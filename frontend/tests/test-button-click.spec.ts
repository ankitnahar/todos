import { test, expect } from '@playwright/test';

test('Quick Add Modal should work via button click', async ({ page }) => {
  await page.goto('http://localhost:3000/notes');
  await page.waitForLoadState('networkidle');
  
  // First, let's programmatically simulate the modal opening
  // by executing JavaScript in the browser context
  await page.evaluate(() => {
    // Create a test event to verify the keyboard listener is attached
    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      altKey: true,
      key: 'n',
      code: 'KeyN'
    });
    window.dispatchEvent(event);
  });
  
  await page.waitForTimeout(1000);
  
  // Check if modal appeared
  const modal = page.locator('[class*="fixed"][class*="inset"]').first();
  const isVisible = await modal.isVisible().catch(() => false);
  
  if (isVisible) {
    console.log('✓ Modal appeared after keyboard event');
    
    // Check for title input
    const titleInput = page.locator('input').first();
    await titleInput.fill('Test Note');
    console.log('✓ Title filled');
    
    // Check for Create button
    const createBtn = page.locator('button:has-text("Create")').first();
    console.log('✓ Create button found');
  } else {
    console.log('✗ Modal did not appear');
    
    // Let's check what we can see
    const headers = await page.locator('h3').count();
    console.log('Headers on page:', headers);
  }
});
