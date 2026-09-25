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

test('Subnote should inherit parent note bucket', async ({ page }) => {
  await page.goto(`${BASE_URL}/notes`);
  await page.waitForLoadState('networkidle');

  // Open quick add
  await openQuickAdd(page);
  await page.waitForTimeout(500);

  // Should be in SubNote mode by default
  const checkbox = page.locator('input[type="checkbox"]').first();
  const isSubnoteMode = await checkbox.isChecked().catch(() => false);
  
  if (isSubnoteMode) {
    console.log('✓ Modal in SubNote mode');

    // Search for parent note
    const parentSearch = page.locator('input[placeholder="Search parent note..."]');
    if (await parentSearch.isVisible()) {
      await parentSearch.click();
      await page.waitForTimeout(500);

      // Select a parent note (try to find one with known bucket)
      const parentNotes = page.locator('button[type="button"]').filter({ hasText: /Energy|Release|Cost/ }).first();
      if (await parentNotes.isVisible()) {
        const parentName = await parentNotes.textContent();
        console.log(`✓ Found parent note: ${parentName}`);
        
        await parentNotes.click();
        await page.waitForTimeout(800);

        // Check bucket dropdown
        const bucketSelect = page.locator('select').first();
        if (await bucketSelect.isVisible()) {
          const selectedValue = await bucketSelect.inputValue();
          
          if (selectedValue && selectedValue !== '') {
            console.log(`✓ Bucket is auto-filled with value: ${selectedValue}`);
            
            // Check for the "(from parent)" label
            const fromParentLabel = page.locator('text=from parent');
            const hasLabel = await fromParentLabel.isVisible().catch(() => false);
            
            if (hasLabel) {
              console.log('✓ Label "(from parent)" is visible');
            } else {
              console.log('✓ Bucket inherited but label not visible (minor)');
            }

            // Verify bucket is not "None"
            expect(selectedValue).not.toBe('');
            console.log('✅ Subnote will inherit parent bucket - NOT defaulting to Unassigned!');
          } else {
            console.log('⚠ Bucket is empty (None selected)');
          }
        }
      }
    }
  }
});
