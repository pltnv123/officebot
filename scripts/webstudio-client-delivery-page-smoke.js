const assert = require('assert');

async function readJson(url, options = {}) {
  const response = await fetch(url, options);
  const json = await response.json();
  return { response, json };
}

async function readHtml(url) {
  const response = await fetch(url);
  const text = await response.text();
  return { response, text };
}

async function main() {
  const base = 'http://127.0.0.1:8787';

  // Execute script to get artifact
  const scriptExec = await readJson(base + '/api/demo/webstudio-order/execute-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief: 'Сделай Python-скрипт, который читает от 1 до 5 и пишет "Vitya PRIVET"', tech_preference: 'python' }),
  });
  assert.strictEqual(scriptExec.response.status, 201);

  // Get artifact from library
  const library1 = await readJson(base + '/api/demo/webstudio-order/project-artifacts');
  const scriptArtifact = (library1.json.artifacts || []).find((item) => item.project_type === 'script' && item.order_id === scriptExec.json.order_id);
  assert(scriptArtifact, 'Script artifact not found in library');

  // Test script delivery page
  const scriptDelivery = await readHtml(base + '/webstudio/delivery/' + encodeURIComponent(scriptArtifact.project_artifact_id));
  assert.strictEqual(scriptDelivery.response.status, 200);
  assert(scriptDelivery.text.includes('Python Script Package') || scriptDelivery.text.includes('Python script package'), 'Script delivery page should show "Python Script Package"');
  assert(scriptDelivery.text.includes('Download ZIP'), 'Script delivery page should have Download ZIP button');
  assert(scriptDelivery.text.includes('script.py'), 'Script delivery page should list script.py');
  assert(scriptDelivery.text.includes('test_run.log'), 'Script delivery page should list test_run.log');
  assert(scriptDelivery.text.includes('Quality Checks') || scriptDelivery.text.includes('Что проверено'), 'Script delivery page should have QA section');
  assert(scriptDelivery.text.includes('Next Steps') || scriptDelivery.text.includes('Что дальше'), 'Script delivery page should have next steps section');

  // Execute telegram bot to get artifact
  const telegramExec = await readJson(base + '/api/demo/webstudio-order/execute-telegram-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief: 'Сделай Telegram-бота для приёма заявок: имя, телефон, услуга, сообщение. Сохранять заявки в CSV.', tech_preference: 'python' }),
  });
  assert.strictEqual(telegramExec.response.status, 201);

  // Get telegram artifact from library
  const library2 = await readJson(base + '/api/demo/webstudio-order/project-artifacts');
  const telegramArtifact = (library2.json.artifacts || []).find((item) => item.project_type === 'telegram_bot' && item.order_id === telegramExec.json.order_id);
  assert(telegramArtifact, 'Telegram artifact not found in library');

  // Test telegram bot delivery page
  const telegramDelivery = await readHtml(base + '/webstudio/delivery/' + encodeURIComponent(telegramArtifact.project_artifact_id));
  assert.strictEqual(telegramDelivery.response.status, 200);
  assert(telegramDelivery.text.includes('Telegram Bot Package') || telegramDelivery.text.includes('Telegram bot package'), 'Telegram delivery page should show "Telegram Bot Package"');
  assert(telegramDelivery.text.includes('Download ZIP'), 'Telegram delivery page should have Download ZIP button');
  assert(telegramDelivery.text.includes('bot.py') || telegramDelivery.text.includes('Bot'), 'Telegram delivery page should list bot.py');
  assert(telegramDelivery.text.includes('.env') || telegramDelivery.text.includes('env'), 'Telegram delivery page should list .env.example');
  assert(telegramDelivery.text.includes('dry-run') || telegramDelivery.text.includes('Dry-run') || telegramDelivery.text.includes('Dry Run'), 'Telegram delivery page should mention dry-run');

  // Test invalid artifact => friendly 404
  const invalidDelivery = await readHtml(base + '/webstudio/delivery/invalid-artifact-id-not-found');
  assert.strictEqual(invalidDelivery.response.status, 200);
  assert(invalidDelivery.text.includes('Artifact not found') || invalidDelivery.text.includes('not found'), 'Invalid artifact should show friendly 404');

  // Verify existing export smoke still works
  const scriptDetail = await readJson(base + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(scriptArtifact.project_artifact_id));
  assert.strictEqual(scriptDetail.response.status, 200);
  assert(Array.isArray(scriptDetail.json.file_routes));

  const telegramDetail = await readJson(base + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(telegramArtifact.project_artifact_id));
  assert.strictEqual(telegramDetail.response.status, 200);

  console.log(JSON.stringify({
    ok: true,
    script_delivery_page_ok: true,
    telegram_delivery_page_ok: true,
    invalid_artifact_404_ok: true,
    export_still_works_ok: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
