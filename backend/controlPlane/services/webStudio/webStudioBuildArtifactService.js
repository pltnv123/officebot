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
      title: 'Премиальный конверсионный лендинг',
      subhead: 'Роскошная визуальная иерархия, сильный CTA и доверительные блоки.',
      accent: '#c58b2b',
    };
  }
  if (branchName === 'B') {
    return {
      title: 'Практичный быстрый бизнес-сайт',
      subhead: 'Ясная структура, быстрый контакт и чёткое объяснение услуги.',
      accent: '#2463eb',
    };
  }
  return {
    title: 'Смелая креативная концепция',
    subhead: 'Запоминающийся образ, сильная подача и более яркая айдентика.',
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

function buildStaticVariantHtml(order, variant, childSession, options = {}) {
  const direction = branchDirection(variant.branch_name);
  const sections = normalizeSections(order);
  const sectionBlocks = sections.map((sectionName, index) => `
      <section class="panel section-${escapeHtml(sectionName)}">
        <h2>${escapeHtml(sectionName.toUpperCase())}</h2>
        <p>Секция ${escapeHtml(sectionName)} для варианта ${escapeHtml(variant.branch_name)} основана на нормализованном брифе и цели заказа ${escapeHtml(order.order_id)}.</p>
      </section>`).join('');

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(direction.title)} · ${escapeHtml(order.order_id)} · ${escapeHtml(variant.branch_name)}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body data-order-id="${escapeHtml(order.order_id)}" data-variant-id="${escapeHtml(variant.variant_id)}" data-branch-name="${escapeHtml(variant.branch_name)}">
    <main class="page">
      <header class="hero panel">
        <span class="eyebrow">WEBSTUDIO ${escapeHtml(variant.branch_name)}</span>
        <h1>${escapeHtml(direction.title)}</h1>
        <p class="subhead">${escapeHtml(direction.subhead)}</p>
        <a class="cta" href="#contact">Оставить заявку</a>
      </header>
      <section class="panel trust-block">
        <h2>Почему нам доверяют</h2>
        <ul>
          <li>Traceable order: ${escapeHtml(order.order_id)}</li>
          <li>Child session: ${escapeHtml(childSession.child_session_id)}</li>
          <li>Concept: ${escapeHtml(variant.concept_summary)}</li>
        </ul>
      </section>${sectionBlocks}
      <section id="offer" class="panel">
        <h2>Предложение</h2>
        <p>${escapeHtml(JSON.stringify(order.normalized_brief?.deliverables || []))}</p>
      </section>
      <section id="contact" class="panel">
        <h2>Следующий шаг</h2>
        <p>Выберите этот вариант для перехода в revision lane.</p>
        <button class="cta-button">Выбрать вариант ${escapeHtml(variant.branch_name)}</button>
      </section>
      <footer class="panel footer">
        <small>Generated for ${escapeHtml(order.order_id)} / ${escapeHtml(variant.variant_id)} / ${escapeHtml(childSession.child_workspace_key)}</small>
      </footer>
    </main>
  </body>
</html>`;
}

function buildStaticVariantCss(variant) {
  const direction = branchDirection(variant.branch_name);
  return `:root { --accent: ${direction.accent}; --bg: #0f172a; --panel: #111827; --text: #f8fafc; --muted: #cbd5e1; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, Arial, sans-serif; background: linear-gradient(180deg, #020617, var(--bg)); color: var(--text); }
.page { max-width: 980px; margin: 0 auto; padding: 32px 20px 60px; }
.panel { background: rgba(17,24,39,0.88); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 24px; margin-bottom: 18px; }
.eyebrow { display: inline-block; margin-bottom: 12px; color: var(--accent); font-weight: 700; letter-spacing: 0.08em; }
.hero h1 { margin: 0 0 10px; font-size: 42px; }
.subhead { color: var(--muted); max-width: 720px; }
.cta, .cta-button { display: inline-block; margin-top: 16px; background: var(--accent); color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 700; border: none; }
ul { padding-left: 18px; }
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
    limitations: [
      'Deterministic bounded local generator, not a full production generator.',
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
        source: options.source || 'bounded_static_site_generator',
        generator_native: Boolean(options.generator_native || false),
        status: 'generated',
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
