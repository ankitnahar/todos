import { test, expect } from '@playwright/test';

test('should open quick add modal on Ctrl+Alt+N', async ({ page }) => {
  await page.goto('http://localhost:3000/notes', { waitUntil: 'load' });
  
  // Wait for page to fully load
  await page.waitForTimeout(2000);
  
  // Focus on the page
  await page.click('body');
  
  // Press Ctrl+Alt+N
  await page.keyboard.press('Control+Alt+N');
  
  // Wait a bit for modal to appear
  await page.waitForTimeout(1000);
  
  // Check if modal or title input exists
  const titleInputs = page.locator('input').filter({ hasText: /title|subnote|note/i });
  const count = await titleInputs.count();
  
  console.log('Found', count, 'title inputs');
  
  // Alternative: check for the header text
  const header = page.locator('h3').filter({ hasText: 'Quick Add' });
  const headerCount = await header.count();
  
  console.log('Found', headerCount, 'Quick Add headers');
  
  // Take a screenshot
  await page.screenshot({ path: '/tmp/screenshot.png' });
  console.log('Screenshot saved');
});
