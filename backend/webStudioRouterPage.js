function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderWebStudioRouterPage({ analysis = null, orderId = null }) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Project Router · WebStudio</title>
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
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background: var(--bg);
      background-image: var(--bg-gradient);
      color: var(--text);
      min-height: 100vh;
    }
    .page { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .hero { text-align: center; margin-bottom: 40px; }
    .hero-title { font-size: 36px; font-weight: 700; margin-bottom: 12px; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-subtitle { color: var(--text-muted); font-size: 16px; line-height: 1.6; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
      margin-bottom: 24px;
    }
    .panel-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
    .form-group { margin-bottom: 20px; }
    .form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--text-muted); }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--panel-border);
      border-radius: 10px;
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
    .form-textarea { min-height: 120px; resize: vertical; }
    .btn {
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      border: none;
    }
    .btn-primary {
      background: var(--accent-gradient);
      color: #fff;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-secondary { background: rgba(255, 255, 255, 0.05); color: var(--text); border: 1px solid var(--panel-border); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
    .analysis-result { display: grid; gap: 16px; }
    .result-item { background: rgba(0, 0, 0, 0.2); border-radius: 10px; padding: 16px; }
    .result-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 8px; }
    .result-value { font-size: 15px; line-height: 1.6; }
    .result-value strong { color: var(--accent); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-right: 6px; margin-bottom: 6px; }
    .badge-accent { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .badge-success { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .badge-info { background: rgba(148, 163, 175, 0.2); color: #cbd5e1; }
    .list { list-style: none; }
    .list li { padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.03); font-size: 14px; color: var(--text-muted); }
    .list li:last-child { border-bottom: none; }
    .list li::before { content: '→'; color: var(--accent); margin-right: 10px; font-weight: 700; }
    .hidden { display: none !important; }
    .loading { text-align: center; padding: 40px; color: var(--text-muted); }
    .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid rgba(59, 130, 246, 0.3); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .nav-link { display: inline-block; margin-top: 20px; color: var(--accent); text-decoration: none; font-size: 14px; }
    .nav-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <h1 class="hero-title">🧭 Project Router</h1>
      <p class="hero-subtitle">Опишите ваш проект — мы подберём нужный тип, план и исполнителей</p>
    </div>

    <div class="panel">
      <h2 class="panel-title">📝 Brief</h2>
      <form id="router-form">
        <div class="form-group">
          <label class="form-label" for="project-type">Тип проекта (если известен)</label>
          <select class="form-select" id="project-type" name="project_type">
            <option value="">Не указано (авто-определение)</option>
            <option value="script">Python Script</option>
            <option value="telegram_bot">Telegram Bot</option>
            <option value="landing_page">Landing Page</option>
            <option value="web_app">Web Application</option>
            <option value="automation">Automation / Integration</option>
            <option value="api_service">API Service / Backend</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="brief">Описание проекта</label>
          <textarea class="form-textarea" id="brief" name="brief" placeholder="Например: Мне нужен Telegram-бот для сбора заявок с сайта. Бот должен принимать имя, email и телефон, сохранять в CSV и отправлять уведомление админу." required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="deliverable">Желаемый результат</label>
          <select class="form-select" id="deliverable" name="desired_deliverable">
            <option value="">Не указано</option>
            <option value="preview">Preview / Демо</option>
            <option value="source_code">Исходный код</option>
            <option value="github_pr">GitHub PR</option>
            <option value="zip_package">ZIP Package</option>
            <option value="deployment_instructions">Инструкции по деплою</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="tech">Технологии (предпочтения)</label>
          <select class="form-select" id="tech" name="tech_preference">
            <option value="">Авто-выбор</option>
            <option value="python">Python</option>
            <option value="nodejs">Node.js</option>
            <option value="django">Django</option>
            <option value="react">React</option>
            <option value="html_css">HTML/CSS</option>
            <option value="telegram_bot_api">Telegram Bot API</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" id="analyze-btn">🔍 Анализировать</button>
      </form>
    </div>

    <div id="loading-panel" class="panel hidden">
      <div class="loading">
        <div class="spinner"></div>
        <p style="margin-top: 16px;">Анализируем brief...</p>
      </div>
    </div>

    <div id="analysis-panel" class="panel hidden">
      <h2 class="panel-title">📊 Результат анализа</h2>
      <div id="analysis-content" class="analysis-result"></div>
      <div id="handoff-actions" class="hidden" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--panel-border);">
        <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text);">🚀 Следующий шаг</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">Артефакт готов к созданию. Нажмите кнопку ниже, чтобы сгенерировать Delivery.</p>
        <button type="button" class="btn btn-primary" id="create-delivery-btn">✨ Create Delivery Artifact</button>
        <div id="handoff-status" style="margin-top: 12px; font-size: 14px; color: var(--text-muted);"></div>
      </div>
      <div style="margin-top: 20px;">
        <a class="nav-link" href="/webstudio/demo">← Вернуться в Demo</a>
        <a class="nav-link" href="/webstudio/router" style="margin-left: 16px;">↻ Новый анализ</a>
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('router-form');
    const loadingPanel = document.getElementById('loading-panel');
    const analysisPanel = document.getElementById('analysis-panel');
    const analysisContent = document.getElementById('analysis-content');
    const analyzeBtn = document.getElementById('analyze-btn');
    const handoffActions = document.getElementById('handoff-actions');
    const handoffStatus = document.getElementById('handoff-status');
    const createDeliveryBtn = document.getElementById('create-delivery-btn');
    
    let currentOrderId = null;
    let currentProjectType = null;
    let currentBrief = null;

    function renderBadge(text, type = 'info') {
      const cls = type === 'accent' ? 'badge-accent' : type === 'success' ? 'badge-success' : type === 'warning' ? 'badge-warning' : 'badge-info';
      return '<span class="badge ' + cls + '">' + escapeHtml(text) + '</span>';
    }

    function renderAnalysis(data) {
      const projectTypeBadge = renderBadge(data.project_type, 'accent');
      const workflowBadge = renderBadge(data.recommended_workflow, 'success');
      
      let html = '';
      html += '<div class="result-item">';
      html += '<div class="result-label">Тип проекта</div>';
      html += '<div class="result-value">' + projectTypeBadge + '<strong>' + escapeHtml(data.project_type) + '</strong></div>';
      html += '</div>';
      
      html += '<div class="result-item">';
      html += '<div class="result-label">Нормализованный brief</div>';
      html += '<div class="result-value">' + escapeHtml(data.normalized_brief) + '</div>';
      html += '</div>';
      
      html += '<div class="result-item">';
      html += '<div class="result-label">Рекомендуемый workflow</div>';
      html += '<div class="result-value">' + workflowBadge + '</div>';
      html += '</div>';
      
      html += '<div class="result-item">';
      html += '<div class="result-label">Необходимые агенты</div>';
      html += '<div class="result-value">' + (data.required_agents || []).map(a => renderBadge(a, 'info')).join('') + '</div>';
      html += '</div>';
      
      html += '<div class="result-item">';
      html += '<div class="result-label">Ожидаемые артефакты</div>';
      html += '<ul class="list">' + (data.expected_artifacts || []).map(a => '<li>' + escapeHtml(a) + '</li>').join('') + '</ul>';
      html += '</div>';
      
      html += '<div class="result-item">';
      html += '<div class="result-label">Этапы выполнения</div>';
      html += '<ul class="list">' + (data.execution_stages || []).map(s => '<li>' + escapeHtml(s) + '</li>').join('') + '</ul>';
      html += '</div>';
      
      html += '<div class="result-item">';
      html += '<div class="result-label">QA план</div>';
      html += '<ul class="list">' + (data.qa_plan || []).map(q => '<li>' + escapeHtml(q) + '</li>').join('') + '</ul>';
      html += '</div>';
      
      if (data.clarification_questions && data.clarification_questions.length > 0) {
        html += '<div class="result-item">';
        html += '<div class="result-label">Вопросы для уточнения</div>';
        html += '<ul class="list">' + data.clarification_questions.map(q => '<li>' + escapeHtml(q) + '</li>').join('') + '</ul>';
        html += '</div>';
      }
      
      html += '<div class="result-item">';
      html += '<div class="result-label">Следующий шаг</div>';
      html += '<div class="result-value">' + renderBadge(data.next_action, 'success') + '</div>';
      html += '</div>';
      
      if (data.order_id) {
        html += '<div class="result-item">';
        html += '<div class="result-label">Order ID</div>';
        html += '<div class="result-value"><code>' + escapeHtml(data.order_id) + '</code></div>';
        html += '</div>';
      }
      
      // Show handoff availability
      if (data.delivery_handoff_available) {
        html += '<div class="result-item">';
        html += '<div class="result-label">Delivery Handoff</div>';
        html += '<div class="result-value">' + renderBadge('Available', 'success') + '</div>';
        html += '</div>';
      }
      
      return html;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      analyzeBtn.disabled = true;
      loadingPanel.classList.remove('hidden');
      analysisPanel.classList.add('hidden');
      
      const formData = new FormData(form);
      const body = {
        brief: formData.get('brief'),
        project_type: formData.get('project_type') || undefined,
        desired_deliverable: formData.get('desired_deliverable') || undefined,
        tech_preference: formData.get('tech') || undefined,
      };
      
      try {
        const response = await fetch('/api/demo/webstudio-order/analyze-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        
        const data = await response.json();
        analysisContent.innerHTML = renderAnalysis(data);
        
        // Store order data for handoff
        currentOrderId = data.order_id;
        currentProjectType = data.project_type;
        currentBrief = data.normalized_brief;
        
        // Show handoff button if available
        if (data.delivery_handoff_available) {
          handoffActions.classList.remove('hidden');
        } else {
          handoffActions.classList.add('hidden');
        }
        
        loadingPanel.classList.add('hidden');
        analysisPanel.classList.remove('hidden');
      } catch (error) {
        alert('Ошибка анализа: ' + error.message);
        loadingPanel.classList.add('hidden');
      } finally {
        analyzeBtn.disabled = false;
      }
    });
    
    // Create Delivery button handler
    createDeliveryBtn?.addEventListener('click', async () => {
      if (!currentOrderId || !currentProjectType) {
        handoffStatus.textContent = '⚠️ No order data available';
        handoffStatus.style.color = 'var(--warning)';
        return;
      }
      
      createDeliveryBtn.disabled = true;
      createDeliveryBtn.textContent = '⏳ Creating Delivery...';
      handoffStatus.textContent = 'Creating delivery artifact...';
      handoffStatus.style.color = 'var(--text-muted)';
      
      try {
        const response = await fetch('/api/demo/webstudio-order/router-handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: currentOrderId,
            project_type: currentProjectType,
            brief: currentBrief,
          }),
        });
        
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'HTTP ' + response.status);
        }
        
        const data = await response.json();
        
        if (data.ok && data.delivery_url) {
          handoffStatus.textContent = '✅ Delivery created! Opening...';
          handoffStatus.style.color = 'var(--success)';
          createDeliveryBtn.textContent = '✅ Delivery Created';
          
          // Open delivery page in new tab after short delay
          setTimeout(() => {
            window.open(data.delivery_url, '_blank');
          }, 800);
        } else {
          throw new Error(data.error || 'Handoff failed');
        }
      } catch (error) {
        handoffStatus.textContent = '❌ Error: ' + error.message;
        handoffStatus.style.color = 'var(--danger)';
        createDeliveryBtn.disabled = false;
        createDeliveryBtn.textContent = '✨ Create Delivery Artifact';
      }
    });
  </script>
</body>
</html>`;
}

module.exports = { renderWebStudioRouterPage };
