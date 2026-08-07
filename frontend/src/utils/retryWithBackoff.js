// Mirrors backend/src/utils/retryWithBackoff.js's shape and defaults for
// consistency, adapted for axios/browser error shapes and for cancellation
// tied to a React component's lifecycle (a backend retry has no
// "unmounted" case; a frontend one does).

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * Classifies an axios error as transient (retryable) or not. Unknown
 * response statuses (400/401/403/404/etc.) default to NOT retryable --
 * retrying won't change a real client-side rejection. A deliberate
 * cancellation (AbortController) must also never be retried.
 */
export const isRetryableError = (error) => {
  if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
    return false;
  }

  const status = error?.response?.status;
  if (typeof status === "number") {
    return RETRYABLE_STATUS_CODES.has(status);
  }

  // No HTTP response at all (network error, CORS block, DNS failure,
  // connection refused, axios timeout) -- treat as transient.
  return true;
};

/**
 * Runs `fn` with a small, bounded exponential backoff retry budget. Only
 * retries errors `isRetryable` classifies as transient; anything else (or
 * the final attempt) is thrown immediately.
 *
 * `isCancelled` is checked before every attempt and before every wait, so a
 * caller can abort the whole retry loop as soon as it becomes true (e.g. on
 * component unmount) instead of waiting for an in-flight delay to elapse.
 * `sleep` is injectable so tests can run without real delays.
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    isRetryable = isRetryableError,
    isCancelled = () => false,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  const cancelledError = () => {
    const err = new Error("Retry cancelled");
    err.name = "RetryCancelledError";
    return err;
  };

  let attempt = 1;
  while (true) {
    if (isCancelled()) throw cancelledError();

    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt || !isRetryable(error)) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delayMs);
      if (isCancelled()) throw cancelledError();
      attempt += 1;
    }
  }
};
