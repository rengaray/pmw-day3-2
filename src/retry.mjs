export async function retryRead(operation, {maxAttempts=3,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),signal}={}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts<1 || maxAttempts>5) throw new Error('Invalid attempt budget.');
  // LAB05_RETRY_START
  return operation(1,signal); // TODO implement bounded transient read retry.
  // LAB05_RETRY_END
}
