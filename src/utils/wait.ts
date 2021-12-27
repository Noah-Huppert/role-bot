/**
 * Wait for a number of milliseconds and then resolve the promise.
 * @param ms - Number of milliseconds to wait.
 * @returns A promise which resolves in ms milliseconds.
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
