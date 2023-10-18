/**
 * Executes the promise, but discards the result and rejects with 'timeout' if the timeout expired.
 */
export const timeout = async <T>(promise: Promise<T>, time = 4000, spec?: string) => {
  return Promise.race([
    new Promise((_, reject) =>
      setTimeout(
        () => reject(`${spec ? spec : 'Timed out '} (${(time / 1000).toFixed(1)} sec)`),
        time
      )
    ),
    promise
  ]) as Promise<T>;
};
