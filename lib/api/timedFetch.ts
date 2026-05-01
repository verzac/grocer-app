/** Default timeout for all API HTTP calls (fetches + mutations). */
export const API_FETCH_TIMEOUT_MS = 10_000;

/** One immediate retry after a transient failure (two attempts total). */
export const TRANSIENT_RETRY_ATTEMPTS = 2;

export class TransientHttpError extends Error {
  readonly name = 'TransientHttpError';
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

function abortMerge(userSignal: AbortSignal | null | undefined, controller: AbortController): void {
  if (!userSignal) return;
  if (userSignal.aborted) {
    controller.abort(userSignal.reason);
    return;
  }
  userSignal.addEventListener(
    'abort',
    () => {
      controller.abort(userSignal.reason);
    },
    { once: true },
  );
}

/**
 * Fetch with a hard timeout and optional propagation of caller `AbortSignal`.
 */
export async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { signal: userSignal, ...rest } = init;
  const merged = new AbortController();
  const timer = setTimeout(() => merged.abort(), API_FETCH_TIMEOUT_MS);
  abortMerge(userSignal, merged);
  try {
    return await fetch(input, { ...rest, signal: merged.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function isTransientFetchFailure(reason: unknown): boolean {
  if (reason instanceof TransientHttpError) return true;
  if (reason instanceof TypeError) return true;
  if (!(reason instanceof DOMException)) return false;
  if (reason.name === 'AbortError') return true;
  if (reason.name === 'TimeoutError') return true;
  return false;
}

/**
 * Status codes where repeating the request may help (timeouts, overload, rate limit).
 * Used for safe reads, refresh, logout, DELETE — not OAuth code exchange or POST /groceries.
 */
export function shouldRetryHttpForGet(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function throwUnlessRetryableGet(res: Response, context: string): void {
  if (res.ok) return;
  if (shouldRetryHttpForGet(res.status)) throw new TransientHttpError(res.status);
  throw new Error(`${context}: ${res.status}`);
}

export async function withTransientRetries<T>(
  attempts: number,
  fn: () => Promise<T>,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === attempts - 1 || !isTransientFetchFailure(e)) throw e;
    }
  }
  throw last;
}
