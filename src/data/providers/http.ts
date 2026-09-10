import { USER_AGENT } from '../../app/config';

/**
 * The one way this app reaches the network: a JSON GET with the required
 * `User-Agent`, a hard timeout and the search box's `AbortSignal`. Nothing
 * about the user travels with it.
 */

export const NETWORK_LOG_TAG = '[bocado:net]';

/** Spec 05: an online provider has 2,5 s to answer before the app moves on. */
export const REQUEST_TIMEOUT_MS = 2500;

/**
 * The endpoint without its query string. A failing request is logged, and the
 * query string is what the user typed to find their food, so it never leaves
 * this module.
 */
export function endpointOf(url: string): string {
  const cut = url.indexOf('?');
  return cut === -1 ? url : url.slice(0, cut);
}

export class RequestFailed extends Error {
  constructor(readonly status: number, url: string) {
    super(`${status} for ${endpointOf(url)}`);
    this.name = 'RequestFailed';
  }
}

export interface GetJsonOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** True when the failure is the caller cancelling, not the network. */
export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Chains the caller's signal to a timeout of our own, so a hung socket ends
 * the request even when nothing else cancels it. `AbortSignal.any` is not in
 * Hermes, hence the manual relay.
 */
function linkedSignal(options: GetJsonOptions): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? REQUEST_TIMEOUT_MS,
  );
  const outer = options.signal;
  const relay = () => controller.abort();
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', relay);
  }
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timeout);
      outer?.removeEventListener('abort', relay);
    },
  };
}

export async function getJson(
  url: string,
  options: GetJsonOptions = {},
): Promise<unknown> {
  const { signal, done } = linkedSignal(options);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal,
    });
    if (!response.ok) throw new RequestFailed(response.status, url);
    return (await response.json()) as unknown;
  } finally {
    done();
  }
}
