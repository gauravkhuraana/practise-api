// API Lab - runnable demonstrations of the protocol-level features.
//
// Each lab fires real requests against the configured base URL and shows the
// status line, the headers that matter and the response body, so you can see
// exactly what your automation should be asserting on.

const QUERY_RESOURCES = ['bills', 'billers', 'payments', 'users'];

const SAMPLE_QUERIES = {
  bills: {
    filter: { status: { in: ['pending', 'overdue'] }, amount: { gte: 100 } },
    sort: ['-amount'],
    fields: ['id', 'amount', 'status', 'dueDate'],
    limit: 5,
  },
  billers: {
    filter: { category: { in: ['telecom', 'broadband'] }, isActive: true },
    sort: ['displayName'],
    limit: 5,
  },
  payments: {
    filter: { status: { in: ['completed', 'failed'] } },
    sort: ['-createdAt'],
    limit: 5,
  },
  users: {
    filter: { kycStatus: 'verified' },
    fields: ['id', 'email', 'firstName', 'kycStatus'],
    limit: 5,
  },
};

const INTERESTING_HEADERS = [
  'etag',
  'last-modified',
  'cache-control',
  'link',
  'location',
  'retry-after',
  'allow',
  'accept-query',
  'accept-patch',
  'x-total-count',
  'x-query-source',
  'x-job-status',
  'x-job-id',
  'idempotency-key',
  'idempotency-replayed',
  'x-bulk-succeeded',
  'x-bulk-failed',
  'x-delivery-id',
  'x-webhook-deliveries',
  'www-authenticate',
  'x-simulated-defect',
];

// ============================================
// Rendering helpers
// ============================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusTone(status) {
  if (status === 0) return 'badge--danger';
  if (status >= 200 && status < 300) return 'badge--ok';
  if (status >= 300 && status < 400) return 'badge--warn';
  return 'badge--danger';
}

function truncate(text, max = 1400) {
  if (!text) return '(empty body)';
  return text.length > max ? `${text.slice(0, max)}\n... (${text.length - max} more characters)` : text;
}

function formatBody(result) {
  if (result.body !== null && result.body !== undefined) {
    return JSON.stringify(result.body, null, 2);
  }
  return result.text || '(empty body)';
}

/** One request/response pair, rendered as a labelled block. */
function stepHtml(label, request, result, note) {
  const headers = INTERESTING_HEADERS.filter((h) => result.headers[h] !== undefined)
    .map(
      (h) =>
        `<div class="kv__row"><span class="kv__k">${escapeHtml(h)}</span><span class="kv__v">${escapeHtml(
          result.headers[h]
        )}</span></div>`
    )
    .join('');

  return `
    <div class="lab-step">
      <div class="lab-step__head">
        <span class="lab-step__label">${escapeHtml(label)}</span>
        <code class="lab-step__req">${escapeHtml(request)}</code>
        <span class="badge ${statusTone(result.status)}">${result.status || 'network error'} ${escapeHtml(
          result.statusText || ''
        )}</span>
        <span class="muted">${result.durationMs}ms</span>
      </div>
      ${note ? `<p class="lab-step__note">${escapeHtml(note)}</p>` : ''}
      ${headers ? `<div class="kv lab-step__headers">${headers}</div>` : ''}
      <pre class="code lab-step__body">${escapeHtml(truncate(formatBody(result)))}</pre>
    </div>
  `;
}

function makeOutput(el) {
  let html = '';
  return {
    reset() {
      html = '';
      el.innerHTML = '<p class="muted">Running...</p>';
    },
    step(label, request, result, note) {
      html += stepHtml(label, request, result, note);
      el.innerHTML = html;
    },
    message(text) {
      html += `<p class="lab-step__note">${escapeHtml(text)}</p>`;
      el.innerHTML = html;
    },
    fail(text) {
      html += `<p class="lab-step__note lab-step__note--bad">${escapeHtml(text)}</p>`;
      el.innerHTML = html;
    },
  };
}

/** Wire a button to an async handler, with a busy state and error trapping. */
function bind(root, selector, handler) {
  const button = root.querySelector(selector);
  if (!button) return;

  button.addEventListener('click', async () => {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Running...';
    try {
      await handler();
    } catch (error) {
      const output = root.querySelector(button.dataset.output);
      if (output) {
        output.innerHTML = `<p class="lab-step__note lab-step__note--bad">${escapeHtml(
          String(error?.message || error)
        )}</p>`;
      }
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// View
// ============================================

export function renderApiLab(outlet, ctx) {
  outlet.innerHTML = `
    <section class="page lab-page">
      <header class="lab-hero">
        <h1>API Lab</h1>
        <p class="muted">
          Runnable demonstrations of the protocol features this API supports. Every
          button fires real requests against the base URL in Settings and shows the
          status, the headers that matter and the body &mdash; the things your test
          suite should be asserting on.
        </p>
      </header>

      <h2 class="section-title">HTTP QUERY</h2>
      <div class="card">
        <h3 class="card__title">Search with a request body</h3>
        <p class="muted">
          QUERY is a safe, idempotent method that carries a body, so complex search
          criteria can be structured JSON instead of an unreadable query string.
          Because some clients and proxies still reject unfamiliar verbs, the same
          request can be sent three ways &mdash; run all three and compare
          <code>meta.querySource</code>.
        </p>
        <div class="row lab-controls">
          <label class="field">
            <span class="field__label">Resource</span>
            <select class="input" id="queryResource">
              ${QUERY_RESOURCES.map((r) => `<option value="${r}">/v1/${r}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span class="field__label">Transport</span>
            <select class="input" id="queryTransport">
              <option value="all">Run all three and compare</option>
              <option value="native">QUERY (native method)</option>
              <option value="path">POST /{resource}/query</option>
              <option value="override">POST + X-HTTP-Method-Override</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span class="field__label">Request body</span>
          <textarea class="input lab-textarea" id="queryBody" rows="12" spellcheck="false"></textarea>
        </label>
        <div class="row">
          <button class="btn" id="runQuery" data-output="#queryOut">Send query</button>
          <button class="btn btn--secondary" id="runQueryInvalid" data-output="#queryOut">Send an invalid field (expect 400)</button>
          <button class="btn btn--ghost" id="runQuerySchema" data-output="#queryOut">Fetch query schema</button>
        </div>
        <div class="lab-output" id="queryOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <h2 class="section-title">Conditional requests</h2>
      <div class="card">
        <h3 class="card__title">ETag, 304 Not Modified and 412 Precondition Failed</h3>
        <p class="muted">
          A single-resource GET returns an <code>ETag</code>. Send it back as
          <code>If-None-Match</code> to get a <code>304</code>, or as
          <code>If-Match</code> on an update to prevent a lost update. Both are
          derived from the stored row version, so an ETag from GET always works as
          an If-Match.
        </p>
        <label class="field">
          <span class="field__label">Resource path</span>
          <input class="input" id="condPath" value="/v1/billers/biller-airtel-postpaid" spellcheck="false" />
        </label>
        <div class="row">
          <button class="btn" id="runConditional" data-output="#condOut">Run the full sequence</button>
        </div>
        <div class="lab-output" id="condOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <h2 class="section-title">Idempotency</h2>
      <div class="card">
        <h3 class="card__title">Idempotency-Key on payment creation</h3>
        <p class="muted">
          A retried payment must not charge twice. Sending the same
          <code>Idempotency-Key</code> with the same body replays the original
          response (<code>Idempotency-Replayed: true</code>); the same key with a
          different body is rejected with <code>409</code>.
        </p>
        <div class="row">
          <button class="btn" id="runIdempotency" data-output="#idemOut">Create, retry, then reuse the key</button>
        </div>
        <div class="lab-output" id="idemOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <h2 class="section-title">Async operations</h2>
      <div class="card">
        <h3 class="card__title">202 Accepted, then poll to completion</h3>
        <p class="muted">
          The job is created immediately and returns <code>202</code> with
          <code>Location</code> and <code>Retry-After</code>. Poll until the status
          reaches a terminal state &mdash; the same shape as an export or a batch
          run in a real system.
        </p>
        <div class="row lab-controls">
          <label class="field">
            <span class="field__label">Duration (ms)</span>
            <input class="input" id="jobDuration" type="number" value="4000" min="500" max="30000" />
          </label>
          <label class="field">
            <span class="field__label">Outcome</span>
            <select class="input" id="jobOutcome">
              <option value="false">Succeed</option>
              <option value="true">Fail</option>
            </select>
          </label>
        </div>
        <div class="row">
          <button class="btn" id="runJob" data-output="#jobOut">Start and poll</button>
        </div>
        <div class="lab-output" id="jobOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <h2 class="section-title">JSON Patch and bulk create</h2>
      <div class="card">
        <h3 class="card__title">RFC 6902 patch documents</h3>
        <p class="muted">
          Send <code>Content-Type: application/json-patch+json</code> with an
          operation array. A <code>test</code> operation that does not hold returns
          <code>409</code> and nothing is written &mdash; that is how you get
          compare-and-swap semantics without an ETag.
        </p>
        <label class="field">
          <span class="field__label">Patch document</span>
          <textarea class="input lab-textarea" id="patchBody" rows="7" spellcheck="false"></textarea>
        </label>
        <div class="row">
          <button class="btn" id="runPatch" data-output="#patchOut">Apply patch</button>
          <button class="btn btn--secondary" id="runPatchTest" data-output="#patchOut">Failing test op (expect 409)</button>
        </div>
        <div class="lab-output" id="patchOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <div class="card">
        <h3 class="card__title">207 Multi-Status bulk create</h3>
        <p class="muted">
          One good item and one invalid item. The response is always
          <code>207</code>, with a per-item status so a partial failure is visible
          row by row.
        </p>
        <div class="row">
          <button class="btn" id="runBulk" data-output="#bulkOut">Create a mixed batch</button>
        </div>
        <div class="lab-output" id="bulkOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <h2 class="section-title">Webhooks</h2>
      <div class="card">
        <h3 class="card__title">Register, fire, then read the delivery log</h3>
        <p class="muted">
          Deliveries are signed with
          <code>X-Webhook-Signature: t=&lt;unix&gt;,v1=&lt;HMAC-SHA256&gt;</code>.
          Point this at your own receiver (webhook.site works well) or leave the
          default, which targets this API's own simulation endpoint so the round
          trip completes without leaving the page.
        </p>
        <label class="field">
          <span class="field__label">Callback URL</span>
          <input class="input" id="webhookUrl" spellcheck="false" />
        </label>
        <div class="row">
          <button class="btn" id="runWebhook" data-output="#webhookOut">Register, fire, inspect, clean up</button>
        </div>
        <div class="lab-output" id="webhookOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <h2 class="section-title">Simulation endpoints</h2>
      <div class="card">
        <h3 class="card__title">Timeouts, status codes, redirects and bad payloads</h3>
        <p class="muted">
          Everything under <code>/v1/simulate</code> is public &mdash; no API key
          needed. Use it to prove your client handles slow responses, retries,
          redirect chains and unparseable bodies.
        </p>
        <div class="row lab-buttons">
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/delay/2000" data-output="#simOut">Delay 2s</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/status/418" data-output="#simOut">Status 418</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/status/429" data-output="#simOut">429 + Retry-After</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/status/503" data-output="#simOut">503</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/redirect/3" data-output="#simOut">3 redirects</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/flaky?failureRate=0.5" data-output="#simOut">Flaky (50%)</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/malformed-json" data-output="#simOut">Malformed JSON</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/empty" data-output="#simOut">204 empty</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/large?items=250" data-output="#simOut">Large payload</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/cache/60" data-output="#simOut">Cacheable</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/basic-auth/tom/jerry" data-output="#simOut">Basic auth challenge</button>
          <button class="btn btn--secondary btn--sm" data-sim="/v1/simulate/echo" data-sim-method="POST" data-output="#simOut">Echo a POST</button>
        </div>
        <div class="lab-output" id="simOut"><p class="muted">No requests sent yet.</p></div>
      </div>

      <h2 class="section-title">Method discovery</h2>
      <div class="card">
        <h3 class="card__title">OPTIONS and 405 Method Not Allowed</h3>
        <p class="muted">
          <code>OPTIONS</code> reports <code>Allow</code> plus the body formats the
          resource accepts. An unsupported method on a resource that exists returns
          <code>405</code> with an <code>Allow</code> header, not a bare
          <code>404</code>.
        </p>
        <div class="row">
          <button class="btn" id="runDiscovery" data-output="#discoveryOut">Probe /v1/bills</button>
        </div>
        <div class="lab-output" id="discoveryOut"><p class="muted">No requests sent yet.</p></div>
      </div>
    </section>
  `;

  const $ = (sel) => outlet.querySelector(sel);
  const api = () => ctx.api();

  // ---- defaults ----
  const queryResource = $('#queryResource');
  const queryBody = $('#queryBody');
  queryBody.value = JSON.stringify(SAMPLE_QUERIES.bills, null, 2);
  queryResource.addEventListener('change', () => {
    queryBody.value = JSON.stringify(SAMPLE_QUERIES[queryResource.value], null, 2);
  });

  $('#patchBody').value = JSON.stringify(
    [
      { op: 'replace', path: '/description', value: 'Updated via JSON Patch' },
      { op: 'replace', path: '/maxAmount', value: 25000 },
    ],
    null,
    2
  );

  $('#webhookUrl').value = `${location.origin.replace(/\/$/, '')}/v1/simulate/status/200`;

  // ============================================
  // HTTP QUERY
  // ============================================
  bind(outlet, '#runQuery', async () => {
    const out = makeOutput($('#queryOut'));
    out.reset();

    const resource = queryResource.value;
    const transport = $('#queryTransport').value;

    let body;
    try {
      body = JSON.parse(queryBody.value || '{}');
    } catch (error) {
      out.fail(`The request body is not valid JSON: ${error.message}`);
      return;
    }

    const payload = JSON.stringify(body);
    const json = { 'Content-Type': 'application/json' };

    const transports = {
      native: {
        label: 'Native method',
        request: `QUERY /v1/${resource}`,
        run: () => api().raw('QUERY', `/v1/${resource}`, { headers: json, body: payload }),
        note: 'Some proxies and HTTP clients reject unknown verbs. If this one fails where the others succeed, that is the reason.',
      },
      path: {
        label: 'Path fallback',
        request: `POST /v1/${resource}/query`,
        run: () => api().raw('POST', `/v1/${resource}/query`, { headers: json, body: payload }),
      },
      override: {
        label: 'Header override',
        request: `POST /v1/${resource}  (X-HTTP-Method-Override: QUERY)`,
        run: () =>
          api().raw('POST', `/v1/${resource}`, {
            headers: { ...json, 'X-HTTP-Method-Override': 'QUERY' },
            body: payload,
          }),
      },
    };

    const chosen = transport === 'all' ? ['native', 'path', 'override'] : [transport];
    const sources = [];

    for (const name of chosen) {
      const t = transports[name];
      const result = await t.run();
      out.step(t.label, t.request, result, t.note);
      if (result.body?.meta?.querySource) sources.push(result.body.meta.querySource);
    }

    if (chosen.length === 3) {
      out.message(
        sources.length === 3
          ? `All three transports answered. meta.querySource reported: ${sources.join(', ')}.`
          : 'Not every transport answered - compare the statuses above.'
      );
    }
  });

  bind(outlet, '#runQueryInvalid', async () => {
    const out = makeOutput($('#queryOut'));
    out.reset();
    const resource = queryResource.value;
    const result = await api().raw('POST', `/v1/${resource}/query`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { notARealField: 'x' }, sort: ['alsoNotReal'] }),
    });
    out.step(
      'Invalid field and sort',
      `POST /v1/${resource}/query`,
      result,
      'Expect 400 with one entry in error.details per offending member, naming the fields that are queryable.'
    );
  });

  bind(outlet, '#runQuerySchema', async () => {
    const out = makeOutput($('#queryOut'));
    out.reset();
    const resource = queryResource.value;
    const result = await api().raw('GET', `/v1/${resource}/query-schema`);
    out.step('Query schema', `GET /v1/${resource}/query-schema`, result);
  });

  // ============================================
  // Conditional requests
  // ============================================
  bind(outlet, '#runConditional', async () => {
    const out = makeOutput($('#condOut'));
    out.reset();

    const path = $('#condPath').value.trim();

    const first = await api().raw('GET', path);
    out.step('1. Fetch the resource', `GET ${path}`, first, 'Note the ETag and Last-Modified headers.');

    const etag = first.headers.etag;
    if (!etag) {
      out.fail(
        'No ETag on the response - check that the path points at a single resource such as /v1/billers/{id}.'
      );
      return;
    }

    const cached = await api().raw('GET', path, { headers: { 'If-None-Match': etag } });
    out.step(
      '2. Re-fetch with If-None-Match',
      `GET ${path}`,
      cached,
      '304 Not Modified with no body - the client keeps its cached copy and the server saves the payload.'
    );

    const stale = await api().raw('PATCH', path, {
      headers: { 'Content-Type': 'application/json', 'If-Match': '"stale-etag"' },
      body: JSON.stringify({ description: 'This update should be rejected' }),
    });
    out.step(
      '3. Update with a stale If-Match',
      `PATCH ${path}`,
      stale,
      '412 Precondition Failed - this is how you stop one client silently overwriting another.'
    );

    const fresh = await api().raw('PATCH', path, {
      headers: { 'Content-Type': 'application/json', 'If-Match': etag },
      body: JSON.stringify({ description: `Updated from the API Lab at ${new Date().toISOString()}` }),
    });
    out.step('4. Update with the current If-Match', `PATCH ${path}`, fresh, 'Accepted, because the tag still matched.');

    const afterUpdate = await api().raw('GET', path, { headers: { 'If-None-Match': etag } });
    out.step(
      '5. Re-check the old validator',
      `GET ${path}`,
      afterUpdate,
      '200 rather than 304 - the resource changed, so the old ETag no longer matches.'
    );
  });

  // ============================================
  // Idempotency
  // ============================================
  bind(outlet, '#runIdempotency', async () => {
    const out = makeOutput($('#idemOut'));
    out.reset();

    const bills = await api().raw('GET', '/v1/bills?status=pending&limit=1');
    const methods = await api().raw('GET', '/v1/payment-methods?limit=1');
    const bill = bills.body?.data?.[0];
    const method = methods.body?.data?.[0];

    if (!bill || !method) {
      out.fail(
        'Could not find a pending bill and a payment method to work with. Check your authentication in Settings.'
      );
      return;
    }

    const key = `lab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const request = {
      billId: bill.id,
      amount: 100,
      paymentMethodId: method.id,
      paymentMethodType: method.type || 'upi',
    };
    const payload = JSON.stringify(request);
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': key };

    const first = await api().raw('POST', '/v1/payments', { headers, body: payload });
    out.step('1. Create the payment', 'POST /v1/payments', first, `Idempotency-Key: ${key}`);

    const replay = await api().raw('POST', '/v1/payments', { headers, body: payload });
    const sameId = first.body?.data?.id && first.body.data.id === replay.body?.data?.id;
    out.step(
      '2. Retry the identical request',
      'POST /v1/payments',
      replay,
      sameId
        ? `Idempotency-Replayed: true, and the same payment id came back (${replay.body.data.id}) - no second charge.`
        : 'The ids differ, which would mean a duplicate charge.'
    );

    const conflict = await api().raw('POST', '/v1/payments', {
      headers,
      body: JSON.stringify({ ...request, amount: 999 }),
    });
    out.step(
      '3. Reuse the key with a different body',
      'POST /v1/payments',
      conflict,
      '409 - a key stands for one specific request, so reusing it for a different one is a client bug worth surfacing.'
    );
  });

  // ============================================
  // Async jobs
  // ============================================
  bind(outlet, '#runJob', async () => {
    const out = makeOutput($('#jobOut'));
    out.reset();

    const durationMs = Number($('#jobDuration').value) || 4000;
    const shouldFail = $('#jobOutcome').value === 'true';

    const created = await api().raw('POST', '/v1/jobs', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'statement-export', durationMs, shouldFail }),
    });
    out.step(
      '1. Start the job',
      'POST /v1/jobs',
      created,
      '202 Accepted. Location says where to poll and Retry-After suggests how long to wait between polls.'
    );

    const jobId = created.body?.data?.id;
    if (!jobId) {
      out.fail('No job id came back, so there is nothing to poll.');
      return;
    }

    for (let attempt = 1; attempt <= 12; attempt++) {
      await sleep(1000);
      const poll = await api().raw('GET', `/v1/jobs/${jobId}`);
      const status = poll.body?.data?.status;
      const progress = poll.body?.data?.progress;

      out.step(`${attempt + 1}. Poll #${attempt}`, `GET /v1/jobs/${jobId}`, poll, `status=${status} progress=${progress}%`);

      if (['completed', 'failed', 'cancelled'].includes(status)) {
        out.message(
          status === 'completed'
            ? 'Terminal state reached, and the result payload is populated.'
            : 'Terminal state reached - this is the branch your polling loop needs to handle.'
        );
        return;
      }
    }

    out.fail('Gave up after 12 polls. Try a shorter duration.');
  });

  // ============================================
  // JSON Patch
  // ============================================
  bind(outlet, '#runPatch', async () => {
    const out = makeOutput($('#patchOut'));
    out.reset();

    let ops;
    try {
      ops = JSON.parse($('#patchBody').value || '[]');
    } catch (error) {
      out.fail(`The patch document is not valid JSON: ${error.message}`);
      return;
    }

    const result = await api().raw('PATCH', '/v1/billers/biller-jio-prepaid', {
      headers: { 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(ops),
    });
    out.step('Apply the patch', 'PATCH /v1/billers/biller-jio-prepaid', result);
  });

  bind(outlet, '#runPatchTest', async () => {
    const out = makeOutput($('#patchOut'));
    out.reset();

    const result = await api().raw('PATCH', '/v1/billers/biller-jio-prepaid', {
      headers: { 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify([
        { op: 'test', path: '/category', value: 'this-is-not-the-category' },
        { op: 'replace', path: '/description', value: 'This must not be written' },
      ]),
    });
    out.step(
      'Failing test operation',
      'PATCH /v1/billers/biller-jio-prepaid',
      result,
      '409 Conflict, and the replace that followed it was not applied - a patch is all or nothing.'
    );
  });

  // ============================================
  // Bulk
  // ============================================
  bind(outlet, '#runBulk', async () => {
    const out = makeOutput($('#bulkOut'));
    out.reset();

    const stamp = Date.now();
    const result = await api().raw('POST', '/v1/billers/bulk', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { name: `lab-good-${stamp}`, displayName: `Lab Good ${stamp}`, category: 'electricity' },
          { name: `lab-bad-${stamp}`, displayName: `Lab Bad ${stamp}`, category: 'not-a-real-category' },
        ],
      }),
    });

    const summary = result.body?.data?.summary;
    out.step(
      'Mixed batch',
      'POST /v1/billers/bulk',
      result,
      summary
        ? `207 Multi-Status - ${summary.succeeded} succeeded, ${summary.failed} failed. The per-item status is what you assert on, not the outer code.`
        : undefined
    );
  });

  // ============================================
  // Webhooks
  // ============================================
  bind(outlet, '#runWebhook', async () => {
    const out = makeOutput($('#webhookOut'));
    out.reset();

    const url = $('#webhookUrl').value.trim();

    const created = await api().raw('POST', '/v1/webhooks', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        events: ['payment.completed', 'test.ping'],
        description: 'Created from the API Lab',
      }),
    });
    out.step(
      '1. Register the subscription',
      'POST /v1/webhooks',
      created,
      'The signing secret is returned only here - store it, because later reads show a hint only.'
    );

    const id = created.body?.data?.id;
    if (!id) {
      out.fail('Registration failed, so there is nothing to fire.');
      return;
    }

    const fired = await api().raw('POST', `/v1/webhooks/${id}/test`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'test.ping', data: { from: 'api-lab' } }),
    });
    out.step(
      '2. Fire a test delivery',
      `POST /v1/webhooks/${id}/test`,
      fired,
      'The outcome reports the status code your endpoint returned and the signature that was sent.'
    );

    const log = await api().raw('GET', `/v1/webhooks/${id}/deliveries`);
    out.step('3. Read the delivery log', `GET /v1/webhooks/${id}/deliveries`, log);

    const removed = await api().raw('DELETE', `/v1/webhooks/${id}`);
    out.step('4. Clean up', `DELETE /v1/webhooks/${id}`, removed, '204 No Content - the subscription and its log are gone.');
  });

  // ============================================
  // Simulation
  // ============================================
  for (const button of outlet.querySelectorAll('[data-sim]')) {
    button.addEventListener('click', async () => {
      const out = makeOutput($('#simOut'));
      out.reset();

      const path = button.dataset.sim;
      const method = button.dataset.simMethod || 'GET';
      const isEcho = path.includes('/echo');

      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Running...';

      try {
        const result = await api().raw(method, path, {
          headers: isEcho ? { 'Content-Type': 'application/json' } : {},
          body: isEcho ? JSON.stringify({ sentFrom: 'api-lab', at: new Date().toISOString() }) : undefined,
        });

        const notes = {
          '/v1/simulate/malformed-json':
            'The status is 200 and the content type claims JSON, but the body is truncated - a good test that your client surfaces parse errors instead of swallowing them.',
          '/v1/simulate/redirect/3':
            'Your client followed the chain to the end. Turn redirect following off to see the first 302 instead.',
          '/v1/simulate/empty':
            '204 No Content - there is no body to parse, which trips up clients that always call .json().',
        };

        out.step(method, path, result, notes[path]);
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });
  }

  // ============================================
  // Discovery
  // ============================================
  bind(outlet, '#runDiscovery', async () => {
    const out = makeOutput($('#discoveryOut'));
    out.reset();

    const options = await api().raw('OPTIONS', '/v1/bills');
    out.step(
      '1. Ask what the collection supports',
      'OPTIONS /v1/bills',
      options,
      'Allow lists the methods; Accept-Query and Accept-Patch describe the body formats it takes.'
    );

    const notAllowed = await api().raw('PUT', '/v1/bills', {
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    out.step(
      '2. Send a method it does not support',
      'PUT /v1/bills',
      notAllowed,
      '405 with an Allow header, rather than a 404 that would suggest the path itself is wrong.'
    );

    const badQuery = await api().raw('QUERY', '/v1/files', {
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    out.step('3. QUERY a resource that does not support it', 'QUERY /v1/files', badQuery, '405, again with Allow.');
  });
}
