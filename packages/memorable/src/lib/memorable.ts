/* eslint-disable @typescript-eslint/no-explicit-any */
import produce from 'immer';

export interface MemorableParams {
  ttl?: number;
  storage?: MemorableStorage;
  reconciler?: MemorableReconciler;
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
  state = Object.freeze({} as any);

  get(key: string) {
    return this.state[key];
  }

  set(key: string, value: any) {
    return produce(this.state, (draft: any) => {
      draft[key] = value;
    });
  }

  remove(key: string) {
    return produce(this.state, (draft: any) => {
      delete draft[key];
    });
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
export abstract class Reconciler {}

export class MemorableReconciler implements Reconciler {}

export class DefaultReconciler extends MemorableReconciler {}

const Memorable = {
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
 *  ttl?: 10 * 60 * 1000, // default to 10 minutes
 *  storage?: DefaultStorage, // default to the machine memory
 *  reconciler?: DefaultReconciler // default to strict mode. meaning if data is in cache and satifies the defined TTL, it will be returned and network skipped.
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

  console.log(Memorable);

  return '🧠';
}
