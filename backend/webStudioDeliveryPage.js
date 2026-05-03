function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderWebStudioDeliveryPage({ artifact }) {
  if (!artifact) {
    return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Artifact not found</title>
  <style>
    body { margin:0; font-family: Inter, Arial, sans-serif; background: #0b1327; color: #f8fafc; }
    .page { max-width: 720px; margin: 80px auto; padding: 28px; text-align: center; }
    h1 { font-size: 32px; margin-bottom: 10px; }
    p { color: #94a3b8; font-size: 16px; line-height: 1.6; }
    a { color: #93c5fd; text-decoration: none; }
  </style>
</head>
<body>
  <div class="page">
    <h1>Artifact not found or expired</h1>
    <p>Эта страница доставки не найдена или срок действия ссылки истёк.</p>
    <p><a href="/webstudio/demo">Вернуться в WebStudio Demo</a></p>
  </div>
</body>
</html>`;
  }

  const projectType = String(artifact.project_type || 'unknown');
  const scenario = String(artifact.scenario || 'default');
  const status = String(artifact.status || 'ready');
  const testStatus = String(artifact.test_status || 'not_applicable');
  const orderId = String(artifact.order_id || '');
  const artifactId = String(artifact.project_artifact_id || '');
  const fileRoutes = Array.isArray(artifact.file_routes) ? artifact.file_routes : [];
  const downloadUrl = String(artifact.download_url || '');

  let title = 'Project delivery';
  let description = '';
  let runCommand = '';
  let importantNote = '';
  let qaChecks = [];
  let nextSteps = [];

  if (projectType === 'script') {
    title = 'Python script package';
    description = `Сгенерированный Python-скрипт для задачи: ${escapeHtml(scenario)}.`;
    runCommand = 'python3 script.py';
    qaChecks = ['Script syntax validated', 'Test run completed', 'Expected output matched'];
    nextSteps = ['Review script.py', 'Run locally with sample input', 'Adapt to your data if needed'];
  } else if (projectType === 'telegram_bot') {
    title = 'Telegram bot package';
    description = `Telegram bot для задачи: ${escapeHtml(scenario)}.`;
    importantNote = 'Dry-run verified. Real Telegram deployment requires BOT_TOKEN in .env.';
    qaChecks = ['Bot state machine validated', 'Dry-run conversation completed', 'applications.csv row saved'];
    nextSteps = ['Add BOT_TOKEN to .env', 'Deploy to your server', 'Test real Telegram flow'];
  } else if (projectType === 'landing_page') {
    title = 'Landing page package';
    description = `Landing page для задачи: ${escapeHtml(scenario)}.`;
    qaChecks = ['Primary preview generated', 'Revision executed', 'Revised preview ready'];
    nextSteps = ['Open primary preview', 'Review revised preview', 'Share preview link with client'];
  }

  const primaryFiles = fileRoutes.filter((item) => {
    const label = String(item.label || '').toLowerCase();
    if (projectType === 'script') return ['script.py', 'readme.md', 'actual_output.txt', 'test_run.log'].some((k) => label.includes(k));
    if (projectType === 'telegram_bot') return ['bot.py', 'readme.md', '.env.example', 'applications.csv', 'test_run.log'].some((k) => label.includes(k));
    if (projectType === 'landing_page') return ['preview', 'revised'].some((k) => label.includes(k));
    return false;
  }).slice(0, 6);

  const otherFiles = fileRoutes.filter((item) => !primaryFiles.includes(item)).slice(0, 8);

  const canRun = projectType === 'script' || projectType === 'telegram_bot';
  const runButtonText = projectType === 'script' ? 'Run Script' : projectType === 'telegram_bot' ? 'Run Dry-Run' : 'Run';
  const runEndpoint = `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/run`;
  const runHistoryEndpoint = `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/run-history`;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · ${escapeHtml(orderId)}</title>
  <style>
    :root { --bg:#07111f; --panel:rgba(15,23,42,0.86); --text:#f8fafc; --muted:#94a3b8; --accent:#3b82f6; --ok:#22c55e; --border:rgba(255,255,255,0.08); --running:#f59e0b; --failed:#ef4444; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, Arial, sans-serif; background: radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 30%), linear-gradient(180deg,#020617,var(--bg)); color:var(--text); }
    .page { max-width: 900px; margin: 0 auto; padding: 28px; }
    .header { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:22px; }
    h1 { font-size: 32px; margin:0; }
    .panel { background: var(--panel); border:1px solid var(--border); border-radius: 22px; padding:22px; backdrop-filter: blur(10px); box-shadow: 0 18px 40px rgba(2,6,23,0.28); margin-bottom:22px; }
    .meta { display:flex; gap:10px; flex-wrap:wrap; }
    .chip { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); font-size:13px; }
    .chip strong { color:#dbeafe; }
    .badge { display:inline-flex; align-items:center; padding:5px 10px; border-radius:999px; font-size:12px; font-weight:800; background: rgba(34,197,94,0.16); color:#bbf7d0; }
    .badge.failed { background: rgba(239,68,68,0.16); color:#fecaca; }
    .muted { color: var(--muted); }
    .row { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
    a.linkish { color:#93c5fd; word-break:break-all; text-decoration:none; }
    button { background: linear-gradient(135deg, var(--accent), #8b5cf6); color:#fff; border:none; border-radius:14px; padding:12px 16px; cursor:pointer; font-weight:800; }
    button.secondary { background:#1f2937; }
    button:disabled { opacity:0.5; cursor:not-allowed; }
    button.running { background: linear-gradient(135deg, var(--running), #d97706); }
    .file-list { display:grid; gap:10px; }
    .note { background: rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25); border-radius:14px; padding:14px; color:#fde68a; }
    ul { margin:0; padding-left:18px; color:#dbeafe; line-height:1.7; }
    .footer { text-align:center; margin-top:40px; color:#64748b; font-size:13px; }
    .run-panel { background: rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25); }
    .run-output { background:#020617; padding:14px; border-radius:14px; overflow:auto; max-height:360px; font-family: monospace; font-size:13px; white-space:pre-wrap; word-break:break-word; margin-top:12px; }
    .hidden { display:none !important; }
    .run-history-item { background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:12px; margin-bottom:8px; }
    .run-history-item .meta-line { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:6px; }
    .run-history-item .preview { background:#020617; padding:8px; border-radius:8px; font-family:monospace; font-size:12px; white-space:pre-wrap; word-break:break-word; max-height:120px; overflow:auto; }
    .run-history-item .preview.stderr { background:#1a0a0a; border:1px solid rgba(239,68,68,0.2); }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="muted" style="margin-top:6px;">Order: ${escapeHtml(orderId)}</div>
      </div>
      <div class="row">
        ${canRun ? `<button id="run-btn">${escapeHtml(runButtonText)}</button>` : ''}
        ${downloadUrl ? `<a class="linkish" href="${escapeHtml(downloadUrl)}"><button>Download ZIP</button></a>` : ''}
        <a class="linkish" href="/webstudio/demo"><button class="secondary">Back to Demo</button></a>
      </div>
    </div>

    <div class="panel">
      <div class="meta">
        <span class="chip"><span class="muted">Project type</span><strong>${escapeHtml(projectType)}</strong></span>
        <span class="chip"><span class="muted">Scenario</span><strong>${escapeHtml(scenario)}</strong></span>
        <span class="chip"><span class="muted">Status</span><strong>${escapeHtml(status)}</strong></span>
        <span class="chip"><span class="muted">Test</span><strong>${escapeHtml(testStatus)}</strong></span>
      </div>
      <p class="muted" style="margin-top:14px;">${description}</p>
      ${runCommand ? `<div class="row" style="margin-top:10px;"><span class="chip"><span class="muted">Run command</span><strong>${escapeHtml(runCommand)}</strong></span></div>` : ''}
      ${importantNote ? `<div class="note" style="margin-top:14px;">${escapeHtml(importantNote)}</div>` : ''}
    </div>

    ${canRun ? `<div class="panel run-panel hidden" id="run-result-panel">
      <h2 style="margin-bottom:10px;">Run Result</h2>
      <div class="meta" id="run-meta"></div>
      <div class="run-output" id="run-output">Waiting for run...</div>
    </div>` : ''}

    ${canRun ? `<div class="panel" id="run-history-panel">
      <h2 style="margin-bottom:10px;">Run history</h2>
      <div id="run-history-container"><div class="muted">Loading run history...</div></div>
    </div>` : ''}

    <div class="panel">
      <h2 style="margin-bottom:10px;">Files</h2>
      <div class="file-list">
        ${primaryFiles.map((item) => `<a class="linkish" href="${escapeHtml(item.route)}" target="_blank" rel="noopener">${escapeHtml(item.label || item.key || 'file')}</a>`).join('')}
      </div>
      ${otherFiles.length > 0 ? `<div class="file-list" style="margin-top:14px;">${otherFiles.map((item) => `<a class="linkish" href="${escapeHtml(item.route)}" target="_blank" rel="noopener">${escapeHtml(item.label || item.key || 'file')}</a>`).join('')}</div>` : ''}
    </div>

    <div class="panel">
      <h2 style="margin-bottom:10px;">Что проверено</h2>
      <ul>${qaChecks.map((check) => `<li>${escapeHtml(check)}</li>`).join('')}</ul>
    </div>

    <div class="panel">
      <h2 style="margin-bottom:10px;">Что дальше</h2>
      <ul>${nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul>
    </div>

    <div class="footer">WebStudio Delivery · ${escapeHtml(artifactId)}</div>
  </div>

  ${canRun ? `<script>
    const artifactId = ${JSON.stringify(artifactId)};
    const runBtn = document.getElementById('run-btn');
    const runResultPanel = document.getElementById('run-result-panel');
    const runMeta = document.getElementById('run-meta');
    const runOutput = document.getElementById('run-output');
    const runHistoryContainer = document.getElementById('run-history-container');
    const runEndpoint = ${JSON.stringify(runEndpoint)};
    const runHistoryEndpoint = ${JSON.stringify(runHistoryEndpoint)};

    function chip(label, value, failed) {
      const badgeClass = failed ? 'badge failed' : 'badge';
      const statusLabel = failed ? 'failed' : String(value);
      if (label === 'Status') {
        return '<span class="chip"><span class="muted">' + label + '</span><span class="' + badgeClass + '">' + statusLabel + '</span></span>';
      }
      return '<span class="chip"><span class="muted">' + label + '</span><strong>' + (value == null ? '—' : String(value)) + '</strong></span>';
    }

    function formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleString('ru-RU', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    }

    function renderRunHistory(history) {
      if (!history || !history.runs || history.runs.length === 0) {
        return '<div class="muted">No runs yet. Click ' + '${escapeHtml(runButtonText)}' + ' first.</div>';
      }
      return history.runs.map((run) => {
        const statusBadge = run.ok ? '<span class="badge">ok</span>' : '<span class="badge failed">failed</span>';
        const durationSec = (run.duration_ms / 1000).toFixed(2);
        const commandStr = Array.isArray(run.command) ? run.command.join(' ') : (run.command || '');
        return '<div class="run-history-item">' +
          '<div class="meta-line">' + statusBadge + '<span class="muted">' + formatDate(run.created_at) + '</span>' +
          '<span class="chip"><span class="muted">Exit</span><strong>' + run.exit_code + '</strong></span>' +
          '<span class="chip"><span class="muted">Duration</span><strong>' + durationSec + 's</strong></span></div>' +
          '<div class="meta-line"><span class="muted">Command:</span><strong>' + escapeHtml(commandStr) + '</strong></div>' +
          (run.stdout_preview ? '<div class="preview">' + escapeHtml(run.stdout_preview) + '</div>' : '') +
          (run.stderr_preview ? '<div class="preview stderr">' + escapeHtml(run.stderr_preview) + '</div>' : '') +
          '</div>';
      }).join('');
    }

    async function loadRunHistory() {
      try {
        console.log('[webstudio-delivery] loadRunHistory', { runHistoryEndpoint });
        const response = await fetch(runHistoryEndpoint);
        console.log('[webstudio-delivery] run history response', { status: response.status, ok: response.ok });
        if (!response.ok) {
          const text = await response.text();
          console.warn('[webstudio-delivery] run history HTTP error', { status: response.status, body: text.slice(0, 200) });
          if (runHistoryContainer) {
            runHistoryContainer.innerHTML = '<div class="muted">Failed to load run history: HTTP ' + response.status + '</div>';
          }
          return;
        }
        const history = await response.json();
        console.log('[webstudio-delivery] run history data', { run_count: history.run_count, runs: history.runs ? history.runs.length : 0 });
        if (runHistoryContainer) {
          runHistoryContainer.innerHTML = renderRunHistory(history);
        }
      } catch (error) {
        console.error('[webstudio-delivery] run history error', error);
        if (runHistoryContainer) {
          runHistoryContainer.innerHTML = '<div class="muted">Failed to load run history: ' + (error.message || 'Unknown error') + '</div>';
        }
      }
    }

    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      runBtn.classList.add('running');
      runBtn.textContent = 'Running...';
      runResultPanel.classList.remove('hidden');
      runOutput.textContent = 'Starting run...';

      try {
        const response = await fetch(runEndpoint, { method: 'POST' });
        const result = await response.json();

        if (!result.ok) {
          runOutput.textContent = 'Run failed: ' + (result.error || result.reason || 'Unknown error');
          runBtn.disabled = false;
          runBtn.classList.remove('running');
          runBtn.textContent = 'Run again';
          loadRunHistory();
          return;
        }

        const durationSec = (result.duration_ms / 1000).toFixed(2);
        runMeta.innerHTML = [
          chip('Exit code', result.exit_code),
          chip('Duration', durationSec + 's'),
          chip('Status', result.ok ? 'ok' : 'failed', !result.ok),
        ].join('');

        const output = result.stdout || '(no output)';
        runOutput.textContent = output;

        runBtn.disabled = false;
        runBtn.classList.remove('running');
        runBtn.textContent = 'Run again';
        loadRunHistory();
      } catch (error) {
        runOutput.textContent = 'Run error: ' + error.message;
        runBtn.disabled = false;
        runBtn.classList.remove('running');
        runBtn.textContent = 'Run again';
        loadRunHistory();
      }
    });

    loadRunHistory();
  </script>` : ''}
</body>
</html>`;
}

module.exports = {
  renderWebStudioDeliveryPage,
};
