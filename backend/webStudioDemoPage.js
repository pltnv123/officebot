function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderWebStudioDemoPage({ orderId = '' } = {}) {
  const rawOrderId = String(orderId || '');
  const safeOrderId = escapeHtml(rawOrderId);
  const defaultRevision = 'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.';
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WebStudio MVP Demo</title>
  <style>
    :root { --bg:#0b1220; --panel:#111827; --text:#f8fafc; --muted:#94a3b8; --accent:#2563eb; --warn:#d97706; --ok:#16a34a; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, Arial, sans-serif; background:linear-gradient(180deg,#020617,var(--bg)); color:var(--text); }
    .page { max-width: 1280px; margin: 0 auto; padding: 24px; }
    .grid { display:grid; grid-template-columns: 360px 1fr; gap:20px; }
    .panel { background: rgba(17,24,39,0.95); border:1px solid rgba(255,255,255,0.08); border-radius: 18px; padding:18px; margin-bottom:18px; }
    h1,h2,h3 { margin-top:0; }
    button { background: var(--accent); color:#fff; border:none; border-radius: 12px; padding: 10px 14px; cursor:pointer; font-weight:700; }
    button.secondary { background:#374151; }
    input, textarea { width:100%; background:#0f172a; color:var(--text); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; }
    textarea { min-height: 120px; resize: vertical; }
    .row { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
    .badge { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700; }
    .badge.primary { background: rgba(37,99,235,0.2); color:#93c5fd; }
    .badge.placeholder { background: rgba(217,119,6,0.18); color:#fdba74; }
    .badge.ok { background: rgba(22,163,74,0.18); color:#86efac; }
    .muted { color: var(--muted); }
    .variant-card { border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:14px; margin-top:10px; }
    .variant-card.primary { border-color: rgba(37,99,235,0.4); }
    .variant-card.placeholder { border-style:dashed; }
    .kv { display:grid; grid-template-columns: 180px 1fr; gap:8px; font-size:14px; }
    .linkish { color:#93c5fd; word-break: break-all; }
    pre { white-space: pre-wrap; word-break: break-word; background:#020617; padding:14px; border-radius:12px; overflow:auto; max-height:480px; }
    iframe { width:100%; min-height:520px; border:1px solid rgba(255,255,255,0.08); border-radius:12px; background:#fff; }
    details { margin-top:10px; }
    @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div id="webstudio-demo-root" class="page" data-order-id="${safeOrderId}">
    <div class="panel">
      <h1>WebStudio MVP Demo</h1>
      <div class="muted">Operator/demo page for manual testing of primary Variant B MVP. This is not a production client portal.</div>
    </div>
    <div class="grid">
      <section>
        <div class="panel">
          <h2>Demo control panel</h2>
          <label for="order-id-input">Order ID</label>
          <input id="order-id-input" value="${safeOrderId}" placeholder="ws-order-demo-0001" />
          <div class="row">
            <button id="create-demo-btn">Create / Load Demo Order</button>
            <button id="refresh-surface-btn" class="secondary">Refresh Surface</button>
          </div>
          <div id="status-line" class="muted" style="margin-top:10px;">Status: idle</div>
        </div>

        <div class="panel">
          <h2>Revision panel</h2>
          <label for="revision-text">Revision request</label>
          <textarea id="revision-text">${escapeHtml(defaultRevision)}</textarea>
          <div class="row">
            <button id="select-primary-btn">Select Variant B</button>
            <button id="submit-revision-btn">Submit Revision</button>
            <button id="execute-revision-btn">Execute Revision</button>
          </div>
        </div>

        <div class="panel">
          <h2>Delivery panel</h2>
          <div id="delivery-summary" class="kv"></div>
        </div>
      </section>

      <section>
        <div class="panel">
          <h2>Header</h2>
          <div id="header-summary" class="kv"></div>
        </div>

        <div class="panel">
          <h2>Variants</h2>
          <div id="variants-list"></div>
        </div>

        <div class="panel">
          <h2>Preview area</h2>
          <div id="preview-meta" class="kv"></div>
          <div class="row" style="margin-bottom:10px;">
            <a id="preview-link" class="linkish" href="#" target="_blank" rel="noopener">Preview link/path unavailable</a>
          </div>
          <iframe id="preview-frame" title="Variant B preview" src="about:blank"></iframe>
        </div>

        <div class="panel">
          <h2>Revised result</h2>
          <div id="revised-summary" class="kv"></div>
        </div>

        <div class="panel">
          <h2>Debug/API panel</h2>
          <details open>
            <summary>Raw surface JSON</summary>
            <pre id="surface-json">{}</pre>
          </details>
        </div>
      </section>
    </div>
  </div>
  <script>
    const state = { orderId: ${JSON.stringify(rawOrderId || '')}, surface: null };
    const $ = (id) => document.getElementById(id);

    function setStatus(text) { $('status-line').textContent = 'Status: ' + text; }
    function safe(v) { return v == null || v === '' ? '—' : String(v); }
    function renderKv(node, entries) {
      node.innerHTML = entries.map(([k,v]) => '<div class="muted">' + k + '</div><div>' + safe(v) + '</div>').join('');
    }

    function renderVariants(surface) {
      const variants = surface?.variants || [];
      $('variants-list').innerHTML = variants.map((variant) => {
        const isPrimary = variant.branch_name === 'B';
        return '<div class="variant-card ' + (isPrimary ? 'primary' : 'placeholder') + '">' +
          '<div class="row"><strong>Variant ' + safe(variant.branch_name) + '</strong>' +
          '<span class="badge ' + (isPrimary ? 'primary' : 'placeholder') + '">' + (isPrimary ? 'Primary MVP' : 'Placeholder') + '</span></div>' +
          '<div class="kv" style="margin-top:10px;">' +
          '<div class="muted">implementation_status</div><div>' + safe(variant.implementation_status) + '</div>' +
          '<div class="muted">quality_level</div><div>' + safe(variant.quality_level) + '</div>' +
          '<div class="muted">production_ready</div><div>' + safe(variant.production_ready) + '</div>' +
          '<div class="muted">build_artifact_id</div><div>' + safe(variant.build_artifact_id) + '</div>' +
          '<div class="muted">preview_path</div><div class="linkish">' + safe(variant.preview_path) + '</div>' +
          '<div class="muted">placeholder_reason</div><div>' + safe(variant.placeholder_reason) + '</div>' +
          '</div></div>';
      }).join('');
    }

    function renderSurface(surface) {
      state.surface = surface;
      const order = surface?.order || {};
      const primary = surface?.primary_variant || null;
      const delivery = surface?.public_delivery_bundle || {};
      const revisionLane = surface?.revision_lane || {};
      renderKv($('header-summary'), [
        ['order_id', order.order_id],
        ['current status', revisionLane.status || surface?.mvp_delivery_status?.recommended_next_action],
        ['selected_variant_id', surface?.selected_variant_id],
      ]);
      renderVariants(surface);
      renderKv($('delivery-summary'), [
        ['public_delivery_id', delivery.public_delivery_id],
        ['initial_previews_count', delivery.initial_previews?.length],
        ['revised_preview_available', Boolean(delivery.revised_preview)],
        ['hosting_native', delivery.hosting_native],
        ['source', delivery.source],
      ]);
      renderKv($('preview-meta'), [
        ['primary_variant_branch', primary?.branch_name],
        ['build_artifact_id', primary?.build_artifact_id],
        ['preview_path', primary?.preview_path],
        ['qa_summary', JSON.stringify(primary?.qa_summary || null)],
      ]);
      renderKv($('revised-summary'), [
        ['revision_status', revisionLane.status],
        ['revised_build_artifact_id', revisionLane.revised_build_artifact_id],
        ['revised_preview_route_path', revisionLane.revised_preview_route_path],
        ['revised_published_html_path', revisionLane.revised_published_html_path],
      ]);
      $('surface-json').textContent = JSON.stringify(surface, null, 2);

      const previewHref = delivery?.primary_variant?.preview_path || primary?.preview_path || '#';
      $('preview-link').textContent = previewHref === '#' ? 'Preview link/path unavailable' : previewHref;
      $('preview-link').href = previewHref === '#' ? '#' : '/api/webstudio-preview?path=' + encodeURIComponent(previewHref);
      $('preview-frame').src = previewHref !== '#' ? '/api/webstudio-preview?path=' + encodeURIComponent(previewHref) : 'about:blank';
    }

    async function loadSurface(orderId) {
      if (!orderId) throw new Error('orderId is required');
      const response = await fetch('/api/export/webstudio-order-surface/' + encodeURIComponent(orderId));
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Failed to load surface');
      state.orderId = orderId;
      $('order-id-input').value = orderId;
      renderSurface(payload.webstudio_order_surface);
      return payload.webstudio_order_surface;
    }

    async function createFullMvp() {
      const response = await fetch('/api/demo/webstudio-order/full-mvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Failed to create full MVP order');
      await loadSurface(payload.order_id);
    }

    async function postJson(url, body) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Request failed');
      return payload;
    }

    $('create-demo-btn').addEventListener('click', async () => {
      try { setStatus('creating/loading demo order…'); await createFullMvp(); setStatus('demo order ready'); } catch (error) { setStatus(error.message); }
    });
    $('refresh-surface-btn').addEventListener('click', async () => {
      try { setStatus('refreshing surface…'); await loadSurface($('order-id-input').value.trim()); setStatus('surface refreshed'); } catch (error) { setStatus(error.message); }
    });
    $('select-primary-btn').addEventListener('click', async () => {
      try { setStatus('selecting Variant B…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent($('order-id-input').value.trim()) + '/select-primary', {}); await loadSurface($('order-id-input').value.trim()); setStatus('Variant B selected'); } catch (error) { setStatus(error.message); }
    });
    $('submit-revision-btn').addEventListener('click', async () => {
      try {
        setStatus('submitting revision…');
        await postJson('/api/demo/webstudio-order/' + encodeURIComponent($('order-id-input').value.trim()) + '/revision', {
          delta_brief: { requested_changes: [$('revision-text').value.trim()], customer_notes: $('revision-text').value.trim() }
        });
        await loadSurface($('order-id-input').value.trim());
        setStatus('revision created');
      } catch (error) { setStatus(error.message); }
    });
    $('execute-revision-btn').addEventListener('click', async () => {
      try { setStatus('executing revision…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent($('order-id-input').value.trim()) + '/execute-revision', {}); await loadSurface($('order-id-input').value.trim()); setStatus('revision executed'); } catch (error) { setStatus(error.message); }
    });

    if (state.orderId) {
      loadSurface(state.orderId).then(() => setStatus('surface preloaded')).catch((error) => setStatus(error.message));
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderWebStudioDemoPage,
  escapeHtml,
};