const STORAGE_KEY = 'billpay_practice_ui_settings_v1';

const DEFAULTS = {
  baseUrl: 'https://billpay-api.gauravkhurana-practice-api.workers.dev',
  theme: 'light',
  responseFormat: 'json', // 'json' | 'xml'
  auth: {
    type: 'api_key',
    identifier: 'demo-api-key-123',
    apiKey: 'demo-api-key-123',
    apiKeyLocation: 'header', // 'header' | 'query'
    bearerToken: 'demo-jwt-token-456',
    basic: {
      username: 'demo',
      password: 'password123',
    },
    cookie: {
      sessionId: 'demo-session-abc123',
    },
  },
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return mergeDefaults(parsed);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearSession() {
  const s = loadSettings();
  s.auth = { type: 'api_key', identifier: '—' };
  saveSettings(s);
}

export function setAuth(auth) {
  const s = loadSettings();
  s.auth = auth;
  saveSettings(s);
}

function mergeDefaults(partial) {
  const merged = structuredClone(DEFAULTS);
  if (partial && typeof partial === 'object') {
    if (typeof partial.baseUrl === 'string') merged.baseUrl = partial.baseUrl;
    if (partial.theme === 'dark' || partial.theme === 'light') merged.theme = partial.theme;
    if (partial.responseFormat === 'json' || partial.responseFormat === 'xml') merged.responseFormat = partial.responseFormat;
    if (partial.auth && typeof partial.auth === 'object') {
      merged.auth = { ...merged.auth, ...partial.auth };
      if (partial.auth.basic && typeof partial.auth.basic === 'object') {
        merged.auth.basic = { ...merged.auth.basic, ...partial.auth.basic };
      }
      if (partial.auth.cookie && typeof partial.auth.cookie === 'object') {
        merged.auth.cookie = { ...merged.auth.cookie, ...partial.auth.cookie };
      }
    }
  }
  return merged;
}
