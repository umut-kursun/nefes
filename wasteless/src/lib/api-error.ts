/** Safe client-facing API error text — never leak stack traces in production. */
export function safeApiErrorMessage(
  error: unknown,
  fallback = "İşlem başarısız oldu. Lütfen tekrar deneyin."
): string {
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return error.message;
  }
  return fallback;
}
