const DEFAULT_LIMIT = 10;

export function renderUsers(outlet, { api, toast }) {
  outlet.innerHTML = `
    <h1 class="card__title">Users</h1>
    <p class="muted">Search, filter, create/edit, delete, and verify KYC.</p>

    <div class="row" style="margin: 12px 0 16px 0;">
      <label class="field" style="margin:0; min-width: 260px; flex: 1;">
        <span class="field__label">Search</span>
        <input id="q" class="input" placeholder="email, name, phone" />
      </label>

      <label class="field" style="margin:0; min-width: 220px;">
        <span class="field__label">KYC status</span>
        <select id="kyc" class="input">
          <option value="">All</option>
          <option value="pending">pending</option>
          <option value="verified">verified</option>
          <option value="rejected">rejected</option>
        </select>
      </label>

      <label class="field" style="margin:0; min-width: 160px;">
        <span class="field__label">Limit</span>
        <select id="limit" class="input">
          <option value="5">5</option>
          <option value="10" selected>10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </label>

      <div class="row" style="margin-left:auto;">
        <button id="refresh" class="btn" type="button" data-testid="refresh-users">Refresh</button>
        <button id="exportCsv" class="btn btn--secondary" type="button" data-testid="export-csv">Export CSV</button>
        <button id="exportPdf" class="btn btn--secondary" type="button" data-testid="export-pdf">Export PDF</button>
      </div>
    </div>

    <div class="row" style="margin-bottom: 14px;">
      <button id="newUser" class="btn" type="button" data-testid="create-user-btn">Create user</button>
      <span class="muted" id="status"></span>
    </div>

    <div class="table-wrap" aria-label="Users table">
      <table>
        <thead>
          <tr>
            <th style="min-width:140px;">ID</th>
            <th style="min-width:220px;">Email</th>
            <th style="min-width:160px;">Name</th>
            <th style="min-width:140px;">Phone</th>
            <th style="min-width:120px;">KYC</th>
            <th style="min-width:170px;">Created</th>
            <th style="min-width:240px;">Actions</th>
          </tr>
        </thead>
        <tbody id="rows">
          <tr><td colspan="7" class="muted">Loading…</td></tr>
        </tbody>
      </table>
    </div>

    <div class="row" style="justify-content: space-between; margin-top: 14px;">
      <div class="row">
        <button id="prev" class="btn btn--secondary" type="button">Prev</button>
        <button id="next" class="btn btn--secondary" type="button">Next</button>
      </div>
      <div class="muted" id="pageInfo"></div>
    </div>

    <div class="modal-backdrop" id="modal" role="dialog" aria-modal="true" aria-label="User modal">
      <div class="modal">
        <h2 class="modal__title" id="modalTitle">User</h2>
        <div id="modalBody"></div>
      </div>
    </div>
  `;

  const ui = {
    q: outlet.querySelector('#q'),
    kyc: outlet.querySelector('#kyc'),
    limit: outlet.querySelector('#limit'),
    refresh: outlet.querySelector('#refresh'),
    exportCsv: outlet.querySelector('#exportCsv'),
    exportPdf: outlet.querySelector('#exportPdf'),
    newUser: outlet.querySelector('#newUser'),
    rows: outlet.querySelector('#rows'),
    prev: outlet.querySelector('#prev'),
    next: outlet.querySelector('#next'),
    status: outlet.querySelector('#status'),
    pageInfo: outlet.querySelector('#pageInfo'),
    modal: outlet.querySelector('#modal'),
    modalTitle: outlet.querySelector('#modalTitle'),
    modalBody: outlet.querySelector('#modalBody'),
  };

  const state = {
    page: 1,
    limit: DEFAULT_LIMIT,
    lastData: [],
    lastMeta: null,
  };

  function openModal(title, bodyHtml) {
    ui.modalTitle.textContent = title;
    ui.modalBody.innerHTML = bodyHtml;
    ui.modal.style.display = 'flex';
    ui.modal.addEventListener('click', onBackdropClick);
    window.addEventListener('keydown', onEsc);
  }

  function closeModal() {
    ui.modal.style.display = 'none';
    ui.modalBody.innerHTML = '';
    ui.modal.removeEventListener('click', onBackdropClick);
    window.removeEventListener('keydown', onEsc);
  }

  function onBackdropClick(e) {
    if (e.target === ui.modal) closeModal();
  }

  function onEsc(e) {
    if (e.key === 'Escape') closeModal();
  }

  function badgeForKyc(kycStatus) {
    const s = String(kycStatus || 'pending');
    if (s === 'verified') return `<span class="badge badge--ok">verified</span>`;
    if (s === 'rejected') return `<span class="badge badge--danger">rejected</span>`;
    return `<span class="badge badge--warn">pending</span>`;
  }

  function fmtDate(d) {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  }

  function setLoading(isLoading) {
    ui.status.innerHTML = isLoading ? `<span class="spinner" aria-label="Loading"></span> Loading…` : '';
  }

  async function load() {
    setLoading(true);
    ui.rows.innerHTML = `<tr><td colspan="7" class="muted">Loading…</td></tr>`;

    try {
      const limit = Number(ui.limit.value || state.limit);
      state.limit = limit;

      const params = new URLSearchParams();
      params.set('page', String(state.page));
      params.set('limit', String(limit));
      const q = ui.q.value.trim();
      if (q) params.set('search', q);
      const kyc = ui.kyc.value;
      if (kyc) params.set('kyc_status', kyc);

      const res = await api().get(`/v1/users?${params.toString()}`);
      const list = res?.data || [];
      state.lastData = list;
      state.lastMeta = res?.meta || null;

      if (!Array.isArray(list) || list.length === 0) {
        ui.rows.innerHTML = `<tr><td colspan="7" class="muted">No users found</td></tr>`;
      } else {
        ui.rows.innerHTML = list.map(u => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
          return `
            <tr data-testid="user-row-${escapeHtml(u.id)}">
              <td>${escapeHtml(u.id || '')}</td>
              <td>${escapeHtml(u.email || '')}</td>
              <td>${escapeHtml(name)}</td>
              <td>${escapeHtml(u.phone || '—')}</td>
              <td>${badgeForKyc(u.kycStatus)}</td>
              <td>${escapeHtml(fmtDate(u.createdAt))}</td>
              <td>
                <div class="row">
                  <button class="btn btn--secondary" type="button" data-action="edit" data-id="${escapeHtml(u.id)}" data-testid="edit-user-${escapeHtml(u.id)}">Edit</button>
                  <button class="btn btn--secondary" type="button" data-action="kyc" data-id="${escapeHtml(u.id)}" data-testid="verify-kyc-${escapeHtml(u.id)}">Verify KYC</button>
                  <button class="btn btn--danger" type="button" data-action="delete" data-id="${escapeHtml(u.id)}" data-testid="delete-user-${escapeHtml(u.id)}">Delete</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

      const p = res?.pagination;
      ui.pageInfo.textContent = p
        ? `Page ${p.page} of ${p.totalPages} • total ${p.total}`
        : `Page ${state.page}`;

      ui.prev.disabled = state.page <= 1;
      ui.next.disabled = p ? state.page >= p.totalPages : false;

      toast?.('Users loaded', `Fetched ${Array.isArray(list) ? list.length : 0} user(s)`);
    } catch (e) {
      ui.rows.innerHTML = `<tr><td colspan="7" class="muted">Failed to load users: ${escapeHtml(e?.message || 'Error')}</td></tr>`;
      ui.pageInfo.textContent = '';
      toast?.('Users failed', e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function userFormHtml(user = {}) {
    const isEdit = Boolean(user?.id);
    return `
      <form id="userForm" data-testid="user-form">
        <div class="row" style="justify-content: space-between; margin-bottom: 10px;">
          <div class="muted">${isEdit ? 'Edit user' : 'Create user'}</div>
          <button class="btn btn--secondary" type="button" id="closeModal" data-testid="close-modal">Close</button>
        </div>

        <label class="field">
          <span class="field__label">Email *</span>
          <input class="input" name="email" data-testid="email-input" value="${escapeHtml(user.email || '')}" required />
        </label>

        <div class="row">
          <label class="field" style="margin:0; flex:1; min-width:220px;">
            <span class="field__label">First name *</span>
            <input class="input" name="firstName" data-testid="firstname-input" value="${escapeHtml(user.firstName || '')}" required />
          </label>
          <label class="field" style="margin:0; flex:1; min-width:220px;">
            <span class="field__label">Last name</span>
            <input class="input" name="lastName" data-testid="lastname-input" value="${escapeHtml(user.lastName || '')}" />
          </label>
        </div>

        <label class="field">
          <span class="field__label">Phone</span>
          <input class="input" name="phone" data-testid="phone-input" value="${escapeHtml(user.phone || '')}" placeholder="+919876543210" />
        </label>

        <label class="field">
          <span class="field__label">KYC status</span>
          <select class="input" name="kycStatus" data-testid="kyc-status-select">
            <option value="pending" ${user.kycStatus === 'pending' || !user.kycStatus ? 'selected' : ''}>pending</option>
            <option value="verified" ${user.kycStatus === 'verified' ? 'selected' : ''}>verified</option>
            <option value="rejected" ${user.kycStatus === 'rejected' ? 'selected' : ''}>rejected</option>
          </select>
        </label>

        <h3 class="card__title" style="font-size:14px; margin-top: 10px;">Address</h3>

        <label class="field">
          <span class="field__label">Line 1</span>
          <input class="input" name="address.line1" value="${escapeHtml(user.address?.line1 || '')}" />
        </label>

        <div class="row">
          <label class="field" style="margin:0; flex:1; min-width:160px;">
            <span class="field__label">City</span>
            <input class="input" name="address.city" value="${escapeHtml(user.address?.city || '')}" />
          </label>
          <label class="field" style="margin:0; flex:1; min-width:160px;">
            <span class="field__label">State</span>
            <input class="input" name="address.state" value="${escapeHtml(user.address?.state || '')}" />
          </label>
          <label class="field" style="margin:0; flex:1; min-width:160px;">
            <span class="field__label">Postal code</span>
            <input class="input" name="address.postalCode" data-testid="postal-code-input" value="${escapeHtml(user.address?.postalCode || '')}" />
          </label>
        </div>

        <label class="field">
          <span class="field__label">Country</span>
          <input class="input" name="address.country" data-testid="country-input" value="${escapeHtml(user.address?.country || 'IN')}" />
        </label>

        <div class="row" style="justify-content: flex-end; margin-top: 12px;">
          <button class="btn" type="submit" data-testid="submit-user">${isEdit ? 'Save changes' : 'Create user'}</button>
        </div>

        ${isEdit ? `<input type="hidden" name="id" value="${escapeHtml(user.id)}" />` : ''}
      </form>
    `;
  }

  function kycModalHtml(userId) {
    return `
      <div class="row" style="justify-content: space-between; margin-bottom: 10px;">
        <div class="muted">Update KYC status for <strong>${escapeHtml(userId)}</strong></div>
        <button class="btn btn--secondary" type="button" id="closeModal" data-testid="close-kyc-modal">Close</button>
      </div>

      <label class="field">
        <span class="field__label">New status</span>
        <select id="newStatus" class="input" data-testid="kyc-new-status">
          <option value="verified">verified</option>
          <option value="rejected">rejected</option>
          <option value="pending">pending</option>
        </select>
      </label>

      <div class="row" style="justify-content:flex-end;">
        <button id="saveKyc" class="btn" type="button" data-testid="save-kyc-btn">Update KYC</button>
      </div>

      <pre class="code" id="kycOutput" data-testid="kyc-output"></pre>
    `;
  }

  async function onRowAction(action, id) {
    if (!id) return;

    if (action === 'edit') {
      setLoading(true);
      try {
        const res = await api().get(`/v1/users/${encodeURIComponent(id)}`);
        const user = res?.data || {};
        openModal('Edit user', userFormHtml(user));
        wireUserForm(true);
      } catch (e) {
        toast?.('Load failed', e?.message || 'Failed to fetch user');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (action === 'delete') {
      const ok = confirm(`Delete user ${id}?`);
      if (!ok) return;

      setLoading(true);
      try {
        await api().delete(`/v1/users/${encodeURIComponent(id)}`);
        toast?.('Deleted', `User ${id} deleted`);
        await load();
      } catch (e) {
        toast?.('Delete failed', e?.message || 'Request failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (action === 'kyc') {
      openModal('Verify KYC', kycModalHtml(id));
      ui.modalBody.querySelector('#closeModal').addEventListener('click', closeModal);

      ui.modalBody.querySelector('#saveKyc').addEventListener('click', async () => {
        const status = ui.modalBody.querySelector('#newStatus').value;
        const out = ui.modalBody.querySelector('#kycOutput');
        out.textContent = 'Loading…';
        try {
          const res = await api().post(`/v1/users/${encodeURIComponent(id)}/verify-kyc`, { status });
          out.textContent = JSON.stringify(res, null, 2);
          toast?.('KYC updated', `${id} → ${status}`);
          await load();
        } catch (e) {
          out.textContent = JSON.stringify({ message: e?.message, status: e?.status, data: e?.data }, null, 2);
          toast?.('KYC failed', e?.message || 'Request failed');
        }
      });
      return;
    }
  }

  function wireUserForm(isEdit) {
    ui.modalBody.querySelector('#closeModal').addEventListener('click', closeModal);

    ui.modalBody.querySelector('#userForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);

      const payload = {
        email: data.get('email')?.toString().trim(),
        firstName: data.get('firstName')?.toString().trim(),
        lastName: data.get('lastName')?.toString().trim() || undefined,
        phone: data.get('phone')?.toString().trim() || undefined,
        kycStatus: data.get('kycStatus')?.toString() || 'pending',
        address: {
          line1: data.get('address.line1')?.toString().trim() || undefined,
          city: data.get('address.city')?.toString().trim() || undefined,
          state: data.get('address.state')?.toString().trim() || undefined,
          postalCode: data.get('address.postalCode')?.toString().trim() || undefined,
          country: data.get('address.country')?.toString().trim() || 'IN',
        },
      };

      // Remove empty address object
      if (!payload.address.line1 && !payload.address.city && !payload.address.state && !payload.address.postalCode) {
        delete payload.address;
      }

      setLoading(true);
      try {
        if (isEdit) {
          const id = data.get('id')?.toString();
          const res = await api().put(`/v1/users/${encodeURIComponent(id)}`, payload);
          toast?.('Saved', 'User updated');
          closeModal();
          await load();
          return res;
        }

        const res = await api().post('/v1/users', payload);
        toast?.('Created', 'User created');
        closeModal();
        await load();
        return res;
      } catch (err) {
        toast?.('Save failed', err?.message || 'Request failed');
      } finally {
        setLoading(false);
      }
    });
  }

  ui.newUser.addEventListener('click', () => {
    openModal('Create user', userFormHtml({}));
    wireUserForm(false);
  });

  ui.refresh.addEventListener('click', () => {
    state.page = 1;
    load();
  });

  ui.prev.addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1);
    load();
  });

  ui.next.addEventListener('click', () => {
    state.page += 1;
    load();
  });

  ui.rows.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    onRowAction(btn.dataset.action, btn.dataset.id);
  });

  ui.exportCsv.addEventListener('click', () => {
    const rows = state.lastData || [];
    if (!rows.length) {
      toast?.('Export', 'No rows to export');
      return;
    }

    const headers = ['id', 'email', 'firstName', 'lastName', 'phone', 'kycStatus', 'createdAt'];
    const lines = [headers.join(',')];

    for (const u of rows) {
      const vals = headers.map(h => csvEscape(u?.[h] ?? ''));
      lines.push(vals.join(','));
    }

    downloadText('users.csv', lines.join('\n'), 'text/csv');
    toast?.('Exported', 'users.csv downloaded');
  });

  ui.exportPdf.addEventListener('click', () => {
    window.print();
  });

  // initial
  ui.limit.value = String(DEFAULT_LIMIT);
  load();
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[\n\r",]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
