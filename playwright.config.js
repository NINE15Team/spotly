// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Visual regression config for Hako Figma pixel checks.
 * Unit/component tests remain Jest; Playwright covers viewport screenshots.
 *
 * Breakpoints (from Figma + template assumptions — see PROGRESS.md):
 * - mobile: 390px (Figma mobile frames)
 * - desktop: 1440px (Figma desktop frames)
 */
module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  projects: [
    {
      name: 'mobile-390',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
