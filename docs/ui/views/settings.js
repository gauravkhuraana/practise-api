import { loadSettings, saveSettings, setAuth } from '../lib/storage.js';

export function renderSettings(outlet, ctx) {
  const { api, toast, rebuildApi, refreshUserBadge, clearSession } = ctx;
  const settings = loadSettings();

  outlet.innerHTML = `
    <h1 class="card__title">Settings & Auth</h1>
    <p class="muted">Configure API connection and choose authentication method.</p>

    <div class="card" style="margin-top: var(--space-3);">
      <h2 class="card__title" style="font-size:16px;">API Connection</h2>

      <label class="field">
        <span class="field__label">Base URL</span>
        <select id="baseUrl" class="input">
          <option value="https://billpay-api.gauravkhurana-practice-api.workers.dev">Production (Cloudflare Workers)</option>
          <option value="http://localhost:8787">Local (wrangler dev)</option>
        </select>
      </label>

      <div class="row">
        <button id="pingHealth" class="btn btn--secondary" type="button">Ping /health</button>
        <button id="clearSession" class="btn btn--danger" type="button">Clear session</button>
      </div>

      <pre class="code" id="healthOutput" style="margin-top:12px; display:none;"></pre>
    </div>

    <div class="card" style="margin-top: var(--space-3);">
      <h2 class="card__title" style="font-size:16px;">Authentication</h2>
      <p class="muted">Choose an auth method. Most endpoints require auth (except /health).</p>

      <div class="row" role="tablist" aria-label="Auth method tabs" style="margin: 12px 0;">
        <button class="btn btn--secondary" type="button" data-tab="api_key">API Key</button>
        <button class="btn btn--secondary" type="button" data-tab="bearer">Bearer</button>
        <button class="btn btn--secondary" type="button" data-tab="basic">Basic</button>
        <button class="btn btn--secondary" type="button" data-tab="cookie">Cookie</button>
        <button class="btn btn--secondary" type="button" data-tab="oauth2">OAuth2</button>
      </div>

      <div id="authPanel"></div>
    </div>

    <div class="card" style="margin-top: var(--space-3);">
      <h2 class="card__title" style="font-size:16px;">Response Format</h2>
      <p class="muted">Choose the response format. API supports JSON and XML.</p>

      <div class="row" style="gap:12px; margin-top: 12px;">
        <label class="radio-label">
          <input type="radio" name="responseFormat" value="json" id="formatJson" /> JSON (default)
        </label>
        <label class="radio-label">
          <input type="radio" name="responseFormat" value="xml" id="formatXml" /> XML
        </label>
      </div>
      <p class="muted" style="margin-top:8px;">Sets the <code>Accept</code> header to <code>application/json</code> or <code>application/xml</code></p>
    </div>

    <div class="card" style="margin-top: var(--space-3);">
      <h2 class="card__title" style="font-size:16px;">Session Info</h2>
      <div class="row">
        <button id="whoAmI" class="btn btn--secondary" type="button">GET /v1/auth/me</button>
      </div>
      <pre class="code" id="sessionOutput" style="margin-top:12px;"></pre>
    </div>
  `;

  const ui = {
    baseUrl: outlet.querySelector('#baseUrl'),
    pingHealth: outlet.querySelector('#pingHealth'),
    clearSession: outlet.querySelector('#clearSession'),
    healthOutput: outlet.querySelector('#healthOutput'),
    authPanel: outlet.querySelector('#authPanel'),
    whoAmI: outlet.querySelector('#whoAmI'),
    sessionOutput: outlet.querySelector('#sessionOutput'),
    tabButtons: Array.from(outlet.querySelectorAll('button[data-tab]')),
  };

  ui.baseUrl.value = settings.baseUrl;

  ui.baseUrl.addEventListener('change', () => {
    const next = loadSettings();
    next.baseUrl = ui.baseUrl.value;
    saveSettings(next);
    rebuildApi();
    toast('Base URL updated', next.baseUrl);
  });

  ui.pingHealth.addEventListener('click', async () => {
    ui.healthOutput.textContent = 'Loading…';
    ui.healthOutput.style.display = 'block';
    try {
      const res = await api().get('/health');
      ui.healthOutput.textContent = JSON.stringify(res, null, 2);
      toast('Health OK', 'GET /health succeeded');
    } catch (e) {
      ui.healthOutput.textContent = JSON.stringify({ error: e?.message, status: e?.status, data: e?.data }, null, 2);
      toast('Health failed', e?.message || 'Error');
    }
  });

  ui.clearSession.addEventListener('click', () => {
    clearSession();
    ui.sessionOutput.textContent = '';
    toast('Session cleared', 'Auth settings removed');
  });

  ui.whoAmI.addEventListener('click', async () => {
    ui.sessionOutput.textContent = 'Loading…';
    try {
      const res = await api().get('/v1/auth/me');
      ui.sessionOutput.textContent = JSON.stringify(res, null, 2);
      toast('Session OK', 'GET /v1/auth/me succeeded');
    } catch (e) {
      ui.sessionOutput.textContent = JSON.stringify({ error: e?.message, status: e?.status, data: e?.data }, null, 2);
      toast('Session failed', e?.message || 'Error');
    }
  });

  function setActiveTab(tab) {
    for (const b of ui.tabButtons) {
      const active = b.dataset.tab === tab;
      b.style.borderColor = active ? 'var(--border)' : 'transparent';
      b.style.background = active ? 'var(--bg)' : 'transparent';
    }
  }

  function renderApiKey() {
    setActiveTab('api_key');
    const current = loadSettings().auth || {};

    ui.authPanel.innerHTML = `
      <label class="field">
        <span class="field__label">API key value</span>
        <input id="apiKeyValue" class="input" autocomplete="off" value="${escapeHtml(current.apiKey || 'demo-api-key-123')}" />
      </label>

      <label class="field">
        <span class="field__label">Send via</span>
        <select id="apiKeyLocation" class="input">
          <option value="header">Header: X-API-Key</option>
          <option value="query">Query: ?api_key=…</option>
        </select>
      </label>

      <button id="saveApiKey" class="btn" type="button">Save</button>
      <p class="muted" style="margin-top:8px;">Demo: <strong>demo-api-key-123</strong></p>
    `;

    ui.authPanel.querySelector('#apiKeyLocation').value = current.apiKeyLocation || 'header';

    ui.authPanel.querySelector('#saveApiKey').addEventListener('click', () => {
      const apiKey = ui.authPanel.querySelector('#apiKeyValue').value.trim();
      const apiKeyLocation = ui.authPanel.querySelector('#apiKeyLocation').value;
      setAuth({ type: 'api_key', identifier: apiKeyLocation === 'query' ? 'api_key(query)' : 'X-API-Key', apiKey, apiKeyLocation });
      refreshUserBadge();
      toast('Auth saved', 'API Key configured');
    });
  }

  function renderBearer() {
    setActiveTab('bearer');
    const current = loadSettings().auth || {};

    ui.authPanel.innerHTML = `
      <label class="field">
        <span class="field__label">Bearer token</span>
        <input id="bearerToken" class="input" autocomplete="off" value="${escapeHtml(current.bearerToken || 'demo-jwt-token-456')}" />
      </label>

      <button id="saveBearer" class="btn" type="button">Save</button>
      <p class="muted" style="margin-top:8px;">Demo: <strong>demo-jwt-token-456</strong></p>
    `;

    ui.authPanel.querySelector('#saveBearer').addEventListener('click', () => {
      const bearerToken = ui.authPanel.querySelector('#bearerToken').value.trim();
      setAuth({ type: 'bearer', identifier: 'Authorization: Bearer', bearerToken });
      refreshUserBadge();
      toast('Auth saved', 'Bearer token configured');
    });
  }

  function renderBasic() {
    setActiveTab('basic');
    const current = loadSettings().auth || {};

    ui.authPanel.innerHTML = `
      <label class="field">
        <span class="field__label">Username</span>
        <input id="basicUser" class="input" autocomplete="off" value="${escapeHtml(current.basic?.username || 'demo')}" />
      </label>

      <label class="field">
        <span class="field__label">Password</span>
        <input id="basicPass" class="input" type="password" autocomplete="off" value="${escapeHtml(current.basic?.password || 'password123')}" />
      </label>

      <button id="saveBasic" class="btn" type="button">Save</button>
      <p class="muted" style="margin-top:8px;">Demo: <strong>demo / password123</strong></p>
    `;

    ui.authPanel.querySelector('#saveBasic').addEventListener('click', () => {
      const username = ui.authPanel.querySelector('#basicUser').value.trim();
      const password = ui.authPanel.querySelector('#basicPass').value;
      setAuth({ type: 'basic', identifier: 'Authorization: Basic', basic: { username, password } });
      refreshUserBadge();
      toast('Auth saved', 'Basic auth configured');
    });
  }

  function renderCookie() {
    setActiveTab('cookie');
    const current = loadSettings().auth || {};

    ui.authPanel.innerHTML = `
      <label class="field">
        <span class="field__label">Session ID (Cookie value)</span>
        <input id="sessionId" class="input" autocomplete="off" value="${escapeHtml(current.cookie?.sessionId || 'demo-session-abc123')}" />
      </label>

      <button id="saveCookie" class="btn" type="button">Save</button>
      <p class="muted" style="margin-top:8px;">Demo: <strong>demo-session-abc123</strong></p>
      <p class="muted" style="margin-top:4px;">⚠️ Note: Cookie auth via JavaScript may be limited by CORS. Works best with same-origin requests or when API allows credentials.</p>
    `;

    ui.authPanel.querySelector('#saveCookie').addEventListener('click', () => {
      const sessionId = ui.authPanel.querySelector('#sessionId').value.trim();
      setAuth({ type: 'cookie', identifier: 'Cookie: session_id', cookie: { sessionId } });
      refreshUserBadge();
      toast('Auth saved', 'Cookie session configured');
    });
  }

  function renderOAuth2() {
    setActiveTab('oauth2');

    ui.authPanel.innerHTML = `
      <p class="muted">Call <code>/oauth/token</code> to get an access token.</p>

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
        <button id="useToken" class="btn btn--secondary" type="button">Use as Bearer</button>
      </div>

      <pre class="code" id="tokenOutput" style="margin-top:12px;"></pre>
      <p class="muted" style="margin-top:8px;">Demo client: <strong>demo-client</strong> / <strong>demo-secret-789</strong></p>
    `;

    const grantType = ui.authPanel.querySelector('#grantType');
    const fields = ui.authPanel.querySelector('#oauthFields');
    const tokenOutput = ui.authPanel.querySelector('#tokenOutput');

    const state = { lastToken: null };

    function renderFields() {
      const gt = grantType.value;
      if (gt === 'client_credentials') {
        fields.innerHTML = `
          <label class="field"><span class="field__label">client_id</span><input id="clientId" class="input" value="demo-client" /></label>
          <label class="field"><span class="field__label">client_secret</span><input id="clientSecret" class="input" value="demo-secret-789" /></label>
        `;
      } else if (gt === 'password') {
        fields.innerHTML = `
          <label class="field"><span class="field__label">username</span><input id="username" class="input" value="demo" /></label>
          <label class="field"><span class="field__label">password</span><input id="password" class="input" type="password" value="password123" /></label>
        `;
      } else {
        fields.innerHTML = `
          <label class="field"><span class="field__label">refresh_token</span><input id="refreshToken" class="input" value="demo-refresh-token-789" /></label>
        `;
      }
    }

    renderFields();
    grantType.addEventListener('change', renderFields);

    ui.authPanel.querySelector('#getToken').addEventListener('click', async () => {
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
        toast('Token received', 'OAuth2 token succeeded');
      } catch (e) {
        tokenOutput.textContent = JSON.stringify({ error: e?.message, status: e?.status, data: e?.data }, null, 2);
        toast('Token failed', e?.message || 'Error');
      }
    });

    ui.authPanel.querySelector('#useToken').addEventListener('click', () => {
      const token = state.lastToken?.access_token;
      if (!token) {
        toast('No token', 'Get a token first');
        return;
      }
      setAuth({ type: 'bearer', identifier: 'Authorization: Bearer', bearerToken: token });
      refreshUserBadge();
      toast('Auth saved', 'Bearer token set from OAuth2 response');
    });
  }

  function onTabClick(tab) {
    const next = loadSettings();
    next.lastAuthTab = tab;
    saveSettings(next);
    if (tab === 'api_key') renderApiKey();
    else if (tab === 'bearer') renderBearer();
    else if (tab === 'basic') renderBasic();
    else if (tab === 'cookie') renderCookie();
    else renderOAuth2();
  }

  for (const b of ui.tabButtons) {
    b.addEventListener('click', () => onTabClick(b.dataset.tab));
  }

  // Response format radios
  const formatJson = outlet.querySelector('#formatJson');
  const formatXml = outlet.querySelector('#formatXml');
  
  if (settings.responseFormat === 'xml') {
    formatXml.checked = true;
  } else {
    formatJson.checked = true;
  }

  formatJson.addEventListener('change', () => {
    const next = loadSettings();
    next.responseFormat = 'json';
    saveSettings(next);
    toast('Format updated', 'Responses will be JSON');
  });

  formatXml.addEventListener('change', () => {
    const next = loadSettings();
    next.responseFormat = 'xml';
    saveSettings(next);
    toast('Format updated', 'Responses will be XML');
  });

  onTabClick(settings.lastAuthTab || settings.auth?.type || 'api_key');
}

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
