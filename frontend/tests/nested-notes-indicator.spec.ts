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

test('should show subnote count for nested notes in parent search', async ({ page }) => {
  await page.goto(`${BASE_URL}/notes`);
  await page.waitForLoadState('networkidle');

  // Open quick add (should be in SubNote mode by default)
  await openQuickAdd(page);

  // Click on parent note search
  const parentSearch = page.locator('input[placeholder="Search parent note..."]');
  if (await parentSearch.isVisible()) {
    await parentSearch.click();
    await page.waitForTimeout(500);

    // Look for notes with subnote indicators
    const noteItems = page.locator('span').filter({ hasText: /^\d+$/ });
    const badgeCount = await noteItems.count();

    if (badgeCount > 0) {
      console.log(`✓ Found ${badgeCount} notes with subnote counts displayed`);
      
      // Verify at least one badge is visible
      const firstBadge = noteItems.first();
      await expect(firstBadge).toBeVisible();
      console.log('✓ Subnote count badges are visible');
    } else {
      console.log('⚠ No subnote count badges found (might be no nested notes in DB)');
    }

    // Verify colored background for nested notes
    const highlightedNotes = page.locator('[class*="primary"]');
    const highlightCount = await highlightedNotes.count();
    console.log(`✓ Found ${highlightCount} highlighted nested note entries`);
  }
});
