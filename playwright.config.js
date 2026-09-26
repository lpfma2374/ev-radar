const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  webServer: {
    command: 'npx http-server . -p 4173 --silent',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
