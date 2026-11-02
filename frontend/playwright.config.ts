import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,retries:0,
 use:{baseURL:'http://127.0.0.1:5183',channel:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],
 // Los servicios y su limpieza se controlan por IPC en scripts/test-e2e.cjs.
});
