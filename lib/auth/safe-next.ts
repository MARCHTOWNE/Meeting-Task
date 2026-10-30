/**
 * 登录后要跳回的页面。只允许本站的相对路径，
 * 防止 /login?next=https://evil.com 这类"开放重定向"把用户带去钓鱼网站。
 */
export function safeNext(value: unknown) {
  const next = typeof value === "string" ? value : "";
  const isRelative = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  return isRelative && !next.startsWith("/login") && !next.startsWith("/signup") ? next : "/tasks";
}
