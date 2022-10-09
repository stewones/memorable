/**
 * express setup
 */
import express, { Request, Response } from 'express';
const app = express();
const port = 3000;

/**
 * memorable setup
 */
import { memorable } from 'memorable';

/**
 * some time expensive computation
 */
function timeExpensiveComputation() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Done ${memorable()}`);
    }, 5000);
  });
}

app.get('/', async (req: Request, res: Response) => {
  const result = await timeExpensiveComputation();
  res.send(result);
});

app.listen(port, () => {
  console.log(`Express example listening on port ${port}`);
});
