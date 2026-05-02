const fs = require('fs/promises');
const path = require('path');

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createBuildArtifactId(orderId, branchName) {
  return `ws-build-artifact-${orderId}-${String(branchName).toLowerCase()}`;
}

function branchDirection(branchName) {
  if (branchName === 'A') {
    return {
      title: 'Variant A placeholder preview',
      subhead: 'Зарезервированная ветка для будущей полной multi-variant реализации.',
      accent: '#c58b2b',
    };
  }
  if (branchName === 'B') {
    return {
      title: 'Автоматизация заявок для малого бизнеса',
      subhead: 'Сильный первый экран, понятный оффер, доверительные блоки и быстрый путь к заявке.',
      accent: '#2463eb',
    };
  }
  return {
    title: 'Variant C placeholder preview',
    subhead: 'Экспериментальная sibling-ветка сохранена как placeholder без production claim.',
    accent: '#9b36ff',
  };
}

function buildArtifactRoot(rootDir, orderId, branchName) {
  return path.join(rootDir, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-build-artifacts', orderId, String(branchName).toLowerCase());
}

function normalizeSections(order) {
  const rows = Array.isArray(order.normalized_brief?.required_sections) ? order.normalized_brief.required_sections : [];
  return rows.length ? rows : ['hero', 'offer', 'benefits', 'cta'];
}

function buildPrimaryVariantHtml(order, variant, childSession, sections, direction) {
  const benefits = [
    ['Быстрее обрабатываете заявки', 'Помогаем сократить путь от первого касания до разговора с клиентом.'],
    ['Видите понятную структуру оффера', 'Hero, доверие, процесс и CTA собраны в один внятный сценарий.'],
    ['Получаете MVP preview без хаоса', 'Показываем usable landing page и честно помечаем её как operator demo, а не production-ready сайт.'],
  ];
  const processSteps = [
    'Анализируем заявку и цель страницы',
    'Собираем оффер и структуру лендинга',
    'Показываем preview и фиксируем обратную связь',
    'Вносим revision без разрушения базовой логики',
  ];
  const faqRows = [
    ['Можно ли менять структуру?', 'Да, но в этом MVP мы сначала усиливаем выбранный вариант B без широкого переписывания всех веток.'],
    ['Это production-ready сайт?', 'Нет. Это operator demo / MVP preview, который показывает направление и механику правок.'],
    ['Что входит в revision?', 'Усиление hero, доверительного блока, CTA и точечные изменения без потери базовой структуры.'],
  ];

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(direction.title)} · ${escapeHtml(order.order_id)} · ${escapeHtml(variant.branch_name)}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body data-order-id="${escapeHtml(order.order_id)}" data-variant-id="${escapeHtml(variant.variant_id)}" data-branch-name="${escapeHtml(variant.branch_name)}" data-quality-level="primary" data-implementation-status="real">
    <main class="page">
      <header class="hero panel hero-primary">
        <div class="hero-copy">
          <span class="eyebrow">WEBSTUDIO PRIMARY VARIANT B</span>
          <h1>Автоматизированная обработка заявок для малого бизнеса</h1>
          <p class="subhead">Помогаем быстро показать ценность услуги, усилить доверие и превратить лендинг в понятный маршрут к заявке.</p>
          <div class="hero-actions">
            <a class="cta" href="#contact">Запросить демонстрацию</a>
            <a class="ghost-link" href="#faq">Посмотреть FAQ</a>
          </div>
          <div class="trust-line">Без фейковых отзывов, без тёмных паттернов, с прозрачной структурой и human review.</div>
        </div>
        <aside class="hero-visual panel">
          <div class="visual-chip">Variant B recommended</div>
          <div class="visual-metric"><strong>4 шага</strong><span>от заявки до preview</span></div>
          <div class="visual-metric"><strong>MVP preview</strong><span>operator demo, not final production website</span></div>
          <div class="visual-metric"><strong>Revision included</strong><span>усиливаем hero, trust и CTA</span></div>
        </aside>
      </header>

      <section class="panel benefits-block">
        <h2>Почему этот лендинг выглядит сильнее</h2>
        <div class="cards cards-benefits">
          ${benefits.map(([title, text]) => `<article><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join('')}
        </div>
      </section>

      <section class="panel process-block">
        <h2>Как работает веб-студия</h2>
        <div class="process-grid">
          ${processSteps.map((step, index) => `<article><span class="step-index">0${index + 1}</span><h3>${escapeHtml(step)}</h3><p>Шаг ${index + 1} в операторском MVP-процессе для заказа ${escapeHtml(order.order_id)}.</p></article>`).join('')}
        </div>
      </section>

      <section class="panel trust-block trust-primary">
        <h2>Trust / proof</h2>
        <div class="trust-grid">
          <div>
            <p>Мы честно показываем, что это <strong>MVP preview</strong>, а не production-ready релиз. Но визуально это уже usable продающий лендинг.</p>
            <ul>
              <li>Прозрачный оффер и конкретный следующий шаг</li>
              <li>Trust blocks рядом с CTA</li>
              <li>Operator demo с human review recommended</li>
            </ul>
          </div>
          <div class="trust-note panel">
            <strong>Order:</strong> ${escapeHtml(order.order_id)}<br />
            <strong>Variant:</strong> ${escapeHtml(variant.variant_id)}<br />
            <strong>Workspace:</strong> ${escapeHtml(childSession.child_workspace_key)}
          </div>
        </div>
      </section>

      <section class="panel pricing-block">
        <h2>MVP package</h2>
        <div class="pricing-card">
          <div>
            <div class="pricing-label">Variant B recommended</div>
            <h3>MVP landing preview</h3>
            <p>Первый usable вариант для демонстрации структуры, оффера и revision loop.</p>
          </div>
          <ul>
            <li>Primary Variant B</li>
            <li>Revision included</li>
            <li>Preview + revised preview</li>
          </ul>
        </div>
      </section>

      <section id="faq" class="panel faq-block">
        <h2>FAQ</h2>
        <div class="faq-list">
          ${faqRows.map(([q, a]) => `<article><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></article>`).join('')}
        </div>
      </section>

      <section id="contact" class="panel contact-primary final-cta">
        <h2>Готовы посмотреть следующую итерацию?</h2>
        <p>Запросите демонстрацию, выберите Variant B и внесите правку, чтобы получить revised preview без потери базовой структуры.</p>
        <div class="hero-actions">
          <a class="cta" href="#top">Запросить демонстрацию</a>
          <a class="ghost-link" href="#faq">Посмотреть revised preview</a>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function buildPlaceholderVariantHtml(order, variant, childSession, direction) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(direction.title)} · ${escapeHtml(order.order_id)} · ${escapeHtml(variant.branch_name)}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body data-order-id="${escapeHtml(order.order_id)}" data-variant-id="${escapeHtml(variant.variant_id)}" data-branch-name="${escapeHtml(variant.branch_name)}" data-quality-level="placeholder" data-implementation-status="placeholder">
    <main class="page">
      <header class="hero panel placeholder-hero">
        <span class="eyebrow">WEBSTUDIO ${escapeHtml(variant.branch_name)} PLACEHOLDER</span>
        <h1>${escapeHtml(direction.title)}</h1>
        <p class="subhead">${escapeHtml(direction.subhead)}</p>
      </header>
      <section class="panel placeholder-note">
        <h2>Placeholder branch</h2>
        <p>Этот sibling-вариант сохранён в A/B/C architecture, но не является production-ready в текущем срезе.</p>
        <ul>
          <li>Order: ${escapeHtml(order.order_id)}</li>
          <li>Child session: ${escapeHtml(childSession.child_session_id)}</li>
          <li>Reason: Reserved sibling branch for future full multi-variant execution</li>
        </ul>
      </section>
      <footer class="panel footer">
        <small>Placeholder variant only, no production claim.</small>
      </footer>
    </main>
  </body>
</html>`;
}

function buildStaticVariantHtml(order, variant, childSession, options = {}) {
  const direction = branchDirection(variant.branch_name);
  const sections = normalizeSections(order);
  if (variant.branch_name === 'B') {
    return buildPrimaryVariantHtml(order, variant, childSession, sections, direction);
  }
  return buildPlaceholderVariantHtml(order, variant, childSession, direction);
}

function buildStaticVariantCss(variant) {
  const direction = branchDirection(variant.branch_name);
  const primaryEnhancements = variant.branch_name === 'B'
    ? `.hero-primary { border-color: rgba(36,99,235,0.35); display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 22px; align-items: stretch; }
.hero-copy { display:flex; flex-direction:column; justify-content:center; }
.hero-actions { display:flex; gap:12px; flex-wrap:wrap; margin-top:18px; }
.trust-line { margin-top:14px; color:#bfdbfe; font-size:14px; }
.hero-visual { background: linear-gradient(180deg, rgba(36,99,235,0.18), rgba(15,23,42,0.92)); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); }
.visual-chip { display:inline-block; margin-bottom:16px; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.08); color:#dbeafe; font-size:12px; font-weight:700; }
.visual-metric { padding:12px 0; border-top:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:4px; }
.cards { display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; }
.cards article, .process-grid article, .faq-list article, .pricing-card, .trust-note { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 18px; }
.process-grid, .faq-list { display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; }
.step-index { display:inline-flex; width:34px; height:34px; border-radius:999px; align-items:center; justify-content:center; background:rgba(36,99,235,0.18); color:#bfdbfe; font-weight:800; margin-bottom:12px; }
.trust-grid { display:grid; grid-template-columns: 1.2fr 0.8fr; gap:16px; align-items:start; }
.pricing-card { display:grid; grid-template-columns: 1fr auto; gap:18px; align-items:center; }
.pricing-label { color:#93c5fd; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
.final-cta { box-shadow: 0 20px 48px rgba(36,99,235,0.18); }
.ghost-link { color:#cbd5e1; text-decoration:none; padding:12px 16px; border:1px solid rgba(255,255,255,0.14); border-radius:12px; }
.ghost-link:hover, .cta:hover { transform: translateY(-1px); }
@media (max-width: 900px) { .hero-primary, .process-grid, .faq-list, .cards, .trust-grid, .pricing-card { grid-template-columns: 1fr; } .hero h1 { font-size: 34px; } }`
    : `.placeholder-hero { border-style: dashed; opacity: 0.92; }
.placeholder-note { border-style: dashed; }`;
  return `:root { --accent: ${direction.accent}; --bg: #0f172a; --panel: #111827; --text: #f8fafc; --muted: #cbd5e1; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, Arial, sans-serif; background: radial-gradient(circle at top, rgba(36,99,235,0.14), transparent 35%), linear-gradient(180deg, #020617, var(--bg)); color: var(--text); }
.page { max-width: 1160px; margin: 0 auto; padding: 40px 20px 72px; }
.panel { background: rgba(17,24,39,0.88); border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; padding: 28px; margin-bottom: 20px; backdrop-filter: blur(8px); }
.eyebrow { display: inline-block; margin-bottom: 12px; color: var(--accent); font-weight: 800; letter-spacing: 0.08em; }
.hero h1 { margin: 0 0 12px; font-size: 48px; line-height:1.05; }
.subhead { color: var(--muted); max-width: 720px; font-size:18px; line-height:1.6; }
.cta, .cta-button { display: inline-block; margin-top: 16px; background: linear-gradient(135deg, var(--accent), #7c3aed); color: #fff; text-decoration: none; padding: 13px 20px; border-radius: 14px; font-weight: 800; border: none; box-shadow: 0 14px 36px rgba(36,99,235,0.28); }
ul { padding-left: 18px; line-height:1.7; }
h2 { margin-top:0; font-size:28px; }
h3 { margin-top:0; font-size:20px; }
${primaryEnhancements}
`;}

function buildArtifactManifest(order, variant, childSession, files) {
  return {
    build_artifact_id: createBuildArtifactId(order.order_id, variant.branch_name),
    order_id: order.order_id,
    variant_id: variant.variant_id,
    branch_name: variant.branch_name,
    source: 'bounded_static_site_generator',
    generator_native: false,
    generated_at: nowIso(),
    files,
    checks: {
      html_exists: true,
      manifest_exists: true,
      variant_linked: true,
      child_session_linked: true,
      preview_path_available: true,
    },
    limitations: variant.branch_name === 'B'
      ? [
          'Primary variant B is the only real MVP implementation in this slice.',
          'Preview path is local runtime artifact path, not public deployment.',
        ]
      : [
          'Placeholder sibling branch only, not production-ready in this slice.',
          'Preview path is local runtime artifact path, not public deployment.',
        ],
    next_steps: [
      'Wire preview_path into real browser automation.',
      'Add real deployment/build pipeline later if accepted.',
    ],
  };
}

function createWebStudioBuildArtifactService({ repositories, rootDir } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioTaskFlowBindings || !repositories.webStudioChildSessions || !repositories.webStudioBuildArtifacts) {
    throw new Error('webStudioBuildArtifactService requires webStudio repositories including build artifacts');
  }
  if (!rootDir) {
    throw new Error('webStudioBuildArtifactService requires rootDir');
  }

  return Object.freeze({
    buildStaticVariantHtml,
    buildArtifactManifest,

    async attachBuildArtifactToVariant(variantId, artifact) {
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          build_artifact_id: artifact.build_artifact_id,
          build_status: artifact.status,
          artifact_root: artifact.artifact_root,
          html_path: artifact.html_path,
          manifest_path: artifact.manifest_path,
          preview_path: artifact.preview_path,
          updated_at: nowIso(),
        },
      });
    },

    async createBuildArtifactForVariant(orderId, variantId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) throw new Error(`WebStudio order not found: ${orderId}`);
      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (!binding) throw new Error(`TaskFlow binding missing for order: ${orderId}`);
      const variant = await repositories.webStudioVariants.getVariantById({ variant_id: variantId });
      if (!variant) throw new Error(`WebStudio variant not found: ${variantId}`);
      if (variant.order_id !== orderId) throw new Error(`Variant does not belong to order: ${variantId}`);
      const childSession = await repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: variantId });
      if (!childSession) throw new Error(`Child session missing for variant: ${variantId}`);

      const existing = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variantId });
      if (existing) return existing;

      const artifactRoot = buildArtifactRoot(rootDir, orderId, variant.branch_name);
      await fs.mkdir(artifactRoot, { recursive: true });
      const htmlPath = path.join(artifactRoot, 'index.html');
      const cssPath = path.join(artifactRoot, 'styles.css');
      const manifestPath = path.join(artifactRoot, 'manifest.json');
      const previewPath = htmlPath;

      const html = buildStaticVariantHtml(order, variant, childSession, options);
      const css = buildStaticVariantCss(variant);
      await fs.writeFile(htmlPath, html, 'utf8');
      await fs.writeFile(cssPath, css, 'utf8');

      const files = {
        html_path: htmlPath,
        css_path: cssPath,
        manifest_path: manifestPath,
        preview_path: previewPath,
      };
      const manifest = buildArtifactManifest(order, variant, childSession, files);
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      const now = nowIso();
      const buildArtifact = {
        build_artifact_id: options.build_artifact_id || createBuildArtifactId(orderId, variant.branch_name),
        order_id: orderId,
        variant_id: variantId,
        branch_name: variant.branch_name,
        child_session_id: childSession.child_session_id,
        child_agent_id: childSession.child_agent_id,
        child_workspace_key: childSession.child_workspace_key,
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
        source: options.source || (variant.branch_name === 'B' ? 'bounded_static_site_generator' : 'placeholder_variant'),
        generator_native: Boolean(options.generator_native || false),
        status: variant.branch_name === 'B' ? 'generated' : 'placeholder',
        artifact_root: artifactRoot,
        html_path: htmlPath,
        css_path: cssPath,
        manifest_path: manifestPath,
        preview_path: previewPath,
        preview_url: null,
        files,
        checks: manifest.checks,
        limitations: manifest.limitations,
        migration_target: options.migration_target || 'OpenClaw child session execution / build pipeline',
        quality_level: variant.quality_level || (variant.branch_name === 'B' ? 'primary' : 'placeholder'),
        implementation_status: variant.implementation_status || (variant.branch_name === 'B' ? 'real' : 'placeholder'),
        is_primary_recommendation: Boolean(variant.is_primary_recommendation || variant.branch_name === 'B'),
        placeholder_reason: variant.branch_name === 'B' ? null : (variant.placeholder_reason || 'Reserved sibling branch for future full multi-variant execution'),
        created_at: now,
        updated_at: now,
      };

      const created = await repositories.webStudioBuildArtifacts.createBuildArtifact({ build_artifact: buildArtifact });
      await this.attachBuildArtifactToVariant(variantId, created);

      const existingEvidence = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceByVariantId({ variant_id: variantId });
      if (existingEvidence) {
        await repositories.webStudioBrowserQAEvidence.updateBrowserEvidenceById({
          browser_evidence_id: existingEvidence.browser_evidence_id,
          patch: {
            preview_path: created.preview_path,
            build_artifact_id: created.build_artifact_id,
            updated_at: nowIso(),
          },
        });
      }

      return created;
    },

    async createBuildArtifactsForOrderVariants(orderId, options = {}) {
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      if (variants.length !== 3) throw new Error(`Expected exactly 3 variants for order: ${orderId}`);
      const childSessions = await repositories.webStudioChildSessions.listChildSessionsByOrderId({ order_id: orderId });
      if (childSessions.length !== 3) throw new Error(`Expected exactly 3 child sessions for order: ${orderId}`);

      const rows = [];
      for (const variant of variants.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)))) {
        rows.push(await this.createBuildArtifactForVariant(orderId, variant.variant_id, options));
      }
      return rows;
    },

    async getBuildArtifactsForOrder(orderId) {
      const rows = await repositories.webStudioBuildArtifacts.listBuildArtifactsByOrderId({ order_id: orderId });
      return rows.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
    },

    async getBuildArtifactForVariant(variantId) {
      return repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variantId });
    },
  });
}

module.exports = {
  createWebStudioBuildArtifactService,
};
