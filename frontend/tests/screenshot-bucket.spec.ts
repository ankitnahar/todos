import { test } from '@playwright/test';

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

test('screenshot: bucket inheritance in modal', async ({ page }) => {
  await page.goto(`${BASE_URL}/notes`);
  await page.waitForLoadState('networkidle');

  await openQuickAdd(page);
  
  const parentSearch = page.locator('input[placeholder="Search parent note..."]');
  if (await parentSearch.isVisible()) {
    await parentSearch.click();
    await page.waitForTimeout(500);
    
    // Select first parent note
    const parentNote = page.locator('button[type="button"]').first();
    if (await parentNote.isVisible()) {
      await parentNote.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot showing bucket selection
      await page.screenshot({ path: '/tmp/bucket-inherit.png', fullPage: true });
      console.log('Screenshot saved');
    }
  }
});
