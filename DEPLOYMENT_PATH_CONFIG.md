# NIRI Path-Based Deployment Guide

## Deployment Scenario

- **State app** (from `indicators/staging` branch) → `server-url/state`
- **Ministry app** (from `niri/final` branch) → `server-url/ministry`

## Code Changes Required

### 1. Vite Configuration (`vite.config.ts`)

Add a configurable `base` path so assets (JS, CSS, images) load from the correct URL:

```ts
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || '/',
  // ... rest of config
}));
```

### 2. React Router Basename (`App.tsx`)

Add `basename` to `BrowserRouter` so client-side routing works under the subpath:

```tsx
<BrowserRouter basename={import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || undefined}>
```

### 3. Environment / Build Scripts

**State build:**
```bash
VITE_BASE_PATH=/state/ npm run build
```

**Ministry build:**
```bash
VITE_BASE_PATH=/ministry/ npm run build
```

Or add to `.env.state` and `.env.ministry`:
```
# .env.state
VITE_BASE_PATH=/state/

# .env.ministry  
VITE_BASE_PATH=/ministry/
```

Then: `npm run build -- --mode state` (requires vite.config to load env files).

### 4. Server Configuration (Deployment Side)

The server (nginx, etc.) must:
- Serve the **State** build for `/state` and `/state/*`
- Serve the **Ministry** build for `/ministry` and `/ministry/*`
- Return `index.html` for all SPA routes (so React Router can handle them)

Example nginx:
```nginx
location /state {
  alias /path/to/state-build/;
  try_files $uri $uri/ /state/index.html;
}
location /ministry {
  alias /path/to/ministry-build/;
  try_files $uri $uri/ /ministry/index.html;
}
```

## What Stays the Same

- **API calls** (`VITE_API_BASE_URL`) – no change; backend URL is independent
- **Route paths in code** – keep using `/dashboard`, `/ministry/dashboard`, etc.; React Router applies basename automatically
- **Links** – use `<Link to="/dashboard">`; basename is applied automatically

## Summary

| Change | File | Purpose |
|--------|------|---------|
| `base` | vite.config.ts | Asset URLs (JS, CSS) |
| `basename` | App.tsx | Client-side routing |
| `VITE_BASE_PATH` | Build env | Set per deployment (/state/ or /ministry/) |
