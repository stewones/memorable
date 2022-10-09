/* eslint-disable @typescript-eslint/no-explicit-any */

import { isEmpty } from './utils/isEmpty';

export interface MemorableProtocol {
  ttl: number; // in miliseconds
  storage: MemorableStorage;
  reconciler: MemorableReconciler;
}
export interface MemorableParams {
  ttl?: number; // in miliseconds
  storage?: MemorableStorage;
  reconciler?: MemorableReconciler;
}

export interface MemoParams<T = any> {
  key: string;
  ttl?: number;
  fetch: () => Promise<T>;
}

export interface Memo<T = any> extends Pick<MemoParams<T>, 'key' | 'ttl'> {
  value: T | null;
  cache: 'hit' | 'miss';
  expires: number;
}

/**
 * Storage tells Memorable how to handle and where to store the data
 */
export abstract class Storage {
  state: any;

  abstract get(key: string): any;
  abstract set(key: string, value: any): void;
  abstract remove(key: string): void;
}

export class MemorableStorage implements Storage {
  state = {} as any;

  get(key: string) {
    return Promise.resolve(this.state[key]);
  }

  set(key: string, value: any) {
    this.state[key] = value;
    return Promise.resolve();
  }

  remove(key: string) {
    delete this.state[key];
    return Promise.resolve();
  }
}
export class DefaultStorage extends MemorableStorage {
  get(key: string) {
    return super.get(key);
  }

  set(key: string, value: any) {
    return super.set(key, value);
  }

  remove(key: string) {
    return super.remove(key);
  }
}

/**
 * The Reconciler is responsible for telling Memorable wheter it should fetch data from network or cache
 *
 * @export
 * @class Reconciler
 */
export abstract class Reconciler {
  abstract shouldFetch<T = any>(
    memo: MemoParams<T>
  ): (protocol: MemorableProtocol) => Promise<boolean | Memo>;
}

export class MemorableReconciler implements Reconciler {
  /**
   * Wheter or not we should request the network
   * but also returns data if we have it in cache
   */
  shouldFetch<T = any>(
    memo: MemoParams<T>
  ): (protocol: MemorableProtocol) => Promise<boolean | Memo> {
    return async ({ storage }: { storage: MemorableStorage }) => {
      const memoFromStorage = await storage.get(memo.key);
      if (isEmpty(memoFromStorage)) {
        return Promise.resolve(true);
      }

      /**
       * just return the cached memo if it's not expired
       */
      const now = new Date().getTime();
      const expires = memoFromStorage.expires;
      console.log('now', now);
      console.log('expires', expires);

      if (now < expires) {
        return Promise.resolve(memoFromStorage);
      }

      /**
       * otherwise, we need to fetch the data from network
       */
      return Promise.resolve(true);
    };
  }
}

export class DefaultReconciler extends MemorableReconciler {
  shouldFetch<T = any>(memo: MemoParams<T>) {
    return super.shouldFetch(memo);
  }
}

/**
 * Memorable is a main object which holds instances of everything. ie storage, reconciler and more.
 * it should not be imported in your app, instead use the memorable() to initialize and memo() to consume.
 */
export const Memorable: MemorableProtocol = {
  storage: new DefaultStorage(),
  reconciler: new DefaultReconciler(),
  ttl: 10 * 60 * 1000,
};

/**
 * Initialize Memorable
 *
 * This function should be called only once in your app root to tell Memorable how to store and fetch data
 *
 * @example
 * import { memorable, DefaultStorage, DefaultReconciler } from 'memorable';
 *
 * memorable({
 *  ttl?: 10 * 60 * 1000, // default to 10 minutes. configurable in runtime at memo() level
 *  storage?: new DefaultStorage(), // default to the machine memory
 *  reconciler?: new DefaultReconciler() // default to strict mode. meaning if data is in cache and satifies the defined TTL, it will be returned and network skipped.
 * });
 *
 * @export
 * @param {MemorableParams} params
 * @returns {*}  {string}
 */
export function memorable(params?: MemorableParams): string {
  if (params?.ttl) {
    Memorable.ttl = params.ttl;
  }
  if (params?.storage) {
    Memorable.storage = params.storage;
  }

  if (params?.reconciler) {
    Memorable.reconciler = params.reconciler;
  }

  return '🧠';
}

export async function memo<T = any>(params?: MemoParams<T>): Promise<Memo<T>> {
  if (!params?.key) {
    throw new Error('key is required');
  }

  if (!params?.fetch) {
    throw new Error('fetch is required');
  }

  const key = params.key;
  const ttl = params.ttl || Memorable.ttl;

  const reconciler: boolean | any = await Memorable.reconciler.shouldFetch({
    ...params,
    ttl,
  })(Memorable);

  /**
   * meaning we should fetch from network
   */
  if (reconciler === true) {
    const value = await params.fetch();
    const expires = new Date().getTime() + ttl;

    // for faster responses we don't want to wait for the storage to finish
    Memorable.storage.set(key, {
      key,
      ttl,
      value,
      expires,
    });

    return Promise.resolve({
      key,
      ttl,
      value,
      expires,
      cache: 'miss',
    });
  }

  /**
   * otherwise the reconciler returned the cached Memo
   */
  if (reconciler !== false) {
    return Promise.resolve({
      ...reconciler,
      cache: 'hit',
    });
  }

  /**
   * if there's no reconciliation, just return value as null
   */
  return Promise.resolve({
    key,
    ttl,
    value: null,
    expires: 0,
    cache: 'miss',
  });
}
