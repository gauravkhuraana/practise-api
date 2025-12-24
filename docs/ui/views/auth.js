import { loadSettings, saveSettings, setAuth } from '../lib/storage.js';

export function renderAuth(outlet, { api, onSessionChange, toast }) {
  const settings = loadSettings();

  outlet.innerHTML = `
    <h1 class="card__title">Authentication</h1>
    <p class="muted">Choose an auth method and save it. Most API endpoints require auth (except /health).</p>

    <div class="row" role="tablist" aria-label="Auth method tabs">
      <button class="btn btn--secondary" type="button" data-tab="api_key">API Key</button>
      <button class="btn btn--secondary" type="button" data-tab="bearer">Bearer</button>
      <button class="btn btn--secondary" type="button" data-tab="basic">Basic</button>
      <button class="btn btn--secondary" type="button" data-tab="oauth2">OAuth2</button>
    </div>

    <div id="authPanel" style="margin-top:16px;"></div>
  `;

  const panel = outlet.querySelector('#authPanel');
  const tabButtons = Array.from(outlet.querySelectorAll('button[data-tab]'));

  function setActiveTab(tab) {
    for (const b of tabButtons) {
      const active = b.dataset.tab === tab;
      b.style.borderColor = active ? 'var(--border)' : 'transparent';
      b.style.background = active ? 'var(--bg)' : 'transparent';
    }
  }

  function renderApiKey() {
    setActiveTab('api_key');
    const current = loadSettings().auth || {};

    panel.innerHTML = `
      <div class="card" style="padding:0;border:none;background:transparent;">
        <label class="field">
          <span class="field__label">API key value</span>
          <input id="apiKeyValue" class="input" autocomplete="off" value="${escapeHtml(current.apiKey || 'demo-api-key-123')}" />
        </label>

        <label class="field">
          <span class="field__label">Send API key via</span>
          <select id="apiKeyLocation" class="input">
            <option value="header">Header: X-API-Key</option>
            <option value="query">Query: ?api_key=…</option>
          </select>
        </label>

        <div class="row">
          <button id="saveApiKey" class="btn" type="button">Save</button>
        </div>

        <p class="muted" style="margin-top:12px;">Demo: <strong>demo-api-key-123</strong></p>
      </div>
    `;

    const loc = panel.querySelector('#apiKeyLocation');
    loc.value = current.apiKeyLocation || 'header';

    panel.querySelector('#saveApiKey').addEventListener('click', () => {
      const apiKey = panel.querySelector('#apiKeyValue').value.trim();
      const apiKeyLocation = loc.value;
      const auth = {
        type: 'api_key',
        identifier: apiKeyLocation === 'query' ? 'api_key(query)' : 'X-API-Key',
        apiKey,
        apiKeyLocation,
      };
      setAuth(auth);
      onSessionChange?.();
      toast?.('Auth saved', 'API Key configured');
    });
  }

  function renderBearer() {
    setActiveTab('bearer');
    const current = loadSettings().auth || {};

    panel.innerHTML = `
      <div class="card" style="padding:0;border:none;background:transparent;">
        <label class="field">
          <span class="field__label">Bearer token</span>
          <input id="bearerToken" class="input" autocomplete="off" value="${escapeHtml(current.bearerToken || 'demo-jwt-token-456')}" />
        </label>

        <div class="row">
          <button id="saveBearer" class="btn" type="button">Save</button>
        </div>

        <p class="muted" style="margin-top:12px;">Demo: <strong>demo-jwt-token-456</strong></p>
      </div>
    `;

    panel.querySelector('#saveBearer').addEventListener('click', () => {
      const bearerToken = panel.querySelector('#bearerToken').value.trim();
      const auth = {
        type: 'bearer',
        identifier: 'Authorization: Bearer',
        bearerToken,
      };
      setAuth(auth);
      onSessionChange?.();
      toast?.('Auth saved', 'Bearer token configured');
    });
  }

  function renderBasic() {
    setActiveTab('basic');
    const current = loadSettings().auth || {};

    panel.innerHTML = `
      <div class="card" style="padding:0;border:none;background:transparent;">
        <label class="field">
          <span class="field__label">Username</span>
          <input id="basicUser" class="input" autocomplete="off" value="${escapeHtml(current.basic?.username || 'demo')}" />
        </label>

        <label class="field">
          <span class="field__label">Password</span>
          <input id="basicPass" class="input" type="password" autocomplete="off" value="${escapeHtml(current.basic?.password || 'password123')}" />
        </label>

        <div class="row">
          <button id="saveBasic" class="btn" type="button">Save</button>
        </div>

        <p class="muted" style="margin-top:12px;">Demo: <strong>demo / password123</strong></p>
      </div>
    `;

    panel.querySelector('#saveBasic').addEventListener('click', () => {
      const username = panel.querySelector('#basicUser').value.trim();
      const password = panel.querySelector('#basicPass').value;
      const auth = {
        type: 'basic',
        identifier: 'Authorization: Basic',
        basic: { username, password },
      };
      setAuth(auth);
      onSessionChange?.();
      toast?.('Auth saved', 'Basic auth configured');
    });
  }

  function renderOAuth2() {
    setActiveTab('oauth2');

    panel.innerHTML = `
      <div class="card" style="padding:0;border:none;background:transparent;">
        <h2 class="card__title" style="font-size:16px;">Token endpoint</h2>
        <p class="muted">This calls <code>/oauth/token</code> using <code>application/x-www-form-urlencoded</code>.</p>

        <label class="field">
          <span class="field__label">Grant type</span>
          <select id="grantType" class="input">
            <option value="client_credentials">client_credentials</option>
            <option value="password">password</option>
            <option value="refresh_token">refresh_token</option>
          </select>
        </label>

        <div id="oauthFields"></div>

        <div class="row">
          <button id="getToken" class="btn" type="button">Get token</button>
          <button id="useToken" class="btn btn--secondary" type="button">Use token as Bearer</button>
        </div>

        <pre class="code" id="tokenOutput" aria-label="Token output"></pre>

        <p class="muted" style="margin-top:12px;">
          Demo client: <strong>demo-client</strong> / <strong>demo-secret-789</strong>
        </p>
      </div>
    `;

    const grantType = panel.querySelector('#grantType');
    const fields = panel.querySelector('#oauthFields');
    const tokenOutput = panel.querySelector('#tokenOutput');

    const state = {
      lastToken: null,
    };

    function renderFields() {
      const gt = grantType.value;
      if (gt === 'client_credentials') {
        fields.innerHTML = `
          <label class="field">
            <span class="field__label">client_id</span>
            <input id="clientId" class="input" autocomplete="off" value="demo-client" />
          </label>
          <label class="field">
            <span class="field__label">client_secret</span>
            <input id="clientSecret" class="input" autocomplete="off" value="demo-secret-789" />
          </label>
        `;
      } else if (gt === 'password') {
        fields.innerHTML = `
          <label class="field">
            <span class="field__label">username</span>
            <input id="username" class="input" autocomplete="off" value="demo" />
          </label>
          <label class="field">
            <span class="field__label">password</span>
            <input id="password" class="input" type="password" autocomplete="off" value="password123" />
          </label>
        `;
      } else {
        fields.innerHTML = `
          <label class="field">
            <span class="field__label">refresh_token</span>
            <input id="refreshToken" class="input" autocomplete="off" value="demo-refresh-token-789" />
          </label>
        `;
      }
    }

    renderFields();
    grantType.addEventListener('change', renderFields);

    panel.querySelector('#getToken').addEventListener('click', async () => {
      tokenOutput.textContent = 'Loading…';
      try {
        const gt = grantType.value;
        const body = { grant_type: gt };

        if (gt === 'client_credentials') {
          body.client_id = fields.querySelector('#clientId').value.trim();
          body.client_secret = fields.querySelector('#clientSecret').value.trim();
        } else if (gt === 'password') {
          body.username = fields.querySelector('#username').value.trim();
          body.password = fields.querySelector('#password').value;
        } else {
          body.refresh_token = fields.querySelector('#refreshToken').value.trim();
        }

        const res = await api().post('/oauth/token', body, 'application/x-www-form-urlencoded');
        state.lastToken = res;
        tokenOutput.textContent = JSON.stringify(res, null, 2);
        toast?.('Token received', 'OAuth2 token request succeeded');
      } catch (e) {
        tokenOutput.textContent = JSON.stringify({ message: e?.message, status: e?.status, data: e?.data }, null, 2);
        toast?.('Token failed', e?.message || 'Request failed');
      }
    });

    panel.querySelector('#useToken').addEventListener('click', () => {
      const token = state.lastToken?.access_token;
      if (!token) {
        toast?.('No token', 'Get a token first');
        return;
      }
      setAuth({ type: 'bearer', identifier: 'Authorization: Bearer', bearerToken: token });
      onSessionChange?.();
      toast?.('Auth saved', 'Bearer token set from OAuth2 response');
    });
  }

  function onTabClick(tab) {
    const next = loadSettings();
    // Persist last tab for convenience
    next.lastAuthTab = tab;
    saveSettings(next);

    if (tab === 'api_key') renderApiKey();
    else if (tab === 'bearer') renderBearer();
    else if (tab === 'basic') renderBasic();
    else renderOAuth2();
  }

  for (const b of tabButtons) {
    b.addEventListener('click', () => onTabClick(b.dataset.tab));
  }

  onTabClick(settings.lastAuthTab || settings.auth?.type || 'api_key');
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
