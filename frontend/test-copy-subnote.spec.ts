import { test, expect } from '@playwright/test';

test('copy subnote with line breaks preserves formatting', async ({ page }) => {
  // Navigate directly to the note detail page (ID 320)
  await page.goto('http://localhost:3000/notes/320', { waitUntil: 'domcontentloaded' });

  // Wait a moment for React to render
  await page.waitForTimeout(2000);

  // Check for errors in console
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('Browser error:', msg.text());
  });

  // Take a screenshot to see what loaded
  await page.screenshot({ path: '/tmp/note-detail.png' });
  console.log('Screenshot saved to /tmp/note-detail.png');

  // Try to find ANY button on the page
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.count()} buttons`);

  // Look for text content
  const pageContent = await page.textContent('body');
  if (pageContent) {
    console.log('Page content preview:', pageContent.substring(0, 200));
  }

  // Try to find the Copy All button with more flexible selector
  try {
    await page.locator('button', { hasText: 'Copy All' }).click({ timeout: 5000 });
  } catch (e) {
    console.log('Failed to click Copy All, error:', e.message);
    // Try alternative selector
    await page.locator('button').filter({ hasText: 'Copy All' }).click();
  }

  // Wait for clipboard
  await page.waitForTimeout(500);

  // Get clipboard content
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

  console.log('=== CLIPBOARD CONTENT ===');
  console.log(clipboardText);
  console.log('=== END ===');

  // Verify content structure
  expect(clipboardText).toContain('Generallly');
  expect(clipboardText).toContain('Hello how are you?');
  expect(clipboardText).toContain('I am fine');

  // Verify line breaks are preserved
  const lines = clipboardText.split('\n');
  console.log(`Clipboard has ${lines.length} lines`);
  expect(lines.length).toBeGreaterThan(2);

  // Verify HTML is stripped
  expect(clipboardText).not.toContain('<br');
  expect(clipboardText).not.toContain('<p>');
});
