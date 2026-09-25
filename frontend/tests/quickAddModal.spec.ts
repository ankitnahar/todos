import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Helper function to open quick add modal via keyboard event
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
  await page.waitForTimeout(500);
}

test.describe('Quick Add Note Modal - Ctrl+Alt+N', () => {
  test('should open modal on Notes page', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);
    const modal = page.locator('h3:has-text("Quick Add")').first();
    await expect(modal).toBeVisible();
  });

  test('should open modal on Bucket View page', async ({ page }) => {
    await page.goto(`${BASE_URL}/buckets`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);
    const modal = page.locator('h3:has-text("Quick Add")').first();
    await expect(modal).toBeVisible();
  });

  test('should open modal on Hot Topics page', async ({ page }) => {
    await page.goto(`${BASE_URL}/hot-topics`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);
    const modal = page.locator('h3:has-text("Quick Add")').first();
    await expect(modal).toBeVisible();
  });

  test('should close modal on X button click', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);
    const closeBtn = page.locator('button[type="button"]').filter({ hasText: 'X' }).first();
    await closeBtn.click();

    const modal = page.locator('h3:has-text("Quick Add")').first();
    await expect(modal).not.toBeVisible();
  });

  test('should close modal on Cancel button click', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);
    await page.locator('button:has-text("Cancel")').click();

    const modal = page.locator('h3:has-text("Quick Add")').first();
    await expect(modal).not.toBeVisible();
  });

  test('should toggle between SubNote and Note mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);
    const subNoteCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(subNoteCheckbox).toBeChecked();

    // Click to toggle to Note mode
    await subNoteCheckbox.click();
    await expect(subNoteCheckbox).not.toBeChecked();

    // Parent note search should not be visible in Note mode
    await expect(page.locator('text=Select Parent Note')).not.toBeVisible();

    // Toggle back to SubNote mode
    await subNoteCheckbox.click();
    await expect(subNoteCheckbox).toBeChecked();
    await expect(page.locator('text=Select Parent Note')).toBeVisible();
  });

  test('should create a simple note', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    // Open modal and toggle to Note mode
    await openQuickAddModal(page);
    await page.locator('input[type="checkbox"]').first().click();

    // Fill in note title
    const titleInput = page.locator('input').filter({ hasText: /title/i }).first();
    await titleInput.fill('Test Note ' + Date.now());

    // Click Create button
    const createBtn = page.locator('button:has-text("Create")').filter({ not: page.locator(':has-text("Create as")') }).first();
    await createBtn.click();

    // Success toast should appear
    await expect(page.locator('text=Note created')).toBeVisible({ timeout: 5000 });
  });

  test('should expand/collapse description section', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);

    // Description should be collapsed
    const descEditor = page.locator('[placeholder="Add description..."]').first();
    let isVisible = await descEditor.isVisible().catch(() => false);
    expect(isVisible).toBe(false);

    // Click Description to expand
    await page.locator('button:has-text("Description")').click();

    // Description editor should now be visible
    await expect(descEditor).toBeVisible();

    // Click again to collapse
    await page.locator('button:has-text("Description")').click();
    isVisible = await descEditor.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);

    // Try to create without title - button should be disabled
    const createButton = page.locator('button:has-text("Create")').filter({ not: page.locator(':has-text("Create as")') }).first();
    await expect(createButton).toBeDisabled();

    // Add title
    const titleInput = page.locator('input').filter({ hasText: /title|subnote/i }).first();
    await titleInput.fill('Test');

    // Button should still be disabled (waiting for parent note in subnote mode)
    await expect(createButton).toBeDisabled();

    // Toggle to note mode
    await page.locator('input[type="checkbox"]').first().click();

    // Now button should be enabled
    await expect(createButton).toBeEnabled();
  });

  test('should select bucket for note', async ({ page }) => {
    await page.goto(`${BASE_URL}/notes`);
    await page.waitForLoadState('networkidle');

    await openQuickAddModal(page);

    // Toggle to Note mode
    await page.locator('input[type="checkbox"]').first().click();

    // Fill title
    const titleInput = page.locator('input').filter({ hasText: /title/i }).first();
    await titleInput.fill('Note in Bucket ' + Date.now());

    // Open bucket dropdown
    const bucketSelect = page.locator('select').first();
    await bucketSelect.selectOption({ index: 1 }); // Select first non-None bucket

    // Verify selection changed
    const selectedOption = bucketSelect.locator('option[selected]');
    const selectedText = await selectedOption.textContent();
    expect(selectedText).not.toBe('None');

    // Create note
    const createBtn = page.locator('button:has-text("Create")').filter({ not: page.locator(':has-text("Create as")') }).first();
    await createBtn.click();

    // Verify success
    await expect(page.locator('text=Note created')).toBeVisible({ timeout: 5000 });
  });

  test('should work across all three pages', async ({ page }) => {
    const pages = ['/notes', '/buckets', '/hot-topics'];

    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');

      // Open modal
      await openQuickAddModal(page);
      const modal = page.locator('h3:has-text("Quick Add")').first();
      await expect(modal).toBeVisible();

      // Close modal
      await page.locator('button:has-text("Cancel")').click();
      await expect(modal).not.toBeVisible();
    }
  });
});
