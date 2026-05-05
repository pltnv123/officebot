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
    .code-block { background:#0b1120; border:1px solid rgba(59,130,246,0.2); border-radius:0 0 10px 10px; padding:16px; font-family:'Consolas','Monaco','Courier New',monospace; font-size:13px; line-height:1.6; color:#e2e8f0; max-height:480px; overflow:auto; white-space:pre-wrap; word-wrap:break-word; }
    textarea.code-block { width:100%; min-height:400px; resize:vertical; outline:none; tab-size:4; }
    .code-editor-wrapper { position:relative; display:flex; background:#0b1120; border:1px solid rgba(59,130,246,0.2); border-radius:10px; overflow:hidden; }
    .line-numbers { background:#090d1a; color:#475569; padding:16px 8px; text-align:right; font-family:'Consolas','Monaco','Courier New',monospace; font-size:13px; line-height:1.6; user-select:none; min-width:48px; }
    .code-editor-container { position:relative; flex:1; }
    #script-editor { width:100%; min-height:400px; resize:vertical; outline:none; tab-size:4; border:none; background:transparent; color:#e2e8f0; padding:16px; font-family:'Consolas','Monaco','Courier New',monospace; font-size:13px; line-height:1.6; }
    .syntax-keyword { color:#c678dd; }
    .syntax-string { color:#98c379; }
    .syntax-comment { color:#5c6370; font-style:italic; }
    .syntax-function { color:#61afef; }
    .syntax-number { color:#d19a66; }
    .output-stdout { color:#98c379; }
    .output-stderr { color:#e06c75; background:rgba(224,108,117,0.1); padding:2px 4px; border-radius:4px; }
    .output-info { color:#61afef; }
    .toolbar-btn { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:#e2e8f0; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; }
    .toolbar-btn:hover { background:rgba(255,255,255,0.1); }
    .wrap-toggle { display:flex; align-items:center; gap:6px; font-size:12px; color:#94a3b8; }
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
        <div style="margin-top:16px;"><a href="/webstudio/router" class="linkish" style="font-size:14px;">🧭 Project Router →</a></div>
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
          <div class="preview-head" style="align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
              <h2 style="margin-bottom:4px;font-size:20px;">🐍 Script Project Workspace</h2>
              <div class="preview-note" style="font-size:13px;color:#9ca3af;">Generated runnable Python script package — edit, run, version, and export</div>
            </div>
          </div>
          
          <!-- Status Bar with Chips -->
          <div class="row" style="align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
            <span class="chip" style="background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.3);"><strong>🐍 script.py</strong></span>
            <span id="script-scenario-chip" class="chip">📋 scenario</span>
            <span id="script-version-chip" class="chip">📦 Ver: <strong id="current-version-chip-text">v0001</strong></span>
            <span id="script-dirty-chip" class="chip hidden" style="background:rgba(255,193,7,0.15);border-color:rgba(255,193,7,0.3);">⚠️ Unsaved changes</span>
            <span id="script-saved-chip" class="chip" style="background:rgba(156,163,175,0.15);border-color:rgba(156,163,175,0.3);">✅ Saved</span>
            <span id="script-test-chip" class="chip" style="background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.3);">✅ Test passed</span>
            <span id="script-run-status-chip" class="chip" style="margin-left:auto;background:rgba(156,163,175,0.15);border-color:rgba(156,163,175,0.3);">⚙️ Status: <strong id="script-run-status-text">Ready</strong></span>
          </div>
          
          <!-- Primary Action Buttons -->
          <div class="row" style="margin-bottom:16px;gap:10px;flex-wrap:wrap;">
            <button id="run-live-edited-btn" class="primary" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);font-weight:600;">▶️ Run Edited</button>
            <button id="run-live-btn" class="secondary">▶️ Run Live</button>
            <button id="stop-live-btn" class="secondary" disabled style="background:#7f1d1d;color:#fef2f2;border-color:#991b1b;">⏹️ Stop</button>
            <button id="clear-terminal-btn" class="secondary" style="margin-left:auto;">🗑️ Clear</button>
            <button id="save-as-version-btn" class="secondary">💾 Save Version</button>
            <button id="restore-version-btn" class="secondary">⏪ Restore</button>
            <button id="download-zip-btn" class="secondary">📥 Download ZIP</button>
            <button id="open-delivery-btn" class="secondary" disabled title="Generate a script package first">🔗 Open Delivery</button>
          </div>
          
          <!-- Project Files Workspace -->
          <div id="script-workspace-panel" class="row" style="gap:16px;align-items:flex-start;">
            <!-- File List (Left Column) -->
            <div id="script-file-list-panel" style="flex:0 0 240px;min-width:200px;">
              <h3 style="margin-bottom:8px;font-size:13px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">📁 Project Files</h3>
              <div id="script-file-list" style="border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.2);">
                <!-- File items injected here -->
              </div>
              <p style="margin-top:8px;font-size:11px;color:#6b7280;">💡 Only <code style="background:rgba(59,130,246,0.2);padding:2px 6px;border-radius:4px;">script.py</code> is editable in this milestone</p>
            </div>
            
            <!-- Editor/Preview (Right Column) -->
            <div id="script-file-content-panel" style="flex:1;min-width:0;">
              <div class="field">
                <div class="code-header">
                  <span id="script-file-title" class="filename">script.py</span>
                  <span id="script-file-badge" class="chip" style="font-size:11px;margin-left:8px;">editable</span>
                  <div class="row" style="gap:6px;align-items:center;margin-left:auto;">
                    <button id="script-file-copy-btn" class="toolbar-btn" title="Copy code">📋 Copy</button>
                    <button id="script-file-save-btn" class="secondary hidden">💾 Save File</button>
                    <button id="script-file-reset-btn" class="secondary hidden">↩️ Reset</button>
                    <label class="wrap-toggle"><input type="checkbox" id="word-wrap-toggle" /> Wrap</label>
                    <select id="script-versions-dropdown" class="secondary" style="min-width:150px;"><option value="">Versions...</option></select>
                  </div>
                </div>
                <pre id="script-code-block" class="code-block">No script executed yet.</pre>
                <div id="script-editor-wrapper" class="code-editor-wrapper hidden">
                  <div id="script-line-numbers" class="line-numbers">1</div>
                  <textarea id="script-editor" spellcheck="false" placeholder="Edit Python code here... (Ctrl+Enter to run, Ctrl+S to save)"></textarea>
                </div>
                <div id="script-file-preview" class="code-block hidden" style="background:#1a1a2e;color:#d4d4d4;min-height:200px;max-height:500px;overflow:auto;"></div>
              </div>
            </div>
          </div>
          
          <!-- Execution Console -->
          <div id="script-live-terminal-panel" class="panel" style="margin-top:16px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">⌨️ Execution Console</h3>
              <span id="live-terminal-status" class="chip" style="font-size:11px;background:rgba(156,163,175,0.15);border-color:rgba(156,163,175,0.3);">Ready</span>
            </div>
            <div class="code-header" style="background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:8px 8px 0 0;padding:10px 14px;font-family:monospace;font-size:12px;color:#9ca3af;">
              <span style="color:#22c55e;">$</span> <span style="color:#e2e8f0;">python3 -u script.py</span>
            </div>
            <pre id="live-terminal-output" class="code-block" style="background:#0f172a;color:#e2e8f0;min-height:300px;max-height:450px;overflow:auto;border-radius:0 0 8px 8px;border-top:none;border:1px solid rgba(255,255,255,0.08);border-top:none;font-size:12px;line-height:1.6;"><span class="muted" style="color:#6b7280;">Run the script to see live output...</span></pre>
            
            <!-- Stdin input row -->
            <div class="row" style="margin-top:12px;gap:8px;">
              <input type="text" id="script-live-stdin-input" class="field" style="flex:1;min-width:200px;font-family:monospace;font-size:12px;background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px 12px;color:#e2e8f0;" placeholder="Type input for running script..." disabled />
              <button id="script-live-send-input-btn" class="primary" disabled style="padding:8px 16px;">Send</button>
            </div>
            
            <!-- Run Stats -->
            <div class="row" style="margin-top:12px;padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:8px;border:1px solid rgba(255,255,255,0.08);gap:16px;">
              <span style="font-size:12px;color:#9ca3af;">Exit code: <strong id="terminal-exit-code" style="color:#e2e8f0;">-</strong></span>
              <span style="font-size:12px;color:#9ca3af;">Duration: <strong id="terminal-duration" style="color:#e2e8f0;">-</strong></span>
              <span style="font-size:12px;color:#9ca3af;">State: <strong id="terminal-state" style="color:#e2e8f0;">-</strong></span>
            </div>
          </div>
          
          <!-- Supporting Files (collapsed) -->
          <details id="script-supporting-files-panel" class="panel" style="margin-top:16px;">
            <summary style="cursor:pointer;font-weight:700;margin-bottom:8px;">Supporting Files</summary>
            <div id="script-files" class="file-list" style="margin-top:12px;"></div>
          </details>
          
          <!-- Debug/API (collapsed) -->
          <details class="panel" style="margin-top:16px;">
            <summary style="cursor:pointer;font-weight:700;margin-bottom:8px;">Debug / API</summary>
            <div class="field">
              <div class="row">
                <button id="refresh-script-surface-btn" class="secondary">Refresh Surface</button>
                <button id="debug-script-json-btn" class="secondary">Debug JSON</button>
              </div>
              <pre id="script-debug-json" class="code-block hidden" style="margin-top:12px;max-height:300px;overflow:auto;font-size:11px;"></pre>
            </div>
          </details>
        </div>

        
        <div id="landing-program-panel" class="panel hidden">
          <div class="preview-head" style="align-items:center;justify-content:space-between;">
            <div>
              <h2 style="margin-bottom:6px;">Landing Page</h2>
              <div class="preview-note">Editable HTML landing page with versioning.</div>
            </div>
            <div class="row" style="gap:8px;">
              <span id="landing-scenario-badge" class="badge">scenario</span>
              <span id="landing-status-badge" class="badge">status</span>
              <button id="preview-landing-btn" class="primary">Preview</button>
            </div>
          </div>
          <div id="landing-version-control" class="panel" style="margin-bottom:16px;">
            <h3 style="margin:0 0 8px 0;">Version Control</h3>
            <div class="row" style="align-items:center;">
              <span class="muted">Current version:</span>
              <strong id="landing-current-version-display">v0001</strong>
              <select id="landing-version-selector" class="secondary" style="margin-left:12px; min-width:200px;"><option value="">Select version...</option></select>
            </div>
            <div class="row" style="margin-top:8px;">
              <button id="landing-load-version-btn" class="secondary">Load selected into editor</button>
              <button id="landing-restore-version-btn" class="secondary">Restore selected version</button>
              <button id="landing-save-as-version-btn" class="primary">Save editor as new version</button>
              <button id="landing-reset-editor-btn" class="secondary">Reset editor to current version</button>
            </div>
          </div>
          <div id="landing-program-header" class="meta-grid" style="margin:12px 0;"></div>
          <div class="row" style="margin-bottom:8px;">
            <button id="edit-landing-btn" class="secondary">Edit</button>
            <button id="save-landing-btn" class="primary hidden">Save</button>
            <button id="reset-landing-btn" class="secondary hidden">Reset</button>
            <select id="landing-versions-dropdown" class="secondary" style="margin-left:12px; min-width:200px;"><option value="">Versions...</option></select>
            <span id="landing-dirty-badge" class="chip hidden" style="margin-left:auto;"><span class="muted">Unsaved changes</span></span>
          </div>
          <div class="field">
            <div class="code-header">
              <span class="filename">index.html</span>
              <span id="landing-preview-state" class="muted">idle</span>
            </div>
            <pre id="landing-code-block" class="code-block">No landing page loaded yet.</pre>
            <textarea id="landing-editor" class="code-block hidden" spellcheck="false"></textarea>
          </div>
          <div id="landing-preview-output" class="hidden">
            <h3 style="margin-top:16px;">Preview Output</h3>
            <div id="landing-preview-meta" class="meta-grid"></div>
            <div class="field"><h4>Preview Route</h4><pre id="landing-preview-route"></pre></div>
            <div class="field"><h4>Preview</h4><iframe id="landing-preview-iframe" style="width:100%;height:400px;border:1px solid #ccc;"></iframe></div>
          </div>
        </div>

        <div id="landing-run-history-panel" class="panel hidden">
          <h2>Preview History</h2>
          <div id="landing-run-history-list" class="file-list"></div>
        </div>

        <div id="landing-supporting-files-panel" class="panel hidden">
          <h2>Supporting Files</h2>
          <div id="landing-files" class="file-list"></div>
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

        <div id="telegram-bot-program-panel" class="panel hidden">
          <div class="preview-head"><div><h2 style="margin-bottom:6px;">Telegram Bot Program</h2><div class="preview-note">Editable bot.py with dry-run, versioning, and restore.</div></div></div>
          <div id="telegram-program-header" class="meta-grid" style="margin:12px 0;"></div>
          <div class="row" style="margin-bottom:8px;">
            <button id="run-telegram-bot-dryrun-btn" class="primary">Run Dry-Run</button>
            <button id="telegram-save-version-btn" class="secondary">Save as new version</button>
            <button id="telegram-restore-version-btn" class="secondary">Restore selected version</button>
            <button id="telegram-reset-btn" class="secondary">Reset to current version</button>
            <button id="telegram-open-delivery-btn" class="secondary">Open client delivery</button>
            <button id="telegram-download-zip-btn" class="secondary">Download ZIP</button>
            <select id="telegram-versions-dropdown" class="secondary" style="margin-left:12px; min-width:200px;"><option value="">Versions...</option></select>
            <span id="telegram-dirty-badge" class="chip hidden" style="margin-left:auto;"><span class="muted">Unsaved changes</span></span>
          </div>
          <div class="field">
            <div class="code-header"><span class="filename">bot.py</span><span id="telegram-run-state" class="muted">idle</span></div>
            <pre id="telegram-code-block" class="code-block">No telegram bot executed yet.</pre>
            <textarea id="telegram-editor" class="code-block hidden" spellcheck="false"></textarea>
          </div>
          <div id="telegram-dryrun-output" class="hidden">
            <h3 style="margin-top:16px;">Dry-Run Output</h3>
            <div id="telegram-dryrun-meta" class="meta-grid"></div>
            <div class="field"><h4>Transcript</h4><pre id="telegram-transcript"></pre></div>
            <div class="field"><h4>applications.csv</h4><pre id="telegram-csv-result"></pre></div>
            <div class="field hidden" id="telegram-stderr-field"><h4>stderr</h4><pre id="telegram-stderr"></pre></div>
          </div>
          <div id="telegram-version-panel" class="panel hidden" style="margin-top:16px;">
            <h3>Version Control</h3>
            <div id="telegram-versions-list" class="file-list"></div>
          </div>
          <div id="telegram-run-history-panel" class="panel hidden" style="margin-top:16px;">
            <h3>Run History</h3>
            <div id="telegram-run-history-list" class="file-list"></div>
          </div>
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

        <details id="platform-roadmap-panel" class="panel" style="margin-top:16px;">
          <summary style="cursor:pointer; font-weight:600; font-size:1.1em;">Platform Roadmap / Capabilities</summary>
          <div style="margin-top:12px;">
            <h3 style="margin:12px 0 8px 0;">Available Now</h3>
            <div id="platform-available-list" class="file-list"></div>
            <h3 style="margin:16px 0 8px 0;">Planned</h3>
            <div id="platform-planned-list" class="file-list"></div>
            <p class="muted" style="margin-top:12px; font-size:0.9em;">Note: Android requires Android SDK/emulator/build runner. iOS requires macOS runner/Xcode/simulator environment.</p>
          </div>
        </details>

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
      currentScriptProjectArtifactId: '',
      originalScript: '',
      scriptDirty: false,
      // Multi-file session editing: editedFiles[filename] = editedContent
      editedFiles: {}
    };
    const $ = (id) => document.getElementById(id);
    const $$ = (id) => document.getElementById(id) || null;
    const safeSetHtml = (id, html) => { const el = $$(id); if (el) el.innerHTML = html == null ? '' : String(html); return !!el; };
    const safeSetText = (id, text) => { const el = $$(id); if (el) el.textContent = text == null ? '' : String(text); return !!el; };
    const safeClassToggle = (id, className, force) => { const el = $$(id); if (el) el.classList.toggle(className, force); return !!el; };
    const defaultScriptBrief = ${JSON.stringify(defaultScriptBrief)};
    const defaultTelegramBrief = ${JSON.stringify(defaultBrief)};

    function setStatus(text) { $('status-line').textContent = 'Status: ' + text; }
    function safe(v) { return v == null || v === '' ? '—' : String(v); }
    function chip(label, value) { return '<span class="chip"><span class="muted">' + label + '</span><strong>' + safe(value) + '</strong></span>'; }
    function renderMetaGrid(node, entries) { node.innerHTML = entries.map(([label, value]) => '<div class="meta-item"><div class="label">' + label + '</div><div class="value">' + safe(value) + '</div></div>').join(''); }
    function renderBulletList(node, items) { node.innerHTML = (items || []).map((item) => '<li>' + safe(item) + '</li>').join(''); }
    async function fetchText(url) { const response = await fetch(url); if (!response.ok) throw new Error('Failed to fetch ' + url); return response.text(); }

    async function loadScriptVersions() {
      if (!state.currentScriptProjectArtifactId) {
        safeSetHtml('script-versions-dropdown', '<option value="">Versions...</option>');
        safeSetHtml('version-selector', '<option value="">Select version...</option>');
        state.currentVersionId = 'v0001';
        updateScriptStatusChips();
        return;
      }
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/versions');
        const data = await response.json();
        const versions = data.versions || [];
        const currentVersionId = data.current_version_id || 'v0001';
        
        // Update old dropdown (for backward compatibility)
        const dropdown = $$('script-versions-dropdown');
        if (dropdown) {
          dropdown.innerHTML = '<option value="">Versions...</option>' + versions.map(v => 
            '<option value="' + v.version_id + '">' + v.label + ' (' + v.version_id + ')</option>'
          ).join('');
        }
        
        // Update new version selector
        const versionSelector = $$('version-selector');
        if (versionSelector) {
          versionSelector.innerHTML = '<option value="">Select version...</option>' + versions.map(v => 
            '<option value="' + v.version_id + '">' + v.label + ' (' + v.source_type + ')</option>'
          ).join('');
        }
        
        // Update current version chip
        state.currentVersionId = currentVersionId;
        updateScriptStatusChips();
      } catch (error) {
        console.warn('Failed to load versions:', error);
        safeSetHtml('script-versions-dropdown', '<option value="">Versions (error)</option>');
        safeSetHtml('version-selector', '<option value="">Select version...</option>');
      }
    }

    $('script-versions-dropdown')?.addEventListener('change', async (e) => {
      const versionId = e.target.value;
      if (!versionId) return;
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/version/' + encodeURIComponent(versionId));
        const data = await response.json();
        if (data.ok && data.source) {
          $('script-editor').value = data.source;
          state.scriptDirty = true;
          $('script-dirty-badge').classList.remove('hidden');
          $('edit-script-btn').classList.add('hidden');
          $('save-script-btn').classList.remove('hidden');
          $('reset-script-btn').classList.remove('hidden');
          $('script-code-block').classList.add('hidden');
          $('script-editor-wrapper').classList.remove('hidden');
          updateLineNumbers();
        }
      } catch (error) {
        console.warn('Failed to load version:', error);
      }
    });

    // Version selector handlers
    $('version-selector')?.addEventListener('change', async (e) => {
      const versionId = e.target.value;
      if (!versionId) return;
      // Just select, don't load yet
      state.selectedVersionId = versionId;
    });

    $('load-version-btn')?.addEventListener('click', async () => {
      const versionId = $('version-selector').value;
      if (!versionId) {
        alert('Please select a version first');
        return;
      }
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/version/' + encodeURIComponent(versionId));
        const data = await response.json();
        if (data.ok && data.source) {
          $('script-editor').value = data.source;
          state.scriptDirty = true;
          $('script-dirty-badge').classList.remove('hidden');
          $('edit-script-btn').classList.add('hidden');
          $('save-script-btn').classList.remove('hidden');
          $('reset-script-btn').classList.remove('hidden');
          $('script-code-block').classList.add('hidden');
          $('script-editor-wrapper').classList.remove('hidden');
          updateLineNumbers();
          alert('Loaded ' + versionId + ' into editor (not restored yet)');
        }
      } catch (error) {
        console.warn('Failed to load version:', error);
        alert('Failed to load version');
      }
    });

    $('restore-version-btn')?.addEventListener('click', async () => {
      let versionId = $('script-versions-dropdown')?.value;
      
      // Fallback: if no version selected, use currentVersionId from state
      if (!versionId && state.currentVersionId) {
        versionId = state.currentVersionId;
      }
      
      if (!versionId) {
        alert('No version selected. Please select a version from the dropdown or save a version first.');
        return;
      }
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/script-version/' + encodeURIComponent(versionId) + '/restore', {
          method: 'POST',
        });
        const data = await response.json();
        if (data.ok) {
          const editor = $$('script-editor');
          if (editor) {
            editor.value = data.source;
          }
          state.scriptDirty = false;
          updateScriptStatusChips();
          safeClassToggle('script-code-block', 'hidden', true);
          safeClassToggle('script-editor-wrapper', 'hidden', false);
          safeSetText('current-version-chip-text', versionId);
          state.currentVersionId = versionId;
          setStatus('Restored ' + versionId);
          await loadScriptVersions();
        } else {
          alert('Failed to restore version: ' + (data.error || 'unknown'));
        }
      } catch (error) {
        console.warn('Failed to restore version:', error);
        alert('Failed to restore version');
      }
    });

    $('save-as-version-btn')?.addEventListener('click', async () => {
      const editor = $$('script-editor');
      const editedSource = editor ? editor.value : '';
      if (!editedSource) {
        alert('Editor is empty');
        return;
      }
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/script-version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edited_source: editedSource }),
        });
        const data = await response.json();
        if (data.ok) {
          state.scriptDirty = false;
          updateScriptStatusChips();
          safeSetText('current-version-chip-text', data.version_id);
          state.currentVersionId = data.version_id;
          setStatus('Saved as ' + data.version_id);
          // Reload versions and select the newly saved one
          await loadScriptVersions();
          // Give dropdown time to populate, then select new version
          setTimeout(() => {
            const dropdown = $('script-versions-dropdown');
            if (dropdown) {
              dropdown.value = data.version_id;
            }
          }, 500);
        } else {
          alert('Failed to save version: ' + (data.error || 'unknown'));
        }
      } catch (error) {
        console.warn('Failed to save version:', error);
        alert('Failed to save version');
      }
    });

    $('reset-editor-btn')?.addEventListener('click', async () => {
      const currentVersionId = state.currentVersionId || 'v0001';
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/version/' + encodeURIComponent(currentVersionId));
        const data = await response.json();
        if (data.ok && data.source) {
          $('script-editor').value = data.source;
          state.scriptDirty = false;
          $('script-dirty-badge').classList.add('hidden');
          $('edit-script-btn').classList.remove('hidden');
          $('save-script-btn').classList.add('hidden');
          $('reset-script-btn').classList.add('hidden');
          alert('Reset editor to ' + currentVersionId);
        }
      } catch (error) {
        console.warn('Failed to reset editor:', error);
        alert('Failed to reset editor');
      }
    });

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
      $('script-program-panel').classList.toggle('hidden', !isScript);
      $('script-run-history-panel').classList.toggle('hidden', !isScript || !state.currentScriptProjectArtifactId);
      $('script-supporting-files-panel').classList.toggle('hidden', !isScript);
      
      // Show editor when script selected but no surface loaded yet
      if (isScript) {
        const hasSurface = state.lastScriptResult || state.currentScriptProjectArtifactId;
        if (!hasSurface) {
          // No surface yet - show editor for manual code entry
          $('script-code-block').classList.add('hidden');
          $('script-editor-wrapper').classList.remove('hidden');
          if (!$('script-editor').value) {
            $('script-editor').value = '# Write your Python script here\\n# or click "Execute Script MVP" to generate one\\n\\ndef main():\\n    print("Hello, World!")\\n\\nif __name__ == "__main__":\\n    main()\\n';
          }
        }
      }
      
      $('telegram-bot-program-panel').classList.toggle('hidden', !isTelegram || !state.lastTelegramBotResult);
      const isLandingResult = state.lastLandingResult?.project_type === 'landing_page';
      $('landing-program-panel').classList.toggle('hidden', !isLandingResult || !state.lastLandingResult);
      $('landing-run-history-panel').classList.toggle('hidden', !isLanding);
      $('landing-supporting-files-panel').classList.toggle('hidden', !isLanding);
      $('telegram-bot-result-panel').classList.toggle('hidden', !isTelegram || !state.lastTelegramBotResult);
      $('refresh-script-surface-btn').classList.toggle('hidden', !isScript);
      $('refresh-telegram-bot-surface-btn').classList.toggle('hidden', !isTelegram);
      $('workflow-collapsed-note').classList.toggle('hidden', !isIdle);
      $('script-hints').classList.toggle('hidden', $('project-type-select').value !== 'script');
      $('telegram-hints').classList.toggle('hidden', $('project-type-select')?.value !== 'telegram_bot');
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
      // CRITICAL: Use canonical project_artifact_id from artifact library, not script_execution.artifact_id
      // script_execution.artifact_id is ws-script-artifact-* but artifact library uses ws-project-artifact-*
      // Prefer surface.project_artifact_id, then try to find from artifact library via order_id
      let artifactId = surface.project_artifact_id || '';
      
      // Fallback: construct project_artifact_id from order_id and scenario if surface lacks it
      if (!artifactId && surface.order_id && surface.script_execution?.scenario) {
        artifactId = 'ws-project-artifact-script-' + surface.order_id + '-' + surface.script_execution.scenario.replace(/[^a-zA-Z0-9_-]/g, '-');
      }
      
      // Last resort: use script_execution.artifact_id (may not work with artifact library routes)
      if (!artifactId) {
        artifactId = surface.script_execution?.artifact_id || surface.artifact_id || surface.id || '';
      }
      
      state.currentScriptProjectArtifactId = artifactId || state.currentScriptProjectArtifactId;
      state.lastScriptResult = { order_id: surface.order_id, project_type: 'script', scenario: surface.script_execution?.scenario, language: surface.script_execution?.language, safety_level: surface.script_execution?.safety_level, artifact_id: surface.script_execution?.artifact_id, artifact_root: surface.script_execution?.artifact_root, files: surface.files, safe_routes: surface.safe_routes, test: surface.test, next_action: surface.next_action, project_artifact_id: artifactId };
      
      // Enable Open Delivery button now that artifact exists
      const openDeliveryBtn = $('open-delivery-btn');
      if (openDeliveryBtn) {
        openDeliveryBtn.disabled = false;
        openDeliveryBtn.title = 'Open delivery page for this artifact';
      }
      
      // Save to localStorage for refresh persistence
      try {
        localStorage.setItem('webstudio.lastProjectArtifactId', state.currentScriptProjectArtifactId);
        localStorage.setItem('webstudio.lastProjectType', 'script');
        if (surface.order_id) localStorage.setItem('webstudio.lastOrderId', surface.order_id);
        localStorage.setItem('webstudio.lastSavedAt', new Date().toISOString());
      } catch (e) { /* ignore localStorage errors */ }
      
      // Update header chips
      safeSetText('script-scenario-chip', surface.script_execution?.scenario || 'unknown');
      
      // Load and display script code
      const [scriptText, logText, outputText] = await Promise.all([fetchText(surface.safe_routes.script), fetchText(surface.safe_routes.test_run_log), fetchText(surface.safe_routes.actual_output)]);
      safeSetText('script-code-block', scriptText);
      const editor = $$('script-editor');
      if (editor) editor.value = scriptText;
      state.originalScript = scriptText; // Store for reset
      state.scriptDirty = false; // Reset dirty flag
      state.scriptRunStatus = 'idle';
      state.currentOpenFile = 'script.py'; // Default open file
      safeSetText('script-log-preview', logText);
      safeSetText('script-output-preview', outputText);
      
      // Load versions
      await loadScriptVersions();
      
      // Reset UI state
      safeClassToggle('script-code-block', 'hidden', false);
      safeClassToggle('script-editor-wrapper', 'hidden', true);
      safeClassToggle('script-file-preview', 'hidden', true);
      updateScriptStatusChips();
      
      // Render file list
      renderScriptFileList(surface);
      
      // Reset terminal stats
      safeSetText('terminal-exit-code', '-');
      safeSetText('terminal-duration', '-');
      safeSetText('terminal-state', '-');
      safeSetText('live-terminal-status', 'idle');
      
      updateHeaderChips(); updateDebugJson(); syncProjectVisibility();
    }
    
    function renderScriptFileList(surface) {
      const fileListEl = $('script-file-list');
      if (!fileListEl || !surface.files) return;
      
      const editableFiles = ['script.py', 'bot.py', 'README.md', 'sample_input.csv', 'sample_input.txt', 'input.csv', 'input.txt'];
      const files = Object.values(surface.files || {}).filter(f => f);
      
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
      files.forEach(fileName => {
        const lower = fileName.toLowerCase();
        // /src — Source: script.py, bot.py, other .py (read-only unless whitelisted)
        if (fileName === 'script.py' || fileName === 'bot.py') {
          groups.src.files.push(fileName);
        } else if (lower.endsWith('.py')) {
          groups.src.files.push(fileName); // other .py are read-only
        // /docs — Documentation: README.md, other .md
        } else if (lower.endsWith('.md')) {
          groups.docs.files.push(fileName);
        // /input — Input: sample_input.*, input.*
        } else if ((lower.includes('sample_input') || lower.startsWith('input.')) && (lower.endsWith('.csv') || lower.endsWith('.txt'))) {
          groups.input.files.push(fileName);
        // /output — Output: actual_output.*, sample_output.*
        } else if (lower.includes('output') && (lower.endsWith('.txt') || lower.endsWith('.csv'))) {
          groups.output.files.push(fileName);
        // /logs — Logs: *.log
        } else if (lower.endsWith('.log')) {
          groups.logs.files.push(fileName);
        // /meta — Metadata: manifest.json
        } else if (lower === 'manifest.json' || lower.endsWith('.json')) {
          groups.meta.files.push(fileName);
        // Fallback to docs
        } else {
          groups.docs.files.push(fileName);
        }
      });
      
      // Render grouped tree
      let html = '';
      Object.values(groups).forEach(group => {
        if (group.files.length === 0) return;
        html += '<div style="border-bottom:1px solid rgba(255,255,255,0.03);">';
        html += '<div style="padding:8px 12px;background:rgba(255,255,255,0.02);font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;justify-content:space-between;">' +
          group.label + ' <span style="background:rgba(148,163,175,0.2);padding:2px 8px;border-radius:10px;font-size:9px;">' + group.files.length + '</span></div>';
        html += '<div style="background:rgba(0,0,0,0.15);">';
        group.files.forEach(fileName => {
          const isEditable = isSafeEditableArtifactFile(fileName);
          const isSelected = fileName === state.currentOpenFile;
          const badge = isEditable ? '<span class="chip" style="font-size:9px;padding:2px 6px;margin-left:6px;background:rgba(59,130,246,0.2);">editable</span>' : '<span class="chip" style="font-size:9px;padding:2px 6px;margin-left:6px;background:rgba(156,163,175,0.2);">read-only</span>';
          const selectedStyle = isSelected ? 'background:rgba(59,130,246,0.2);border-left:3px solid #3b82f6;' : '';
          html += '<div class="file-item" data-file="' + safe(fileName) + '" tabindex="0" role="button" aria-label="Open ' + safe(fileName) + '" style="padding:8px 12px 8px 20px;border-bottom:1px solid rgba(255,255,255,0.02);cursor:pointer;display:flex;align-items:center;justify-content:space-between;' + selectedStyle + '">' +
            '<span style="font-family:monospace;font-size:12px;">' + safe(fileName) + '</span>' + badge + '</div>';
        });
        html += '</div></div>';
      });
      
      fileListEl.innerHTML = html;
      
      // Add click handlers
      fileListEl.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', () => openScriptFile(item.dataset.file, surface));
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openScriptFile(item.dataset.file, surface);
          }
        });
      });
    }
    
    async function openScriptFile(fileName, surface) {
      state.currentOpenFile = fileName;
      
      // Update file list selection
      document.querySelectorAll('#script-file-list .file-item').forEach(item => {
        const isSelected = item.dataset.file === fileName;
        item.style.background = isSelected ? 'rgba(59,130,246,0.2)' : '';
        item.style.borderLeft = isSelected ? '3px solid #3b82f6' : '';
      });
      
      // Update file title and badge
      safeSetText('script-file-title', fileName);
      const isEditable = isSafeEditableArtifactFile(fileName);
      safeSetText('script-file-badge', isEditable ? 'editable' : 'read-only');
      $('script-file-badge').style.background = isEditable ? '' : 'rgba(156,163,175,0.2)';
      
      // Show/hide save/reset buttons based on editability
      safeClassToggle('script-file-save-btn', 'hidden', !isEditable);
      safeClassToggle('script-file-reset-btn', 'hidden', !isEditable);
      
      // Map filename to safe_routes key
      // surface.safe_routes has keys: script, readme, sample_input, sample_output, actual_output, test_run_log, manifest
      // surface.files has values: script.py, README.md, sample_input.csv, etc.
      let routeKey = null;
      for (const [key, value] of Object.entries(surface.files || {})) {
        if (value === fileName) {
          routeKey = key;
          break;
        }
      }
      const route = routeKey ? surface.safe_routes[routeKey] : null;
      
      try {
        let content;
        // Check if we have edited content for this file
        if (isEditable && state.editedFiles[fileName]) {
          content = state.editedFiles[fileName];
        } else {
          content = await fetchText(route);
          // Store original content for editable files
          if (isEditable && !state.editedFiles[fileName]) {
            state.editedFiles[fileName] = content;
          }
        }
        
        if (isEditable) {
          // Show editor for editable files
          safeClassToggle('script-code-block', 'hidden', true);
          safeClassToggle('script-editor-wrapper', 'hidden', false);
          safeClassToggle('script-file-preview', 'hidden', true);
          const editor = $$('script-editor');
          if (editor) {
            editor.value = content;
            if (fileName === 'script.py') state.originalScript = content;
          }
        } else {
          // Show preview for read-only files
          safeClassToggle('script-code-block', 'hidden', true);
          safeClassToggle('script-editor-wrapper', 'hidden', true);
          safeClassToggle('script-file-preview', 'hidden', false);
          safeSetText('script-file-preview', content);
        }
      } catch (error) {
        console.error('Failed to load file:', fileName, error);
        safeSetText('script-file-preview', 'Error loading file: ' + error.message);
        safeClassToggle('script-file-preview', 'hidden', false);
      }
    }

    async function renderTelegramBotSurface(surface) {
      state.currentProjectType = 'telegram_bot';
      state.currentBotOrderId = surface.order_id || state.currentBotOrderId;
      state.currentBotProjectArtifactId = surface.bot_execution?.artifact_id;
      state.lastTelegramBotResult = { order_id: surface.order_id, project_type: 'telegram_bot', scenario: surface.bot_execution?.scenario, language: surface.bot_execution?.language, safety_level: surface.bot_execution?.safety_level, artifact_id: surface.bot_execution?.artifact_id, bot_execution_id: surface.bot_execution?.bot_execution_id, artifact_root: surface.bot_execution?.artifact_root, files: surface.files, safe_routes: surface.safe_routes, test: surface.test, next_action: surface.next_action };
      renderMetaGrid($('telegram-program-header'), [['Scenario', surface.bot_execution?.scenario || 'pending'], ['Language', surface.bot_execution?.language || 'python'], ['Safety level', surface.bot_execution?.safety_level || 'bounded_demo'], ['Test status', surface.test?.ok ? 'ok' : 'failed'], ['Command', surface.test?.command || 'pending'], ['Next action', surface.next_action || 'review_telegram_bot_package']]);
      const [botText, readmeText, envText, dryRunText, csvText, logText, outputText] = await Promise.all([fetchText(surface.safe_routes.bot), fetchText(surface.safe_routes.readme), fetchText(surface.safe_routes.env_example), fetchText(surface.safe_routes.dry_run_test), fetchText(surface.safe_routes.applications_csv), fetchText(surface.safe_routes.test_run_log), fetchText(surface.safe_routes.actual_output)]);
      telegramBotOriginalSource = botText;
      telegramBotDirty = false;
      $('telegram-code-block').textContent = botText;
      $('telegram-editor').value = botText;
      $('telegram-bot-preview').textContent = botText;
      $('telegram-readme-preview').textContent = readmeText;
      $('telegram-env-preview').textContent = envText;
      $('telegram-dry-run-preview').textContent = dryRunText;
      $('telegram-csv-preview').textContent = csvText;
      $('telegram-log-preview').textContent = logText;
      $('telegram-output-preview').textContent = outputText;
      await loadTelegramBotVersions();
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
    async function loadPlatformCapabilities() {
      try {
        const response = await fetch('/api/demo/webstudio-order/platform-capabilities');
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          console.warn('Failed to load platform capabilities:', payload.error);
          return;
        }
        const availableList = $('platform-available-list');
        const plannedList = $('platform-planned-list');
        availableList.innerHTML = '';
        plannedList.innerHTML = '';
        for (const pt of payload.project_types) {
          const isAvailable = pt.implementation_status !== 'not_implemented';
          const targetList = isAvailable ? availableList : plannedList;
          const card = document.createElement('div');
          card.className = 'file-card';
          const statusColor = isAvailable ? '#4caf50' : '#ff9800';
          const statusLabel = isAvailable ? 'Available' : 'Planned';
          const reasonHtml = pt.reason ? '<div class="muted" style="font-size:0.8em; margin-top:6px;">' + pt.reason + '</div>' : '';
          card.innerHTML = '<div style="font-weight:600;">' + pt.display_name + ' (' + pt.project_type + ')</div>' +
            '<div class="muted" style="font-size:0.85em;">Language: ' + pt.language + '</div>' +
            '<div class="row" style="margin-top:6px;">' +
            '<span class="chip" style="background:' + statusColor + '; color:#fff;">' + statusLabel + '</span>' +
            '<span class="chip">' + pt.implementation_status + '</span>' +
            '</div>' + reasonHtml;
          targetList.appendChild(card);
        }
      } catch (error) {
        console.warn('loadPlatformCapabilities error:', error);
      }
    }

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

    $('project-type-select')?.addEventListener('change', () => { state.currentProjectType = $('project-type-select').value || 'unknown'; updateActionButtons(); updateHeaderChips(); syncProjectVisibility(); });
    
    // Restore last project on page load (after DOM ready)
    (async function restoreLastProjectOnLoad() {
      try {
        await new Promise(resolve => { if (document.readyState === 'complete') resolve(); else window.addEventListener('load', resolve); });
        const lastArtifactId = localStorage.getItem('webstudio.lastProjectArtifactId');
        const lastProjectType = localStorage.getItem('webstudio.lastProjectType');
        const lastOrderId = localStorage.getItem('webstudio.lastOrderId');
        
        // CRITICAL: Normalize artifact ID from ws-script-artifact-* to ws-project-artifact-*
        let canonicalArtifactId = lastArtifactId;
        if (canonicalArtifactId && canonicalArtifactId.startsWith('ws-script-artifact-')) {
          // Normalize: ws-script-artifact-{order_id}-{scenario} -> ws-project-artifact-script-{order_id}-{scenario}
          const parts = canonicalArtifactId.split('-');
          if (parts.length >= 4) {
            const scenario = parts.slice(3).join('-');
            const orderIdFromArtifact = parts[2];
            canonicalArtifactId = 'ws-project-artifact-script-' + orderIdFromArtifact + '-' + scenario;
          }
        }
        
        if (canonicalArtifactId && lastProjectType === 'script' && lastOrderId) {
          // Fetch artifact detail directly by project_artifact_id to verify it exists
          const artifactDetail = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(canonicalArtifactId)).then(r => r.json()).catch(() => null);
          
          if (artifactDetail && artifactDetail.ok) {
            // Artifact found in library - use canonical ID
            state.orderId = lastOrderId;
            state.currentScriptOrderId = lastOrderId;
            state.currentScriptProjectArtifactId = canonicalArtifactId;
            $('order-id-input').value = state.orderId || '';
            
            // Fetch surface using order ID to get script content
            const surfaceResponse = await fetch('/api/demo/webstudio-order/script-surface/' + encodeURIComponent(lastOrderId));
            if (surfaceResponse.ok) {
              const surface = await surfaceResponse.json();
              // Override surface.project_artifact_id with canonical ID
              surface.project_artifact_id = canonicalArtifactId;
              await loadScriptSurface(lastOrderId);
              await loadArtifactLibrary();
              setStatus('Restored last project');
            }
          } else {
            console.warn('Restore: artifact not found in library', canonicalArtifactId);
            localStorage.removeItem('webstudio.lastProjectArtifactId');
            localStorage.removeItem('webstudio.lastProjectType');
            localStorage.removeItem('webstudio.lastOrderId');
          }
        }
      } catch (e) {
        console.warn('Failed to restore last project:', e);
        try { localStorage.removeItem('webstudio.lastProjectArtifactId'); localStorage.removeItem('webstudio.lastProjectType'); localStorage.removeItem('webstudio.lastOrderId'); } catch (e2) {}
      }
    })();

    $('analyze-brief-btn')?.addEventListener('click', async () => {
      try {
        setStatus('analyzing brief…');
        const payload = await postJson('/api/demo/webstudio-order/analyze-brief', { project_type: $('project-type-select').value, brief: $('brief-text').value.trim(), desired_deliverable: $('deliverable-select').value, tech_preference: $('tech-select').value });
        const newOrderId = extractOrderId(payload);
        if (newOrderId) {
          state.orderId = newOrderId;
          state.currentScriptOrderId = newOrderId;
          state.currentScriptProjectArtifactId = '';
          state.lastScriptResult = null;
          state.surface = null;
          
          // Disable Open Delivery button when no artifact
          const openDeliveryBtn = $('open-delivery-btn');
          if (openDeliveryBtn) {
            openDeliveryBtn.disabled = true;
            openDeliveryBtn.title = 'Generate a script package first';
          }
          
          // Clear localStorage when starting new project
          try {
            localStorage.removeItem('webstudio.lastProjectArtifactId');
            localStorage.removeItem('webstudio.lastProjectType');
            localStorage.removeItem('webstudio.lastOrderId');
            localStorage.removeItem('webstudio.lastSavedAt');
          } catch (e) { /* ignore */ }
        }
        $('order-id-input').value = state.orderId || '';
        renderPlan(payload);
        if (payload.project_type === 'landing_page') await loadLandingSurface(state.orderId);
        updateDebugJson();
        syncProjectVisibility();
        setStatus('project plan ready');
      } catch (error) { setStatus(error.message); }
    });

    $('execute-script-btn')?.addEventListener('click', async () => {
      try {
        setStatus('executing script MVP…');
        const payload = await postJson('/api/demo/webstudio-order/execute-script', { brief: $('brief-text').value.trim(), tech_preference: $('tech-select').value });
        if (!payload.ok || payload.execution_supported === false) throw new Error('Этот тип скрипта пока не входит в безопасные demo-сценарии. Попробуйте простую CLI-задачу: печать текста, цикл по числам, сумма диапазона, CSV summary, text cleaner, JSON extractor.');
        const newOrderId = extractOrderId(payload);
        if (newOrderId) {
          state.orderId = newOrderId;
          state.currentScriptOrderId = newOrderId;
        }
        state.currentScriptProjectArtifactId = payload.project_artifact_id || '';
        state.lastScriptResult = null;
        state.scriptDirty = false;
        state.scriptRunStatus = 'idle';
        $('order-id-input').value = state.orderId || '';
        await loadScriptSurface(state.orderId);
        await loadArtifactLibrary();
        setStatus('script package ready');
        
        // Save to localStorage for refresh persistence
        try {
          if (payload.project_artifact_id) {
            localStorage.setItem('webstudio.lastProjectArtifactId', payload.project_artifact_id);
            localStorage.setItem('webstudio.lastProjectType', 'script');
            localStorage.setItem('webstudio.lastSavedAt', new Date().toISOString());
          }
        } catch (e) { /* ignore */ }
      } catch (error) { setStatus(error.message); }
    });

    $('execute-telegram-bot-btn')?.addEventListener('click', async () => {
      try {
        setStatus('executing telegram bot MVP…');
        const payload = await postJson('/api/demo/webstudio-order/execute-telegram-bot', { brief: $('brief-text').value.trim(), tech_preference: $('tech-select').value });
        if (!payload.ok || payload.execution_supported === false) throw new Error('Этот тип Telegram-бота пока не входит в безопасные demo-сценарии. Попробуйте задачу lead capture bot: имя, телефон, услуга, сообщение, сохранение в CSV.');
        state.orderId = extractOrderId(payload) || state.orderId; state.currentBotOrderId = state.orderId; $('order-id-input').value = state.orderId || ''; await loadTelegramBotSurface(state.orderId); await loadArtifactLibrary(); setStatus('telegram bot package ready');
      } catch (error) { setStatus(error.message); }
    });

    $('start-mvp-build-btn')?.addEventListener('click', async () => { try { await createFullMvp(); setStatus('landing MVP build started'); } catch (error) { setStatus(error.message); } });
    $('create-demo-btn')?.addEventListener('click', async () => { try { setStatus('creating/loading demo order…'); await createFullMvp(); setStatus('demo order ready'); } catch (error) { setStatus(error.message); } });
    $('refresh-surface-btn')?.addEventListener('click', async () => {
      try {
        const orderId = getCurrentOrderId();
        if (state.currentProjectType === 'script') { setStatus('refreshing script surface…'); await loadScriptSurface(orderId); setStatus('script surface refreshed'); return; }
        if (state.currentProjectType === 'telegram_bot') { setStatus('refreshing telegram bot surface…'); await loadTelegramBotSurface(orderId); setStatus('telegram bot surface refreshed'); return; }
        setStatus('refreshing landing surface…'); await loadLandingSurface(orderId); setStatus('landing surface refreshed');
      } catch (error) { setStatus(error.message); }
    });
    $('refresh-script-surface-btn')?.addEventListener('click', async () => { try { const orderId = state.currentScriptOrderId || getCurrentOrderId(); setStatus('refreshing script surface…'); await loadScriptSurface(orderId); setStatus('script surface refreshed'); } catch (error) { setStatus(error.message); } });
    $('refresh-telegram-bot-surface-btn')?.addEventListener('click', async () => { try { const orderId = state.currentBotOrderId || getCurrentOrderId(); setStatus('refreshing telegram bot surface…'); await loadTelegramBotSurface(orderId); setStatus('telegram bot surface refreshed'); } catch (error) { setStatus(error.message); } });
    $('refresh-artifact-library-btn')?.addEventListener('click', async () => { try { setStatus('refreshing artifact library…'); await loadArtifactLibrary(); setStatus('artifact library refreshed'); } catch (error) { setStatus(error.message); } });
    $('select-primary-btn')?.addEventListener('click', async () => { try { const orderId = getCurrentOrderId(); setStatus('selecting Variant B…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent(orderId) + '/select-primary', {}); await loadLandingSurface(orderId); setStatus('Variant B selected'); } catch (error) { setStatus(error.message); } });
    $('submit-revision-btn')?.addEventListener('click', async () => { try { const orderId = getCurrentOrderId(); setStatus('submitting revision…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent(orderId) + '/revision', { delta_brief: { requested_changes: [$('revision-text').value.trim()], customer_notes: $('revision-text').value.trim() } }); await loadLandingSurface(orderId); setStatus('revision created'); } catch (error) { setStatus(error.message); } });
    $('execute-revision-btn')?.addEventListener('click', async () => { try { const orderId = getCurrentOrderId(); setStatus('executing revision…'); await postJson('/api/demo/webstudio-order/' + encodeURIComponent(orderId) + '/execute-revision', {}); await loadLandingSurface(orderId); setStatus('revision executed'); } catch (error) { setStatus(error.message); } });

    // Script Run functions

    async function runScriptOnMainPage(editedSource) {
      if (!state.currentScriptProjectArtifactId) {
        setStatus('No project_artifact_id available');
        return;
      }
      const runBtn = $('run-script-btn');
      const runState = $('script-run-state');
      runBtn.disabled = true;
      runBtn.textContent = 'Running...';
      runState.textContent = 'running';
      setStatus(editedSource !== undefined ? 'running edited script…' : 'running script on main page…');

      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editedSource !== undefined ? { edited_source: editedSource } : {}),
        });
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
        console.warn('Script run failed', { error });
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

    $('run-script-btn')?.addEventListener('click', runScriptOnMainPage);
    $('run-script-again-btn')?.addEventListener('click', runScriptOnMainPage);
    
    // Helper: update script status chips
    function updateScriptStatusChips() {
      const versionChip = $('current-version-chip-text');
      const dirtyChip = $('script-dirty-chip');
      const savedChip = $('script-saved-chip');
      const statusChip = $('script-run-status-text');
      if (versionChip) versionChip.textContent = state.currentVersionId || 'v0001';
      if (dirtyChip) dirtyChip.classList.toggle('hidden', !state.scriptDirty);
      if (savedChip) savedChip.classList.toggle('hidden', state.scriptDirty);
      if (statusChip) statusChip.textContent = state.scriptRunStatus || 'idle';
    }
    
    // Editable script playground handlers
    $('edit-script-btn')?.addEventListener('click', () => {
      $('script-code-block').classList.add('hidden');
      $('script-editor-wrapper').classList.remove('hidden');
      state.scriptDirty = true;
      updateLineNumbers();
      updateScriptStatusChips();
      $('script-editor').focus();
    });
    
    $('save-script-btn')?.addEventListener('click', () => {
      state.originalScript = $('script-editor').value;
      state.scriptDirty = false;
      $('script-code-block').textContent = state.originalScript;
      $('script-code-block').classList.remove('hidden');
      $('script-editor-wrapper').classList.add('hidden');
      updateScriptStatusChips();
    });
    
    $('reset-script-btn')?.addEventListener('click', () => {
      $('script-editor').value = state.originalScript || '';
      state.scriptDirty = false;
      updateLineNumbers();
      updateScriptStatusChips();
    });
    
    $('script-editor')?.addEventListener('input', () => {
      state.scriptDirty = true;
      updateLineNumbers();
      updateScriptStatusChips();
    });
    
    // Line numbers update
    function updateLineNumbers() {
      const editor = $('script-editor');
      const lineNumbers = $('script-line-numbers');
      if (!editor || !lineNumbers) return;
      const NL = String.fromCharCode(10);
      const lines = editor.value.split(NL).length;
      lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join(NL);
    }
    
    // Sync scroll between line numbers and editor
    $('script-editor')?.addEventListener('scroll', () => {
      const lineNumbers = $('script-line-numbers');
      if (lineNumbers) lineNumbers.scrollTop = $('script-editor').scrollTop;
    });
    
    // Copy code button
    $('copy-code-btn')?.addEventListener('click', async () => {
      const code = $('script-code-block').textContent;
      try {
        await navigator.clipboard.writeText(code);
        const btn = $('copy-code-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      } catch (e) {
        setStatus('Failed to copy: ' + e.message);
      }
    });
    
    // Script file copy button
    $('script-file-copy-btn')?.addEventListener('click', async () => {
      let code = '';
      if (!$('script-editor-wrapper').classList.contains('hidden')) {
        code = $$('script-editor').value;
      } else if (!$('script-file-preview').classList.contains('hidden')) {
        code = $('script-file-preview').textContent;
      } else {
        code = $('script-code-block').textContent;
      }
      try {
        await navigator.clipboard.writeText(code);
        const btn = $('script-file-copy-btn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      } catch (e) {
        console.warn('Failed to copy file:', e);
      }
    });
    
    // Script file save button (stub - saves current file to session state only)
    const scriptFileSaveBtn = $('script-file-save-btn');
    if (scriptFileSaveBtn) {
      scriptFileSaveBtn.addEventListener('click', async () => {
        const editor = $$('script-editor');
        if (editor && isSafeEditableArtifactFile(state.currentOpenFile)) {
          state.editedFiles[state.currentOpenFile] = editor.value;
          if (state.currentOpenFile === 'script.py') {
            state.originalScript = editor.value;
            state.scriptDirty = false;
            updateScriptStatusChips();
          }
          setStatus('File saved (session only): ' + state.currentOpenFile);
        }
      });
    }
    
    // Script file reset button (stub - resets to original)
    const scriptFileResetBtn = $('script-file-reset-btn');
    if (scriptFileResetBtn) {
      scriptFileResetBtn.addEventListener('click', () => {
        const editor = $$('script-editor');
        const fileName = state.currentOpenFile;
        if (editor && isSafeEditableArtifactFile(fileName)) {
          // Delete edited content and reload original
          delete state.editedFiles[fileName];
          if (fileName === 'script.py') {
            state.scriptDirty = false;
            updateScriptStatusChips();
          }
          // Reload original from server
          if (state.surface) {
            openScriptFile(fileName, state.surface);
          }
          setStatus('File reset to original: ' + fileName);
        }
      });
    }
    
    // Word wrap toggle
    $('word-wrap-toggle')?.addEventListener('change', (e) => {
      const codeBlock = $('script-code-block');
      const editor = $('script-editor');
      if (e.target.checked) {
        codeBlock.style.whiteSpace = 'pre-wrap';
        editor.style.whiteSpace = 'pre-wrap';
      } else {
        codeBlock.style.whiteSpace = 'pre';
        editor.style.whiteSpace = 'pre';
      }
    });
    
    // Keyboard shortcuts: Ctrl+S to save, Ctrl+Enter to run
    $('script-editor')?.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (!$('save-script-btn').classList.contains('hidden')) {
          $('save-script-btn').click();
        }
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!$('script-editor-wrapper').classList.contains('hidden')) {
          // Run edited source
          startLiveRun($('script-editor').value);
        } else {
          runScriptOnMainPage();
        }
      }
    });
    
    // Override runScriptOnMainPage to use edited source if dirty
    const originalRunScriptOnMainPage = runScriptOnMainPage;
    runScriptOnMainPage = async () => {
      const editedSource = $('script-editor-wrapper').classList.contains('hidden') ? undefined : $('script-editor').value;
      await originalRunScriptOnMainPage(editedSource);
    };

    renderPlan({ project_type: 'unknown', normalized_brief: 'Заполните brief, чтобы получить routing plan для проекта.', recommended_workflow: 'brief_intake_router_flow', required_agents: ['CTO'], expected_artifacts: ['project plan'], execution_stages: ['Collect brief', 'Analyze request', 'Route to matching workflow'], qa_plan: ['Check required fields', 'Validate project classification'], clarification_questions: [], next_action: 'Analyze Brief / Create Plan', desired_deliverable: $('deliverable-select').value, tech_preference: $('tech-select').value });
    loadPlatformCapabilities().catch(() => {});
    loadArtifactLibrary().catch(() => {});

    // Live Terminal handlers
    let liveRunEventSource = null;
    let liveRunId = null;

    function appendTerminalLine(text, type = 'stdout') {
      const terminal = $('live-terminal-output');
      const line = document.createElement('div');
      line.textContent = text;
      if (type === 'stderr') line.style.color = '#f48771';
      else if (type === 'event') line.style.color = '#569cd6';
      terminal.appendChild(line);
      terminal.scrollTop = terminal.scrollHeight;
    }

    function clearTerminal() {
      $('live-terminal-output').innerHTML = '';
    }

    function setLiveRunStatus(status) {
      // Map technical statuses to user-friendly labels
      const statusLabels = {
        'idle': 'Ready',
        'starting': 'Starting…',
        'running': 'Running…',
        'ok': '✅ Completed',
        'completed': '✅ Completed',
        'done': '✅ Completed',
        'failed': '❌ Failed',
        'error': '❌ Error',
        'stopped': '⏹️ Stopped',
        'disconnected': '⚠️ Stream disconnected'
      };
      const label = statusLabels[status] || status;
      $('live-terminal-status').textContent = label;
      $('script-run-status-text').textContent = label;
      $('stop-live-btn').disabled = status !== 'running';
      state.scriptRunStatus = status;
      updateTerminalInputState(status);
    }
    
    function updateTerminalInputState(status) {
      const inputEl = document.getElementById("script-live-stdin-input");
      const sendBtn = document.getElementById("script-live-send-input-btn");
      const isRunning = status === "running" || status === "starting...";
      if (inputEl) inputEl.disabled = !isRunning;
      if (sendBtn) sendBtn.disabled = !isRunning;
      updateScriptStatusChips();
    }

    async function startLiveRun(editedSource = null) {
      if (!state.currentScriptProjectArtifactId) {
        appendTerminalLine('No script artifact loaded', 'stderr');
        return;
      }

      clearTerminal();
      setLiveRunStatus('starting...');

      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/run-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edited_source: editedSource }),
        });
        const result = await response.json();
        if (!result.ok) {
          appendTerminalLine('Error: ' + result.error, 'stderr');
          setLiveRunStatus('error');
          return;
        }

        liveRunId = result.run_id;
        appendTerminalLine('Run started: ' + liveRunId, 'event');
        appendTerminalLine('Command: ' + (result.command || 'python3 script.py'), 'event');
        appendTerminalLine('---', 'event');

        // Connect to SSE
        const eventSource = new EventSource(result.events_url);
        liveRunEventSource = eventSource;

        eventSource.addEventListener('stdout', (e) => {
          if (!e.data) return; let data; try { data = JSON.parse(e.data); } catch (err) { return; }
          appendTerminalLine(data.chunk, 'stdout');
        });

        eventSource.addEventListener('stderr', (e) => {
          if (!e.data) return; let data; try { data = JSON.parse(e.data); } catch (err) { return; }
          appendTerminalLine(data.chunk, 'stderr');
        });


        eventSource.addEventListener('stdin', (e) => {
          if (!e.data) return; let data; try { data = JSON.parse(e.data); } catch (err) { return; }
          // Echo stdin from server (optional, since we already show it client-side)
          // appendTerminalLine('> ' + data.chunk.trim(), 'stdin');
        });
        eventSource.addEventListener('done', (e) => {
          if (!e.data) return; let data; try { data = JSON.parse(e.data); } catch (err) { return; }
          appendTerminalLine('---', 'event');
          appendTerminalLine('Process exited with code ' + data.exit_code + ' (' + data.duration_ms + 'ms)', 'event');
          setLiveRunStatus(data.status);
          // Update terminal stats
          const exitCodeEl = $('terminal-exit-code');
          const durationEl = $('terminal-duration');
          const stateEl = $('terminal-state');
          if (exitCodeEl) exitCodeEl.textContent = data.exit_code ?? '-';
          if (durationEl) durationEl.textContent = ((data.duration_ms || 0) / 1000).toFixed(2) + 's';
          if (stateEl) stateEl.textContent = data.status || 'completed';
          eventSource.close();
          liveRunEventSource = null;
        });

        eventSource.addEventListener('error', (e) => {
          if (!e.data) return; let data; try { data = JSON.parse(e.data); } catch (err) { return; }
          appendTerminalLine('Error: ' + (data.error || data.message), 'stderr');
          setLiveRunStatus('error');
          eventSource.close();
          liveRunEventSource = null;
        });

        eventSource.onerror = () => {
          appendTerminalLine('Connection lost', 'stderr');
          setLiveRunStatus('disconnected');
          if (liveRunEventSource) {
            liveRunEventSource.close();
            liveRunEventSource = null;
          }
        };
      } catch (error) {
        appendTerminalLine('Failed to start: ' + error.message, 'stderr');
        setLiveRunStatus('error');
      }
    }

    $('clear-terminal-btn')?.addEventListener('click', () => {
      const terminal = $('live-terminal-output');
      if (terminal) terminal.innerHTML = '<span class="muted">Run the script to see live output.</span>';
      $('terminal-exit-code').textContent = '-';
      $('terminal-duration').textContent = '-';
      $('terminal-state').textContent = '-';
      $('live-terminal-status').textContent = 'cleared';
    });
    
    $('run-live-btn')?.addEventListener('click', () => startLiveRun(null));

    // Send stdin to live run
    $('script-live-send-input-btn')?.addEventListener('click', async () => {
      const inputEl = $('script-live-stdin-input');
      if (!inputEl || !liveRunId) return;
      const input = inputEl.value;
      if (!input) return;
      
      // Add newline if not present
      const inputWithNewline = input.endsWith('\\n') ? input : input + '\\n';
      
      // Show input in terminal
      appendTerminalLine('> ' + input, 'stdin');
      
      try {
        const result = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/run-live/' + liveRunId + '/input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: inputWithNewline }),
        }).then(r => r.json());
        
        if (!result.ok) {
          appendTerminalLine('Failed to send input: ' + (result.error || 'unknown error'), 'stderr');
        }
      } catch (error) {
        appendTerminalLine('Failed to send input: ' + error.message, 'stderr');
      }
      
      inputEl.value = '';
    });
    // Enter key sends input
    $('script-live-stdin-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        $('script-live-send-input-btn').click();
      }
    });
    $('run-live-edited-btn')?.addEventListener('click', () => {
      const editedSource = $('script-editor-wrapper').classList.contains('hidden') ? undefined : $('script-editor').value;
      startLiveRun(editedSource);
    });
    $('stop-live-btn')?.addEventListener('click', async () => {
      if (!liveRunId) return;
      try {
        await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/run-live/' + liveRunId + '/stop', { method: 'POST' });
        appendTerminalLine('Stop requested', 'event');
      } catch (error) {
        appendTerminalLine('Stop failed: ' + error.message, 'stderr');
      }
    });


    // Download ZIP button
    $('download-zip-btn')?.addEventListener('click', async () => {
      if (!state.currentScriptProjectArtifactId) {
        setStatus('No artifact loaded');
        return;
      }
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentScriptProjectArtifactId) + '/download');
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Download failed');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'script-' + state.currentScriptProjectArtifactId + '.zip';
        a.click();
        window.URL.revokeObjectURL(url);
        setStatus('ZIP download started');
      } catch (error) {
        setStatus('ZIP export failed: ' + error.message);
      }
    });
    
    // Open Delivery button
    $('open-delivery-btn')?.addEventListener('click', () => {
      if (!state.currentScriptProjectArtifactId) {
        setStatus('No artifact loaded');
        return;
      }
      // Use existing /webstudio/delivery/:artifactId route
      window.open('/webstudio/delivery/' + encodeURIComponent(state.currentScriptProjectArtifactId), '_blank');
    });
    // Telegram Bot Program Panel handlers
    let telegramBotOriginalSource = '';
    let telegramBotDirty = false;
    let telegramBotCurrentVersionId = 'v0001';

    async function loadTelegramBotVersions() {
      if (!state.currentBotProjectArtifactId) {
        $('telegram-versions-dropdown').innerHTML = '<option value="">Versions...</option>';
        $('current-version-display').textContent = 'v0001';
        return;
      }
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentBotProjectArtifactId) + '/versions');
        const data = await response.json();
        const versions = data.versions || [];
        const currentVersionId = data.current_version_id || 'v0001';
        telegramBotCurrentVersionId = currentVersionId;
        
        $('telegram-versions-dropdown').innerHTML = '<option value="">Versions...</option>' + versions.map((v) => '<option value="' + v.version_id + '">' + v.version_id + ' — ' + (v.version_label || 'Generated version') + '</option>').join('');
        $('telegram-versions-list').innerHTML = versions.map((v) => '<div class="file-list-item"><span>' + v.version_id + ' — ' + (v.version_label || 'Generated version') + '</span><button class="secondary" data-version-id="' + v.version_id + '">Load</button></div>').join('');
      } catch (error) {
        console.warn('Failed to load telegram bot versions', error);
      }
    }

    async function runTelegramBotDryRun(editedSource) {
      if (!state.currentBotProjectArtifactId) {
        setStatus('No project_artifact_id available');
        return;
      }
      const runBtn = $('run-telegram-bot-dryrun-btn');
      const runState = $('telegram-run-state');
      runBtn.disabled = true;
      runBtn.textContent = 'Running...';
      runState.textContent = 'running';
      setStatus(editedSource !== undefined ? 'running edited telegram bot dry-run…' : 'running telegram bot dry-run…');

      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentBotProjectArtifactId) + '/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editedSource !== undefined ? { edited_source: editedSource } : {}),
        });
        const result = await response.json();

        if (!result.ok) {
          setStatus('Dry-run failed: ' + (result.error || result.reason || 'Unknown error'));
          runBtn.disabled = false;
          runBtn.textContent = 'Run Dry-Run';
          runState.textContent = 'failed';
          return;
        }

        renderTelegramBotDryRunOutput(result);
        await loadTelegramBotRunHistory();
        setStatus('Telegram bot dry-run completed');
      } catch (error) {
        setStatus('Dry-run error: ' + error.message);
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Run Dry-Run';
        runState.textContent = 'idle';
      }
    }

    function renderTelegramBotDryRunOutput(result) {
      $('telegram-dryrun-output').classList.remove('hidden');
      const meta = [
        ['Exit code', result.exit_code],
        ['Duration', (result.duration_ms / 1000).toFixed(2) + 's'],
        ['Status', result.ok ? 'ok' : 'failed'],
      ];
      renderMetaGrid($('telegram-dryrun-meta'), meta);
      $('telegram-transcript').textContent = result.stdout || '';
      $('telegram-stderr').textContent = result.stderr || '';
      $('telegram-stderr-field').classList.toggle('hidden', !result.stderr);
    }

    async function loadTelegramBotRunHistory() {
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentBotProjectArtifactId) + '/run-history');
        const data = await response.json();
        const runs = data.runs || [];
        $('telegram-run-history-list').innerHTML = runs.slice().reverse().map((run) => '<div class="file-list-item"><span>' + run.run_id + ' — ' + (run.ok ? 'ok' : 'failed') + ' — ' + new Date(run.created_at).toLocaleString() + '</span></div>').join('');
        $('telegram-run-history-panel').classList.remove('hidden');
      } catch (error) {
        console.warn('Failed to load telegram bot run history', error);
      }
    }

    $('run-telegram-bot-dryrun-btn')?.addEventListener('click', () => {
      const editedSource = $('telegram-editor').classList.contains('hidden') ? undefined : $('telegram-editor').value;
      runTelegramBotDryRun(editedSource);
    });

    $('telegram-save-version-btn')?.addEventListener('click', async () => {
      if (!state.currentBotProjectArtifactId) return;
      const editedSource = $('telegram-editor').value;
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentBotProjectArtifactId) + '/script-version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edited_source: editedSource }),
        });
        const result = await response.json();
        if (!result.ok) throw new Error(result.error || 'Failed to save version');
        telegramBotOriginalSource = editedSource;
        telegramBotDirty = false;
        $('telegram-code-block').textContent = editedSource;
        $('telegram-code-block').classList.remove('hidden');
        $('telegram-editor').classList.add('hidden');
        $('telegram-dirty-badge').classList.add('hidden');
        await loadTelegramBotVersions();
        setStatus('Version saved: ' + result.version_id);
      } catch (error) {
        setStatus('Save failed: ' + error.message);
      }
    });

    $('telegram-restore-version-btn')?.addEventListener('click', async () => {
      const versionId = $('telegram-versions-dropdown').value;
      if (!versionId || !state.currentBotProjectArtifactId) return;
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentBotProjectArtifactId) + '/script-version/' + encodeURIComponent(versionId) + '/restore', {
          method: 'POST',
        });
        const result = await response.json();
        if (!result.ok) throw new Error(result.error || 'Failed to restore version');
        telegramBotOriginalSource = result.source;
        telegramBotDirty = false;
        $('telegram-code-block').textContent = result.source;
        $('telegram-editor').value = result.source;
        $('telegram-code-block').classList.remove('hidden');
        $('telegram-editor').classList.add('hidden');
        $('telegram-dirty-badge').classList.add('hidden');
        await loadTelegramBotVersions();
        setStatus('Version restored: ' + versionId);
      } catch (error) {
        setStatus('Restore failed: ' + error.message);
      }
    });

    $('telegram-reset-btn')?.addEventListener('click', () => {
      $('telegram-editor').value = telegramBotOriginalSource || '';
      telegramBotDirty = false;
      $('telegram-dirty-badge').classList.add('hidden');
    });

    $('telegram-editor')?.addEventListener('input', () => {
      telegramBotDirty = true;
      $('telegram-dirty-badge').classList.remove('hidden');
    });

    $('telegram-versions-dropdown')?.addEventListener('change', async (e) => {
      const versionId = e.target.value;
      if (!versionId || !state.currentBotProjectArtifactId) return;
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentBotProjectArtifactId) + '/version/' + encodeURIComponent(versionId));
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || 'Failed to load version');
        $('telegram-editor').value = data.source;
        telegramBotDirty = false;
        $('telegram-dirty-badge').classList.add('hidden');
      } catch (error) {
        setStatus('Load version failed: ' + error.message);
      }
    });

    $('telegram-open-delivery-btn')?.addEventListener('click', () => {
      if (!state.currentBotProjectArtifactId) return;
      window.open('/webstudio/client-delivery/' + encodeURIComponent(state.currentBotProjectArtifactId), '_blank');
    });

    $('telegram-download-zip-btn')?.addEventListener('click', async () => {
      if (!state.currentBotProjectArtifactId) return;
      try {
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(state.currentBotProjectArtifactId) + '/export-zip');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'telegram-bot-' + state.currentBotProjectArtifactId + '.zip';
        a.click();
        window.URL.revokeObjectURL(url);
        setStatus('ZIP download started');
      } catch (error) {
        setStatus('ZIP export failed: ' + error.message);
      }
    });
    // Landing panel event listeners
    $('edit-landing-btn')?.addEventListener('click', () => {
      $('landing-code-block').classList.add('hidden');
      $('landing-editor').classList.remove('hidden');
      $('edit-landing-btn').classList.add('hidden');
      $('save-landing-btn').classList.remove('hidden');
      $('reset-landing-btn').classList.remove('hidden');
      $('landing-dirty-badge').classList.remove('hidden');
      state.landingDirty = false;
    });
    
    $('save-landing-btn')?.addEventListener('click', () => {
      state.originalLanding = $('landing-editor').value;
      state.landingDirty = false;
      $('landing-code-block').textContent = state.originalLanding;
      $('landing-code-block').classList.remove('hidden');
      $('landing-editor').classList.add('hidden');
      $('edit-landing-btn').classList.remove('hidden');
      $('save-landing-btn').classList.add('hidden');
      $('reset-landing-btn').classList.add('hidden');
      $('landing-dirty-badge').classList.add('hidden');
    });
    
    $('reset-landing-btn')?.addEventListener('click', () => {
      $('landing-editor').value = state.originalLanding || '';
      state.landingDirty = false;
      $('landing-dirty-badge').classList.add('hidden');
    });
    
    $('landing-editor')?.addEventListener('input', () => {
      state.landingDirty = true;
      if (!$('landing-dirty-badge').classList.contains('hidden')) {
        $('landing-dirty-badge').classList.remove('hidden');
      }
    });
    
    $('preview-landing-btn')?.addEventListener('click', async () => {
      try {
        const editedSource = state.landingDirty ? $('landing-editor').value : null;
        const body = editedSource ? { edited_source: editedSource, save_edited: false } : {};
        const response = await fetch('/api/demo/webstudio-order/project-artifact/' + state.currentProjectArtifactId + '/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (result.ok && result.preview_route) {
          $('landing-preview-iframe').src = result.preview_route;
          $('landing-preview-output').classList.remove('hidden');
          $('landing-preview-route').textContent = result.preview_route;
          $('landing-preview-state').textContent = 'preview ready';
          setStatus('Landing preview ready');
        } else {
          setStatus('Preview failed: ' + (result.error || 'unknown error'));
        }
      } catch (error) {
        setStatus('Preview failed: ' + error.message);
      }
    });
  </script>
</body>
</html>`;
}

module.exports = {
  renderWebStudioDemoPage,
  escapeHtml,
};
