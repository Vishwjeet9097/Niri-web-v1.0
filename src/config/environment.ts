export const config = {
  useMock: import.meta.env.VITE_USE_MOCK === "true", // Only use mock when explicitly enabled
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000", // Updated for NIRI backend
  loginPath: import.meta.env.VITE_LOGIN_PATH || "/auth/login", // Updated for NIRI API
  formsPath: import.meta.env.VITE_FORMS_PATH || "/submission", // Updated for NIRI API
  appName: "NIRI Dashboard",
  version: "1.0.0",
} as const;
