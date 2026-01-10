export function renderBills(outlet, ctx) {
  const { api, toast, navigate } = ctx;

  outlet.innerHTML = `
    <h1 class="card__title">My Bills</h1>
    <p class="muted">View pending bills, due dates, and manage auto-pay settings.</p>

    <div class="bills-stats" id="stats">
      <div class="stat-card">
        <span class="stat-card__value" id="stPending">—</span>
        <span class="stat-card__label">Pending</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value" id="stPaid">—</span>
        <span class="stat-card__label">Paid</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value" id="stOverdue">—</span>
        <span class="stat-card__label">Overdue</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value" id="stTotal">—</span>
        <span class="stat-card__label">Total Due</span>
      </div>
    </div>

    <div class="row" style="margin-bottom: 14px; gap: 12px; flex-wrap: wrap;">
      <label class="field" style="margin:0; min-width:200px; flex:1;">
        <span class="field__label">Search</span>
        <input id="q" class="input" placeholder="bill number or biller" />
      </label>

      <label class="field" style="margin:0; min-width:120px;">
        <span class="field__label">Status</span>
        <select id="status" class="input">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="processing">Processing</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>

      <label class="field" style="margin:0; min-width:120px;">
        <span class="field__label">Due After</span>
        <input id="dueFrom" class="input" type="date" />
      </label>

      <label class="field" style="margin:0; min-width:120px;">
        <span class="field__label">Due Before</span>
        <input id="dueTo" class="input" type="date" />
      </label>

      <button id="refresh" class="btn" type="button" style="align-self:flex-end;">Refresh</button>
    </div>

    <div class="table-wrap">
      <table class="table" id="table">
        <thead>
          <tr>
            <th>Bill #</th>
            <th>Biller</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Auto-Pay</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>

    <div class="row" style="justify-content: space-between; margin-top: 14px;">
      <div class="row">
        <button id="prev" class="btn btn--secondary" type="button">Prev</button>
        <button id="next" class="btn btn--secondary" type="button">Next</button>
      </div>
      <div class="muted" id="pageInfo"></div>
    </div>

    <!-- Payment Modal -->
    <div class="modal-overlay" id="paymentModal" data-testid="payment-modal" hidden>
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Make Payment</span>
          <button class="modal__close" id="closePaymentModal" data-testid="close-payment-modal">&times;</button>
        </div>
        <div class="modal__body">
          <div id="paymentBillInfo" class="kv" style="margin-bottom:16px;"></div>
          
          <label class="field">
            <span class="field__label">Select Payment Method *</span>
            <select id="payMethodSelect" data-testid="pay-method-select" class="input" required>
              <option value="">Loading payment methods...</option>
            </select>
          </label>
          
          <label class="field">
            <span class="field__label">Notes (optional)</span>
            <input type="text" id="paymentNotes" data-testid="payment-notes" class="input" placeholder="Add a note for this payment" />
          </label>
          
          <div id="paymentError" class="payment-error" style="display:none;"></div>
          <div id="paymentSuccess" class="payment-success" style="display:none;"></div>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--secondary" id="cancelPayment" data-testid="cancel-payment">Cancel</button>
          <button type="button" class="btn" id="confirmPayment" data-testid="confirm-payment">💳 Confirm Payment</button>
        </div>
      </div>
    </div>

    <style>
      .bills-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4); }
      .payment-error { background: var(--danger-light); color: var(--danger); padding: 12px; border-radius: 8px; margin-top: 12px; border: 1px solid var(--danger); }
      .payment-success { background: var(--success-light); color: var(--success); padding: 12px; border-radius: 8px; margin-top: 12px; border: 1px solid var(--success); font-weight: 600; }
    </style>
  `;

  const ui = {
    tbody: outlet.querySelector('#tbody'),
    q: outlet.querySelector('#q'),
    statusSel: outlet.querySelector('#status'),
    dueFrom: outlet.querySelector('#dueFrom'),
    dueTo: outlet.querySelector('#dueTo'),
    refresh: outlet.querySelector('#refresh'),
    prev: outlet.querySelector('#prev'),
    next: outlet.querySelector('#next'),
    pageInfo: outlet.querySelector('#pageInfo'),
    stPending: outlet.querySelector('#stPending'),
    stPaid: outlet.querySelector('#stPaid'),
    stOverdue: outlet.querySelector('#stOverdue'),
    stTotal: outlet.querySelector('#stTotal'),
    // Payment modal
    paymentModal: outlet.querySelector('#paymentModal'),
    closePaymentModal: outlet.querySelector('#closePaymentModal'),
    cancelPayment: outlet.querySelector('#cancelPayment'),
    confirmPayment: outlet.querySelector('#confirmPayment'),
    payMethodSelect: outlet.querySelector('#payMethodSelect'),
    paymentNotes: outlet.querySelector('#paymentNotes'),
    paymentBillInfo: outlet.querySelector('#paymentBillInfo'),
    paymentError: outlet.querySelector('#paymentError'),
    paymentSuccess: outlet.querySelector('#paymentSuccess'),
  };

  const state = { page: 1, limit: 10, currentBill: null };

  // Payment modal functions
  function openPaymentModal(bill) {
    state.currentBill = bill;
    ui.paymentError.style.display = 'none';
    ui.paymentSuccess.style.display = 'none';
    ui.paymentNotes.value = '';
    ui.confirmPayment.disabled = false;
    
    ui.paymentBillInfo.innerHTML = `
      <div class="kv__row"><span class="kv__k">Bill #</span><span class="kv__v">${escapeHtml(bill.billNumber || bill.id)}</span></div>
      <div class="kv__row"><span class="kv__k">Biller</span><span class="kv__v">${escapeHtml(bill.billerName || bill.billerId || '—')}</span></div>
      <div class="kv__row"><span class="kv__k">Amount</span><span class="kv__v" style="font-weight:700;font-size:18px;">₹${formatNum(bill.amount)}</span></div>
      <div class="kv__row"><span class="kv__k">Due Date</span><span class="kv__v">${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '—'}</span></div>
    `;
    
    // Load payment methods
    loadPaymentMethods();
    ui.paymentModal.hidden = false;
  }

  function closePaymentModalFn() {
    ui.paymentModal.hidden = true;
    state.currentBill = null;
  }

  async function loadPaymentMethods() {
    ui.payMethodSelect.innerHTML = '<option value="">Loading payment methods...</option>';
    try {
      const res = await api().get('/v1/payment-methods');
      const methods = res?.data || [];
      if (methods.length === 0) {
        ui.payMethodSelect.innerHTML = '<option value="">No payment methods found - add one first</option>';
      } else {
        ui.payMethodSelect.innerHTML = '<option value="">Select a payment method</option>' + 
          methods.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.nickname || m.type)} (${escapeHtml(m.type)})</option>`).join('');
      }
    } catch (e) {
      ui.payMethodSelect.innerHTML = '<option value="">Failed to load payment methods</option>';
    }
  }

  async function processPayment() {
    const methodId = ui.payMethodSelect.value;
    if (!methodId) {
      ui.paymentError.textContent = 'Please select a payment method';
      ui.paymentError.style.display = 'block';
      return;
    }
    
    ui.confirmPayment.disabled = true;
    ui.confirmPayment.textContent = 'Processing...';
    ui.paymentError.style.display = 'none';
    
    try {
      const payload = {
        billId: state.currentBill.id,
        paymentMethodId: methodId,
        amount: state.currentBill.amount,
        notes: ui.paymentNotes.value.trim() || undefined,
      };
      
      const res = await api().post('/v1/payments', payload);
      
      ui.paymentSuccess.innerHTML = `✅ Payment successful!<br>Payment ID: ${escapeHtml(res?.data?.id || 'N/A')}<br>Status: ${escapeHtml(res?.data?.status || 'completed')}`;
      ui.paymentSuccess.style.display = 'block';
      toast('Payment Success', `Bill ${state.currentBill.billNumber || state.currentBill.id} paid successfully!`);
      
      // Reload bills after short delay
      setTimeout(() => {
        closePaymentModalFn();
        load();
      }, 2000);
      
    } catch (e) {
      ui.paymentError.textContent = `Payment failed: ${e?.message || 'Unknown error'}`;
      ui.paymentError.style.display = 'block';
      ui.confirmPayment.disabled = false;
      ui.confirmPayment.textContent = '💳 Confirm Payment';
      toast('Payment Failed', e?.message || 'Unknown error');
    }
  }

  ui.closePaymentModal?.addEventListener('click', closePaymentModalFn);
  ui.cancelPayment?.addEventListener('click', closePaymentModalFn);
  ui.confirmPayment?.addEventListener('click', processPayment);
  ui.paymentModal?.addEventListener('click', (e) => {
    if (e.target === ui.paymentModal) closePaymentModalFn();
  });

  ui.refresh.addEventListener('click', () => { state.page = 1; load(); });
  ui.prev.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); load(); });
  ui.next.addEventListener('click', () => { state.page += 1; load(); });

  async function load() {
    ui.tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading…</td></tr>`;

    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));

    const q = ui.q.value.trim();
    if (q) params.set('search', q);

    const st = ui.statusSel.value;
    if (st) params.set('status', st);

    const dueFrom = ui.dueFrom.value;
    const dueTo = ui.dueTo.value;
    if (dueFrom) params.set('due_from', dueFrom);
    if (dueTo) params.set('due_to', dueTo);

    try {
      const res = await api().get(`/v1/bills?${params.toString()}`);
      const list = res?.data || [];
      state.billsList = list; // Store for payment modal access

      if (!list.length) {
        ui.tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;">No bills found.</td></tr>`;
      } else {
        ui.tbody.innerHTML = list.map(b => `
          <tr data-id="${b.id}">
            <td>${escapeHtml(b.billNumber || b.id)}</td>
            <td>${escapeHtml(b.billerName || b.billerId || '—')}</td>
            <td>₹${formatNum(b.amount)}</td>
            <td>${b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '—'}</td>
            <td><span class="badge ${statusBadge(b.status)}">${escapeHtml(b.status)}</span></td>
            <td>${autoPayToggle(b)}</td>
            <td>
              ${b.status === 'pending' ? `<button class="btn btn--secondary btn--sm pay-btn" data-testid="pay-btn-${b.id}" data-id="${b.id}">Pay</button>` : ''}
            </td>
          </tr>
        `).join('');

        // Wire auto-pay toggles
        for (const tog of ui.tbody.querySelectorAll('.autopay-toggle')) {
          tog.addEventListener('change', async (e) => {
            const billId = e.target.dataset.id;
            const val = e.target.checked;
            try {
              await api().patch(`/v1/bills/${billId}`, { autoPay: val });
              toast('Auto-Pay', val ? 'Enabled' : 'Disabled');
            } catch (err) {
              toast('Auto-Pay failed', err?.message);
              e.target.checked = !val;
            }
          });
        }

        // Wire pay buttons to open modal
        for (const btn of ui.tbody.querySelectorAll('.pay-btn')) {
          btn.addEventListener('click', () => {
            const billId = btn.dataset.id;
            const bill = state.billsList.find(b => b.id === billId);
            if (bill) {
              openPaymentModal(bill);
            }
          });
        }
      }

      // Stats
      const pending = list.filter(x => x.status === 'pending').length;
      const paid = list.filter(x => x.status === 'paid').length;
      const overdue = list.filter(x => x.status === 'overdue').length;
      const totalDue = list.reduce((s, x) => s + (x.status === 'pending' || x.status === 'overdue' ? (x.amount || 0) : 0), 0);

      ui.stPending.textContent = pending;
      ui.stPaid.textContent = paid;
      ui.stOverdue.textContent = overdue;
      ui.stTotal.textContent = `₹${formatNum(totalDue)}`;

      const p = res?.pagination;
      ui.pageInfo.textContent = p ? `Page ${p.page} of ${p.totalPages} • ${p.total} bills` : `Page ${state.page}`;
      ui.prev.disabled = state.page <= 1;
      ui.next.disabled = p ? state.page >= p.totalPages : false;

      toast('Bills loaded', `${list.length} bill(s)`);
    } catch (e) {
      ui.tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;">Failed: ${escapeHtml(e?.message)}</td></tr>`;
      toast('Bills failed', e?.message || 'Error');
    }
  }

  load();
}

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function formatNum(n) {
  return Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusBadge(s) {
  const map = { pending: '', paid: 'badge--ok', overdue: 'badge--error', processing: '', cancelled: 'badge--error' };
  return map[s] || '';
}

function autoPayToggle(b) {
  const checked = b.autoPay ? 'checked' : '';
  return `
    <label class="toggle" style="margin:0;">
      <input type="checkbox" class="autopay-toggle" data-id="${b.id}" ${checked} />
      <span class="toggle__slider"></span>
    </label>
  `;
}
