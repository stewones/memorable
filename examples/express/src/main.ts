/**
 * express setup
 */
import express, { Request, Response } from 'express';
const app = express();
const port = 3000;

/**
 * memorable setup
 */
import { memorable, memo } from 'memorable';
memorable({
  ttl: 5 * 1000, // default to 5 seconds.
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
 * express routes
 */
app.get('/', async (req: Request, res: Response) => {
  const result = await timeExpensiveComputation();
  res.json(result);
});

app.listen(port, () => {
  console.log(`Express example listening on port ${port}`);
});
