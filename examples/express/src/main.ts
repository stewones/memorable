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

class CustomReconciler extends MemorableReconciler {
  shouldFetch<T = any>(
    memo: MemoParams<T>
  ): (protocol: MemorableProtocol) => Promise<boolean | Memo> {
    /**
     * use the default implementation for a given key
     */
    if (memo.key === 'my-computation-result') {
      return super.shouldFetch(memo);
    }

    /**
     * otherwise use a custom implementation
     * where we check for data modification
     * to decide whenever a new fetch is necessary
     */
    return async ({ storage }: { storage: MemorableStorage }) => {
      const memoFromStorage = await storage.get(memo.key);

      if (isEmpty(memoFromStorage)) {
        return Promise.resolve(true);
      }

      /**
       * resolve cached memo but also request the network
       * to check for data modification and update the cache
       */
      const now = new Date().getTime();
      const expires = memoFromStorage.expires;

      console.log('now', now);
      console.log('expires', expires);

      if (now < expires) {
        Promise.resolve(memoFromStorage);
      }

      /**
       * check for updates
       */
      setTimeout(() => {
        Promise.resolve(memoFromStorage);
      }, 3000);
    };
  }
}

memorable({
  storage: new CustomStorage(),
  reconciler: new CustomReconciler(),
  ttl: 5 * 1000, // default to 5 seconds. -1 to disable cache.
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
 * now we don't only rely on the ttl
 * but also if data has changed
 * to decide if we should fetch or not
 * check the CustomReconciler class above
 */
async function anotherTimeExpensiveComputation() {
  const anotherComputationResult = await memo<string>({
    key: 'another-computation-result',
    fetch: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve('Done 🧠⚡');
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
