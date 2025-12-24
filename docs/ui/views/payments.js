export function renderPayments(outlet, ctx) {
  const { api, toast } = ctx;

  outlet.innerHTML = `
    <h1 class="card__title">Payment History</h1>
    <p class="muted">View all transactions, refunds, and payment status.</p>

    <div class="row" style="margin-bottom: 14px; gap: 12px; flex-wrap: wrap;">
      <label class="field" style="margin:0; min-width:200px; flex:1;">
        <span class="field__label">Search</span>
        <input id="q" class="input" placeholder="transaction ref or user ID" />
      </label>

      <label class="field" style="margin:0; min-width:120px;">
        <span class="field__label">Status</span>
        <select id="status" class="input">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>

      <label class="field" style="margin:0; min-width:120px;">
        <span class="field__label">From Date</span>
        <input id="dateFrom" class="input" type="date" />
      </label>

      <label class="field" style="margin:0; min-width:120px;">
        <span class="field__label">To Date</span>
        <input id="dateTo" class="input" type="date" />
      </label>

      <button id="refresh" class="btn" type="button" style="align-self:flex-end;">Refresh</button>
    </div>

    <div class="table-wrap">
      <table class="table" id="table">
        <thead>
          <tr>
            <th>Txn Ref</th>
            <th>Bill</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Date</th>
            <th>Status</th>
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

    <!-- Refund Modal -->
    <div class="modal-overlay" id="refundOverlay" hidden>
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Request Refund</span>
          <button class="modal__close" id="closeRefund">&times;</button>
        </div>
        <div class="modal__body">
          <p>Transaction: <strong id="refTxnId"></strong></p>
          <p>Amount: <strong id="refAmount"></strong></p>
          <label class="field">
            <span class="field__label">Reason (optional)</span>
            <textarea id="refReason" class="input" rows="3" placeholder="Why are you requesting a refund?"></textarea>
          </label>
        </div>
        <div class="modal__footer">
          <button class="btn btn--secondary" id="cancelRefund">Cancel</button>
          <button class="btn btn--danger" id="confirmRefund">Confirm Refund</button>
        </div>
      </div>
    </div>

    <!-- Cancel Modal -->
    <div class="modal-overlay" id="cancelOverlay" hidden>
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title">Cancel Payment</span>
          <button class="modal__close" id="closeCancel">&times;</button>
        </div>
        <div class="modal__body">
          <p>Are you sure you want to cancel payment <strong id="cancelTxnId"></strong>?</p>
        </div>
        <div class="modal__footer">
          <button class="btn btn--secondary" id="cancelCancelBtn">No, Keep It</button>
          <button class="btn btn--danger" id="confirmCancelBtn">Yes, Cancel Payment</button>
        </div>
      </div>
    </div>
  `;

  const ui = {
    tbody: outlet.querySelector('#tbody'),
    q: outlet.querySelector('#q'),
    statusSel: outlet.querySelector('#status'),
    dateFrom: outlet.querySelector('#dateFrom'),
    dateTo: outlet.querySelector('#dateTo'),
    refresh: outlet.querySelector('#refresh'),
    prev: outlet.querySelector('#prev'),
    next: outlet.querySelector('#next'),
    pageInfo: outlet.querySelector('#pageInfo'),
    // Refund modal
    refundOverlay: outlet.querySelector('#refundOverlay'),
    closeRefund: outlet.querySelector('#closeRefund'),
    cancelRefund: outlet.querySelector('#cancelRefund'),
    confirmRefund: outlet.querySelector('#confirmRefund'),
    refTxnId: outlet.querySelector('#refTxnId'),
    refAmount: outlet.querySelector('#refAmount'),
    refReason: outlet.querySelector('#refReason'),
    // Cancel modal
    cancelOverlay: outlet.querySelector('#cancelOverlay'),
    closeCancel: outlet.querySelector('#closeCancel'),
    cancelCancelBtn: outlet.querySelector('#cancelCancelBtn'),
    confirmCancelBtn: outlet.querySelector('#confirmCancelBtn'),
    cancelTxnId: outlet.querySelector('#cancelTxnId'),
  };

  const state = { page: 1, limit: 10, activePaymentId: null };

  ui.refresh.addEventListener('click', () => { state.page = 1; load(); });
  ui.prev.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); load(); });
  ui.next.addEventListener('click', () => { state.page += 1; load(); });

  // Refund modal wiring
  function openRefund(p) {
    state.activePaymentId = p.id;
    ui.refTxnId.textContent = p.transactionRef || p.id;
    ui.refAmount.textContent = `₹${formatNum(p.amount)}`;
    ui.refReason.value = '';
    ui.refundOverlay.hidden = false;
  }
  function closeRefundModal() {
    ui.refundOverlay.hidden = true;
    state.activePaymentId = null;
  }
  ui.closeRefund.addEventListener('click', closeRefundModal);
  ui.cancelRefund.addEventListener('click', closeRefundModal);
  ui.confirmRefund.addEventListener('click', async () => {
    if (!state.activePaymentId) return;
    try {
      await api().post(`/v1/payments/${state.activePaymentId}/refund`, { reason: ui.refReason.value.trim() || undefined });
      toast('Refund', 'Refund requested successfully');
      closeRefundModal();
      load();
    } catch (e) {
      toast('Refund failed', e?.message);
    }
  });

  // Cancel modal wiring
  function openCancel(p) {
    state.activePaymentId = p.id;
    ui.cancelTxnId.textContent = p.transactionRef || p.id;
    ui.cancelOverlay.hidden = false;
  }
  function closeCancelModal() {
    ui.cancelOverlay.hidden = true;
    state.activePaymentId = null;
  }
  ui.closeCancel.addEventListener('click', closeCancelModal);
  ui.cancelCancelBtn.addEventListener('click', closeCancelModal);
  ui.confirmCancelBtn.addEventListener('click', async () => {
    if (!state.activePaymentId) return;
    try {
      await api().post(`/v1/payments/${state.activePaymentId}/cancel`, {});
      toast('Cancelled', 'Payment cancelled');
      closeCancelModal();
      load();
    } catch (e) {
      toast('Cancel failed', e?.message);
    }
  });

  async function load() {
    ui.tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading…</td></tr>`;

    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));

    const q = ui.q.value.trim();
    if (q) params.set('search', q);

    const st = ui.statusSel.value;
    if (st) params.set('status', st);

    const from = ui.dateFrom.value;
    const to = ui.dateTo.value;
    if (from) params.set('from_date', from);
    if (to) params.set('to_date', to);

    try {
      const res = await api().get(`/v1/payments?${params.toString()}`);
      const list = res?.data || [];

      if (!list.length) {
        ui.tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;">No payments found.</td></tr>`;
      } else {
        ui.tbody.innerHTML = list.map(p => `
          <tr data-id="${p.id}">
            <td>${escapeHtml(p.transactionRef || p.id)}</td>
            <td>${escapeHtml(p.billId || '—')}</td>
            <td>₹${formatNum(p.amount)}</td>
            <td>${escapeHtml(p.paymentMethodType || '—')}</td>
            <td>${p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
            <td><span class="badge ${statusBadge(p.status)}">${escapeHtml(p.status)}</span></td>
            <td class="actions-cell">
              ${p.status === 'pending' ? `<button class="btn btn--secondary btn--sm cancel-btn" data-idx="${list.indexOf(p)}">Cancel</button>` : ''}
              ${p.status === 'completed' ? `<button class="btn btn--secondary btn--sm refund-btn" data-idx="${list.indexOf(p)}">Refund</button>` : ''}
            </td>
          </tr>
        `).join('');

        // Wire buttons
        for (const btn of ui.tbody.querySelectorAll('.refund-btn')) {
          btn.addEventListener('click', () => openRefund(list[+btn.dataset.idx]));
        }
        for (const btn of ui.tbody.querySelectorAll('.cancel-btn')) {
          btn.addEventListener('click', () => openCancel(list[+btn.dataset.idx]));
        }
      }

      const p = res?.pagination;
      ui.pageInfo.textContent = p ? `Page ${p.page} of ${p.totalPages} • ${p.total} payments` : `Page ${state.page}`;
      ui.prev.disabled = state.page <= 1;
      ui.next.disabled = p ? state.page >= p.totalPages : false;

      toast('Payments loaded', `${list.length} payment(s)`);
    } catch (e) {
      ui.tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;">Failed: ${escapeHtml(e?.message)}</td></tr>`;
      toast('Payments failed', e?.message || 'Error');
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
  const map = { pending: '', completed: 'badge--ok', failed: 'badge--error', refunded: '', cancelled: 'badge--error' };
  return map[s] || '';
}
