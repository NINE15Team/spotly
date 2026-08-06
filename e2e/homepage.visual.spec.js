const { test, expect } = require('@playwright/test');

/**
 * Visual baselines for Homepage sections.
 * Requires app running at PLAYWRIGHT_BASE_URL (default http://localhost:3000).
 * Generate/update: yarn playwright test e2e/homepage.visual.spec.js --update-snapshots
 */
test.describe('Homepage visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('full homepage screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage-full.png', { fullPage: true });
  });

  test('hero section', async ({ page }) => {
    const hero = page.locator('section[aria-label="Hero"]');
    await expect(hero).toHaveScreenshot('homepage-hero.png');
  });

  test('how it works section', async ({ page }) => {
    const section = page.locator('section[aria-labelledby="hako-how-it-works-heading"]');
    await expect(section).toHaveScreenshot('homepage-how-it-works.png');
  });
});
