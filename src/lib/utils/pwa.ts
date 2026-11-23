export const pwaPublicPaths = [
  "/sw.js",
  "/manifest.webmanifest",
  "/offline",
  "/icon.png",
  "/apple-icon.png",
  "/favicon.ico",
] as const;

export function isPwaPublicPath(pathname: string) {
  return pwaPublicPaths.includes(pathname as (typeof pwaPublicPaths)[number]) || pathname.startsWith("/icons/");
}
