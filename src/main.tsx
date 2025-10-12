import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/AppProviders";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AppProviders>
      <App />
    </AppProviders>
  </ErrorBoundary>
);
