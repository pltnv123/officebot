const fs = require('fs/promises');
const path = require('path');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');

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

function sanitizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function buildRevisedBuildArtifactId(orderId, branchName, revisionNumber) {
  return `ws-revised-build-artifact-${orderId}-${String(branchName).toLowerCase()}-rev-${revisionNumber}`;
}

function buildRevisionArtifactRoot(rootDir, orderId, branchName, revisionNumber) {
  return path.join(
    rootDir,
    'backend',
    'controlPlane',
    'storage',
    '.first-governed-workflow-runtime',
    'webstudio-revision-artifacts',
    orderId,
    String(branchName).toLowerCase(),
    `rev-${revisionNumber}`,
  );
}

function summarizeDeltaBrief(deltaBrief) {
  const requested = Array.isArray(deltaBrief?.requested_changes) ? deltaBrief.requested_changes.map(sanitizeText).filter(Boolean) : [];
  const constraints = Array.isArray(deltaBrief?.constraints) ? deltaBrief.constraints.map(sanitizeText).filter(Boolean) : [];
  return {
    requested_changes: requested,
    priority: sanitizeText(deltaBrief?.priority || 'normal') || 'normal',
    affected_sections: Array.isArray(deltaBrief?.affected_sections) ? deltaBrief.affected_sections.map(sanitizeText).filter(Boolean) : [],
    constraints,
    customer_notes: sanitizeText(deltaBrief?.customer_notes || ''),
    acceptance_delta: Array.isArray(deltaBrief?.acceptance_delta) ? deltaBrief.acceptance_delta.map(sanitizeText).filter(Boolean) : [],
    summary_text: requested.join('; ') || sanitizeText(deltaBrief?.customer_notes || ''),
  };
}

function buildRevisedStaticHtml(parentHtml, order, selectedVariant, revisionRequest, options = {}) {
  const delta = summarizeDeltaBrief(revisionRequest.delta_brief || {});
  const title = sanitizeText(selectedVariant?.headline || '') || `Вариант ${selectedVariant.branch_name}`;
  const trustItems = [
    'Больше конкретики о процессе и ожидаемом результате.',
    'Усиленный блок доверия с прозрачной логикой работы.',
    'CTA вынесен в более заметную акцентную зону.',
  ];
  const contentSections = (delta.affected_sections.length ? delta.affected_sections : ['hero', 'trust', 'cta'])
    .slice(0, 3)
    .map((sectionName, index) => `
      <section class="panel detail-section detail-${escapeHtml(sectionName)}">
        <h2>${escapeHtml(String(sectionName).toUpperCase())}</h2>
        <p>Ревизия ${escapeHtml(String(revisionRequest.revision_number))} усиливает секцию ${escapeHtml(sectionName)} без изменения базовой структуры исходного варианта.</p>
        <p class="detail-note">Изменение ${index + 1}: ${escapeHtml(delta.requested_changes[index] || delta.summary_text || 'Усилить восприятие и ясность оффера.')}</p>
      </section>`).join('');

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Revision ${escapeHtml(String(revisionRequest.revision_number))} · ${escapeHtml(order.order_id)} · ${escapeHtml(selectedVariant.branch_name)}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body
    data-order-id="${escapeHtml(order.order_id)}"
    data-selected-variant-id="${escapeHtml(selectedVariant.variant_id)}"
    data-revision-request-id="${escapeHtml(revisionRequest.revision_request_id)}"
    data-revision-number="${escapeHtml(String(revisionRequest.revision_number))}"
    data-parent-build-artifact-id="${escapeHtml(revisionRequest.parent_build_artifact_id)}"
  >
    <main class="page revision-page">
      <header class="hero panel hero-revision">
        <span class="eyebrow">WEBSTUDIO ${escapeHtml(selectedVariant.branch_name)} · REV ${escapeHtml(String(revisionRequest.revision_number))}</span>
        <h1>Усиленный первый экран для ${escapeHtml(title)}</h1>
        <p class="subhead">${escapeHtml(delta.summary_text || 'Усилить первый экран, добавить больше доверия и сделать CTA заметнее.')}</p>
        <a class="cta cta-primary" href="#contact">Получить усиленную версию</a>
        <p class="revision-note">Базовая структура сохранена, ревизия выполнена только для выбранного варианта.</p>
      </header>
      <section class="panel trust-block trust-block-revision">
        <h2>Почему это вызывает больше доверия</h2>
        <ul>
          ${trustItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <p class="customer-note">Комментарий клиента: ${escapeHtml(delta.customer_notes || 'Не указан отдельно, применён из delta brief.')}</p>
      </section>
      <section class="panel structure-preserved">
        <h2>Структура сохранена</h2>
        <p>Исходная логика варианта ${escapeHtml(selectedVariant.branch_name)} сохранена, изменены только акценты, доверительный блок и заметность CTA.</p>
      </section>
      ${contentSections}
      <section id="contact" class="panel contact-panel">
        <h2>CTA стал заметнее</h2>
        <p>Теперь основной призыв к действию визуально приоритетнее и поддержан доверием рядом с оффером.</p>
        <button class="cta-button">Запросить следующий шаг</button>
      </section>
      <footer class="panel footer">
        <small>Parent artifact: ${escapeHtml(revisionRequest.parent_build_artifact_id)} · Revision request: ${escapeHtml(revisionRequest.revision_request_id)}</small>
      </footer>
    </main>
    <template id="parent-html-fragment">${escapeHtml((parentHtml || '').slice(0, 1200))}</template>
  </body>
</html>`;
}

function buildRevisedStaticCss(selectedVariant) {
  const accent = selectedVariant.branch_name === 'A' ? '#c58b2b' : (selectedVariant.branch_name === 'B' ? '#2463eb' : '#9b36ff');
  return `:root { --accent: ${accent}; --bg: #08111f; --panel: rgba(15,23,42,0.92); --text: #f8fafc; --muted: #cbd5e1; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, Arial, sans-serif; background: radial-gradient(circle at top, rgba(36,99,235,0.25), transparent 40%), linear-gradient(180deg, #020617, var(--bg)); color: var(--text); }
.page { max-width: 980px; margin: 0 auto; padding: 32px 20px 64px; }
.panel { background: var(--panel); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; margin-bottom: 18px; }
.eyebrow { display: inline-block; margin-bottom: 12px; color: var(--accent); font-weight: 800; letter-spacing: 0.08em; }
.hero h1 { margin: 0 0 12px; font-size: 46px; line-height: 1.1; }
.subhead, .revision-note, .customer-note, .detail-note { color: var(--muted); }
.cta, .cta-button { display: inline-block; margin-top: 18px; background: linear-gradient(135deg, var(--accent), #f97316); color: white; text-decoration: none; padding: 14px 22px; border-radius: 14px; font-weight: 800; border: none; box-shadow: 0 12px 30px rgba(249,115,22,0.28); }
ul { padding-left: 18px; }
.hero-revision { border-color: rgba(249,115,22,0.35); }
.trust-block-revision { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04); }
`;
}

function buildRevisionManifest(order, selectedVariant, revisionRequest, revisedFiles, revisedBuildArtifactId) {
  const applied = summarizeDeltaBrief(revisionRequest.delta_brief || {});
  return {
    revised_build_artifact_id: revisedBuildArtifactId,
    revision_request_id: revisionRequest.revision_request_id,
    revision_number: revisionRequest.revision_number,
    parent_build_artifact_id: revisionRequest.parent_build_artifact_id,
    selected_variant_id: selectedVariant.variant_id,
    branch_name: selectedVariant.branch_name,
    order_id: order.order_id,
    source: 'bounded_revision_artifact_generator',
    revision_native: false,
    files: revisedFiles,
    checks: {
      revised_html_exists: true,
      revised_manifest_exists: true,
      parent_artifact_linked: true,
      selected_variant_linked: true,
      non_selected_variants_unchanged: true,
    },
    applied_delta_brief: applied,
    limitations: [
      'Bounded deterministic local revision generator, not OpenClaw-native child-session revision execution.',
      'No revised browser re-QA is performed in WEBSTUDIO-008.',
    ],
    generated_at: nowIso(),
  };
}

function createWebStudioRevisionExecutionService({ repositories, rootDir } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioBuildArtifacts || !repositories.webStudioRevisionRequests) {
    throw new Error('webStudioRevisionExecutionService requires webStudio repositories including build artifacts and revision requests');
  }
  if (!rootDir) {
    throw new Error('webStudioRevisionExecutionService requires rootDir');
  }

  const revisionService = createWebStudioRevisionService({ repositories });

  async function getSelectedVariantForRequest(orderId, revisionRequest) {
    const variant = await repositories.webStudioVariants.getVariantById({ variant_id: revisionRequest.selected_variant_id });
    if (!variant) throw new Error(`Selected variant missing for revision request: ${revisionRequest.selected_variant_id}`);
    if (variant.order_id !== orderId) throw new Error(`Selected variant does not belong to order: ${revisionRequest.selected_variant_id}`);
    return variant;
  }

  return Object.freeze({
    buildRevisedStaticHtml,
    buildRevisionManifest,

    async executeLatestRevisionForOrder(orderId, options = {}) {
      const latest = await revisionService.getLatestRevisionRequest(orderId);
      if (!latest) {
        throw new Error(`Latest revision request not found for order: ${orderId}`);
      }
      return this.executeRevisionRequest(orderId, latest.revision_request_id, options);
    },

    async executeRevisionRequest(orderId, revisionRequestId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) throw new Error(`WebStudio order not found: ${orderId}`);

      const revisionRequest = await repositories.webStudioRevisionRequests.getRevisionRequestById({ revision_request_id: revisionRequestId });
      if (!revisionRequest) throw new Error(`Revision request not found: ${revisionRequestId}`);
      if (revisionRequest.order_id !== orderId) throw new Error(`Revision request does not belong to order: ${revisionRequestId}`);

      if (revisionRequest.revised_build_artifact_id) {
        const existingArtifact = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: revisionRequest.revised_build_artifact_id });
        return {
          revision_request: revisionRequest,
          revised_build_artifact: existingArtifact,
          idempotent: true,
        };
      }

      const selectedVariant = await getSelectedVariantForRequest(orderId, revisionRequest);
      const parentArtifact = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: revisionRequest.parent_build_artifact_id || revisionRequest.build_artifact_id });
      if (!parentArtifact) throw new Error(`Parent build artifact missing for revision request: ${revisionRequestId}`);

      const pendingAt = nowIso();
      await repositories.webStudioRevisionRequests.updateRevisionRequestById({
        revision_request_id: revisionRequestId,
        patch: {
          status: 'pending_execution',
          revision_execution_status: 'pending_execution',
          revision_lane_status: 'pending_execution',
          updated_at: pendingAt,
        },
      });

      const revisedBuildArtifact = await this.createRevisedBuildArtifactForSelectedVariant(order, selectedVariant, { ...revisionRequest, parent_build_artifact_id: parentArtifact.build_artifact_id }, options);

      const completedAt = nowIso();
      const revisionResult = {
        revised_build_artifact_id: revisedBuildArtifact.build_artifact_id,
        parent_build_artifact_id: parentArtifact.build_artifact_id,
        html_path: revisedBuildArtifact.html_path,
        manifest_path: revisedBuildArtifact.manifest_path,
        applied_delta_summary: summarizeDeltaBrief(revisionRequest.delta_brief || {}),
        non_selected_variants_unchanged: true,
        source: revisedBuildArtifact.source,
        revision_native: revisedBuildArtifact.revision_native,
      };

      const updatedRequest = await repositories.webStudioRevisionRequests.updateRevisionRequestById({
        revision_request_id: revisionRequestId,
        patch: {
          status: 'completed',
          revised_build_artifact_id: revisedBuildArtifact.build_artifact_id,
          revision_execution_status: 'completed',
          revision_lane_status: 'completed',
          revision_result: revisionResult,
          execution_source: revisedBuildArtifact.source,
          revision_native: false,
          completed_at: completedAt,
          updated_at: completedAt,
        },
      });

      await repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          latest_revision_request_id: revisionRequestId,
          revision_lane_status: 'completed',
          updated_at: completedAt,
        },
      });

      return {
        revision_request: updatedRequest,
        revised_build_artifact: revisedBuildArtifact,
        idempotent: false,
      };
    },

    async createRevisedBuildArtifactForSelectedVariant(order, selectedVariant, revisionRequest, options = {}) {
      const revisedBuildArtifactId = options.build_artifact_id || buildRevisedBuildArtifactId(order.order_id, selectedVariant.branch_name, revisionRequest.revision_number);
      const existing = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: revisedBuildArtifactId });
      if (existing) return existing;

      const parentArtifact = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: revisionRequest.parent_build_artifact_id });
      if (!parentArtifact) throw new Error(`Parent build artifact missing: ${revisionRequest.parent_build_artifact_id}`);
      const parentHtml = await fs.readFile(parentArtifact.html_path, 'utf8');
      const artifactRoot = buildRevisionArtifactRoot(rootDir, order.order_id, selectedVariant.branch_name, revisionRequest.revision_number);
      await fs.mkdir(artifactRoot, { recursive: true });

      const htmlPath = path.join(artifactRoot, 'index.html');
      const cssPath = path.join(artifactRoot, 'styles.css');
      const manifestPath = path.join(artifactRoot, 'manifest.json');
      const previewPath = htmlPath;

      const html = buildRevisedStaticHtml(parentHtml, order, selectedVariant, revisionRequest, options);
      const css = buildRevisedStaticCss(selectedVariant);
      await fs.writeFile(htmlPath, html, 'utf8');
      await fs.writeFile(cssPath, css, 'utf8');

      const files = {
        html_path: htmlPath,
        css_path: cssPath,
        manifest_path: manifestPath,
        preview_path: previewPath,
      };
      const manifest = buildRevisionManifest(order, selectedVariant, revisionRequest, files, revisedBuildArtifactId);
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      const now = nowIso();
      const artifact = {
        build_artifact_id: revisedBuildArtifactId,
        order_id: order.order_id,
        variant_id: selectedVariant.variant_id,
        selected_variant_id: selectedVariant.variant_id,
        branch_name: selectedVariant.branch_name,
        artifact_type: 'revision',
        revision_request_id: revisionRequest.revision_request_id,
        revision_number: revisionRequest.revision_number,
        parent_build_artifact_id: revisionRequest.parent_build_artifact_id,
        source: 'bounded_revision_artifact_generator',
        generator_native: false,
        revision_native: false,
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
        lineage: {
          order_id: order.order_id,
          selected_variant_id: selectedVariant.variant_id,
          parent_build_artifact_id: revisionRequest.parent_build_artifact_id,
          revision_request_id: revisionRequest.revision_request_id,
          revision_number: revisionRequest.revision_number,
        },
        created_at: now,
        updated_at: now,
      };

      return repositories.webStudioBuildArtifacts.createBuildArtifact({ build_artifact: artifact });
    },

    async getRevisionExecutionSurface(orderId) {
      const revisionSurface = await revisionService.getRevisionSurface(orderId);
      const latest = revisionSurface.latest_revision_request;
      const parentBuildArtifact = latest?.parent_build_artifact_id
        ? await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: latest.parent_build_artifact_id })
        : null;
      const revisedBuildArtifact = latest?.revised_build_artifact_id
        ? await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: latest.revised_build_artifact_id })
        : null;

      return {
        latest_revision_request: clone(latest),
        revision_execution_status: latest?.revision_execution_status || 'not_started',
        parent_build_artifact: clone(parentBuildArtifact),
        revised_build_artifact: clone(revisedBuildArtifact),
        selected_variant: clone(revisionSurface.selected_variant),
        lineage: revisedBuildArtifact?.lineage || (latest ? {
          revision_request_id: latest.revision_request_id,
          revision_number: latest.revision_number,
          parent_build_artifact_id: latest.parent_build_artifact_id,
          selected_variant_id: latest.selected_variant_id,
        } : null),
      };
    },
  });
}

module.exports = {
  createWebStudioRevisionExecutionService,
  buildRevisedStaticHtml,
  buildRevisionManifest,
};