import {defineConfig, devices} from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  expect: {
    timeout: 15 * 1000,
  },
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? "http://localhost:4173" : "http://localhost:5173",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    // {
    //   name: "chromium",
    //   use: {...devices["Desktop Chrome"]},
    // },

    // {
    //   name: "firefox",
    //   use: {...devices["Desktop Firefox"]},
    // },

    // {
    //   name: "webkit",
    //   use: {...devices["Desktop Safari"]},
    // },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: {...devices["Pixel 5"]},
    },
    {
      name: "Mobile Safari",
      use: {...devices["iPhone 12"]},
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */

  webServer: {
    command: process.env.CI
      ? "npm run build && npm run preview"
      : "npm run dev",
    url: process.env.CI ? "http://localhost:4173" : "http://localhost:5173",
    env: {
      VITE_POLICY_KEY: process.env.VITE_POLICY_KEY!,
      VITE_BC_ACCOUNT_ID: process.env.VITE_BC_ACCOUNT_ID!,
    },
    reuseExistingServer: !process.env.CI,
    // reuseExistingServer: true,
  },
});
