import { createApiClient } from './lib/apiClient.js';
import { loadSettings, saveSettings, clearSession as clearStoredSession } from './lib/storage.js';
import { createRouter } from './lib/router.js';
import { renderDashboard } from './views/dashboard.js';
import { renderSettings } from './views/settings.js';
import { renderUsers } from './views/users.js';
import { renderBillers } from './views/billers.js';
import { renderBills } from './views/bills.js';
import { renderPayments } from './views/payments.js';
import { renderPaymentMethods } from './views/paymentMethods.js';
import { renderPractice } from './views/practice.js';
import { renderScenarios } from './views/scenarios.js';

const settings = loadSettings();

const ui = {
  routeOutlet: document.getElementById('routeOutlet'),
  toastRegion: document.getElementById('toastRegion'),
  themeToggle: document.getElementById('themeToggle'),
  rateLimitHint: document.getElementById('rateLimitHint'),
  userName: document.getElementById('userName'),
  userKyc: document.getElementById('userKyc'),
};

applyTheme(settings.theme);

let api = createApiClient({
  baseUrl: settings.baseUrl,
  getAuth: () => loadSettings().auth,
  getResponseFormat: () => loadSettings().responseFormat || 'json',
  onResponseMeta(meta) {
    if (meta?.rateLimit) {
      const { limit, remaining, reset } = meta.rateLimit;
      ui.rateLimitHint.textContent = limit
        ? `${remaining}/${limit} • reset ${reset ?? '—'}`
        : '';
    }
  },
});

function rebuildApi() {
  const s = loadSettings();
  api = createApiClient({
    baseUrl: s.baseUrl,
    getAuth: () => loadSettings().auth,
    getResponseFormat: () => loadSettings().responseFormat || 'json',
    onResponseMeta: api.__onResponseMeta,
  });
}

function toast(title, body) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast__title"></div><div class="toast__body"></div>`;
  el.querySelector('.toast__title').textContent = title;
  el.querySelector('.toast__body').textContent = body;
  ui.toastRegion.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  ui.themeToggle.setAttribute('aria-pressed', String(isDark));
  ui.themeToggle.textContent = isDark ? '☀️' : '🌙';
}

ui.themeToggle.addEventListener('click', () => {
  const next = loadSettings();
  next.theme = next.theme === 'dark' ? 'light' : 'dark';
  saveSettings(next);
  applyTheme(next.theme);
});

async function refreshUserBadge() {
  try {
    const res = await api.get('/v1/auth/me');
    const u = res?.data?.user;
    ui.userName.textContent = u?.name || u?.email || 'Authenticated';
    ui.userKyc.textContent = u?.scopes?.length ? 'Active' : '—';
    ui.userKyc.className = 'user__status badge badge--ok';
  } catch {
    const { auth } = loadSettings();
    ui.userName.textContent = auth?.identifier || 'Not logged in';
    ui.userKyc.textContent = '—';
    ui.userKyc.className = 'user__status badge';
  }
}

refreshUserBadge();

function navigate(hash) {
  location.hash = hash;
}

const router = createRouter({
  outlet: ui.routeOutlet,
  setActiveNav(path) {
    for (const a of document.querySelectorAll('.sidebar__link[data-route]')) {
      const r = a.dataset.route;
      a.setAttribute('aria-current', r === path ? 'page' : 'false');
    }
  },
});

const ctx = {
  api: () => api,
  toast,
  navigate,
  refreshUserBadge,
  rebuildApi,
  clearSession() {
    clearStoredSession();
    rebuildApi();
    refreshUserBadge();
  },
};

router.add('/', (outlet) => renderDashboard(outlet, ctx));
router.add('/scenarios', (outlet) => renderScenarios(outlet, ctx));
router.add('/bills', (outlet) => renderBills(outlet, ctx));
router.add('/payments', (outlet) => renderPayments(outlet, ctx));
router.add('/payment-methods', (outlet) => renderPaymentMethods(outlet, ctx));
router.add('/users', (outlet) => renderUsers(outlet, ctx));
router.add('/billers', (outlet) => renderBillers(outlet, ctx));
router.add('/settings', (outlet) => renderSettings(outlet, ctx));
router.add('/practice', (outlet) => renderPractice(outlet, ctx));

router.start('/scenarios');

