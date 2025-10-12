import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/AppProviders";
import { ThemeProvider } from "@/app/ThemeProvider";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </ThemeProvider>
  </ErrorBoundary>
);
