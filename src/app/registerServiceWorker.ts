/** Registered only in production builds - during `vite dev`, a cached service worker would fight the dev server's own module reloading. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    // BASE_URL (Vite's configured `base`) keeps this correct whether the
    // app is hosted at a domain root or under a subpath.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.error('Service worker registration failed', error)
    })
  })
}
