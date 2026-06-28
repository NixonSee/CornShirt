const EVENT_DETAIL_PATH = /^\/events\/[A-Za-z0-9_-]+$/;

export function getSafeEventReturnTo(value: string | null): string | null {
  if (!value || !EVENT_DETAIL_PATH.test(value)) return null;
  return value;
}

export function withEventReturnTo(
  authPath: "/login" | "/register",
  returnTo: string | null,
): string {
  const safeReturnTo = getSafeEventReturnTo(returnTo);

  return safeReturnTo
    ? `${authPath}?returnTo=${encodeURIComponent(safeReturnTo)}`
    : authPath;
}
