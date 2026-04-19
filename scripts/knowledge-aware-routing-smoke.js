const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/knowledgeAwareLayer.js', 'utf8');
const reportPath = './docs/artifacts/knowledge-aware-context.json';

const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExports: layer.includes('buildKnowledgeAwareContext') && layer.includes('source_of_truth') && layer.includes('lossless-claw') && layer.includes('qmd'),
  endpointPresent: server.includes("app.get('/api/export/knowledge-aware-context'") && server.includes('knowledge_context: buildKnowledgeAwareContext'),
  artifactPresent: Boolean(artifact),
  routingSummary: typeof artifact?.routing_summary === 'object' && typeof artifact?.routing_summary?.suggested_owner === 'string',
  planningHints: Array.isArray(artifact?.planning_hints) && artifact.planning_hints.length >= 3,
  memoryAwareTasks: Array.isArray(artifact?.memory_aware_tasks) && artifact.memory_aware_tasks.length >= 1,
  compactPayload: typeof artifact?.compact_context_payload === 'object' && typeof artifact?.compact_context_payload?.routing_counts === 'object',
  supabaseSource: artifact?.source_of_truth?.runtime === 'supabase',
  qmdRetrieval: artifact?.source_of_truth?.retrieval === 'qmd',
  losslessMemory: artifact?.source_of_truth?.memory === 'lossless-claw',
};

console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
