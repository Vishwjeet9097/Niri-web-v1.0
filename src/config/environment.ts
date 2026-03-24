const basePath = (import.meta.env.VITE_BASE_PATH || "").replace(/\/+$/, "") || "";

export const config = {
  useMock: import.meta.env.VITE_USE_MOCK === "true", // Only use mock when explicitly enabled
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL, // Updated for NIE-I backend
  loginPath: import.meta.env.VITE_LOGIN_PATH || "/auth/login", // Updated for NIE-I API
  formsPath: import.meta.env.VITE_FORMS_PATH || "/submission", // Updated for NIE-I API
  appName: "NIE-I Dashboard",
  version: "1.0.0",
  /** Base path for deployment (e.g. /state or /ministry). Use with toAppPath() for redirects. */
  basePath,
} as const;

/** Prepend base path to a route for window.location / pushState (e.g. /state/dashboard) */
export function toAppPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return config.basePath ? `${config.basePath}${p}` : p;
}

/**
 * URLs for files in `public/` (images, logos). In dev, Vite serves `public` at the site root,
 * so `/state/images/...` 404s while `/images/...` works. In production builds, use the base path.
 */
export function getPublicAssetPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.DEV) {
    return p;
  }
  return config.basePath ? `${config.basePath}${p}` : p;
}
