export function renderDashboard(outlet, ctx) {
  const { api, toast, navigate } = ctx;

  outlet.innerHTML = `
    <h1 class="card__title">Dashboard</h1>
    <p class="muted">Welcome to BillPay. View your summary and take quick actions below.</p>

    <div class="stat-grid" id="stats">
      <div class="stat-card">
        <div class="stat-card__label">Pending Bills</div>
        <div class="stat-card__value" id="statPending">—</div>
        <div class="stat-card__sub">due soon</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Total Due</div>
        <div class="stat-card__value" id="statDue">—</div>
        <div class="stat-card__sub">INR</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Payments This Month</div>
        <div class="stat-card__value" id="statPayments">—</div>
        <div class="stat-card__sub">transactions</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Payment Methods</div>
        <div class="stat-card__value" id="statMethods">—</div>
        <div class="stat-card__sub">active</div>
      </div>
    </div>

    <h2 class="card__title" style="font-size:16px; margin-top: var(--space-4);">Quick Actions</h2>

    <div class="action-grid">
      <a href="#/bills" class="action-card">
        <div class="action-card__icon">📄</div>
        <div class="action-card__title">View & Pay Bills</div>
        <div class="action-card__desc">See pending bills and make payments in a few clicks.</div>
      </a>

      <a href="#/payments" class="action-card">
        <div class="action-card__icon">💸</div>
        <div class="action-card__title">Payment History</div>
        <div class="action-card__desc">Review past transactions, refund or cancel if needed.</div>
      </a>

      <a href="#/payment-methods" class="action-card">
        <div class="action-card__icon">💳</div>
        <div class="action-card__title">Manage Payment Methods</div>
        <div class="action-card__desc">Add UPI, cards, bank accounts or wallets.</div>
      </a>

      <a href="#/billers" class="action-card">
        <div class="action-card__icon">🏢</div>
        <div class="action-card__title">Browse Billers</div>
        <div class="action-card__desc">Find electricity, telecom, water and other service providers.</div>
      </a>

      <a href="#/users" class="action-card">
        <div class="action-card__icon">👤</div>
        <div class="action-card__title">Manage Users</div>
        <div class="action-card__desc">Create, edit, delete users and verify KYC status.</div>
      </a>

      <a href="#/settings" class="action-card">
        <div class="action-card__icon">⚙️</div>
        <div class="action-card__title">Settings & Auth</div>
        <div class="action-card__desc">Configure API connection and authentication method.</div>
      </a>
    </div>

    <div class="card" style="margin-top: var(--space-4);">
      <h2 class="card__title" style="font-size:16px;">API Health</h2>
      <div class="row">
        <button id="pingHealth" class="btn btn--secondary" type="button">Ping /health</button>
        <span class="muted" id="healthStatus"></span>
      </div>
      <pre class="code" id="healthOutput" style="margin-top:12px; display:none;"></pre>
    </div>
  `;

  const healthBtn = outlet.querySelector('#pingHealth');
  const healthStatus = outlet.querySelector('#healthStatus');
  const healthOutput = outlet.querySelector('#healthOutput');

  healthBtn.addEventListener('click', async () => {
    healthStatus.innerHTML = `<span class="spinner"></span> Checking…`;
    healthOutput.style.display = 'none';
    try {
      const res = await api().get('/health');
      healthStatus.textContent = '✓ Healthy';
      healthOutput.textContent = JSON.stringify(res, null, 2);
      healthOutput.style.display = 'block';
      toast('Health OK', 'API is reachable');
    } catch (e) {
      healthStatus.textContent = '✗ Unreachable';
      healthOutput.textContent = JSON.stringify({ error: e?.message }, null, 2);
      healthOutput.style.display = 'block';
      toast('Health failed', e?.message || 'Error');
    }
  });

  loadStats();

  async function loadStats() {
    try {
      const [billsRes, paymentsRes, methodsRes] = await Promise.all([
        api().get('/v1/bills?status=pending&limit=100').catch(() => null),
        api().get('/v1/payments?limit=100').catch(() => null),
        api().get('/v1/payment-methods?limit=100').catch(() => null),
      ]);

      const bills = billsRes?.data || [];
      const payments = paymentsRes?.data || [];
      const methods = methodsRes?.data || [];

      outlet.querySelector('#statPending').textContent = bills.length;

      const totalDue = bills.reduce((sum, b) => sum + (b.amount?.value || 0), 0);
      outlet.querySelector('#statDue').textContent = totalDue.toLocaleString();

      outlet.querySelector('#statPayments').textContent = payments.length;
      outlet.querySelector('#statMethods').textContent = methods.length;
    } catch {
      // ignore
    }
  }
}
