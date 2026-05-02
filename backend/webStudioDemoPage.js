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
  const defaultBrief = 'Сделай Telegram-бота для приёма заявок: имя, телефон, услуга, сообщение. Сохранять заявки в CSV.';
  const defaultScriptBrief = 'Сделай Python-скрипт, который читает CSV и считает сумму по колонке amount';
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WebStudio MVP Demo</title>
  <style>
    :root { --bg:#07111f; --panel:rgba(15,23,42,0.86); --text:#f8fafc; --muted:#94a3b8; --accent:#3b82f6; --accent-2:#8b5cf6; --border:rgba(255,255,255,0.08); }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, Arial, sans-serif; background: radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 30%), linear-gradient(180deg,#020617,var(--bg)); color:var(--text); }
    .page { max-width: 1400px; margin: 0 auto; padding: 28px; }
    .hero-shell { display:grid; grid-template-columns: 1.15fr 0.85fr; gap:22px; margin-bottom:22px; }
    .grid { display:grid; grid-template-columns: 360px minmax(0, 1fr); gap:22px; align-items:start; }
    .panel { background: rgba(15,23,42,0.86); border:1px solid var(--border); border-radius:22px; padding:22px; backdrop-filter: blur(10px); box-shadow: 0 18px 40px rgba(2,6,23,0.28); }
    h1,h2,h3 { margin-top:0; }
    h1 { font-size: 42px; line-height:1.05; margin-bottom:10px; }
    h2 { font-size: 26px; margin-bottom:14px; }
    h3 { font-size: 18px; margin-bottom:8px; }
    .subtitle { color:var(--muted); font-size:17px; line-height:1.6; max-width:820px; }
    .hero-meta { display:flex; gap:10px; flex-wrap:wrap; margin-top:18px; }
    .chip { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); font-size:13px; }
    .chip strong { color:#dbeafe; }
    .summary-card { background: linear-gradient(135deg, rgba(59,130,246,0.16), rgba(139,92,246,0.12)); }
    .summary-card ul { margin:0; padding-left:18px; color:#cbd5e1; line-height:1.8; }
    button { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color:#fff; border:none; border-radius:14px; padding:12px 16px; cursor:pointer; font-weight:800; }
    button.secondary { background:#1f2937; }
    button:disabled { opacity:0.5; cursor:not-allowed; }
    input, textarea, select { width:100%; background:#0b1327; color:var(--text); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:12px 14px; }
    textarea { min-height:140px; resize:vertical; }
    label { display:block; font-weight:700; margin-bottom:8px; }
    .field { margin-top:14px; }
    .row { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
    .muted { color:var(--muted); }
    .step-list, .file-list { display:grid; gap:12px; }
    .step-card, .variant-card { border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:14px; background:rgba(255,255,255,0.03); }
    .step-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px; }
    .step-index { display:inline-flex; width:28px; height:28px; align-items:center; justify-content:center; border-radius:999px; background:rgba(59,130,246,0.18); color:#bfdbfe; font-weight:800; font-size:12px; }
    .badge { display:inline-flex; align-items:center; padding:5px 10px; border-radius:999px; font-size:12px; font-weight:800; background: rgba(148,163,184,0.16); color:#cbd5e1; }
    .meta-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
    .meta-item { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:14px; }
    .meta-item .label { color:var(--muted); font-size:12px; margin-bottom:6px; }
    .meta-item .value { font-weight:700; word-break:break-word; }
    .linkish { color:#93c5fd; word-break:break-all; text-decoration:none; }
    pre { white-space:pre-wrap; word-break:break-word; background:#020617; padding:14px; border-radius:14px; overflow:auto; max-height:360px; }
    iframe { width:100%; min-height:640px; border:1px solid rgba(255,255,255,0.08); border-radius:16px; background:#fff; }
    .preview-head { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
    .preview-note { color:#cbd5e1; font-size:14px; }
    .hidden { display:none !important; }
    .plan-list { margin:0; padding-left:18px; color:#dbeafe; line-height:1.7; }
    .variant-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:14px; }
    .collapsed-note { font-size:14px; color:#cbd5e1; margin-top:10px; }
    .code-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; padding:8px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:10px 10px 0 0; }
    .code-header .filename { font-weight:700; color:#e2e8f0; font-size:13px; }
    .code-block { background:#0b1120; border:1px solid rgba(59,130,246,0.2); border-radius:0 0 10px 10px; padding:16px; font-family:'Consolas','Monaco','Courier New',monospace; font-size:13px; line-height:1.6; color:#e2e8f0; max-height:480px; overflow:auto; }
    @media (max-width: 1100px) { .hero-shell, .grid, .variant-grid, .meta-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div id="webstudio-demo-root" class="page" data-order-id="${safeOrderId}">
    <section class="hero-shell">
      <div class="panel">
        <h1>WebStudio MVP Demo</h1>
        <div class="subtitle">Автоматизированная веб-студия: intake → router → landing, script или telegram bot package. Каждый тип проекта теперь рендерится как отдельный surface.</div>
        <div id="hero-chips" class="hero-meta"></div>
      </div>
      <div class="panel summary-card">
        <h2 style="margin-bottom:10px;">Что показывает этот demo</h2>
        <ul>
          <li>Client brief intake для нескольких project types</li>
          <li>Bounded vertical slices: landing, script, telegram bot</li>
          <li>Отдельные surfaces без смешения UX между типами</li>
        </ul>
      </div>
    </section>

    <div class="grid">
      <section>
        <div class="panel">
          <h2>Client Brief Intake</h2>
          <div class="field">
            <label for="project-type-select">Project type</label>
            <select id="project-type-select">
              <option value="landing_page">landing_page</option>
              <option value="telegram_bot">telegram_bot</option>
              <option value="script">script</option>
              <option value="web_app">web_app</option>
              <option value="automation">automation</option>
              <option value="api_service">api_service</option>
              <option value="unknown">unknown</option>
            </select>
          </div>
          <div class="field">
            <label for="brief-text">Brief</label>
            <textarea id="brief-text" placeholder="Например: Сделай Telegram-бота для приёма заявок с админкой и Google Sheets">${escapeHtml(defaultBrief)}</textarea>
            <div id="script-hints" class="collapsed-note hidden">Примеры для safe script mode:<br>- Сделай Python-скрипт, который читает CSV и считает сумму по колонке amount<br>- Сделай Python-скрипт, который читает от 1 до 5 и пишет "Vitya PRIVET"<br>- Сделай Python-скрипт, который считает сумму от 1 до 100<br>- Сделай Python-скрипт, который печатает таблицу умножения на 7</div>
            <div id="telegram-hints" class="collapsed-note hidden">Примеры для safe telegram bot mode:<br>- Сделай Telegram-бота для приёма заявок: имя, телефон, услуга, сообщение. Сохранять заявки в CSV.<br>- Нужен бот, который собирает имя, телефон и комментарий клиента.</div>
          </div>
          <div class="field">
            <label for="deliverable-select">Desired deliverable</label>
            <select id="deliverable-select">
              <option value="preview">preview</option>
              <option value="source_code">source_code</option>
              <option value="github_pr">github_pr</option>
              <option value="zip_package">zip_package</option>
              <option value="deployment_instructions">deployment_instructions</option>
            </select>
          </div>
          <div class="field">
            <label for="tech-select">Tech preference</label>
            <select id="tech-select">
              <option value="auto">auto</option>
              <option value="python">python</option>
              <option value="nodejs">nodejs</option>
              <option value="django">django</option>
              <option value="react">react</option>
              <option value="html_css">html_css</option>
              <option value="telegram_bot_api">telegram_bot_api</option>
            </select>
          </div>
          <div class="row">
            <button id="analyze-brief-btn">Analyze Brief / Create Plan</button>
            <button id="execute-script-btn" class="secondary" disabled>Execute Script MVP</button>
            <button id="execute-telegram-bot-btn" class="secondary" disabled>Execute Telegram Bot MVP</button>
          </div>
          <div id="status-line" class="muted" style="margin-top:12px;">Status: idle</div>
        </div>

        <div id="landing-workflow-panel" class="panel">
          <h2>Landing Workflow</h2>
          <label for="order-id-input">Order ID</label>
          <input id="order-id-input" value="${safeOrderId}" placeholder="ws-order-demo-0001" />
          <div class="row">
            <button id="create-demo-btn">Create / Load Demo Order</button>
            <button id="refresh-surface-btn" class="secondary">Refresh Surface</button>
            <button id="refresh-script-surface-btn" class="secondary hidden">Refresh Script Surface</button>
            <button id="refresh-telegram-bot-surface-btn" class="secondary hidden">Refresh Telegram Bot Surface</button>
          </div>
          <div id="workflow-collapsed-note" class="collapsed-note hidden">Landing workflow скрыт, пока активен non-landing project type.</div>
          <div id="workflow-steps" class="step-list" style="margin-top:16px;"></div>
        </div>

        <div id="revision-panel" class="panel">
          <h2>Revision request</h2>
          <label for="revision-text">Что улучшить</label>
          <textarea id="revision-text">${escapeHtml(defaultRevision)}</textarea>
          <div class="row">
            <button id="select-primary-btn">Select Variant B</button>
            <button id="submit-revision-btn">Submit Revision</button>
            <button id="execute-revision-btn">Execute Revision</button>
          </div>
          <div id="revision-status-note" class="preview-note" style="margin-top:12px;">Last revision status: pending</div>
        </div>
      </section>

      <section>
        <div class="panel">
          <div class="preview-head">
            <div>
              <h2 style="margin-bottom:6px;">Project Plan</h2>
              <div class="preview-note">После Analyze Brief здесь показывается intake summary и маршрут выполнения по текущему типу проекта.</div>
            </div>
            <button id="start-mvp-build-btn" class="secondary">Start MVP Build</button>
          </div>
          <div id="plan-meta" class="meta-grid"></div>
          <div class="field"><h3>What we understood</h3><pre id="plan-brief">Analyze a brief to generate a plan.</pre></div>
          <div class="field"><h3>Recommended agents</h3><div id="plan-agents" class="row"></div></div>
          <div class="field"><h3>Execution stages</h3><ul id="plan-stages" class="plan-list"></ul></div>
          <div class="field"><h3>Expected artifacts</h3><ul id="plan-artifacts" class="plan-list"></ul></div>
          <div class="field"><h3>QA plan</h3><ul id="plan-qa" class="plan-list"></ul></div>
          <div class="field hidden" id="clarification-panel"><h3>Clarification path</h3><ul id="plan-clarifications" class="plan-list"></ul></div>
        </div>

        <div id="script-program-panel" class="panel hidden">
          <div class="preview-head" style="align-items:center;justify-content:space-between;">
            <div>
              <h2 style="margin-bottom:6px;">Program</h2>
              <div class="preview-note">Generated runnable Python script for the requested task.</div>
            </div>
            <div class="row" style="gap:8px;">
              <span id="script-scenario-badge" class="badge">scenario</span>
              <span id="script-test-badge" class="badge">test: pending</span>
              <button id="run-script-btn" class="primary">Run</button>
            </div>
          </div>
          <div id="script-program-header" class="meta-grid" style="margin:12px 0;"></div>
          <div class="field">
            <div class="code-header">
              <span class="filename">script.py</span>
              <span id="script-run-state" class="muted">idle</span>
            </div>
            <pre id="script-code-block" class="code-block">No script executed yet.</pre>
          </div>
          <div id="script-execution-output" class="hidden">
            <h3 style="margin-top:16px;">Execution Output</h3>
            <div id="script-exec-meta" class="meta-grid"></div>
            <div class="field"><h4>Command</h4><pre id="script-exec-command"></pre></div>
            <div class="field"><h4>stdout</h4><pre id="script-exec-stdout"></pre></div>
            <div class="field hidden" id="script-exec-stderr-field"><h4>stderr</h4><pre id="script-exec-stderr"></pre></div>
            <div class="row" style="margin-top:12px;"><button id="run-script-again-btn" class="secondary">Run again</button></div>
          </div>
        </div>

        <div id="script-run-history-panel" class="panel hidden">
          <h2>Run History</h2>
          <div id="script-run-history-list" class="file-list"></div>
        </div>

        <div id="script-supporting-files-panel" class="panel hidden">
          <h2>Supporting Files</h2>
          <div id="script-files" class="file-list"></div>
          <div class="field" style="margin-top:12px;"><h3>test_run.log</h3><pre id="script-log-preview"></pre></div>
          <div class="field"><h3>actual_output.txt</h3><pre id="script-output-preview"></pre></div>
        </div>

        <div id="telegram-bot-result-panel" class="panel hidden">
          <div class="preview-head"><div><h2 style="margin-bottom:6px;">Telegram Bot MVP Result</h2><div class="preview-note">Bounded local telegram bot package with dry-run QA, без реального Telegram API.</div></div></div>
          <div id="telegram-bot-meta" class="meta-grid"></div>
          <div class="field"><h3>Files</h3><div id="telegram-bot-files" class="file-list"></div></div>
          <div class="field"><h3>bot.py</h3><pre id="telegram-bot-preview">No telegram bot executed yet.</pre></div>
          <div class="field"><h3>README.md</h3><pre id="telegram-readme-preview">No telegram bot executed yet.</pre></div>
          <div class="field"><h3>.env.example</h3><pre id="telegram-env-preview">No telegram bot executed yet.</pre></div>
          <div class="field"><h3>dry_run_test.py</h3><pre id="telegram-dry-run-preview">No telegram bot executed yet.</pre></div>
          <div class="field"><h3>applications.csv</h3><pre id="telegram-csv-preview">No telegram bot executed yet.</pre></div>
          <div class="field"><h3>test_run.log</h3><pre id="telegram-log-preview">No telegram bot executed yet.</pre></div>
          <div class="field"><h3>actual_output.txt</h3><pre id="telegram-output-preview">No telegram bot executed yet.</pre></div>
        </div>

        <div id="artifact-library-panel" class="panel">
          <div class="preview-head"><div><h2 style="margin-bottom:6px;">Project Artifact Library</h2><div class="preview-note">Unified bounded library of created landing/script/telegram bot outputs.</div></div><button id="refresh-artifact-library-btn" class="secondary">Refresh Artifact Library</button></div>
          <div id="artifact-library-list" class="file-list"></div>
        </div>

        <div id="variants-panel" class="panel">
          <h2>Варианты</h2>
          <div id="variants-list" class="variant-grid"></div>
        </div>

        <div id="primary-preview-panel" class="panel">
          <div class="preview-head"><div><h2 style="margin-bottom:6px;">Primary Preview</h2><div class="preview-note">Основной usable preview для Variant B.</div></div><a id="preview-link" class="linkish" href="#" target="_blank" rel="noopener">Open in new tab</a></div>
          <div id="preview-meta" class="meta-grid"></div>
          <div style="margin-top:14px;"></div>
          <iframe id="preview-frame" title="Variant B preview" src="about:blank"></iframe>
        </div>

        <div id="revised-panel" class="panel hidden">
          <div class="preview-head"><div><h2 style="margin-bottom:6px;">Revised Preview</h2><div class="preview-note">Показывается после execute revision.</div></div><a id="revised-preview-link" class="linkish" href="#" target="_blank" rel="noopener">Open revised preview</a></div>
          <div id="revised-summary" class="meta-grid"></div>
          <div style="margin-top:14px;"></div>
          <iframe id="revised-preview-frame" title="Revised preview" src="about:blank"></iframe>
        </div>

        <div class="panel">
          <h2>Advanced debug JSON</h2>
          <details>
            <summary id="debug-summary">Open debug JSON</summary>
            <pre id="surface-json">{}</pre>
          </details>
        </div>
      </section>
    </div>
  </div>
  <script>
    const state = {
      orderId: ${JSON.stringify(rawOrderId || '')},
      surface: null,
      latestPlan: null,
      lastScriptResult: null,
      lastTelegramBotResult: null,
      artifactLibrary: [],
      currentProjectType: 'unknown',
      currentScriptOrderId: '',
      currentBotOrderId: '',
      currentScriptProjectArtifactId: ''
    };
    const $ = (id) => document.getElementById(id);
    const defaultScriptBrief = ${JSON.stringify(defaultScriptBrief)};
    const defaultTelegramBrief = ${JSON.stringify(defaultBrief)};

    function setStatus(text) { $('status-line').textContent = 'Status: ' + text; }
    function safe(v) { return v == null || v === '' ? '—' : String(v); }
    function chip(label, value) { return '<span class="chip"><span class="muted">' + label + '</span><strong>' + safe(value) + '</strong></span>'; }
    function renderMetaGrid(node, entries) { node.innerHTML = entries.map(([label, value]) => '<div class="meta-item"><div class="label">' + label + '</div><div class="value">' + safe(value) + '</div></div>').join(''); }
    function renderBulletList(node, items) { node.innerHTML = (items || []).map((item) => '<li>' + safe(item) + '</li>').join(''); }
    async function fetchText(url) { const response = await fetch(url); if (!response.ok) throw new Error('Failed to fetch ' + url); return response.text(); }

    function updateHeaderChips() {
      if (state.currentProjectType === 'script') {
        $('hero-chips').innerHTML = [chip('Order', state.currentScriptOrderId || state.orderId || 'not created'), chip('Project type', 'script'), chip('Scenario', state.lastScriptResult?.scenario || 'pending'), chip('Test', state.lastScriptResult?.test?.ok ? 'ok' : 'pending'), chip('Safety', state.lastScriptResult?.safety_level || 'bounded_demo')].join('');
        return;
      }
      if (state.currentProjectType === 'telegram_bot') {
        $('hero-chips').innerHTML = [chip('Order', state.currentBotOrderId || state.orderId || 'not created'), chip('Project type', 'telegram_bot'), chip('Scenario', state.lastTelegramBotResult?.scenario || 'lead_capture_bot'), chip('Test', state.lastTelegramBotResult?.test?.ok ? 'ok' : 'pending'), chip('Safety', state.lastTelegramBotResult?.safety_level || 'bounded_demo')].join('');
        return;
      }
      $('hero-chips').innerHTML = [chip('Order', state.orderId || 'not created'), chip('Project type', state.currentProjectType || 'unknown'), chip('Deliverable', state.latestPlan?.desired_deliverable || $('deliverable-select').value || 'preview'), chip('Tech', state.latestPlan?.tech_preference || $('tech-select').value || 'auto')].join('');
    }

    function updateDebugJson() {
      let payload = { surface: state.surface, plan: state.latestPlan };
      if (state.currentProjectType === 'script') payload = { script_surface: state.lastScriptResult, plan: state.latestPlan };
      if (state.currentProjectType === 'telegram_bot') payload = { telegram_bot_surface: state.lastTelegramBotResult, plan: state.latestPlan };
      $('surface-json').textContent = JSON.stringify(payload, null, 2);
    }

    function syncProjectVisibility() {
      const isScript = state.currentProjectType === 'script';
      const isTelegram = state.currentProjectType === 'telegram_bot';
      const isLanding = state.currentProjectType === 'landing_page';
      const isIdle = !isScript && !isTelegram && !isLanding;
      $('landing-workflow-panel').classList.toggle('hidden', isScript || isTelegram);
      $('revision-panel').classList.toggle('hidden', !isLanding);
      $('variants-panel').classList.toggle('hidden', !isLanding);
      $('primary-preview-panel').classList.toggle('hidden', !isLanding);
      $('revised-panel').classList.toggle('hidden', !isLanding || $('revised-preview-frame').src === 'about:blank');
      $('script-program-panel').classList.toggle('hidden', !isScript || !state.lastScriptResult);
      $('script-run-history-panel').classList.toggle('hidden', !isScript || !state.currentScriptProjectArtifactId);
      $('script-supporting-files-panel').classList.toggle('hidden', !isScript || !state.lastScriptResult);
      $('telegram-bot-result-panel').classList.toggle('hidden', !isTelegram || !state.lastTelegramBotResult);
      $('refresh-script-surface-btn').classList.toggle('hidden', !isScript);
      $('refresh-telegram-bot-surface-btn').classList.toggle('hidden', !isTelegram);
      $('workflow-collapsed-note').classList.toggle('hidden', !isIdle);
      $('script-hints').classList.toggle('hidden', $('project-type-select').value !== 'script');
      $('telegram-hints').classList.toggle('hidden', $('project-type-select').value !== 'telegram_bot');
      $('debug-summary').textContent = isScript ? 'Open script debug JSON' : isTelegram ? 'Open telegram bot debug JSON' : 'Open landing debug JSON';
    }

    function updateActionButtons() {
      $('execute-script-btn').disabled = $('project-type-select').value !== 'script';
      $('execute-telegram-bot-btn').disabled = $('project-type-select').value !== 'telegram_bot';
      if ($('project-type-select').value === 'script' && (!$('brief-text').value.trim() || $('brief-text').value.includes('Telegram-бота'))) $('brief-text').value = defaultScriptBrief;
      if ($('project-type-select').value === 'telegram_bot' && (!$('brief-text').value.trim() || $('brief-text').value.includes('CSV и считает сумму'))) $('brief-text').value = defaultTelegramBrief;
    }

    function getPrimaryPreviewRoute(surface) { return surface?.public_delivery_bundle?.selected_preview?.preview_route_path || surface?.public_delivery_bundle?.initial_previews?.find((p) => p.branch_name === 'B')?.preview_route_path || surface?.primary_variant?.preview_route_path || surface?.selected_variant?.preview_route_path || null; }
    function getRevisedPreviewRoute(surface) { return surface?.public_delivery_bundle?.revised_preview?.preview_route_path || surface?.revision_lane?.revised_preview_route_path || surface?.latest_revision_request?.revision_result?.preview_route_path || null; }

    function renderWorkflow(surface) {
      const hasOrder = Boolean(surface?.order?.order_id);
      const hasSelected = Boolean(surface?.selected_variant_id);
      const hasRevision = Boolean(surface?.latest_revision_request?.revision_request_id);
      const hasRevised = Boolean(getRevisedPreviewRoute(surface));
      const steps = [
        { index: '01', title: 'Create / Load Demo Order', status: hasOrder ? 'done' : 'pending', note: hasOrder ? 'Order loaded' : 'Создайте или загрузите demo order' },
        { index: '02', title: 'Select Variant B', status: hasSelected ? 'done' : (hasOrder ? 'ready' : 'pending'), note: hasSelected ? 'Variant B selected' : 'Выберите primary MVP variant' },
        { index: '03', title: 'Submit Revision', status: hasRevision ? 'done' : (hasSelected ? 'ready' : 'pending'), note: hasRevision ? 'Revision request created' : 'Добавьте правку для hero / CTA / trust' },
        { index: '04', title: 'Execute Revision', status: hasRevised ? 'done' : (hasRevision ? 'ready' : 'pending'), note: hasRevised ? 'Revised preview generated' : 'Запустите execute revision' },
      ];
      $('workflow-steps').innerHTML = steps.map((step) => '<div class="step-card"><div class="step-head"><div style="display:flex;align-items:center;gap:10px;"><span class="step-index">' + step.index + '</span><strong>' + step.title + '</strong></div><span class="badge">' + step.status + '</span></div><div class="muted">' + step.note + '</div></div>').join('');
    }

    function renderVariants(surface) {
      const variants = surface?.variants || [];
      const previewRoute = getPrimaryPreviewRoute(surface);
      $('variants-list').innerHTML = variants.map((variant) => '<div class="variant-card"><strong>Variant ' + safe(variant.branch_name || '') + '</strong><div class="muted" style="margin:8px 0 12px;">' + (variant.branch_name === 'B' ? 'Primary MVP' : 'Placeholder') + '</div><div>' + ((variant.branch_name === 'B' && previewRoute) ? '<a class="linkish" href="' + previewRoute + '" target="_blank" rel="noopener">Open preview</a>' : '<span class="muted">Preview reserved</span>') + '</div></div>').join('');
    }

    function renderLandingSurface(surface) {
      state.surface = surface;
      state.currentProjectType = 'landing_page';
      const primary = surface?.primary_variant || {};
      const revisionLane = surface?.revision_lane || {};
      const delivery = surface?.public_delivery_bundle || {};
      const previewRoute = getPrimaryPreviewRoute(surface);
      const revisedPreviewRoute = getRevisedPreviewRoute(surface);
      renderWorkflow(surface);
      renderVariants(surface);
      renderMetaGrid($('preview-meta'), [['Build artifact', primary?.build_artifact_id || 'pending'], ['QA status', primary?.qa_summary?.status || primary?.qa_summary?.result || 'Needs review'], ['Preview available', previewRoute ? 'Yes' : 'No']]);
      $('preview-link').href = previewRoute || '#';
      $('preview-frame').src = previewRoute || 'about:blank';
      renderMetaGrid($('revised-summary'), [['Revision status', revisionLane.status || 'pending'], ['Revised artifact id', revisionLane.revised_build_artifact_id || 'pending'], ['Public delivery revision available', delivery?.revised_preview ? 'Yes' : 'No']]);
      $('revised-preview-link').href = revisedPreviewRoute || '#';
      $('revised-preview-frame').src = revisedPreviewRoute || 'about:blank';
      $('revision-status-note').textContent = 'Last revision status: ' + safe(revisionLane.status || surface?.latest_revision_request?.status || 'pending');
      updateHeaderChips(); updateDebugJson(); syncProjectVisibility();
    }

    async function renderScriptSurface(surface) {
      state.currentProjectType = 'script';
      state.currentScriptOrderId = surface.order_id || state.currentScriptOrderId;
      state.currentScriptProjectArtifactId = surface.project_artifact_id || state.currentScriptProjectArtifactId;
      state.lastScriptResult = { order_id: surface.order_id, project_type: 'script', scenario: surface.script_execution?.scenario, language: surface.script_execution?.language, safety_level: surface.script_execution?.safety_level, artifact_id: surface.script_execution?.artifact_id, artifact_root: surface.script_execution?.artifact_root, files: surface.files, safe_routes: surface.safe_routes, test: surface.test, next_action: surface.next_action, project_artifact_id: surface.project_artifact_id };
      
      // Update header badges
      $('script-scenario-badge').textContent = surface.script_execution?.scenario || 'unknown';
      $('script-test-badge').textContent = 'test: ' + (surface.test?.ok ? 'ok' : 'failed');
      
      // Update meta header
      renderMetaGrid($('script-program-header'), [
        ['Scenario', surface.script_execution?.scenario || 'pending'],
        ['Language', surface.script_execution?.language || 'python'],
        ['Safety level', surface.script_execution?.safety_level || 'bounded_demo'],
        ['Test status', surface.test?.ok ? 'ok' : 'failed']
      ]);
      
      // Load and display script code
      const [scriptText, logText, outputText] = await Promise.all([fetchText(surface.safe_routes.script), fetchText(surface.safe_routes.test_run_log), fetchText(surface.safe_routes.actual_output)]);
      $('script-code-block').textContent = scriptText;
      $('script-log-preview').textContent = logText;
      $('script-output-preview').textContent = outputText;
      
      // Update supporting files
      $('script-files').innerHTML = Object.entries(surface.safe_routes || {}).filter(([key]) => key !== 'script').map(([key, route]) => '<a class="linkish" href="' + route + '" target="_blank" rel="noopener">' + safe(key) + ' → ' + safe(surface.files?.[key]) + '</a>').join('');
      
      // Reset execution output
      $('script-execution-output').classList.add('hidden');
      $('script-run-state').textContent = 'idle';
      
      updateHeaderChips(); updateDebugJson(); syncProjectVisibility();
    }

    async function renderTelegramBotSurface(surface) {
      state.currentProjectType = 'telegram_bot';
      state.currentBotOrderId = surface.order_id || state.currentBotOrderId;
      state.lastTelegramBotResult = { order_id: surface.order_id, project_type: 'telegram_bot', scenario: surface.bot_execution?.scenario, language: surface.bot_execution?.language, safety_level: surface.bot_execution?.safety_level, artifact_id: surface.bot_execution?.artifact_id, bot_execution_id: surface.bot_execution?.bot_execution_id, artifact_root: surface.bot_execution?.artifact_root, files: surface.files, safe_routes: surface.safe_routes, test: surface.test, next_action: surface.next_action };
      renderMetaGrid($('telegram-bot-meta'), [['Scenario', surface.bot_execution?.scenario || 'pending'], ['Language', surface.bot_execution?.language || 'python'], ['Safety level', surface.bot_execution?.safety_level || 'bounded_demo'], ['Test status', surface.test?.ok ? 'ok' : 'failed'], ['Command', surface.test?.command || 'pending'], ['Next action', surface.next_action || 'review_telegram_bot_package']]);
      $('telegram-bot-files').innerHTML = Object.entries(surface.safe_routes || {}).map(([key, route]) => '<a class="linkish" href="' + route + '" target="_blank" rel="noopener">' + safe(key) + ' → ' + safe(surface.files?.[key]) + '</a>').join('');
      const [botText, readmeText, envText, dryRunText, csvText, logText, outputText] = await Promise.all([fetchText(surface.safe_routes.bot), fetchText(surface.safe_routes.readme), fetchText(surface.safe_routes.env_example), fetchText(surface.safe_routes.dry_run_test), fetchText(surface.safe_routes.applications_csv), fetchText(surface.safe_routes.test_run_log), fetchText(surface.safe_routes.actual_output)]);
      $('telegram-bot-preview').textContent = botText;
      $('telegram-readme-preview').textContent = readmeText;
      $('telegram-env-preview').textContent = envText;
      $('telegram-dry-run-preview').textContent = dryRunText;
      $('telegram-csv-preview').textContent = csvText;
      $('telegram-log-preview').textContent = logText;
      $('telegram-output-preview').textContent = outputText;
      updateHeaderChips(); updateDebugJson(); syncProjectVisibility();
    }

    function renderPlan(plan) {
      state.latestPlan = plan;
      state.currentProjectType = plan?.project_type || state.currentProjectType;
      renderMetaGrid($('plan-meta'), [['Project type', plan?.project_type || 'pending'], ['Workflow', plan?.recommended_workflow || 'pending'], ['Next action', plan?.next_action || 'pending']]);
      $('plan-brief').textContent = plan?.normalized_brief || 'Analyze a brief to generate a plan.';
      $('plan-agents').innerHTML = (plan?.required_agents || []).map((agent) => '<span class="chip"><strong>' + safe(agent) + '</strong></span>').join('');
      renderBulletList($('plan-stages'), plan?.execution_stages || []);
      renderBulletList($('plan-artifacts'), plan?.expected_artifacts || []);
      renderBulletList($('plan-qa'), plan?.qa_plan || []);
      $('clarification-panel').classList.toggle('hidden', !(plan?.clarification_questions?.length));
      renderBulletList($('plan-clarifications'), plan?.clarification_questions || []);
      $('start-mvp-build-btn').disabled = plan?.project_type === 'script' || plan?.project_type === 'telegram_bot';
      updateHeaderChips(); updateDebugJson(); syncProjectVisibility();
    }

    function extractOrderId(payload) { return String(payload?.order_id || payload?.orderId || payload?.order?.order_id || payload?.webstudio_order_surface?.order?.order_id || '').trim(); }
    function getCurrentOrderId() { const orderId = String(state.orderId || $('order-id-input').value || '').trim(); if (!orderId) throw new Error('Order ID is empty.'); state.orderId = orderId; $('order-id-input').value = orderId; return orderId; }
    async function postJson(url, body) { const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Request failed'); return payload; }
    async function loadLandingSurface(orderId) { const response = await fetch('/api/export/webstudio-order-surface/' + encodeURIComponent(orderId)); const payload = await response.json(); const surface = payload?.webstudio_order_surface || payload; if (!response.ok || payload?.ok === false) throw new Error(payload.error || 'Failed to load landing surface'); renderLandingSurface(surface); return surface; }
    async function loadScriptSurface(orderId) { const response = await fetch('/api/demo/webstudio-order/script-surface/' + encodeURIComponent(orderId)); const payload = await response.json(); if (!response.ok || !payload.ok) throw new Error(payload.error || 'Failed to load script surface'); await renderScriptSurface(payload); return payload; }
    async function loadTelegramBotSurface(orderId) { const response = await fetch('/api/demo/webstudio-order/telegram-bot-surface/' + encodeURIComponent(orderId)); const payload = await response.json(); if (!response.ok || !payload.ok) throw new Error(payload.error || 'Failed to load telegram bot surface'); await renderTelegramBotSurface(payload); return payload; }
    async function loadArtifactLibrary() {
      const response = await fetch('/api/demo/webstudio-order/project-artifacts');
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Failed to load artifact library');
      state.artifactLibrary = payload.artifacts || [];
      $('artifact-library-list').innerHTML = state.artifactLibrary.map((artifact) => {
        const links = (artifact.file_routes || []).slice(0, 8).map((item) => '<a class="linkish" href="' + safe(item.route) + '" target="_blank" rel="noopener">' + safe(item.label || item.key || 'file') + '</a>').join('<br>');
        const download = artifact.download_url ? '<a class="linkish" href="' + artifact.download_url + '" target="_blank" rel="noopener">Download ZIP</a>' : '<span class="muted">Download unavailable</span>';
        const copyButton = '<button class="secondary" data-copy-order="' + safe(artifact.order_id) + '">Copy order_id</button>';
        const clientDelivery = '<a class="linkish" href="/webstudio/delivery/' + safe(artifact.project_artifact_id) + '" target="_blank" rel="noopener">Open client delivery</a>';
        const runInfo = artifact.run_count != null ? '<div class="row" style="margin-top:6px;"><span class="chip"><span class="muted">Runs</span><strong>' + artifact.run_count + '</strong></span>' + (artifact.last_run_status ? '<span class="chip"><span class="muted">Last run</span><strong>' + safe(artifact.last_run_status) + '</strong></span>' : '') + (artifact.last_run_duration_ms ? '<span class="chip"><span class="muted">Duration</span><strong>' + (artifact.last_run_duration_ms / 1000).toFixed(2) + 's</strong></span>' : '') + '</div>' : '';
        const lastRunAt = artifact.last_run_at ? '<div class="muted" style="margin-top:4px;">Last run: ' + safe(new Date(artifact.last_run_at).toLocaleString('ru-RU', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })) + '</div>' : '';
        return '<div class="step-card">' +
          '<div class="step-head"><strong>' + safe(artifact.title || artifact.project_type) + '</strong><span class="badge">' + safe(artifact.status) + '</span></div>' +
          '<div class="row" style="margin-top:0;"><span class="chip"><strong>' + safe(artifact.project_type) + '</strong></span><span class="chip"><strong>' + safe(artifact.scenario) + '</strong></span><span class="chip"><strong>Test: ' + safe(artifact.test_status) + '</strong></span></div>' +
          '<div class="muted" style="margin-top:8px;">Order: ' + safe(artifact.order_id) + '</div>' +
          '<div class="muted" style="margin-top:6px;">Created: ' + safe(artifact.created_at) + '</div>' +
          runInfo + lastRunAt +
          '<div class="row" style="margin-top:8px;"><a class="linkish" href="' + safe(artifact.surface_url || '#') + '" target="_blank" rel="noopener">Open surface</a>' + clientDelivery + download + copyButton + '</div>' +
          '<div style="margin-top:10px;">' + links + '</div>' +
        '</div>';
      }).join('');
      Array.from(document.querySelectorAll('[data-copy-order]')).forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(button.getAttribute('data-copy-order') || '');
            setStatus('order_id copied');
          } catch {
            setStatus('copy failed');
          }
        });
      });
      return payload;
    }
    async function createFullMvp() { const payload = await postJson('/api/demo/webstudio-order/full-mvp', {}); const orderId = extractOrderId(payload); if (!orderId) throw new Error('Full MVP response did not include order_id'); state.orderId = orderId; $('order-id-input').value = orderId; await loadLandingSurface(orderId); }

    $('project-type-select').addEventListener('change', () => { state.currentProjectType = $('project-type-select').value || 'unknown'; updateActionButtons(); updateHeaderChips(); syncProjectVisibility(); });

    $('analyze-brief-btn').addEventListener('click', async () => {
      try {
        setStatus('analyzing brief…');
        const payload = await postJson('/api/demo/webstudio-order/analyze-brief', { project_type: $('project-type-select').value, brief: $('brief-text').value.trim(), desired_deliverable: $('deliverable-select').value, tech_preference: $('tech-select').value });
        state.orderId = extractOrderId(payload) || state.orderId; $('order-id-input').value = state.orderId || ''; renderPlan(payload);
        if (payload.project_type === 'landing_page') await loadLandingSurface(state.orderId); else { state.surface = null; updateDebugJson(); syncProjectVisibility(); }
        setStatus('project plan ready');
      } catch (error) { setStatus(error.message); }
    });

    $('execute-script-btn').addEventListener('click', async () => {
      try {
        setStatus('executing script MVP…');
        const payload = await postJson('/api/demo/webstudio-order/execute-script', { brief: $('brief-text').value.trim(), tech_preference: $('tech-select').value });
        if (!payload.ok || payload.execution_supported === false) throw new Error('Этот тип скрипта пока не входит в безопасные demo-сценарии. Попробуйте простую CLI-задачу: печать текста, цикл по числам, сумма диапазона, CSV summary, text cleaner, JSON extractor.');
        state.orderId = extractOrderId(payload) || state.orderId;
        state.currentScriptOrderId = state.orderId;
        state.currentScriptProjectArtifactId = payload.project_artifact_id || '';
        $('order-id-input').value = state.orderId || '';
        await loadScriptSurface(state.orderId);
        await loadArtifactLibrary();
        setStatus('script package ready');
      } catch (error) { setStatus(error.message); }
    });

    $('execute-telegram-bot-btn').addEventListener('click', async () => {
      try {
        setStatus('executing telegram bot MVP…');
        const payload = await postJson('/api/demo/webstudio-order/execute-telegram-bot', { brief: $('brief-text').value.trim(), tech_preference: $('tech-select').value });
        if (!payload.ok || payload.execution_supported === false) throw new Error('Этот тип Telegram-бота пока не входит в безопасные demo-сценарии. Попробуйте задачу lead capture bot: имя, телефон, услуга, сообщение, сохранение в CSV.');
        state.orderId = extractOrderId(payload) || state.orderId; state.currentBotOrderId = state.orderId; $('order-id-input').value = state.orderId || ''; await loadTelegramBotSurface(state.orderId); await loadArtifactLibrary(); setStatus('telegram bot package ready');
      } catch (error) { setStatus(error.message); }
    });

    $('start-mvp-build-btn').addEventListener('click', async () => { try { await createFullMvp(); setStatus('landing MVP build started'); } catch (error) { setStatus(error.message); } });
    $('create-demo-btn').addEventListener('click', async () => { try { setStatus('creating/loading demo order…'); await createFullMvp(); setStatus('demo order ready'); } catch (error) { setStatus(error.message); } });
    $('refresh-surface-btn').addEventListener('click', async () => {
      try {
        const orderId = getCurrentOrderId();
        if (state.currentProjectType === 'script') { setStatus('refreshing script surface…'); await loadScriptSurface(orderId); setStatus('script surface refreshed'); return; }
        if (state.currentProjectType === 'telegram_bot') { setStatus('refreshing telegram bot surface…'); await loadTelegramBotSurface(orderId); setStatus('telegram bot surface refreshed'); return; }
        setStatus('refreshing landing surface…'); await loadLandingSurface(orderId); setStatus('landing surface refreshed');
      } catch (error) { setStatus(error.message); }
    });
    $('refresh-script-surface-btn').addEventListener('click', async () => { try { const orderId = state.currentScriptOrderId || getCurrentOrderId(); setStatus('refreshing script surface…'); await loadScriptSurface(orderId); setStatus('script surface refreshed'); } catch (error) { setStatus(error.message); } });
    $('refresh-telegram-bot-surface-btn').addEventListener('click', async () => { try { const orderId = state.currentBotOrderId || getCurrentOrderId(); setStatus('refreshing telegram bot surface…'); await loadTelegramBotSurface(orderId); setStatus('telegram bot surface refreshed'); } catch (error) { setStatus(error.message); } });
    $('refresh-artifact-library-btn').addEventListener('click', async () => { try { setStatus('refreshing artifact library…'); await loadArtifactLibrary(); setStatus('artifact library refreshed'); } catch (error) { setStatus(error.message); } });
    $('select-primary-btn').addEventListener('click', async () => { try { const orderId = getCurrentOrderId(); setStatus('selecting Variant B…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent(orderId) + '/select-primary', {}); await loadLandingSurface(orderId); setStatus('Variant B selected'); } catch (error) { setStatus(error.message); } });
    $('submit-revision-btn').addEventListener('click', async () => { try { const orderId = getCurrentOrderId(); setStatus('submitting revision…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent(orderId) + '/revision', { delta_brief: { requested_changes: [$('revision-text').value.trim()], customer_notes: $('revision-text').value.trim() } }); await loadLandingSurface(orderId); setStatus('revision created'); } catch (error) { setStatus(error.message); } });
    $('execute-revision-btn').addEventListener('click', async () => { try { const orderId = getCurrentOrderId(); setStatus('executing revision…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent(orderId) + '/execute-revision', {}); await loadLandingSurface(orderId); setStatus('revision executed'); } catch (error) { setStatus(error.message); } });

    // Script Run functions

    async function runScriptOnMainPage() {
      if (!state.currentScriptProjectArtifactId) {
        setStatus('No project_artifact_id available');
        return;
      }
      const runBtn = $('run-script-btn');
      const runState = $('script-run-state');
      runBtn.disabled = true;
      runBtn.textContent = 'Running...';
      runState.textContent = 'running';
      setStatus('running script on main page…');

      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/run', { method: 'POST' });
        const result = await response.json();

        if (!result.ok) {
          setStatus('Run failed: ' + (result.error || result.reason || 'Unknown error'));
          runBtn.disabled = false;
          runBtn.textContent = 'Run';
          runState.textContent = 'failed';
          return;
        }

        renderScriptExecutionOutput(result);
        await loadScriptRunHistory();
        setStatus('Run saved to history');
        await loadArtifactLibrary();
      } catch (error) {
        setStatus('Run error: ' + error.message);
        console.warn('Script run failed', { status: response?.status, body: result, error });
        runState.textContent = 'failed';
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Run';
        if (runState.textContent === 'running') runState.textContent = 'completed';
      }
    }

    function renderScriptExecutionOutput(result) {
      const outputPanel = $('script-execution-output');
      const execMeta = $('script-exec-meta');
      const execCommand = $('script-exec-command');
      const execStdout = $('script-exec-stdout');
      const execStderr = $('script-exec-stderr');
      const execStderrField = $('script-exec-stderr-field');

      outputPanel.classList.remove('hidden');
      
      const durationSec = (result.duration_ms / 1000).toFixed(2);
      renderMetaGrid(execMeta, [
        ['Status', result.ok ? 'ok' : 'failed'],
        ['Exit code', result.exit_code],
        ['Duration', durationSec + 's']
      ]);
      execCommand.textContent = Array.isArray(result.command) ? result.command.join(' ') : (result.command || '');
      execStdout.textContent = result.stdout || '(no output)';
      if (result.stderr && result.stderr.trim()) {
        execStderr.textContent = result.stderr;
        execStderrField.classList.remove('hidden');
      } else {
        execStderrField.classList.add('hidden');
      }
    }

    async function loadScriptRunHistory() {
      if (!state.currentScriptProjectArtifactId) return;
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/run-history');
        const result = await response.json();
        if (!result.ok) return;
        
        const historyList = $('script-run-history-list');
        if (!result.runs || result.runs.length === 0) {
          historyList.innerHTML = '<div class="preview-note">No runs yet</div>';
          return;
        }
        
        // Sort by run_number descending (latest first)
        const runs = result.runs.sort((a, b) => (b.run_number || 0) - (a.run_number || 0));
        historyList.innerHTML = runs.map((run) => {
          const statusBadge = run.ok ? '<span class="badge">ok</span>' : '<span class="badge failed">failed</span>';
          const durationSec = ((run.duration_ms || 0) / 1000).toFixed(2);
          const stdoutPreview = (run.stdout || '').slice(0, 80) + ((run.stdout || '').length > 80 ? '...' : '');
          return '<div class="step-card"><div class="step-head"><span class="step-index">#' + (run.run_number || '?') + '</span><div style="display:flex;gap:8px;align-items:center;">' + statusBadge + '<span class="muted">exit=' + run.exit_code + ' · ' + durationSec + 's</span></div></div><div class="muted" style="font-size:12px;">' + (run.started_at || '') + '</div><pre style="margin-top:8px;font-size:12px;max-height:120px;">' + stdoutPreview + '</pre></div>';
        }).join('');
        
        $('script-run-history-panel').classList.remove('hidden');
      } catch (error) {
        console.warn('Failed to load run history', error);
      }
    }

    $('run-script-btn').addEventListener('click', runScriptOnMainPage);
    $('run-script-again-btn').addEventListener('click', runScriptOnMainPage);

    renderPlan({ project_type: 'unknown', normalized_brief: 'Заполните brief, чтобы получить routing plan для проекта.', recommended_workflow: 'brief_intake_router_flow', required_agents: ['CTO'], expected_artifacts: ['project plan'], execution_stages: ['Collect brief', 'Analyze request', 'Route to matching workflow'], qa_plan: ['Check required fields', 'Validate project classification'], clarification_questions: [], next_action: 'Analyze Brief / Create Plan', desired_deliverable: $('deliverable-select').value, tech_preference: $('tech-select').value });
    updateActionButtons(); updateHeaderChips(); syncProjectVisibility(); updateDebugJson(); loadArtifactLibrary().catch(() => {});
  </script>
</body>
</html>`;
}

module.exports = {
  renderWebStudioDemoPage,
  escapeHtml,
};
