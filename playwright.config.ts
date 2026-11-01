import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: {
      // any Chromium works; set BROWSER_PATH to use a local one
      executablePath: process.env.BROWSER_PATH ?? '/usr/bin/brave',
      args: ['--use-angle=gl-egl', '--ignore-gpu-blocklist', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
})
