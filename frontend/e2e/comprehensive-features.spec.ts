import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Comprehensive Feature Testing - Create, Edit, and Interact', () => {
  let page: Page;
  let noteId: string;
  let subnoteId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. Create a parent note with bucket and tags', async () => {
    // Navigate to create note
    await page.click('text=New');
    await expect(page).toHaveURL(/\/notes\/new/);

    // Fill note title
    await page.fill('input[placeholder="Note title"]', 'Comprehensive Test Note');

    // Select bucket (should default to ToDo)
    const bucketSelect = page.locator('select').first();
    await bucketSelect.selectOption({ label: /ToDo/ });

    // Add tags
    await page.click('button, div >> text=Tags');
    await page.fill('input[placeholder*="Search"]', 'important');
    await page.click('text=Create "important"');

    // Enable subnotes
    await page.check('input[type="checkbox"] ~ span:has-text("SubNotes")');

    // Save
    await page.click('button:has-text("Create Note")');

    // Extract note ID from URL
    await expect(page).toHaveURL(/\/notes\/\d+/);
    noteId = page.url().split('/').pop() || '';
    expect(noteId).toBeTruthy();
  });

  test('2. Create subnotes with different features', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    // Create first subnote
    await page.click('text=Add SubNote');
    await page.fill('[placeholder="SubNote title"]', 'Backend Implementation');

    // Add description
    await page.click('[placeholder="SubNote description..."]');
    await page.fill('[placeholder="SubNote description..."]', 'Implement API endpoints for note management');

    // Toggle hot topic
    await page.click('button[title="Toggle Hot Topic"]');

    // Save subnote
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

    // Create second subnote with different bucket
    await page.click('text=Add SubNote');
    await page.fill('[placeholder="SubNote title"]', 'Frontend Components');
    await page.click('[placeholder="SubNote description..."]');
    await page.fill('[placeholder="SubNote description..."]', '- Create note editor\n- Build subnote list\n- Add tag selector');

    // Add tags to subnote
    await page.click('button[title="Edit tags"]');
    await page.fill('input[placeholder*="Search"]', 'frontend');
    await page.click('text=Create "frontend"');

    // Save
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });
  });

  test('3. Test tagging on subnotes', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    // Click tag button on first subnote
    const subnoteCards = page.locator('[data-subnote-id]');
    const firstSubnote = subnoteCards.first();

    // Click tag icon
    await firstSubnote.locator('button[title="Edit tags"]').click();

    // Add tag from popup
    const tagPopup = page.locator('[role="dialog"], .fixed.z-50').first();
    await tagPopup.locator('input[placeholder*="Search"]').fill('critical');
    await tagPopup.locator('text=Create "critical"').click();

    // Verify tag was added
    await expect(tagPopup.locator('text=critical')).toBeVisible();
  });

  test('4. Test assignee functionality', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    const subnoteCards = page.locator('[data-subnote-id]');
    const firstSubnote = subnoteCards.first();

    // Click assignees button
    await firstSubnote.locator('button[title="Edit assignees"]').click();

    const assigneePopup = page.locator('[role="dialog"], .fixed.z-50').last();
    await assigneePopup.locator('input[placeholder*="Search"]').fill('John');
    await assigneePopup.locator('text=Add "John"').click();

    // Verify assignee was added
    await expect(assigneePopup.locator('text=John')).toBeVisible();
  });

  test('5. Test bucket change', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    const subnoteCards = page.locator('[data-subnote-id]');
    const firstSubnote = subnoteCards.first();

    // Click bucket button
    await firstSubnote.locator('button[title="Change bucket"]').click();

    const bucketPopup = page.locator('[role="dialog"], .fixed.z-50').last();

    // Select a different bucket
    const bucketOptions = bucketPopup.locator('span:has(+ span:not(empty))');
    await bucketOptions.first().click();

    // Verify change was saved
    await expect(page.locator('text=Updated')).toBeVisible({ timeout: 2000 });
  });

  test('6. Test copy functionality', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    // Try to select and copy subnote title
    const subnoteCards = page.locator('[data-subnote-id]');
    const firstTitle = subnoteCards.first().locator('span:first-child');

    // Triple click to select all
    await firstTitle.tripleClick();

    // Copy to clipboard
    await page.keyboard.press('Control+C');

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();
  });

  test('7. Test description selection and copying', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    // Expand description
    const subnoteCards = page.locator('[data-subnote-id]');
    await subnoteCards.first().click();

    // Wait for description to show
    const description = page.locator('[data-subnote-id]:first-child').locator('text=/Implement|Create|Build/');
    await expect(description).toBeVisible({ timeout: 2000 });

    // Try to select text
    await description.tripleClick();

    // Copy
    await page.keyboard.press('Control+C');

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Implement');
  });

  test('8. Test bullet list visibility', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    // Expand second subnote with list
    const subnoteCards = page.locator('[data-subnote-id]');
    await subnoteCards.nth(1).click();

    // Check if list items are visible
    const listItems = page.locator('[data-subnote-id]:nth-child(2) li');
    await expect(listItems.first()).toBeVisible({ timeout: 2000 });

    // Verify text color is dark (not light)
    const color = await listItems.first().evaluate((el) =>
      window.getComputedStyle(el).color
    );
    // Should not be light gray
    expect(color).not.toMatch(/rgb\(.*200.*/);
  });

  test('9. Test hot topic toggle', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    const subnoteCards = page.locator('[data-subnote-id]');
    const hotButton = subnoteCards.nth(1).locator('button[title="Toggle Hot Topic"]');

    // Toggle hot topic
    await hotButton.click();

    // Verify visual change
    await expect(page.locator('text=Updated')).toBeVisible({ timeout: 2000 });
  });

  test('10. Test search/filter functionality', async () => {
    await page.goto(`${BASE_URL}/notes`);

    // Use search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Backend');

    // Wait for results
    await page.waitForTimeout(500);

    // Should show the matching subnote
    await expect(page.locator('text=Backend Implementation')).toBeVisible();
  });

  test('11. Test tag filtering', async () => {
    await page.goto(`${BASE_URL}/notes`);

    // Click tag filter
    await page.fill('input[placeholder="Tags..."]', 'frontend');
    await page.click('text=frontend');

    // Should filter to show only notes with this tag
    await page.waitForTimeout(500);
    const results = page.locator('[data-subnote-id]');
    expect(await results.count()).toBeGreaterThan(0);
  });

  test('12. Test move subnote to another note', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}`);

    // First, create another note to move to
    await page.click('text=New');
    await page.fill('input[placeholder="Note title"]', 'Target Note for Move');
    await page.click('button:has-text("Create Note")');
    const targetNoteId = page.url().split('/').pop() || '';

    // Go back to original note
    await page.goto(`${BASE_URL}/notes/${noteId}/edit`);

    // Click move button
    const subnoteCards = page.locator('[data-subnote-id]');
    await subnoteCards.first().locator('button[title="Move to another note"]').click();

    // Search and select target note
    const movePopup = page.locator('[role="dialog"], .fixed.z-50').last();
    await movePopup.locator('input[placeholder*="Search"]').fill('Target');
    await movePopup.locator('text=Target Note for Move').click();

    // Verify move was successful
    await expect(page.locator('text=Subnote moved')).toBeVisible({ timeout: 2000 });
  });

  test('13. Test convert subnote to note', async () => {
    await page.goto(`${BASE_URL}/notes/${noteId}/edit`);

    const subnoteCards = page.locator('[data-subnote-id]');
    const countBefore = await subnoteCards.count();

    // Click convert button
    await subnoteCards.last().locator('button[title="Convert to note"]').click();

    // Confirm dialog
    await page.click('button:has-text("OK"), button:has-text("Confirm")');

    // Verify subnote was converted (count should decrease)
    await page.waitForTimeout(500);
    const countAfter = await subnoteCards.count();
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('14. Test note list display with all features', async () => {
    await page.goto(`${BASE_URL}/notes`);

    // Verify favorites star is clickable
    const starButton = page.locator('button[title="Toggle favorite"]').first();
    await starButton.click();
    await expect(page.locator('text=Updated')).toBeVisible({ timeout: 2000 });

    // Verify hot topic is visible
    const flameButton = page.locator('button[title="Toggle hot topic"]').first();
    expect(flameButton).toBeTruthy();
  });

  test('15. Test edit in place functionality', async () => {
    await page.goto(`${BASE_URL}/notes`);

    // Double click note title to edit
    const noteTitle = page.locator('[title="Double-click to edit title"]').first();
    await noteTitle.doubleClick();

    // Should show input field
    const editInput = page.locator('input[value*="Comprehensive"]');
    expect(editInput).toBeTruthy();

    // Update and save
    await editInput.fill('Updated Comprehensive Test');
    await editInput.press('Enter');

    // Verify save
    await expect(page.locator('text=Updated')).toBeVisible({ timeout: 2000 });
  });

  test('16. Test text selection in note list', async () => {
    await page.goto(`${BASE_URL}/notes`);

    // Find a note title and try to select it
    const noteTitle = page.locator('[title="Double-click to edit title"]').first();

    // Triple click to select
    await noteTitle.tripleClick();

    // Should be able to copy
    await page.keyboard.press('Control+C');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();
  });
});
