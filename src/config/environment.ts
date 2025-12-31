export const config = {
  useMock: import.meta.env.VITE_USE_MOCK === "true", // Only use mock when explicitly enabled
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL, // Updated for NIE-I backend
  loginPath: import.meta.env.VITE_LOGIN_PATH || "/auth/login", // Updated for NIE-I API
  formsPath: import.meta.env.VITE_FORMS_PATH || "/submission", // Updated for NIE-I API
  appName: "NIE-I Dashboard",
  version: "1.0.0",
} as const;
