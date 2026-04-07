import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/AppProviders";
import { ThemeProvider } from "@/app/ThemeProvider";

// Frame-buster fallback against clickjacking if security headers are bypassed.
try {
  if (window.self !== window.top) {
    window.top!.location = window.self.location;
  }
} catch {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = "This application cannot be loaded inside a frame.";
  }
  throw new Error("Framed context blocked.");
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </ThemeProvider>
  </ErrorBoundary>
);
