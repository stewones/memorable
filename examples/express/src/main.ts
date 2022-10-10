/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * express setup
 */
import express, { Request, Response } from 'express';
const app = express();
const port = 3000;

/**
 * memorable setup
 */
import {
  memorable,
  memo,
  MemorableReconciler,
  MemoParams,
  MemorableStorage,
  MemorableProtocol,
  Memo,
} from 'memorable';
import { isEmpty } from 'memorable/utils';
import { readFileSync, writeFileSync } from 'fs';
import { isDiff } from './effects/isDiff';

/**
 * create a custom storage adapter to use machine's filesystem
 * this is just an example as how you can use any mechanism to persist data
 * ie: you could implement a RedisStorage adapter based on this example
 */
class CustomStorage extends MemorableStorage {
  target = {};
  proxy = {
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value);
      // write to dist/examples/express/storage.json
      writeFileSync(__dirname + '/storage.json', JSON.stringify(target));
      return result;
    },
  };

  state = new Proxy(this.target, this.proxy);

  constructor() {
    super();
    try {
      // read from dist/examples/express/storage.json
      this.state = JSON.parse(
        readFileSync(__dirname + '/storage.json', 'utf8')
      );
    } catch (e) {
      // do nothing
    }
  }

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

/**
 * create a custom reconciler to control fetch logic and returned cache
 */
class CustomReconciler extends MemorableReconciler {
  shouldFetch<T = any>(
    memo: MemoParams<T>
  ): (protocol: MemorableProtocol) => Promise<boolean | Memo> {
    const { key, ttl } = memo;
    /**
     * skip the custom implementation which follows
     */
    if (key === 'my-computation-result') {
      return super.shouldFetch(memo);
    }

    /**
     * otherwise use a custom implementation
     * where we check for data modification
     */
    return async (protocol) => {
      const { storage } = protocol;

      const memoFromStorage = await storage.get(memo.key);

      /**
       * ask the protocol to fetch the data and skip the rest
       */
      if (isEmpty(memoFromStorage)) {
        return Promise.resolve(true);
      }

      const now = new Date().getTime();
      const expires = memoFromStorage.expires;
      const expired = now > expires;

      console.log('now', now);
      console.log('expires', expires);
      console.log('ttl', ttl);
      console.log('expired', expired);

      /**
       * always check for updates in case of
       * 1 - ttl is defined and expired
       * 2 - or ttl is unset (-1)
       *
       * but you can tweak this logic as your needs.
       * basically if you always need to be checking for updates
       * regardless of cache expiration, just set ttl to -1
       *
       * note that in this example the Reconciler is aiming for maximum response performance
       * that means when disabling TTL (-1)
       * Reconciler will always be checking for updates while delivering what's cached, at same time.
       * when something changes, Reconciler updates the cache and deliver the updated result for subsequent requests
       *
       */
      if ((ttl > 0 && expired) || ttl <= 0) {
        // simulate network delay
        setTimeout(async () => {
          const value = await memo.fetch();
          const expires = new Date().getTime() + memo.ttl;

          const { key, ttl } = memo;

          if (isDiff(memoFromStorage.value, value)) {
            console.log('value changed', memoFromStorage.value, value);
            storage.set(memo.key, {
              key,
              ttl,
              expires,
              value,
            });
          } else {
            console.log('value not changed', memoFromStorage.value, value);
          }
        }, 2000);
      }

      /**
       * resolve cached memo anyways
       * this is so we can speed up the response time for every request
       */
      return Promise.resolve(memoFromStorage);
    };
  }
}

memorable({
  ttl: 10 * 1000, // optional. default to 10 seconds. -1 to disable cache.
  storage: new CustomStorage(), // optional. defaults to MemorableStorage
  reconciler: new CustomReconciler(), // optional. defaults to MemorableReconciler
});

/**
 * some time expensive computation
 */
async function timeExpensiveComputation() {
  const myComputationResult = await memo<string>({
    key: 'my-computation-result',
    fetch: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve('Done 🧠⚡');
        }, 1000);
      });
    },
  });

  return Promise.resolve(myComputationResult);
}

/**
 * another time expensive computation
 * 👉 refer to the CustomReconciler class above to learn more
 */
async function anotherTimeExpensiveComputation() {
  const anotherComputationResult = await memo<string>({
    key: 'another-computation-result',
    fetch: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            `Done ${Math.floor(Math.random() * 100) % 2 === 0 ? '🧠' : '⚡'}`
          );
        }, 1000);
      });
    },
  });

  return Promise.resolve(anotherComputationResult);
}

/**
 * express routes
 */
app.get('/', async (req: Request, res: Response) => {
  const result = await timeExpensiveComputation();
  res.json(result);
});

app.get('/custom-reconciler', async (req: Request, res: Response) => {
  const result = await anotherTimeExpensiveComputation();
  res.json(result);
});

app.listen(port, () => {
  console.log(`Express example listening on port ${port}`);
});
