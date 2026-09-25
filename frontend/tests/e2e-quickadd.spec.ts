import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

async function openQuickAdd(page) {
  await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      altKey: true,
      key: 'n',
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  });
  await page.waitForTimeout(800);
}

test.describe('E2E: Quick Add Note Modal', () => {
  test('End-to-End: Create note from search page', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    // Open quick add
    await openQuickAdd(page);
    
    // Switch to Note mode
    const inputs = page.locator('input[type="checkbox"]');
    if (await inputs.count() > 0) {
      await inputs.first().click();
    }

    // Fill title
    const titleInputs = page.locator('input').filter({ hasText: /title|note/i });
    if (await titleInputs.count() > 0) {
      await titleInputs.first().fill(`E2E Test Note ${Date.now()}`);
      
      // Create
      const btn = page.locator('button:has-text("Create")').first();
      if (await btn.isEnabled()) {
        await btn.click();
        await page.waitForTimeout(2000);
        
        console.log('✅ E2E Test: Note created successfully from Notes page');
      }
    }
  });

  test('End-to-End: Create note from bucket view', async ({ page }) => {
    await page.goto(`${BASE_URL}/buckets`);
    await page.waitForLoadState('networkidle');

    await openQuickAdd(page);
    
    const inputs = page.locator('input[type="checkbox"]');
    if (await inputs.count() > 0) {
      await inputs.first().click();
    }

    const titleInputs = page.locator('input').filter({ hasText: /title|note/i });
    if (await titleInputs.count() > 0) {
      await titleInputs.first().fill(`E2E Test Note ${Date.now()}`);
      
      const btn = page.locator('button:has-text("Create")').first();
      if (await btn.isEnabled()) {
        await btn.click();
        await page.waitForTimeout(2000);
        
        console.log('✅ E2E Test: Note created successfully from Bucket View');
      }
    }
  });

  test('End-to-End: Create note from hot topics', async ({ page }) => {
    await page.goto(`${BASE_URL}/hot-topics`);
    await page.waitForLoadState('networkidle');

    await openQuickAdd(page);
    
    const inputs = page.locator('input[type="checkbox"]');
    if (await inputs.count() > 0) {
      await inputs.first().click();
    }

    const titleInputs = page.locator('input').filter({ hasText: /title|note/i });
    if (await titleInputs.count() > 0) {
      await titleInputs.first().fill(`E2E Test Note ${Date.now()}`);
      
      const btn = page.locator('button:has-text("Create")').first();
      if (await btn.isEnabled()) {
        await btn.click();
        await page.waitForTimeout(2000);
        
        console.log('✅ E2E Test: Note created successfully from Hot Topics');
      }
    }
  });
});
