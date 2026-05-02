#!/usr/bin/env node
const assert = require('assert');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';

async function main() {
  console.log('Running WebStudio Platform Capabilities Smoke Test...\n');
  
  // Step 1: GET platform-capabilities => 200 JSON
  console.log('1. GET /api/demo/webstudio-order/platform-capabilities...');
  const response = await fetch(BASE_URL + '/api/demo/webstudio-order/platform-capabilities');
  assert(response.status === 200, 'status 200');
  const payload = await response.json();
  console.log('   status:', response.status);
  console.log('   ok:', payload.ok);
  
  // Step 2: surface_kind = webstudio_platform_capabilities
  console.log('\n2. Verify surface_kind...');
  assert(payload.surface_kind === 'webstudio_platform_capabilities', 'surface_kind matches');
  console.log('   surface_kind:', payload.surface_kind);
  
  // Step 3: lifecycle_version = universal-artifact-lifecycle-v1
  console.log('\n3. Verify lifecycle_version...');
  assert(payload.lifecycle_version === 'universal-artifact-lifecycle-v1', 'lifecycle_version matches');
  console.log('   lifecycle_version:', payload.lifecycle_version);
  
  // Step 4: Contains current types (script, telegram_bot, landing_page available)
  console.log('\n4. Verify available project types...');
  const availableTypes = payload.project_types.filter(pt => pt.implementation_status !== 'not_implemented');
  const availableNames = availableTypes.map(pt => pt.project_type);
  assert(availableNames.includes('script'), 'script available');
  assert(availableNames.includes('telegram_bot'), 'telegram_bot available');
  assert(availableNames.includes('landing_page'), 'landing_page available');
  console.log('   available types:', availableNames.join(', '));
  
  // Verify script capabilities
  const scriptType = payload.project_types.find(pt => pt.project_type === 'script');
  assert(scriptType.capabilities.edit.available === true, 'script edit available');
  assert(scriptType.capabilities.run.available === true, 'script run available');
  assert(scriptType.capabilities.versioning.available === true, 'script versioning available');
  console.log('   script capabilities: edit✅ run✅ versioning✅');
  
  // Step 5: Contains planned types (web_app, backend_service, android_app, ios_app planned)
  console.log('\n5. Verify planned project types...');
  const plannedTypes = payload.project_types.filter(pt => pt.implementation_status === 'not_implemented');
  const plannedNames = plannedTypes.map(pt => pt.project_type);
  assert(plannedNames.includes('web_app'), 'web_app planned');
  assert(plannedNames.includes('backend_service'), 'backend_service planned');
  assert(plannedNames.includes('android_app'), 'android_app planned');
  assert(plannedNames.includes('ios_app'), 'ios_app planned');
  console.log('   planned types:', plannedNames.join(', '));
  
  // Step 6: Android/iOS must NOT be marked available/implemented
  console.log('\n6. Verify Android/iOS NOT marked available...');
  const androidType = payload.project_types.find(pt => pt.project_type === 'android_app');
  const iosType = payload.project_types.find(pt => pt.project_type === 'ios_app');
  assert(androidType.implementation_status === 'not_implemented', 'android_app not implemented');
  assert(iosType.implementation_status === 'not_implemented', 'ios_app not implemented');
  assert(androidType.capabilities.edit.available === false, 'android edit not available');
  assert(iosType.capabilities.edit.available === false, 'ios edit not available');
  console.log('   android_app: not_implemented✅');
  console.log('   ios_app: not_implemented✅');
  
  // Verify reason fields present
  assert(androidType.reason, 'android_app has reason');
  assert(iosType.reason, 'ios_app has reason');
  console.log('   android reason:', androidType.reason);
  console.log('   ios reason:', iosType.reason);
  
  // Step 7: Universal lifecycle present
  console.log('\n7. Verify universal lifecycle...');
  assert(payload.universal_lifecycle.length === 10, '10 lifecycle stages');
  const stageNames = payload.universal_lifecycle.map(s => s.stage);
  assert(stageNames.includes('intake'), 'intake stage');
  assert(stageNames.includes('version'), 'version stage');
  assert(stageNames.includes('deliver'), 'deliver stage');
  console.log('   lifecycle stages:', stageNames.join(', '));
  
  // Step 8: /webstudio/demo HTML contains Platform Roadmap
  console.log('\n8. Verify /webstudio/demo HTML contains Platform Roadmap...');
  const demoHtml = await fetch(BASE_URL + '/webstudio/demo').then(r => r.text());
  assert(demoHtml.includes('Platform Roadmap'), 'Platform Roadmap present');
  assert(demoHtml.includes('platform-available-list'), 'available list container');
  assert(demoHtml.includes('platform-planned-list'), 'planned list container');
  assert(demoHtml.includes('android_app') || demoHtml.includes('Android'), 'android mentioned');
  assert(demoHtml.includes('ios_app') || demoHtml.includes('iOS'), 'ios mentioned');
  console.log('   Platform Roadmap UI: ✅');
  
  // Step 9: Next recommended slices present
  console.log('\n9. Verify next recommended slices...');
  assert(payload.next_recommended_slices.length >= 1, 'has recommendations');
  const sliceNames = payload.next_recommended_slices.map(s => s.project_type);
  console.log('   recommended slices:', sliceNames.join(', '));
  
  console.log('\n✅ All platform capabilities smoke tests passed!');
  
  return {
    ok: true,
    platform_capabilities_smoke_ok: true,
    available_types: availableNames,
    planned_types: plannedNames,
    lifecycle_version: payload.lifecycle_version,
  };
}

main().then(result => {
  console.log('\nResult:', JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error);
  process.exit(1);
});
