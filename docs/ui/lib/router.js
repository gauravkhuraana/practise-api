export function createRouter({ outlet, setActiveNav }) {
  const routes = new Map();

  function normalizeHash(hash) {
    const h = (hash || '').trim();
    if (!h || h === '#') return '/';
    if (h.startsWith('#')) return h.slice(1);
    return h;
  }

  function render(path) {
    const handler = routes.get(path) || routes.get('/404');
    setActiveNav?.(path);
    handler?.(outlet, { path });
  }

  function onHashChange() {
    const path = normalizeHash(location.hash);
    if (path === '/') {
      location.hash = '#/auth';
      return;
    }
    render(path);
  }

  return {
    add(path, handler) {
      routes.set(path, handler);
      return this;
    },
    start(defaultPath = '/auth') {
      if (!location.hash || location.hash === '#') {
        location.hash = `#${defaultPath}`;
      }
      window.addEventListener('hashchange', onHashChange);
      onHashChange();
    },
  };
}
