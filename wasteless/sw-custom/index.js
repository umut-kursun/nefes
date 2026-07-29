/**
 * Custom SW snippet merged by next-pwa.
 * Enables client-triggered activation via Settings → Güncelle.
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
