/**
 * HTTP errors with a stable machine-readable code. The error handler turns these
 * into the same JSON envelope the success responses use.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = "HttpError"
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "BAD_REQUEST", message, fields)

export const unauthorized = (message = "Sesi tidak valid. Masuk terlebih dahulu.") =>
  new HttpError(401, "UNAUTHORIZED", message)

/** Signed in, but the account's role does not allow this. */
export const forbidden = (message = "Akun kamu tidak punya akses ke bagian ini.") =>
  new HttpError(403, "FORBIDDEN", message)

export const notFound = (message: string) => new HttpError(404, "NOT_FOUND", message)

export const conflict = (code: string, message: string) => new HttpError(409, code, message)

export const badGateway = (message: string) => new HttpError(502, "GATEWAY_ERROR", message)
