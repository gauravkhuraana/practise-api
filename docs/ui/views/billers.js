export function renderBillers(outlet, ctx) {
  const { api, toast } = ctx;

  outlet.innerHTML = `
    <h1 class="card__title">Billers</h1>
    <p class="muted">Browse service providers by category. Click a biller to view details or add a bill.</p>

    <div class="row" style="margin: 12px 0 16px 0; flex-wrap: wrap; gap: 8px;">
      <button class="btn btn--secondary chip" data-cat="" type="button">All</button>
      <button class="btn btn--secondary chip" data-cat="electricity" type="button">Electricity</button>
      <button class="btn btn--secondary chip" data-cat="telecom" type="button">Telecom</button>
      <button class="btn btn--secondary chip" data-cat="water" type="button">Water</button>
      <button class="btn btn--secondary chip" data-cat="gas" type="button">Gas</button>
      <button class="btn btn--secondary chip" data-cat="broadband" type="button">Broadband</button>
      <button class="btn btn--secondary chip" data-cat="dth" type="button">DTH</button>
      <button class="btn btn--secondary chip" data-cat="insurance" type="button">Insurance</button>
    </div>

    <div class="row" style="margin-bottom: 14px; gap: 12px;">
      <label class="field" style="margin:0; min-width:220px; flex:1;">
        <span class="field__label">Search</span>
        <input id="q" class="input" placeholder="biller name" />
      </label>

      <label class="field" style="margin:0; min-width:140px;">
        <span class="field__label">Status</span>
        <select id="active" class="input">
          <option value="">All</option>
          <option value="true" selected>Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>

      <label class="field" style="margin:0; min-width:140px;">
        <span class="field__label">Min Amount</span>
        <input id="minAmt" class="input" type="number" placeholder="0" />
      </label>

      <label class="field" style="margin:0; min-width:140px;">
        <span class="field__label">Max Amount</span>
        <input id="maxAmt" class="input" type="number" placeholder="100000" />
      </label>
    </div>

    <div class="row" style="margin-bottom: 14px;">
      <button id="refresh" class="btn" type="button">Refresh</button>
      <span class="muted" id="status"></span>
    </div>

    <div id="grid" class="biller-grid"></div>

    <div class="row" style="justify-content: space-between; margin-top: 14px;">
      <div class="row">
        <button id="prev" class="btn btn--secondary" type="button">Prev</button>
        <button id="next" class="btn btn--secondary" type="button">Next</button>
      </div>
      <div class="muted" id="pageInfo"></div>
    </div>

    <style>
      .biller-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-3); }
      .biller-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-3); display: flex; flex-direction: column; gap: 6px; }
      .biller-card__name { font-weight: 700; font-size: 15px; }
      .biller-card__cat { font-size: 12px; color: var(--muted); text-transform: uppercase; }
      .biller-card__range { font-size: 13px; }
      .chip[data-active="true"] { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
    </style>
  `;

  const ui = {
    grid: outlet.querySelector('#grid'),
    q: outlet.querySelector('#q'),
    active: outlet.querySelector('#active'),
    minAmt: outlet.querySelector('#minAmt'),
    maxAmt: outlet.querySelector('#maxAmt'),
    refresh: outlet.querySelector('#refresh'),
    status: outlet.querySelector('#status'),
    prev: outlet.querySelector('#prev'),
    next: outlet.querySelector('#next'),
    pageInfo: outlet.querySelector('#pageInfo'),
    chips: Array.from(outlet.querySelectorAll('.chip[data-cat]')),
  };

  const state = { page: 1, limit: 12, category: '' };

  function setActiveChip(cat) {
    state.category = cat;
    for (const c of ui.chips) {
      c.dataset.active = c.dataset.cat === cat ? 'true' : 'false';
    }
  }

  setActiveChip('');

  for (const c of ui.chips) {
    c.addEventListener('click', () => {
      setActiveChip(c.dataset.cat);
      state.page = 1;
      load();
    });
  }

  ui.refresh.addEventListener('click', () => { state.page = 1; load(); });
  ui.prev.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); load(); });
  ui.next.addEventListener('click', () => { state.page += 1; load(); });

  async function load() {
    ui.status.innerHTML = `<span class="spinner"></span> Loading…`;
    ui.grid.innerHTML = '';

    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));

    const q = ui.q.value.trim();
    if (q) params.set('search', q);

    if (state.category) params.set('category', state.category);

    const active = ui.active.value;
    if (active) params.set('is_active', active);

    const minAmt = ui.minAmt.value;
    const maxAmt = ui.maxAmt.value;
    if (minAmt) params.set('min_amount', minAmt);
    if (maxAmt) params.set('max_amount', maxAmt);

    try {
      const res = await api().get(`/v1/billers?${params.toString()}`);
      const list = res?.data || [];

      if (!list.length) {
        ui.grid.innerHTML = `<p class="muted">No billers found.</p>`;
      } else {
        ui.grid.innerHTML = list.map(b => `
          <div class="biller-card">
            <div class="biller-card__cat">${escapeHtml(b.category || '—')}</div>
            <div class="biller-card__name">${escapeHtml(b.displayName || b.name || b.id)}</div>
            <div class="biller-card__range">₹${b.minAmount ?? 0} – ₹${b.maxAmount ?? '∞'}</div>
            <span class="badge ${b.isActive ? 'badge--ok' : ''}">${b.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        `).join('');
      }

      const p = res?.pagination;
      ui.pageInfo.textContent = p ? `Page ${p.page} of ${p.totalPages} • ${p.total} billers` : `Page ${state.page}`;
      ui.prev.disabled = state.page <= 1;
      ui.next.disabled = p ? state.page >= p.totalPages : false;

      ui.status.textContent = '';
      toast('Billers loaded', `${list.length} biller(s)`);
    } catch (e) {
      ui.grid.innerHTML = `<p class="muted">Failed: ${escapeHtml(e?.message)}</p>`;
      ui.status.textContent = '';
      toast('Billers failed', e?.message || 'Error');
    }
  }

  load();
}

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
