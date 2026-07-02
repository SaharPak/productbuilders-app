/** Allow only same-origin relative paths (blocks open redirects). */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  if (raw.includes("://") || raw.includes("\\")) {
    return "/";
  }
  return raw;
}
