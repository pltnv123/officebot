/**
 * WebStudio Platform Registry Service
 * 
 * Defines universal artifact lifecycle and platform capabilities for all project types.
 * 
 * @module webStudioPlatformRegistryService
 */

const UNIVERSAL_LIFECYCLE = [
  { stage: 'intake', order: 1, description: 'Capture requirements and context' },
  { stage: 'plan', order: 2, description: 'Break down into executable steps' },
  { stage: 'generate', order: 3, description: 'Produce initial artifact' },
  { stage: 'review_edit', order: 4, description: 'Human review and modification' },
  { stage: 'run_preview_test', order: 5, description: 'Execute or preview artifact' },
  { stage: 'qa', order: 6, description: 'Automated quality gates' },
  { stage: 'version', order: 7, description: 'Save as immutable version' },
  { stage: 'deliver', order: 8, description: 'Package for handoff/deployment' },
  { stage: 'history_audit', order: 9, description: 'Track changes and runs' },
  { stage: 'expand', order: 10, description: 'Add new capabilities' },
];

const PROJECT_TYPES = {
  script: {
    project_type: 'script',
    display_name: 'Python Script',
    implementation_status: 'bounded_editable_versioned_playground',
    language: 'python',
    runtime: 'python3.12+',
    safety_level: 'bounded_demo',
    primary_file: 'script.py',
    run_command: ['python3', 'script.py'],
    capabilities: {
      edit: { available: true, description: 'Bounded editable source in web editor' },
      run: { available: true, description: 'Python execution in bounded sandbox' },
      preview_build: { available: true, description: 'stdout/logs output' },
      delivery_package: { available: true, description: 'ZIP with script.py, README, config' },
      versioning: { available: true, description: 'Full version history with restore' },
      history_audit: { available: true, description: 'Run history with output/duration' },
    },
    constraints: [
      'No os/sys/subprocess imports',
      'Bounded execution time',
      'No network access',
    ],
  },
  telegram_bot: {
    project_type: 'telegram_bot',
    display_name: 'Telegram Bot',
    implementation_status: 'bounded_dry_run_package',
    language: 'python',
    runtime: 'python3.12+',
    safety_level: 'bounded_demo',
    primary_file: 'bot.py',
    run_command: ['python3', 'dry_run_test.py'],
    capabilities: {
      edit: { available: true, description: 'Bounded editable source in web editor' },
      run: { available: true, description: 'Dry-run simulation (no real API calls)' },
      preview_build: { available: true, description: 'Dry-run output simulation' },
      delivery_package: { available: true, description: 'ZIP with bot.py, README, config' },
      versioning: { available: true, description: 'Full version history with restore' },
      history_audit: { available: true, description: 'Run history with output/duration' },
    },
    constraints: [
      'No real Telegram API calls in demo',
      'Dry-run mode only',
      'Bounded execution time',
    ],
  },
  landing_page: {
    project_type: 'landing_page',
    display_name: 'Landing Page',
    implementation_status: 'bounded_preview_revision',
    language: 'html',
    runtime: 'static_file_server',
    safety_level: 'static_content',
    primary_file: 'index.html',
    run_command: null,
    capabilities: {
      edit: { available: true, description: 'Bounded editable HTML/CSS/JS' },
      run: { available: true, description: 'Static preview via HTTP' },
      preview_build: { available: true, description: 'HTML render in browser' },
      delivery_package: { available: true, description: 'ZIP with index.html, assets' },
      versioning: { available: true, description: 'Full version history with restore' },
      history_audit: { available: true, description: 'Run history with preview URLs' },
    },
    constraints: [
      'Static content only',
      'No server-side execution',
      'No external resource fetching in demo',
    ],
  },
  web_app: {
    project_type: 'web_app',
    display_name: 'Web Application',
    implementation_status: 'not_implemented',
    language: 'javascript/typescript',
    runtime: 'nodejs',
    safety_level: 'tbd',
    primary_file: 'src/App.tsx',
    run_command: null,
    capabilities: {
      edit: { available: false, description: 'Planned: source editor' },
      run: { available: false, description: 'Planned: dev server' },
      preview_build: { available: false, description: 'Planned: hot-reload preview' },
      delivery_package: { available: false, description: 'Planned: bundled ZIP' },
      versioning: { available: false, description: 'Planned: version history' },
      history_audit: { available: false, description: 'Planned: run history' },
    },
    constraints: [],
    reason: 'requires dedicated executor/build runner (webpack/vite, dev server, bundler)',
  },
  backend_service: {
    project_type: 'backend_service',
    display_name: 'Backend Service',
    implementation_status: 'not_implemented',
    language: 'javascript/python/go',
    runtime: 'nodejs/python/go',
    safety_level: 'tbd',
    primary_file: 'server.js',
    run_command: null,
    capabilities: {
      edit: { available: false, description: 'Planned: source editor' },
      run: { available: false, description: 'Planned: API test harness' },
      preview_build: { available: false, description: 'Planned: service preview' },
      delivery_package: { available: false, description: 'Planned: service package' },
      versioning: { available: false, description: 'Planned: version history' },
      history_audit: { available: false, description: 'Planned: run history' },
    },
    constraints: [],
    reason: 'requires dedicated executor/build runner (API harness, database mocks, service discovery)',
  },
  android_app: {
    project_type: 'android_app',
    display_name: 'Android App',
    implementation_status: 'not_implemented',
    language: 'kotlin',
    runtime: 'android_sdk',
    safety_level: 'tbd',
    primary_file: 'MainActivity.kt',
    run_command: null,
    capabilities: {
      edit: { available: false, description: 'Planned: source editor' },
      run: { available: false, description: 'Planned: emulator build/run' },
      preview_build: { available: false, description: 'Planned: APK build' },
      delivery_package: { available: false, description: 'Planned: APK package' },
      versioning: { available: false, description: 'Planned: version history' },
      history_audit: { available: false, description: 'Planned: run history' },
    },
    constraints: [],
    reason: 'requires Android SDK, emulator, build runner (Gradle)',
  },
  ios_app: {
    project_type: 'ios_app',
    display_name: 'iOS App',
    implementation_status: 'not_implemented',
    language: 'swift',
    runtime: 'xcode',
    safety_level: 'tbd',
    primary_file: 'ContentView.swift',
    run_command: null,
    capabilities: {
      edit: { available: false, description: 'Planned: source editor' },
      run: { available: false, description: 'Planned: simulator build/run' },
      preview_build: { available: false, description: 'Planned: IPA build' },
      delivery_package: { available: false, description: 'Planned: IPA package' },
      versioning: { available: false, description: 'Planned: version history' },
      history_audit: { available: false, description: 'Planned: run history' },
    },
    constraints: [],
    reason: 'requires macOS runner, Xcode, simulator/build environment',
  },
};

/**
 * Get list of supported project types with their capabilities.
 * @returns {Array} Array of project type objects
 */
function getSupportedProjectTypes() {
  return Object.values(PROJECT_TYPES).map(pt => ({
    project_type: pt.project_type,
    display_name: pt.display_name,
    implementation_status: pt.implementation_status,
    language: pt.language,
  }));
}

/**
 * Get detailed capabilities for a specific project type.
 * @param {string} projectType - Project type key (e.g., 'script', 'telegram_bot')
 * @returns {Object|null} Project type capabilities or null if not found
 */
function getProjectTypeCapabilities(projectType) {
  return PROJECT_TYPES[projectType] || null;
}

/**
 * Get the universal lifecycle stages.
 * @returns {Array} Array of lifecycle stage objects
 */
function getUniversalLifecycle() {
  return UNIVERSAL_LIFECYCLE;
}

/**
 * Get next recommended slices to implement.
 * @returns {Array} Array of recommended project types with rationale
 */
function getNextRecommendedSlices() {
  return [
    {
      project_type: 'web_app',
      priority: 1,
      rationale: 'Natural extension of landing_page with dynamic behavior',
      dependencies: ['dev_server', 'bundler', 'hot_reload'],
    },
    {
      project_type: 'backend_service',
      priority: 2,
      rationale: 'Enables full-stack workflows with API-driven logic',
      dependencies: ['api_harness', 'database_mocks', 'service_discovery'],
    },
    {
      project_type: 'android_app',
      priority: 3,
      rationale: 'Mobile platform support for OfficeBot',
      dependencies: ['android_sdk', 'emulator', 'gradle_runner'],
    },
    {
      project_type: 'ios_app',
      priority: 4,
      rationale: 'Mobile platform support for OfficeBot (iOS)',
      dependencies: ['macos_runner', 'xcode', 'simulator'],
    },
  ];
}

/**
 * Get platform capabilities surface for API response.
 * @returns {Object} Platform capabilities surface object
 */
function getPlatformCapabilitiesSurface() {
  const availableTypes = Object.values(PROJECT_TYPES).filter(
    pt => pt.implementation_status !== 'not_implemented'
  );
  const plannedTypes = Object.values(PROJECT_TYPES).filter(
    pt => pt.implementation_status === 'not_implemented'
  );

  return {
    surface_kind: 'webstudio_platform_capabilities',
    lifecycle_version: 'universal-artifact-lifecycle-v1',
    project_types: Object.values(PROJECT_TYPES),
    universal_lifecycle: UNIVERSAL_LIFECYCLE,
    next_recommended_slices: getNextRecommendedSlices(),
    summary: {
      available_count: availableTypes.length,
      planned_count: plannedTypes.length,
      available_types: availableTypes.map(pt => pt.project_type),
      planned_types: plannedTypes.map(pt => pt.project_type),
    },
  };
}

module.exports = {
  getSupportedProjectTypes,
  getProjectTypeCapabilities,
  getUniversalLifecycle,
  getNextRecommendedSlices,
  getPlatformCapabilitiesSurface,
  PROJECT_TYPES,
  UNIVERSAL_LIFECYCLE,
};
