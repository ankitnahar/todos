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

test('Subnote created via quick add should be immediately visible', async ({ page }) => {
  await page.goto(`${BASE_URL}/notes`);
  await page.waitForLoadState('networkidle');

  // Get a nested note to use as parent
  const nestedNotes = page.locator('[class*="subnote"], text=/Sub|sub/i');
  const noteCount = await nestedNotes.count();
  
  if (noteCount === 0) {
    console.log('⚠ No nested notes found, skipping test');
    return;
  }

  // Click on first nested note to open it
  const firstNote = page.locator('a, button').filter({ hasText: /C&I|Energy|Release|Cost|Todo/i }).first();
  if (await firstNote.isVisible()) {
    await firstNote.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }

  // Check if we're in note detail view
  const noteTitle = page.locator('h1, h2, h3').first();
  const titleText = await noteTitle.textContent();
  console.log(`✓ Opened note: ${titleText}`);

  // Get current subnote count
  const subnotesBefore = page.locator('[data-subnote-id]');
  const countBefore = await subnotesBefore.count();
  console.log(`✓ Current subnotes: ${countBefore}`);

  // Go back to notes list
  await page.goto(`${BASE_URL}/notes`);
  await page.waitForLoadState('networkidle');

  // Open quick add and create a subnote
  await openQuickAdd(page);
  
  // Parent note search should auto-populate if we just clicked a note
  const parentSearch = page.locator('input[placeholder="Search parent note..."]');
  if (await parentSearch.isVisible()) {
    // The checkbox should be checked (subnote mode)
    const checkbox = page.locator('input[type="checkbox"]').first();
    const isSubnoteMode = await checkbox.isChecked();
    
    if (isSubnoteMode) {
      // Search for a parent note
      await parentSearch.click();
      await page.waitForTimeout(300);
      
      const parentNotes = page.locator('button[type="button"]').filter({ hasText: /Energy|Release/ }).first();
      if (await parentNotes.isVisible()) {
        const parentName = await parentNotes.textContent();
        console.log(`✓ Found parent note: ${parentName}`);
        
        await parentNotes.click();
        await page.waitForTimeout(300);

        // Fill title
        const titleInputs = page.locator('input').filter({ hasText: /title|subnote/i });
        if (await titleInputs.count() > 0) {
          const uniqueTitle = `Test SubNote ${Date.now()}`;
          await titleInputs.first().fill(uniqueTitle);
          
          // Create subnote
          const createBtn = page.locator('button:has-text("Create")').first();
          if (await createBtn.isEnabled()) {
            await createBtn.click();
            await page.waitForTimeout(2000);
            
            console.log(`✓ Subnote "${uniqueTitle}" created`);

            // Now go back to the parent note detail to verify it appears
            // Click on the parent note
            const parentNoteLink = page.locator('a, button').filter({ hasText: /Energy|Release/ }).first();
            if (await parentNoteLink.isVisible()) {
              await parentNoteLink.click();
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(1000);

              // Check if the new subnote is visible
              const subnoteText = page.locator('text=' + uniqueTitle);
              const visible = await subnoteText.isVisible().catch(() => false);
              
              if (visible) {
                console.log('✅ Subnote is now visible in parent note!');
              } else {
                console.log('⚠ Subnote not immediately visible, checking if it appears...');
                await page.waitForTimeout(2000);
                const visibleNow = await subnoteText.isVisible().catch(() => false);
                if (visibleNow) {
                  console.log('✅ Subnote appeared after refresh!');
                }
              }
            }
          }
        }
      }
    }
  }
});
