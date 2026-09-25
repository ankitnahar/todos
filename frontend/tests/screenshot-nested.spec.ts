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

test('screenshot: parent note search with nested indicators', async ({ page }) => {
  await page.goto(`${BASE_URL}/notes`);
  await page.waitForLoadState('networkidle');

  await openQuickAdd(page);
  
  const parentSearch = page.locator('input[placeholder="Search parent note..."]');
  if (await parentSearch.isVisible()) {
    await parentSearch.click();
    await page.waitForTimeout(800);
    
    // Take screenshot of dropdown
    await page.screenshot({ path: '/tmp/nested-notes-dropdown.png' });
    console.log('Screenshot saved to /tmp/nested-notes-dropdown.png');
  }
});
