// Retryable HTTP status codes: 429 (rate limited), 5xx (server-side
// transient), 499 (Cloudinary's own internal sentinel for a request
// timeout -- see node_modules/cloudinary/lib/uploader.js).
const RETRYABLE_STATUS_CODES = new Set([429, 499, 500, 502, 503, 504]);

// Retryable network-level signals: Node errno codes for connection failures,
// plus the DOMException-style names gaxios (googleapis' HTTP client) and
// Cloudinary both use for timeouts/aborts when there's no HTTP response at all.
const RETRYABLE_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "TimeoutError",
  "AbortError",
]);

/**
 * Classifies an error from either the Cloudinary SDK (error.http_code) or
 * googleapis/gaxios (error.status) as transient (retryable) or not. Unknown
 * errors default to NOT retryable -- validation errors, auth failures, and
 * malformed requests must never be retried, and an unrecognized error is
 * treated the same conservative way rather than assumed transient.
 */
export const isRetryableError = (error) => {
  const status = error?.status ?? error?.http_code;
  if (typeof status === "number" && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  const code = error?.code ?? error?.name;
  if (typeof code === "string" && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  return false;
};

/**
 * Runs `fn` with a small, bounded exponential backoff retry budget. Only
 * retries errors isRetryable() classifies as transient; anything else (or
 * the final attempt) is thrown immediately.
 *
 * `sleep` and `isRetryable` are injectable so tests can run without real
 * delays and without needing genuine Cloudinary/Google errors.
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 2,
    baseDelayMs = 300,
    isRetryable = isRetryableError,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt >= maxRetries;
      if (isLastAttempt || !isRetryable(error)) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** attempt;
      await sleep(delayMs);
      attempt += 1;
    }
  }
};
