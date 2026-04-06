/**
 * Client-side inactivity timeout (aligned with backend SESSION_INACTIVITY_MINUTES).
 * Resets on user input; after idle period, triggers logout (server revoke via authService.logout).
 * Throttled pings to GET /auth/profile keep server-side idle aligned with UI activity.
 */

import { authService } from "@/services/auth.service";
import { config } from "@/config/environment";

const DEFAULT_MINUTES = 20;
const SERVER_PING_MS = 60 * 1000;

let lastServerPing = 0;

function pingServerActivity(): void {
  const now = Date.now();
  if (now - lastServerPing < SERVER_PING_MS) return;
  lastServerPing = now;
  if (!authService.isAuthenticated()) return;
  const baseUrl =
    config.apiBaseUrl ??
    (typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_API_BASE_URL
      : undefined) ??
    "http://localhost:3000";
  const url = `${String(baseUrl).replace(/\/+$/, "")}/auth/profile`;
  void fetch(url, {
    method: "GET",
    headers: authService.getAuthHeaders(),
    credentials: "include",
  }).catch(() => {});
}

export function getSessionIdleTimeoutMs(): number {
  const raw =
    typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_SESSION_IDLE_MINUTES
      : undefined;
  const n = raw != null && raw !== "" ? Number(raw) : NaN;
  const minutes = Number.isFinite(n) && n > 0 ? n : DEFAULT_MINUTES;
  return minutes * 60 * 1000;
}

export function startIdleSessionWatcher(
  onIdle: () => void | Promise<void>
): () => void {
  const ms = getSessionIdleTimeoutMs();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let throttle = 0;

  const reset = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void Promise.resolve(onIdle());
    }, ms);
  };

  const onActivity = () => {
    const now = Date.now();
    if (now - throttle < 1000) return;
    throttle = now;
    pingServerActivity();
    reset();
  };

  const events: (keyof WindowEventMap)[] = [
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart",
    "click",
    "wheel",
  ];
  events.forEach((e) =>
    window.addEventListener(e, onActivity as EventListener, { passive: true })
  );

  const onVisibility = () => {
    if (document.visibilityState === "visible") onActivity();
  };
  document.addEventListener("visibilitychange", onVisibility);

  reset();

  return () => {
    if (timer) clearTimeout(timer);
    events.forEach((e) =>
      window.removeEventListener(e, onActivity as EventListener)
    );
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
