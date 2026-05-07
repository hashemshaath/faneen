// Preload the hero image only on the home route (LCP optimization).
// Loaded as an external script so the page CSP can drop 'unsafe-inline'.
(function () {
  try {
    if (location.pathname === '/' || location.pathname === '') {
      var l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'image';
      l.fetchPriority = 'high';
      l.href = '/hero-bg.webp';
      l.type = 'image/webp';
      document.head.appendChild(l);
    }
  } catch (e) { /* never break boot */ }
})();
