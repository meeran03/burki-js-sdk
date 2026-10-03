/** Lightweight transport error shared by preflight and the lazily loaded voice SDK. */
export class SessionRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
