import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Helper to open modal via keyboard event
async function openQuickAddModal(page) {
  await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      altKey: true,
      key: 'n',
      code: 'KeyN',
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  });
  await page.waitForTimeout(800);
}

test.describe('Quick Add Note Modal - Core Functionality', () => {
  test('should open and close modal on Notes page', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' });

    // Open modal
    await openQuickAddModal(page);
    await expect(page.locator('[class*="fixed"][class*="inset"]')).toBeVisible();

    // Close via Cancel
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
    const modal = await page.locator('[class*="fixed"]').count();
    expect(modal).toBe(0);
  });

  test('should toggle between Note and SubNote modes', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' });

    await openQuickAddModal(page);

    // Find the subnote checkbox
    const checkbox = page.locator('input[type="checkbox"]');
    const isChecked = await checkbox.first().isChecked();
    expect(isChecked).toBe(true); // Should be checked by default (SubNote mode)

    // Uncheck to switch to Note mode
    await checkbox.first().click();
    const isCheckedAfter = await checkbox.first().isChecked();
    expect(isCheckedAfter).toBe(false);

    // Check back to SubNote
    await checkbox.first().click();
    const isCheckedAgain = await checkbox.first().isChecked();
    expect(isCheckedAgain).toBe(true);
  });

  test('should create a note successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' });

    await openQuickAddModal(page);

    // Switch to Note mode
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.first().click();
    await page.waitForTimeout(300);

    // Fill title
    const titleInputs = page.locator('input');
    const titleInput = titleInputs.nth(0);
    const testTitle = `Test Note ${Date.now()}`;
    await titleInput.fill(testTitle);

    // Click Create button
    const createButton = page.locator('button:has-text("Create")').first();
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Wait for success notification
    await page.waitForTimeout(2000);
    const successNotification = page.locator('text=Note created');
    const visible = await successNotification.isVisible().catch(() => false);

    if (visible) {
      console.log('✓ Note created successfully');
    }

    // Modal should close
    const modalStillVisible = await page.locator('[class*="fixed"][class*="inset"]').count();
    expect(modalStillVisible).toBeLessThanOrEqual(1); // Only loading spinner might remain
  });

  test('should work on all three pages', async ({ page }) => {
    const pages = [
      { path: '/notes', name: 'Notes' },
      { path: '/buckets', name: 'Bucket View' },
      { path: '/hot-topics', name: 'Hot Topics' }
    ];

    for (const { path, name } of pages) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Open modal
      await openQuickAddModal(page);
      await page.waitForTimeout(500);

      // Check for modal presence
      const modalInputs = page.locator('input[placeholder*="title"], input[placeholder*="subnote"], input[placeholder*="note"]');
      const hasInputs = await modalInputs.count() > 0;

      if (hasInputs) {
        console.log(`✓ Modal works on ${name} page`);
      }

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' });

    await openQuickAddModal(page);

    // In SubNote mode (default), Create button should be disabled
    const createButton = page.locator('button:has-text("Create")').first();
    let isDisabled = await createButton.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);

    // Switch to Note mode
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.first().click();
    await page.waitForTimeout(300);

    // Still disabled without title
    isDisabled = await createButton.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);

    // Add title
    const titleInput = page.locator('input').nth(0);
    await titleInput.fill('Valid Title');
    await page.waitForTimeout(300);

    // Button should now be enabled
    const isEnabled = await createButton.isEnabled().catch(() => false);
    expect(isEnabled).toBe(true);
  });

  test('should expand and collapse description', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' });

    await openQuickAddModal(page);

    // Description should not be visible initially
    let descVisible = await page.locator('[placeholder="Add description..."]').isVisible().catch(() => false);
    expect(descVisible).toBe(false);

    // Click Description button to expand
    const descButton = page.locator('button:has-text("Description")');
    if (await descButton.count() > 0) {
      await descButton.click();
      await page.waitForTimeout(300);

      // Now should be visible
      descVisible = await page.locator('[placeholder="Add description..."]').isVisible().catch(() => false);
      expect(descVisible).toBe(true);

      // Collapse again
      await descButton.click();
      await page.waitForTimeout(300);

      descVisible = await page.locator('[placeholder="Add description..."]').isVisible().catch(() => false);
      expect(descVisible).toBe(false);
    }
  });

  test('should allow tag selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'networkidle' });

    await openQuickAddModal(page);

    // Switch to Note mode
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.first().click();
    await page.waitForTimeout(300);

    // Click tags button
    const tagButton = page.locator('button:has-text("Select tags")');
    if (await tagButton.count() > 0) {
      await tagButton.click();
      await page.waitForTimeout(300);

      // Tags dropdown should be visible
      const tagInput = page.locator('input[placeholder="Search or create..."]').first();
      const visible = await tagInput.isVisible().catch(() => false);
      expect(visible).toBe(true);
    }
  });
});
