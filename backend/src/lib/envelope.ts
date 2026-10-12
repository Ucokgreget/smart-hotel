/**
 * Response envelope. The shape comes from the proposal's example responses:
 * `{ "status": "success", "message": "...", "data": ... }`.
 */

export type ApiResponse<T> = {
  status: "success" | "error"
  message: string
  data?: T
  error?: {
    code: string
    fields?: Record<string, string>
  }
}

export function success<T>(data: T, message: string, status = 200) {
  return { body: { status: "success", message, data } satisfies ApiResponse<T>, status }
}

export function failure(
  message: string,
  code: string,
  status: number,
  fields?: Record<string, string>
) {
  return {
    body: {
      status: "error",
      message,
      error: fields ? { code, fields } : { code },
    } satisfies ApiResponse<never>,
    status,
  }
}
