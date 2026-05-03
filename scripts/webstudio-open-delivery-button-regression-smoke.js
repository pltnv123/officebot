#!/usr/bin/env node
/**
 * WEBSTUDIO-HOTFIX-OPEN-DELIVERY-BUTTON-001: Open Delivery Button State Smoke
 * 
 * Tests Open Delivery button behavior:
 * A. Before artifact exists - should be disabled or show clear message
 * B. After Execute Script MVP - should open valid delivery page
 */

const playwright = require('playwright');

const BASE_URL = 'http://127.0.0.1:8787';
const DEMO_PATH = '/webstudio/demo';

const BRIEF = 'Сделай Python-скрипт, который от 1 до 3 пишет "DELIVERY BUTTON OK"';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('WEBSTUDIO-HOTFIX-OPEN-DELIVERY-BUTTON-001: Open Delivery Button Smoke');
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = {
    ok: false,
    pre_artifact_guard_ok: false,
    post_artifact_open_ok: false,
    delivery_route_ok: false,
    no_undefined_delivery_ok: false,
    no_console_errors_ok: false,
    errors: []
  };

  let browser;
  
  try {
    browser = await playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // ========== PART A: Before artifact exists ==========
    console.log('=== PART A: Before artifact exists ===\n');
    console.log('1. Opening /webstudio/demo (no artifact yet)...');
    await page.goto(`${BASE_URL}${DEMO_PATH}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.locator('select#project-type-select').selectOption('script');
    await page.waitForTimeout(500);
    
    // Check Open Delivery button state before generating artifact
    const openDeliveryBtn = page.locator('#open-delivery-btn');
    const isDisabled = await openDeliveryBtn.isDisabled().catch(() => false);
    console.log(`   Open Delivery disabled: ${isDisabled}`);
    
    // Try clicking it
    const statusLineBefore = page.locator('#status-line');
    const statusBefore = await statusLineBefore.textContent();
    
    await openDeliveryBtn.click();
    await page.waitForTimeout(1000);
    
    const statusAfter = await statusLineBefore.textContent();
    const hasNoArtifactMessage = statusAfter.includes('No artifact') || statusAfter.includes('Generate') || statusAfter.includes('first');
    
    // Check if it opened undefined URL
    const currentUrl = page.url();
    const hasUndefined = currentUrl.includes('undefined') || currentUrl.includes('/delivery/');
    
    result.pre_artifact_guard_ok = isDisabled || hasNoArtifactMessage;
    result.no_undefined_delivery_ok = !hasUndefined || hasNoArtifactMessage;
    
    console.log(`   Status message after click: ${statusAfter}`);
    console.log(`   ✅ Guard works (disabled or message): ${result.pre_artifact_guard_ok}`);
    console.log(`   ✅ No /delivery/undefined opened: ${result.no_undefined_delivery_ok}\n`);
    
    if (!result.pre_artifact_guard_ok) {
      result.errors.push('Open Delivery not properly guarded before artifact exists');
    }
    if (!result.no_undefined_delivery_ok) {
      result.errors.push('Open Delivery opened undefined URL');
    }

    // ========== PART B: After artifact exists ==========
    console.log('=== PART B: After Execute Script MVP ===\n');
    console.log('2. Generating script artifact...');
    await page.locator('textarea#brief-text').fill(BRIEF);
    await page.locator('button#analyze-brief-btn').click();
    await page.waitForTimeout(5000);
    await page.locator('button#execute-script-btn').click();
    await page.waitForTimeout(12000);
    await page.locator('#script-program-panel').waitFor({ state: 'visible', timeout: 10000 });
    console.log('   ✅ Script generated\n');
    
    // Wait for artifact ID to be set
    await page.waitForTimeout(1000);
    
    console.log('3. Clicking Open Delivery after artifact exists...');
    const [deliveryPage] = await Promise.all([
      page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
      openDeliveryBtn.click()
    ]);
    
    if (deliveryPage) {
      await deliveryPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await deliveryPage.waitForTimeout(2000);
      
      const deliveryUrl = deliveryPage.url();
      console.log(`   Delivery URL: ${deliveryUrl}`);
      
      const hasUndefinedInUrl = deliveryUrl.includes('undefined');
      const hasCannotGet = await deliveryPage.evaluate(() => document.body.innerText.includes('Cannot GET'));
      const has404 = await deliveryPage.evaluate(() => document.body.innerText.includes('404'));
      
      result.delivery_route_ok = !hasUndefinedInUrl && !hasCannotGet && !has404;
      console.log(`   ✅ No undefined in URL: ${!hasUndefinedInUrl}`);
      console.log(`   ✅ No Cannot GET: ${!hasCannotGet}`);
      console.log(`   ✅ No 404: ${!has404}\n`);
      
      if (!result.delivery_route_ok) {
        result.errors.push('Delivery route failed');
      }
      
      // Check delivery page content
      const title = await deliveryPage.locator('h1').textContent().catch(() => '');
      const hasTitle = title.includes('Python script package') || title.includes('Python Script Package');
      console.log(`   Title: ${title}`);
      console.log(`   ✅ Has Python script package title: ${hasTitle}\n`);
      
      // Check for artifact ID in footer or content
      const hasArtifactId = await deliveryPage.evaluate(() => {
        const footer = document.querySelector('.footer');
        return footer && footer.textContent.includes('ws-project-artifact');
      });
      console.log(`   ✅ Artifact ID visible: ${hasArtifactId}\n`);
      
      result.post_artifact_open_ok = hasTitle && hasArtifactId && result.delivery_route_ok;
      
      await deliveryPage.close();
    } else {
      console.log('   ❌ Delivery popup not opened\n');
      result.errors.push('Delivery popup not opened after artifact exists');
    }

    // Check console errors
    const criticalErrors = consoleErrors.filter(e => 
      e.includes('artifactId is not defined') ||
      e.includes('Cannot read properties of null') ||
      e.includes('/delivery/undefined')
    );
    result.no_console_errors_ok = criticalErrors.length === 0;
    if (criticalErrors.length > 0) {
      console.log(`   ❌ Critical console errors: ${criticalErrors.join(', ')}\n`);
      result.errors.push(...criticalErrors);
    } else {
      console.log('   ✅ No critical console errors\n');
    }

    result.errors = result.errors.filter((v, i, a) => a.indexOf(v) === i);
    result.ok = result.pre_artifact_guard_ok && 
                result.post_artifact_open_ok && 
                result.delivery_route_ok && 
                result.no_undefined_delivery_ok && 
                result.no_console_errors_ok;

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    result.errors.push(error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(result, null, 2));
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(result.ok ? 0 : 1);
}

main();
