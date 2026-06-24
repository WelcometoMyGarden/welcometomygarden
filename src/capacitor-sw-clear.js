(async () => {
  const hadController = !!navigator.serviceWorker.controller;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  // unregister() does NOT delete Cache Storage — purge it explicitly
  if (globalThis.caches) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        // don't remove the mapbox-tiles cache
        .filter((k) => k !== 'mapbox-tiles')
        .map((k) => caches.delete(k))
    );
  }
  // unregister() also does NOT release control of THIS already-loaded document
  // (which may itself have been served stale from cache). Only a fresh
  // navigation is uncontrolled, so reload once if we were controlled.
  if (hadController && !sessionStorage.getItem('sw-purged')) {
    sessionStorage.setItem('sw-purged', '1');
    location.reload();
  }
})();
