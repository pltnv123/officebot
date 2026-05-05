function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Safe editable artifact file whitelist
function isSafeEditableArtifactFile(filename) {
  const safeEditable = new Set([
    'script.py',
    'bot.py',
    'README.md',
    'sample_input.csv',
    'sample_input.txt',
    'input.csv',
    'input.txt',
  ]);
  return safeEditable.has(filename);
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
  const fileRoutes = Array.isArray(artifact.file_routes) ? artifact.file_routes : (Array.isArray(artifact.fileRoutes) ? artifact.fileRoutes : []);
  const downloadUrl = String(artifact.download_url || '');
  
  const safeRoutes = {};
  const filesMap = {};
  (fileRoutes || []).forEach(item => {
    const key = String(item.key || '');
    const label = String(item.label || '');
    const route = String(item.route || '');
    if (key && route) {
      safeRoutes[key] = route;
      filesMap[key] = label;
    }
  });

  let title = 'Project delivery';
  let subtitle = '';
  let runCommand = '';
  let importantNote = '';
  let qaChecks = [];
  let nextSteps = [];

  if (projectType === 'script') {
    title = 'Python Script Package';
    subtitle = 'Delivered by WebStudio';
    runCommand = 'python3 script.py';
    qaChecks = ['Script syntax validated', 'Test run completed', 'Expected output matched'];
    nextSteps = ['Review script.py', 'Run locally with sample input', 'Adapt to your data if needed'];
  } else if (projectType === 'telegram_bot') {
    title = 'Telegram Bot Package';
    subtitle = 'Delivered by WebStudio';
    importantNote = 'Dry-run verified. Real Telegram deployment requires BOT_TOKEN in .env.';
    qaChecks = ['Bot state machine validated', 'Dry-run conversation completed', 'applications.csv row saved'];
    nextSteps = ['Add BOT_TOKEN to .env', 'Deploy to your server', 'Test real Telegram flow'];
  } else if (projectType === 'landing_page') {
    title = 'Landing Page Package';
    subtitle = 'Delivered by WebStudio';
    qaChecks = ['Primary preview generated', 'Revision executed', 'Revised preview ready'];
    nextSteps = ['Open primary preview', 'Review revised preview', 'Share preview link with client'];
  }

  const primaryFiles = (fileRoutes || []).filter((item) => {
    const label = String(item.label || '').toLowerCase();
    if (projectType === 'script') return ['script.py', 'readme.md', 'actual_output.txt', 'test_run.log'].some((k) => label.includes(k));
    if (projectType === 'telegram_bot') return ['bot.py', 'readme.md', '.env.example', 'applications.csv', 'test_run.log'].some((k) => label.includes(k));
    if (projectType === 'landing_page') return ['preview', 'revised'].some((k) => label.includes(k));
    return false;
  }).slice(0, 6);

  const otherFiles = (fileRoutes || []).filter((item) => !primaryFiles.includes(item)).slice(0, 8);

  const canRun = projectType === 'script' || projectType === 'telegram_bot';
  const runButtonText = projectType === 'script' ? '▶ Run Script' : projectType === 'telegram_bot' ? '▶ Run Dry-Run' : 'Run';
  const runEndpoint = `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/run`;
  const runHistoryEndpoint = `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/run-history`;
  const defaultFileKey = projectType === 'script' ? 'script' : (projectType === 'telegram_bot' ? 'bot' : null);
  
  const orderIdShort = orderId.slice(-8);
  const artifactIdShort = artifactId.slice(0, 12);
  
  const testStatusDisplay = testStatus === 'ok' ? '✅ Passed' : testStatus === 'failed' ? '❌ Failed' : '⏳ Pending';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · #${escapeHtml(orderIdShort)}</title>
  <style>
    :root {
      --bg: #07111f;
      --bg-gradient: radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 40%), linear-gradient(180deg, #020617, #07111f);
      --panel: rgba(15, 23, 42, 0.7);
      --panel-border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent: #3b82f6;
      --accent-gradient: linear-gradient(135deg, #3b82f6, #8b5cf6);
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --code-bg: #0b1120;
      --code-border: rgba(59, 130, 246, 0.2);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: var(--bg-gradient);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }
    .page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 32px;
      align-items: start;
      margin-bottom: 48px;
      padding-bottom: 40px;
      border-bottom: 1px solid var(--panel-border);
    }
    @media (max-width: 768px) { .hero { grid-template-columns: 1fr; } }
    .hero-title {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 10px;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #f8fafc, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-subtitle { color: var(--text-muted); font-size: 16px; font-weight: 400; }
    .hero-meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; align-items: center; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--panel-border);
      white-space: nowrap;
    }
    .status-chip.success { background: rgba(34, 197, 94, 0.18); border-color: rgba(34, 197, 94, 0.35); color: #86efac; }
    .status-chip.warning { background: rgba(245, 158, 11, 0.18); border-color: rgba(245, 158, 11, 0.35); color: #fcd34d; }
    .status-chip.danger { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.35); color: #fca5a5; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: var(--accent-gradient);
      color: #fff;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-primary.running { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .btn-secondary { background: rgba(255, 255, 255, 0.05); color: var(--text); border: 1px solid var(--panel-border); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
    .panel {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
      margin-bottom: 24px;
    }
    .panel-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
    .code-workspace { display: grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: stretch; }
    @media (max-width: 900px) { .code-workspace { grid-template-columns: 1fr; } }
    .file-tree { background: rgba(0, 0, 0, 0.3); border: 1px solid var(--panel-border); border-radius: 12px; overflow: hidden; }
    .file-tree-header {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--panel-border);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .file-group {
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    .file-group:last-child {
      border-bottom: none;
    }
    .file-group-header {
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.02);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .file-count {
      background: rgba(148, 163, 175, 0.2);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
    }
    .file-group-items {
      background: rgba(0, 0, 0, 0.15);
    }
    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px 10px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
      cursor: pointer;
      font-size: 13px;
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      transition: all 0.15s;
      gap: 8px;
    }
    .file-item:last-child { border-bottom: none; }
    .file-item:hover { background: rgba(255, 255, 255, 0.05); }
    .file-item.active { background: rgba(59, 130, 246, 0.15); border-left: 3px solid var(--accent); }
    .file-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(148, 163, 175, 0.2); color: var(--text-muted); }
    .file-badge.editable { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .code-panel { background: var(--code-bg); border: 1px solid var(--code-border); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
    .code-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--panel-border); }
    .code-filename { font-weight: 600; font-size: 13px; font-family: 'SF Mono', 'Consolas', 'Monaco', monospace; color: #e2e8f0; }
    .code-content {
      flex: 1;
      padding: 0;
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      line-height: 1.8;
      color: #e2e8f0;
      max-height: 600px;
      overflow: hidden;
      background: var(--code-bg);
    }
    .code-content textarea {
      width: 100%;
      height: 600px;
      min-height: 400px;
      padding: 24px;
      background: transparent;
      border: none;
      outline: none;
      resize: vertical;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
      white-space: pre;
      overflow: auto;
    }
    .code-content pre {
      margin: 0;
      padding: 24px;
    }
    .toolbar-group { display: flex; gap: 8px; }
    .toolbar-btn { padding: 6px 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--panel-border); border-radius: 8px; color: var(--text); font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .toolbar-btn:hover { background: rgba(255, 255, 255, 0.1); }
    .console-panel { background: #0a0f1a; border: 1px solid var(--panel-border); border-radius: 12px; overflow: hidden; box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3); }
    .console-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
      border-bottom: 1px solid var(--panel-border);
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      color: #94a3b8;
    }
    .console-output {
      padding: 20px;
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      line-height: 1.75;
      max-height: 450px;
      overflow: auto;
      background: #020617;
    }
    .console-output.stdout { color: #4ade80; }
    .console-output.stderr { color: #f87171; background: rgba(239, 68, 68, 0.08); border-top: 1px solid rgba(239, 68, 68, 0.15); }
    .console-stats {
      display: flex;
      gap: 24px;
      padding: 14px 18px;
      background: linear-gradient(0deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.5));
      border-top: 1px solid var(--panel-border);
      font-size: 13px;
      color: var(--text-muted);
    }
    .console-stats strong { color: var(--text); }
    .run-history-list { display: grid; gap: 10px; }
    .run-history-item { background: rgba(255, 255, 255, 0.02); border: 1px solid var(--panel-border); border-radius: 10px; padding: 14px; transition: all 0.15s; }
    .run-history-item:hover { background: rgba(255, 255, 255, 0.05); }
    .run-history-meta { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
    .run-history-preview { background: #020617; padding: 10px 12px; border-radius: 6px; font-family: 'SF Mono', 'Consolas', 'Monaco', monospace; font-size: 12px; line-height: 1.6; max-height: 100px; overflow: auto; white-space: pre-wrap; word-break: break-word; }
    .run-history-preview.stderr { background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.15); }
    .info-list { list-style: none; padding: 0; }
    .info-list li { padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.03); color: var(--text-muted); font-size: 14px; }
    .info-list li:last-child { border-bottom: none; }
    .info-list li::before { content: '✓'; color: var(--success); margin-right: 10px; font-weight: 700; font-size: 14px; }
    .footer { text-align: center; padding: 40px 0; color: var(--text-dim); font-size: 13px; border-top: 1px solid var(--panel-border); margin-top: 40px; }
    .hidden { display: none !important; }
    .muted { color: var(--text-muted); }
    .text-success { color: var(--success); }
    .text-warning { color: var(--warning); }
    .text-danger { color: var(--danger); }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <div>
        <h1 class="hero-title">${escapeHtml(title)}</h1>
        <div class="hero-subtitle">${escapeHtml(subtitle)}</div>
        <div class="hero-meta">
          <span class="status-chip">📦 ${escapeHtml(projectType)}</span>
          <span class="status-chip">🆔 #${escapeHtml(orderIdShort)}</span>
          <span class="status-chip ${status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'warning'}">
            ${status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳'} ${escapeHtml(status)}
          </span>
          <span class="status-chip ${testStatus === 'ok' ? 'success' : testStatus === 'failed' ? 'danger' : ''}">
            ${testStatusDisplay}
          </span>
        </div>
      </div>
      <div class="hero-actions">
        ${canRun ? `<button id="run-btn" class="btn btn-primary">${escapeHtml(runButtonText)}</button>` : ''}
        ${canRun ? `<button id="run-edited-btn" class="btn btn-secondary">📝 Run Edited</button>` : ''}
        ${downloadUrl ? `<a class="linkish" href="${escapeHtml(downloadUrl)}" style="text-decoration:none;"><button class="btn btn-secondary">📥 Download ZIP</button></a>` : ''}
        <a class="linkish" href="/webstudio/demo" style="text-decoration:none;"><button class="btn btn-secondary">← Back to Demo</button></a>
      </div>
    </div>

    <div class="panel" id="code-workspace-panel">
      <h2 class="panel-title">💻 Code</h2>
      ${projectType === 'script' || projectType === 'telegram_bot' ? `
      <div class="code-workspace">
        <div class="file-tree">
          <div class="file-tree-header">📁 Project Files</div>
          <div id="delivery-file-list"></div>
        </div>
        <div class="code-panel">
          <div class="code-header">
            <span id="delivery-file-title" class="code-filename">script.py</span>
            <div class="toolbar-group">
              <button id="delivery-edit-btn" class="toolbar-btn">✏️ Edit</button>
              <button id="delivery-save-btn" class="toolbar-btn hidden">💾 Save</button>
              <button id="delivery-reset-btn" class="toolbar-btn hidden">↩️ Reset</button>
              <button id="delivery-copy-code-btn" class="toolbar-btn">📋 Copy</button>
            </div>
          </div>
          <div id="delivery-code-content" class="code-content"><pre class="muted">Loading code...</pre></div>
        </div>
      </div>` : `<div class="muted">Code preview not available for this project type.</div>`}
    </div>

    ${canRun ? `<div class="panel" id="execution-console-panel">
      <h2 class="panel-title">⌨️ Execution Console</h2>
      <div class="console-panel hidden" id="run-result-panel">
        <div class="console-header"><span>$ python3 script.py</span><span id="run-status" class="muted">Ready</span></div>
        <div id="run-output" class="console-output">Run the script to see output...</div>
        <div class="console-stats" id="run-stats">
          <span>Exit code: <strong id="run-exit-code">-</strong></span>
          <span>Duration: <strong id="run-duration">-</strong></span>
        </div>
      </div>
      <div class="muted" id="run-prompt">Click "Run Script" to execute the code.</div>
    </div>` : ''}

    ${canRun ? `<div class="panel" id="run-history-panel">
      <h2 class="panel-title">📜 Run History</h2>
      <div id="run-history-container" class="run-history-list"><div class="muted">Loading run history...</div></div>
    </div>` : ''}

    <div class="panel">
      <h2 class="panel-title">📦 Package Files</h2>
      <div class="info-list">
        ${primaryFiles.map((item) => `<li><a class="linkish" href="${escapeHtml(item.route)}" target="_blank" rel="noopener" style="color:var(--text);">${escapeHtml(item.label || item.key || 'file')}</a></li>`).join('')}
        ${otherFiles.length > 0 ? `<li class="muted" style="margin-top:12px;">+ ${otherFiles.length} more files in ZIP download</li>` : ''}
      </div>
    </div>

    <div class="panel">
      <h2 class="panel-title">✅ Quality Checks</h2>
      <ul class="info-list">${qaChecks.map((check) => `<li>${escapeHtml(check)}</li>`).join('')}</ul>
    </div>

    <div class="panel">
      <h2 class="panel-title">🚀 Next Steps</h2>
      <ul class="info-list">${nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul>
    </div>

    <div class="footer">WebStudio Delivery · ${escapeHtml(artifactIdShort)}… · Order #${escapeHtml(orderIdShort)}</div>
  </div>

  ${canRun || (projectType === 'script' || projectType === 'telegram_bot') ? `<script>
    const artifactId = ${JSON.stringify(artifactId)};
    const orderId = ${JSON.stringify(orderId)};
    const projectType = ${JSON.stringify(projectType)};
    const safeRoutes = ${JSON.stringify(safeRoutes)};
    const filesMap = ${JSON.stringify(filesMap)};
    const defaultFileKey = ${JSON.stringify(defaultFileKey)};
    const runBtn = document.getElementById('run-btn');
    const runResultPanel = document.getElementById('run-result-panel');
    const runOutput = document.getElementById('run-output');
    const runStatus = document.getElementById('run-status');
    const runPrompt = document.getElementById('run-prompt');
    const runExitCode = document.getElementById('run-exit-code');
    const runDuration = document.getElementById('run-duration');
    const runHistoryContainer = document.getElementById('run-history-container');
    const runEndpoint = ${JSON.stringify(runEndpoint)};
    const runHistoryEndpoint = ${JSON.stringify(runHistoryEndpoint)};
    const runEditedEndpoint = ${JSON.stringify(runEndpoint + '?source=edited')};
    
    let currentFileKey = defaultFileKey || 'script';
    let currentCode = '';
    let originalFileContent = '';
    let isEditing = false;
    let editedCode = '';
    // Multi-file session editing: editedFiles[fileKey] = editedContent
    let editedFiles = {};

    function escapeHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Safe editable artifact file whitelist (MUST match server-side whitelist)
    function isSafeEditableArtifactFile(filename) {
      const safeEditable = new Set([
        'script.py',
        'bot.py',
        'README.md',
        'sample_input.csv',
        'sample_input.txt',
        'input.csv',
        'input.txt',
      ]);
      return safeEditable.has(filename);
    }

    function formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleString('ru-RU', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    }

    function formatDuration(ms) {
      if (!ms && ms !== 0) return '—';
      if (ms < 1000) return ms + 'ms';
      return (ms / 1000).toFixed(2) + 's';
    }

    function renderRunHistory(history) {
      if (!history || !history.runs || history.runs.length === 0) {
        return '<div class="muted">No runs yet. Click "Run Script" to execute the code.</div>';
      }
      return history.runs.slice(0, 8).map((run) => {
        const statusBadge = run.ok ? '<span class="status-chip success">✅</span>' : '<span class="status-chip danger">❌</span>';
        const durationStr = formatDuration(run.duration_ms);
        const commandStr = Array.isArray(run.command) ? run.command.join(' ') : (run.command || '');
        return '<div class="run-history-item">' +
          '<div class="run-history-meta">' + statusBadge + 
          '<span class="muted" style="font-size:12px;">' + formatDate(run.created_at) + '</span>' +
          '<span class="status-chip" style="font-size:11px;padding:4px 8px;">exit ' + run.exit_code + '</span>' +
          '<span class="status-chip" style="font-size:11px;padding:4px 8px;">' + durationStr + '</span></div>' +
          (commandStr ? '<div class="muted" style="font-size:11px;margin-bottom:8px;color:#64748b;">' + escapeHtml(commandStr) + '</div>' : '') +
          (run.stdout_preview ? '<div class="run-history-preview">' + escapeHtml(run.stdout_preview.slice(0, 200)) + (run.stdout_preview.length > 200 ? '…' : '') + '</div>' : '') +
          (run.stderr_preview ? '<div class="run-history-preview stderr">' + escapeHtml(run.stderr_preview.slice(0, 200)) + (run.stderr_preview.length > 200 ? '…' : '') + '</div>' : '') +
          '</div>';
      }).join('');
    }

    async function loadRunHistory() {
      try {
        const response = await fetch(runHistoryEndpoint);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const history = await response.json();
        runHistoryContainer.innerHTML = renderRunHistory(history);
      } catch (error) {
        console.error('[webstudio-delivery] run history error', error);
        runHistoryContainer.innerHTML = '<div class="muted">Failed to load run history</div>';
      }
    }

    function renderFileList() {
      const fileListEl = document.getElementById('delivery-file-list');
      if (!fileListEl || !filesMap) return;
      
      // Group files by virtual paths
      const groups = {
        'src': { label: '/src — Source', files: [], editable: true },
        'docs': { label: '/docs — Documentation', files: [], editable: false },
        'input': { label: '/input — Input', files: [], editable: false },
        'output': { label: '/output — Output', files: [], editable: false },
        'logs': { label: '/logs — Logs', files: [], editable: false },
        'meta': { label: '/meta — Metadata', files: [], editable: false },
      };
      
      // Categorize files by exact virtual path rules
      Object.entries(filesMap).forEach(([key, label]) => {
        const lowerLabel = label.toLowerCase();
        const filename = filesMap[key] || label;
        const isEditable = isSafeEditableArtifactFile(filename);
        
        // /src — Source: script.py, bot.py
        if (key === 'script' || key === 'bot' || label === 'script.py' || label === 'bot.py') {
          groups.src.files.push([key, label, isEditable]);
        // /docs — Documentation: README.md, other .md
        } else if (lowerLabel.endsWith('.md')) {
          groups.docs.files.push([key, label, isEditable]);
        // /input — Input: sample_input.*, input.*
        } else if ((lowerLabel.includes('sample_input') || lowerLabel.startsWith('input.')) && (lowerLabel.endsWith('.csv') || lowerLabel.endsWith('.txt'))) {
          groups.input.files.push([key, label, isEditable]);
        // /output — Output: actual_output.*, sample_output.*
        } else if (lowerLabel.includes('output') && (lowerLabel.endsWith('.txt') || lowerLabel.endsWith('.csv'))) {
          groups.output.files.push([key, label, isEditable]);
        // /logs — Logs: *.log
        } else if (lowerLabel.endsWith('.log')) {
          groups.logs.files.push([key, label, isEditable]);
        // /meta — Metadata: manifest.json
        } else if (lowerLabel === 'manifest.json' || lowerLabel.endsWith('.json')) {
          groups.meta.files.push([key, label, isEditable]);
        // Fallback to docs
        } else {
          groups.docs.files.push([key, label, isEditable]);
        }
      });
      
      // Render grouped tree
      let html = '';
      Object.values(groups).forEach(group => {
        if (group.files.length === 0) return;
        html += '<div class="file-group">';
        html += '<div class="file-group-header">' + escapeHtml(group.label) + ' <span class="file-count">' + group.files.length + '</span></div>';
        html += '<div class="file-group-items">';
        group.files.forEach(([key, label, isEditable]) => {
          const isActive = key === currentFileKey;
          const badge = isEditable ? '<span class="file-badge editable">editable</span>' : '<span class="file-badge">read-only</span>';
          html += '<div class="file-item' + (isActive ? ' active' : '') + '" data-file-key="' + escapeHtml(key) + '">' +
            '<span>' + escapeHtml(label) + '</span>' + badge + '</div>';
        });
        html += '</div></div>';
      });
      
      fileListEl.innerHTML = html;
      fileListEl.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', () => {
          const fileKey = item.dataset.fileKey;
          if (fileKey && safeRoutes[fileKey]) {
            loadFileContent(fileKey);
            fileListEl.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
          }
        });
      });
    }

    async function loadFileContent(fileKey) {
      currentFileKey = fileKey;
      const route = safeRoutes[fileKey];
      const titleEl = document.getElementById('delivery-file-title');
      const contentEl = document.getElementById('delivery-code-content');
      const editBtn = document.getElementById('delivery-edit-btn');
      const saveBtn = document.getElementById('delivery-save-btn');
      const resetBtn = document.getElementById('delivery-reset-btn');
      if (!route || !contentEl) return;
      if (titleEl) titleEl.textContent = filesMap[fileKey] || fileKey;
      
      // Get filename from filesMap
      const filename = filesMap[fileKey] || fileKey;
      const isEditable = isSafeEditableArtifactFile(filename);
      
      // Reset edit mode when switching files
      isEditing = false;
      // Hide/show edit button based on file editability
      if (editBtn) {
        if (isEditable) {
          editBtn.classList.remove('hidden');
        } else {
          editBtn.classList.add('hidden');
        }
      }
      if (saveBtn) saveBtn.classList.add('hidden');
      if (resetBtn) resetBtn.classList.add('hidden');
      
      contentEl.innerHTML = '<pre class="muted">Loading...</pre>';
      try {
        let text;
        // Check if we have edited content for this file
        if (isEditable && editedFiles[fileKey]) {
          text = editedFiles[fileKey];
        } else {
          const response = await fetch(route);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          text = await response.text();
          // Store original content for editable files
          if (isEditable && !editedFiles[fileKey]) {
            editedFiles[fileKey] = text;
          }
        }
        currentCode = text;
        originalFileContent = text;
        editedCode = text;
        contentEl.innerHTML = '<pre>' + escapeHtml(text) + '</pre>';
        // Hide reset button when file is loaded (no edits yet)
        if (resetBtn) resetBtn.classList.add('hidden');
      } catch (error) {
        contentEl.innerHTML = '<pre class="muted">Error loading file</pre>';
      }
    }

    function toggleEditMode(enable) {
      const contentEl = document.getElementById('delivery-code-content');
      const editBtn = document.getElementById('delivery-edit-btn');
      const saveBtn = document.getElementById('delivery-save-btn');
      const resetBtn = document.getElementById('delivery-reset-btn');
      const filename = filesMap[currentFileKey] || currentFileKey;
      const isEditable = isSafeEditableArtifactFile(filename);
      
      if (!isEditable) {
        // Show alert for non-editable files
        if (enable) {
          alert('Editing is only available for: script.py, bot.py, README.md, sample_input.csv/txt, input.csv/txt');
        }
        return;
      }
      
      isEditing = enable;
      
      if (enable) {
        const textarea = document.createElement('textarea');
        textarea.value = editedCode;
        textarea.addEventListener('input', () => {
          editedCode = textarea.value;
          editedFiles[currentFileKey] = editedCode;
        });
        contentEl.innerHTML = '';
        contentEl.appendChild(textarea);
        textarea.focus();
        if (editBtn) editBtn.classList.add('hidden');
        if (saveBtn) saveBtn.classList.remove('hidden');
        if (resetBtn && editedCode !== originalFileContent) resetBtn.classList.remove('hidden');
      } else {
        contentEl.innerHTML = '<pre>' + escapeHtml(editedCode) + '</pre>';
        if (editBtn) editBtn.classList.remove('hidden');
        if (saveBtn) saveBtn.classList.add('hidden');
        if (resetBtn && editedCode !== originalFileContent) resetBtn.classList.remove('hidden');
      }
    }

    document.getElementById('delivery-edit-btn')?.addEventListener('click', () => {
      toggleEditMode(true);
    });

    document.getElementById('delivery-save-btn')?.addEventListener('click', () => {
      toggleEditMode(false);
    });

    document.getElementById('delivery-reset-btn')?.addEventListener('click', () => {
      const contentEl = document.getElementById('delivery-code-content');
      const resetBtn = document.getElementById('delivery-reset-btn');
      const filename = filesMap[currentFileKey] || currentFileKey;
      const isEditable = isSafeEditableArtifactFile(filename);
      
      if (!isEditable) {
        alert('Reset is only available for editable files (script.py, bot.py, README.md, sample_input.csv/txt, input.csv/txt).');
        return;
      }
      
      // Delete edited content and reload original
      delete editedFiles[currentFileKey];
      
      // Reload from server
      loadFileContent(currentFileKey);
      
      // Hide reset button after reset
      if (resetBtn) resetBtn.classList.add('hidden');
    });

    document.getElementById('delivery-copy-code-btn')?.addEventListener('click', async () => {
      if (!currentCode) return;
      try {
        await navigator.clipboard.writeText(currentCode);
        const btn = document.getElementById('delivery-copy-code-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
      } catch (e) { console.warn('Failed to copy code:', e); }
    });

    ${canRun ? `
    // Run Script (original)
    runBtn?.addEventListener('click', async () => {
      runBtn.disabled = true;
      runBtn.classList.add('running');
      runBtn.textContent = 'Running...';
      if (runResultPanel) runResultPanel.classList.remove('hidden');
      if (runPrompt) runPrompt.classList.add('hidden');
      if (runOutput) { runOutput.textContent = 'Starting execution...'; runOutput.className = 'console-output'; }
      if (runStatus) runStatus.textContent = 'Running...';
      try {
        const response = await fetch(runEndpoint, { method: 'POST' });
        const result = await response.json();
        if (!result.ok) {
          if (runOutput) { runOutput.textContent = 'Run failed: ' + (result.error || result.reason || 'Unknown error'); runOutput.className = 'console-output stderr'; }
          if (runStatus) runStatus.textContent = 'Failed';
          runBtn.disabled = false; runBtn.classList.remove('running'); runBtn.textContent = '▶ Run Again';
          loadRunHistory(); return;
        }
        const durationSec = (result.duration_ms / 1000).toFixed(2);
        if (runOutput) { runOutput.textContent = result.stdout || '(no output)'; runOutput.className = 'console-output stdout'; }
        if (runStatus) runStatus.textContent = '✅ Completed';
        if (runExitCode) runExitCode.textContent = result.exit_code;
        if (runDuration) runDuration.textContent = durationSec + 's';
        runBtn.disabled = false; runBtn.classList.remove('running'); runBtn.textContent = '▶ Run Again';
        loadRunHistory();
      } catch (error) {
        if (runOutput) { runOutput.textContent = 'Run error: ' + error.message; runOutput.className = 'console-output stderr'; }
        if (runStatus) runStatus.textContent = 'Error';
        runBtn.disabled = false; runBtn.classList.remove('running'); runBtn.textContent = '▶ Run Again';
        loadRunHistory();
      }
    });

    // Run Edited
    document.getElementById('run-edited-btn')?.addEventListener('click', async () => {
      const runEditedBtn = document.getElementById('run-edited-btn');
      
      // Run Edited only works for script.py/bot.py
      if (currentFileKey !== 'script' && currentFileKey !== 'bot') {
        alert('Run Edited is only available for script.py and bot.py files.');
        return;
      }
      
      runEditedBtn.disabled = true;
      runEditedBtn.textContent = 'Running...';
      if (runResultPanel) runResultPanel.classList.remove('hidden');
      if (runPrompt) runPrompt.classList.add('hidden');
      if (runOutput) { runOutput.textContent = 'Starting execution...'; runOutput.className = 'console-output'; }
      if (runStatus) runStatus.textContent = 'Running...';
      
      try {
        const response = await fetch(runEditedEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edited_source: editedCode })
        });
        const result = await response.json();
        if (!result.ok) {
          if (runOutput) { runOutput.textContent = 'Run failed: ' + (result.error || result.reason || 'Unknown error'); runOutput.className = 'console-output stderr'; }
          if (runStatus) runStatus.textContent = 'Failed';
          runEditedBtn.disabled = false;
          runEditedBtn.textContent = '📝 Run Edited';
          loadRunHistory(); return;
        }
        const durationSec = (result.duration_ms / 1000).toFixed(2);
        if (runOutput) { runOutput.textContent = result.stdout || '(no output)'; runOutput.className = 'console-output stdout'; }
        if (runStatus) runStatus.textContent = '✅ Completed';
        if (runExitCode) runExitCode.textContent = result.exit_code;
        if (runDuration) runDuration.textContent = durationSec + 's';
        runEditedBtn.disabled = false;
        runEditedBtn.textContent = '📝 Run Edited';
        loadRunHistory();
      } catch (error) {
        if (runOutput) { runOutput.textContent = 'Run error: ' + error.message; runOutput.className = 'console-output stderr'; }
        if (runStatus) runStatus.textContent = 'Error';
        runEditedBtn.disabled = false;
        runEditedBtn.textContent = '📝 Run Edited';
        loadRunHistory();
      }
    });` : ''}

    ${projectType === 'script' || projectType === 'telegram_bot' ? `
    renderFileList();
    if (defaultFileKey) loadFileContent(defaultFileKey);` : ''}
    ${canRun ? 'loadRunHistory();' : ''}
  </script>` : ''}
</body>
</html>`;
}

module.exports = { renderWebStudioDeliveryPage };
