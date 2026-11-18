/** The subset of `fetch` the mirror needs, so the Worker runtime and tests can both provide it. */
export type FetchFile = (url: string, init?: RequestInit) => Promise<Response>;
