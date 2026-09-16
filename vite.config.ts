/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Defaults to root ('/') for local dev/build. Overridden by the GitHub
  // Pages workflow to '/<repo-name>/' since a project Pages site is served
  // under a subpath, not the domain root.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
