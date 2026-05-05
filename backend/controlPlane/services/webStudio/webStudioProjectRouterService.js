function normalizeProjectType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const allowed = new Set(['landing_page', 'telegram_bot', 'script', 'web_app', 'automation', 'api_service', 'unknown']);
  if (allowed.has(raw)) return raw;
  return 'unknown';
}

function normalizeDeliverable(value) {
  const raw = String(value || '').trim().toLowerCase();
  const allowed = new Set(['preview', 'source_code', 'github_pr', 'zip_package', 'deployment_instructions']);
  return allowed.has(raw) ? raw : 'preview';
}

function normalizeTechPreference(value) {
  const raw = String(value || '').trim().toLowerCase();
  const allowed = new Set(['auto', 'python', 'nodejs', 'django', 'react', 'html_css', 'telegram_bot_api']);
  return allowed.has(raw) ? raw : 'auto';
}

function normalizeBrief(brief, projectType) {
  const text = String(brief || '').replace(/\s+/g, ' ').trim();
  if (!text) return `Client requested a ${projectType.replace(/_/g, ' ')} project. Brief needs clarification.`;
  return text;
}

function classifyProjectType(projectType, brief) {
  const normalizedType = normalizeProjectType(projectType);
  if (normalizedType === 'unknown') return 'unknown';
  if (normalizedType) return normalizedType;
  const text = String(brief || '').toLowerCase();
  if (/telegram|бот|bot/.test(text)) return 'telegram_bot';
  if (/script|скрипт|parser|парсер|cli/.test(text)) return 'script';
  if (/landing|лендинг/.test(text)) return 'landing_page';
  if (/web app|webapp|saas|dashboard|кабинет|приложение/.test(text)) return 'web_app';
  if (/automation|automate|n8n|zapier|workflow|интеграц/.test(text)) return 'automation';
  if (/api|backend|service|microservice/.test(text)) return 'api_service';
  return 'unknown';
}

function createPlanMap() {
  return {
    landing_page: {
      required_agents: ['CTO', 'frontend', 'QA'],
      expected_artifacts: ['HTML/CSS preview', 'SEO summary', 'revision lane'],
      execution_stages: ['Clarify offer and audience', 'Build premium landing structure', 'Prepare Variant B preview', 'Run QA and revision loop'],
      qa_plan: ['Check hero clarity and CTA visibility', 'Validate layout and responsive behavior', 'Review trust blocks, SEO basics, and revision readiness'],
      next_action: 'Start MVP Build',
      recommended_workflow: 'landing_mvp_preview_flow',
    },
    telegram_bot: {
      required_agents: ['CTO', 'backend/bot', 'QA'],
      expected_artifacts: ['bot.py', '.env.example', 'README', 'dry-run test', 'sample updates', 'applications.csv', 'test log'],
      execution_stages: ['Define lead capture conversation steps', 'Implement local bot state machine', 'Prepare CSV persistence and sample updates', 'Run dry-run QA without real Telegram token'],
      qa_plan: ['Validate bot state machine', 'Run dry-run simulated updates', 'Verify saved application row', 'Verify no real token required'],
      next_action: 'execute_telegram_bot_mvp',
      recommended_workflow: 'telegram_bot_delivery_router_flow',
    },
    script: {
      required_agents: ['CTO', 'backend/script', 'QA'],
      expected_artifacts: ['script file', 'README', 'sample input/output', 'test command'],
      execution_stages: ['Clarify inputs, outputs, and runtime', 'Choose minimal implementation approach', 'Prepare runnable script package', 'Verify sample execution and edge cases'],
      qa_plan: ['Validate CLI or file contract', 'Run sample input/output checks', 'Document execution command and dependencies'],
      next_action: 'Start MVP Build',
      recommended_workflow: 'script_delivery_router_flow',
    },
    web_app: {
      required_agents: ['CTO', 'frontend', 'backend', 'QA'],
      expected_artifacts: ['frontend preview', 'API sketch', 'data model', 'test plan'],
      execution_stages: ['Break product into screens and roles', 'Draft frontend and backend boundaries', 'Define MVP data model and API shape', 'Prepare QA plan for critical flows'],
      qa_plan: ['Validate main user journeys', 'Check API-contract completeness', 'Review data model assumptions and test strategy'],
      next_action: 'Start MVP Build',
      recommended_workflow: 'web_app_mvp_planning_flow',
    },
    automation: {
      required_agents: ['CTO', 'integration', 'QA'],
      expected_artifacts: ['workflow plan', 'integration map', 'code/config stubs', 'test checklist'],
      execution_stages: ['Map trigger and target systems', 'Define automation steps and failure handling', 'Prepare config/code stubs', 'Review rollout and QA checklist'],
      qa_plan: ['Check trigger-action mapping', 'Validate credentials/config surface', 'Review retry, logging, and manual fallback strategy'],
      next_action: 'Start MVP Build',
      recommended_workflow: 'automation_integration_router_flow',
    },
    api_service: {
      required_agents: ['CTO', 'backend', 'QA'],
      expected_artifacts: ['API contract', 'service skeleton plan', 'env/config notes', 'test checklist'],
      execution_stages: ['Define endpoints and consumers', 'Choose service/runtime shape', 'Draft data and integration requirements', 'Prepare QA contract tests'],
      qa_plan: ['Validate endpoint coverage', 'Check auth/config assumptions', 'Review error handling and smoke test commands'],
      next_action: 'Start MVP Build',
      recommended_workflow: 'api_service_router_flow',
    },
    unknown: {
      required_agents: ['CTO'],
      expected_artifacts: ['clarification questions', 'risk list', 'proposed project type'],
      execution_stages: ['Detect missing product details', 'Prepare clarification checklist', 'Propose the closest project type and delivery shape'],
      qa_plan: ['Verify open questions are actionable', 'Check key risks and assumptions are explicit'],
      next_action: 'Clarify Brief',
      recommended_workflow: 'clarification_router_flow',
    },
  };
}

function createWebStudioProjectRouterService() {
  const planMap = createPlanMap();

  function analyzeBrief(input = {}) {
    const requestedProjectType = normalizeProjectType(input.project_type);
    const desiredDeliverable = normalizeDeliverable(input.desired_deliverable);
    const techPreference = normalizeTechPreference(input.tech_preference);
    const normalizedBrief = normalizeBrief(input.brief, requestedProjectType);
    const resolvedProjectType = classifyProjectType(requestedProjectType, normalizedBrief);
    const basePlan = planMap[resolvedProjectType] || planMap.unknown;

    return {
      project_type: resolvedProjectType,
      requested_project_type: requestedProjectType,
      normalized_brief: normalizedBrief,
      desired_deliverable: desiredDeliverable,
      tech_preference: techPreference,
      recommended_workflow: basePlan.recommended_workflow,
      required_agents: basePlan.required_agents,
      expected_artifacts: basePlan.expected_artifacts.concat([
        `Desired deliverable: ${desiredDeliverable}`,
        `Preferred tech: ${techPreference}`,
      ]),
      execution_stages: basePlan.execution_stages,
      qa_plan: basePlan.qa_plan,
      next_action: basePlan.next_action,
      clarification_questions: resolvedProjectType === 'unknown'
        ? [
            'What should the final product do for the end user?',
            'Who will use it and through which interface?',
            'What format do you expect on delivery: preview, code, PR, zip, or deployment instructions?',
          ]
        : [],
    };
  }

  return { analyzeBrief };
}

module.exports = {
  createWebStudioProjectRouterService,
};
