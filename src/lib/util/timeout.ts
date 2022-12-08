

/**
 * Executes the promise, but discards the result and rejects with 'timeout' if the timeout expired.
 */
export const timeout = async <T>(promise: Promise<T>, time = 4000) => {

  return new Promise<T>((resolve, reject) => {
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject('timeout');
        }
      }, time);

      promise
        .then((response) => {
          if (!resolved)  {
            resolved = true;
            clearTimeout(timeoutId)
            resolve(response);
          }
        })
        .catch((error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId)
            reject(error)
          }
        });
  })
}
