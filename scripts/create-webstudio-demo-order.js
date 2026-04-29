const path = require('path');
const { runWebStudioOrderWalkthrough } = require('../backend/controlPlane/storage/runWebStudioOrderWalkthrough');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const result = await runWebStudioOrderWalkthrough({ rootDir, reset: true });
  const surface = result.demo.surface;
  const variants = surface.variants || [];

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.governed_flow_id || null,
    variant_ids: variants.map((row) => row.variant_id),
    child_task_ids: variants.map((row) => row.child_task_id),
    qa_result_ids: variants.map((row) => row.qa_result?.qa_result_id || null),
    delivery_id: surface.delivery_bundle?.delivery_id || null,
    state_file: result.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
