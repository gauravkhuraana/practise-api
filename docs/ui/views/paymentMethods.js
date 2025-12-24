export function renderPaymentMethods(outlet, ctx) {
  const { api, toast } = ctx;

  outlet.innerHTML = `
    <h1 class="card__title">Payment Methods</h1>
    <p class="muted">Manage your saved payment methods. Set a default for quick checkout.</p>

    <button id="addMethod" class="btn" style="margin-bottom: var(--space-3);">+ Add Payment Method</button>

    <div id="methodGrid" class="method-grid"></div>

    <!-- Add/Edit Modal -->
    <div class="modal-overlay" id="methodOverlay" hidden>
      <div class="modal">
        <div class="modal__header">
          <span class="modal__title" id="modalTitle">Add Payment Method</span>
          <button class="modal__close" id="closeModal">&times;</button>
        </div>
        <form id="methodForm">
          <div class="modal__body">
            <label class="field">
              <span class="field__label">Type</span>
              <select id="pmType" class="input" required>
                <option value="">Select type</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_account">Bank Account</option>
                <option value="wallet">Wallet</option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Nickname</span>
              <input id="pmNickname" class="input" placeholder="e.g. Personal Card" />
            </label>

            <!-- UPI fields -->
            <div id="upiFields" class="type-fields" hidden>
              <label class="field">
                <span class="field__label">UPI ID</span>
                <input id="pmUpiId" class="input" placeholder="yourname@upi" />
              </label>
            </div>

            <!-- Card fields -->
            <div id="cardFields" class="type-fields" hidden>
              <label class="field">
                <span class="field__label">Card Number</span>
                <input id="pmCardNumber" class="input" placeholder="1234 5678 9012 3456" maxlength="19" />
              </label>
              <div class="row" style="gap: 12px;">
                <label class="field" style="flex:1;">
                  <span class="field__label">Expiry (MM/YY)</span>
                  <input id="pmExpiry" class="input" placeholder="MM/YY" maxlength="5" />
                </label>
                <label class="field" style="flex:1;">
                  <span class="field__label">Name on Card</span>
                  <input id="pmCardName" class="input" placeholder="JOHN DOE" />
                </label>
              </div>
            </div>

            <!-- Bank fields -->
            <div id="bankFields" class="type-fields" hidden>
              <label class="field">
                <span class="field__label">Account Number</span>
                <input id="pmAcctNo" class="input" placeholder="123456789012" />
              </label>
              <label class="field">
                <span class="field__label">IFSC Code</span>
                <input id="pmIfsc" class="input" placeholder="SBIN0001234" maxlength="11" style="text-transform:uppercase;" />
              </label>
              <label class="field">
                <span class="field__label">Account Holder Name</span>
                <input id="pmAcctName" class="input" placeholder="John Doe" />
              </label>
            </div>

            <!-- Wallet fields -->
            <div id="walletFields" class="type-fields" hidden>
              <label class="field">
                <span class="field__label">Wallet Provider</span>
                <select id="pmWalletProvider" class="input">
                  <option value="paytm">Paytm</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="googlepay">Google Pay</option>
                  <option value="amazonpay">Amazon Pay</option>
                </select>
              </label>
              <label class="field">
                <span class="field__label">Mobile Number</span>
                <input id="pmWalletMobile" class="input" placeholder="9876543210" maxlength="10" />
              </label>
            </div>

            <label class="field" style="flex-direction:row; align-items:center; gap:8px;">
              <input type="checkbox" id="pmIsDefault" />
              <span class="field__label" style="margin:0;">Set as default</span>
            </label>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" id="cancelMethod">Cancel</button>
            <button type="submit" class="btn" id="saveMethod">Save</button>
          </div>
        </form>
      </div>
    </div>

    <style>
      .method-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3); }
      .method-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-3); display: flex; flex-direction: column; gap: 8px; position: relative; }
      .method-card--default { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
      .method-card__type { font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 600; }
      .method-card__name { font-weight: 700; font-size: 15px; }
      .method-card__detail { font-size: 13px; color: var(--muted); }
      .method-card__actions { display: flex; gap: 8px; margin-top: 8px; }
      .method-card__default-badge { position: absolute; top: 8px; right: 8px; font-size: 10px; background: var(--primary-light); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-weight: 600; }
      .type-fields { display: flex; flex-direction: column; gap: 8px; }
    </style>
  `;

  const ui = {
    grid: outlet.querySelector('#methodGrid'),
    addBtn: outlet.querySelector('#addMethod'),
    // Modal
    overlay: outlet.querySelector('#methodOverlay'),
    closeModal: outlet.querySelector('#closeModal'),
    cancelMethod: outlet.querySelector('#cancelMethod'),
    form: outlet.querySelector('#methodForm'),
    modalTitle: outlet.querySelector('#modalTitle'),
    // Fields
    pmType: outlet.querySelector('#pmType'),
    pmNickname: outlet.querySelector('#pmNickname'),
    pmIsDefault: outlet.querySelector('#pmIsDefault'),
    // UPI
    upiFields: outlet.querySelector('#upiFields'),
    pmUpiId: outlet.querySelector('#pmUpiId'),
    // Card
    cardFields: outlet.querySelector('#cardFields'),
    pmCardNumber: outlet.querySelector('#pmCardNumber'),
    pmExpiry: outlet.querySelector('#pmExpiry'),
    pmCardName: outlet.querySelector('#pmCardName'),
    // Bank
    bankFields: outlet.querySelector('#bankFields'),
    pmAcctNo: outlet.querySelector('#pmAcctNo'),
    pmIfsc: outlet.querySelector('#pmIfsc'),
    pmAcctName: outlet.querySelector('#pmAcctName'),
    // Wallet
    walletFields: outlet.querySelector('#walletFields'),
    pmWalletProvider: outlet.querySelector('#pmWalletProvider'),
    pmWalletMobile: outlet.querySelector('#pmWalletMobile'),
  };

  const state = { methods: [], editId: null };

  // Toggle type-specific fields
  ui.pmType.addEventListener('change', () => {
    const t = ui.pmType.value;
    ui.upiFields.hidden = t !== 'upi';
    ui.cardFields.hidden = t !== 'card';
    ui.bankFields.hidden = t !== 'bank_account';
    ui.walletFields.hidden = t !== 'wallet';
  });

  function openModal(edit = null) {
    state.editId = edit?.id || null;
    ui.modalTitle.textContent = edit ? 'Edit Payment Method' : 'Add Payment Method';
    ui.form.reset();
    
    // Hide all type fields
    for (const f of outlet.querySelectorAll('.type-fields')) f.hidden = true;

    if (edit) {
      ui.pmType.value = edit.type || '';
      ui.pmNickname.value = edit.nickname || '';
      ui.pmIsDefault.checked = !!edit.isDefault;

      // Populate type-specific
      if (edit.type === 'upi') {
        ui.upiFields.hidden = false;
        ui.pmUpiId.value = edit.details?.upiId || '';
      } else if (edit.type === 'card') {
        ui.cardFields.hidden = false;
        ui.pmCardNumber.value = edit.details?.maskedNumber || edit.details?.cardNumber || '';
        ui.pmExpiry.value = edit.details?.expiry || '';
        ui.pmCardName.value = edit.details?.nameOnCard || '';
      } else if (edit.type === 'bank_account') {
        ui.bankFields.hidden = false;
        ui.pmAcctNo.value = edit.details?.accountNumber || '';
        ui.pmIfsc.value = edit.details?.ifsc || '';
        ui.pmAcctName.value = edit.details?.accountHolderName || '';
      } else if (edit.type === 'wallet') {
        ui.walletFields.hidden = false;
        ui.pmWalletProvider.value = edit.details?.provider || 'paytm';
        ui.pmWalletMobile.value = edit.details?.mobileNumber || '';
      }
    }

    ui.overlay.hidden = false;
  }

  function closeModal() {
    ui.overlay.hidden = true;
    state.editId = null;
  }

  ui.addBtn.addEventListener('click', () => openModal());
  ui.closeModal.addEventListener('click', closeModal);
  ui.cancelMethod.addEventListener('click', closeModal);

  ui.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = ui.pmType.value;
    if (!type) {
      toast('Validation', 'Please select a type');
      return;
    }

    const body = {
      type,
      nickname: ui.pmNickname.value.trim() || undefined,
      isDefault: ui.pmIsDefault.checked,
      details: {},
    };

    if (type === 'upi') {
      body.details.upiId = ui.pmUpiId.value.trim();
    } else if (type === 'card') {
      body.details.cardNumber = ui.pmCardNumber.value.replace(/\s/g, '');
      body.details.expiry = ui.pmExpiry.value;
      body.details.nameOnCard = ui.pmCardName.value.trim();
    } else if (type === 'bank_account') {
      body.details.accountNumber = ui.pmAcctNo.value.trim();
      body.details.ifsc = ui.pmIfsc.value.toUpperCase().trim();
      body.details.accountHolderName = ui.pmAcctName.value.trim();
    } else if (type === 'wallet') {
      body.details.provider = ui.pmWalletProvider.value;
      body.details.mobileNumber = ui.pmWalletMobile.value.trim();
    }

    try {
      if (state.editId) {
        await api().put(`/v1/payment-methods/${state.editId}`, body);
        toast('Updated', 'Payment method updated');
      } else {
        await api().post('/v1/payment-methods', body);
        toast('Added', 'Payment method added');
      }
      closeModal();
      load();
    } catch (err) {
      toast('Error', err?.message);
    }
  });

  async function setDefault(id) {
    try {
      await api().patch(`/v1/payment-methods/${id}/default`, {});
      toast('Default', 'Default payment method set');
      load();
    } catch (err) {
      toast('Error', err?.message);
    }
  }

  async function deleteMethod(id) {
    if (!confirm('Delete this payment method?')) return;
    try {
      await api().delete(`/v1/payment-methods/${id}`);
      toast('Deleted', 'Payment method removed');
      load();
    } catch (err) {
      toast('Error', err?.message);
    }
  }

  async function load() {
    ui.grid.innerHTML = `<p class="muted">Loading…</p>`;

    try {
      const res = await api().get('/v1/payment-methods');
      const list = res?.data || [];
      state.methods = list;

      if (!list.length) {
        ui.grid.innerHTML = `<p class="muted">No payment methods. Click "+ Add Payment Method" to add one.</p>`;
        return;
      }

      ui.grid.innerHTML = list.map((m, i) => `
        <div class="method-card ${m.isDefault ? 'method-card--default' : ''}">
          ${m.isDefault ? '<span class="method-card__default-badge">Default</span>' : ''}
          <div class="method-card__type">${escapeHtml(typeLabel(m.type))}</div>
          <div class="method-card__name">${escapeHtml(m.nickname || m.type)}</div>
          <div class="method-card__detail">${escapeHtml(detailSummary(m))}</div>
          <div class="method-card__actions">
            ${!m.isDefault ? `<button class="btn btn--secondary btn--sm set-default-btn" data-idx="${i}">Set Default</button>` : ''}
            <button class="btn btn--secondary btn--sm edit-btn" data-idx="${i}">Edit</button>
            <button class="btn btn--danger btn--sm delete-btn" data-idx="${i}">Delete</button>
          </div>
        </div>
      `).join('');

      // Wire buttons
      for (const btn of ui.grid.querySelectorAll('.set-default-btn')) {
        btn.addEventListener('click', () => setDefault(list[+btn.dataset.idx].id));
      }
      for (const btn of ui.grid.querySelectorAll('.edit-btn')) {
        btn.addEventListener('click', () => openModal(list[+btn.dataset.idx]));
      }
      for (const btn of ui.grid.querySelectorAll('.delete-btn')) {
        btn.addEventListener('click', () => deleteMethod(list[+btn.dataset.idx].id));
      }

      toast('Loaded', `${list.length} payment method(s)`);
    } catch (err) {
      ui.grid.innerHTML = `<p class="muted">Failed: ${escapeHtml(err?.message)}</p>`;
      toast('Error', err?.message);
    }
  }

  load();
}

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function typeLabel(t) {
  return { upi: 'UPI', card: 'Credit/Debit Card', bank_account: 'Bank Account', wallet: 'Wallet' }[t] || t;
}

function detailSummary(m) {
  const d = m.details || {};
  if (m.type === 'upi') return d.upiId || '—';
  if (m.type === 'card') return d.maskedNumber || `••••${(d.cardNumber || '').slice(-4)}` || '—';
  if (m.type === 'bank_account') return `${d.ifsc || ''} ••••${(d.accountNumber || '').slice(-4)}`;
  if (m.type === 'wallet') return `${d.provider || ''} ${d.mobileNumber || ''}`.trim() || '—';
  return '—';
}
