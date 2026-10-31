import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const WEB_FONTS_BLOCK = /\s*<!-- web-fonts:start -->[\s\S]*?<!-- web-fonts:end -->/;

// Drops the Google Fonts links from index.html in the native app build, which ships Nunito Sans locally instead.
const localFontsForApp = () => ({
  name: 'local-fonts-for-app',
  transformIndexHtml: {
    order: 'pre',
    handler: (html, context) => (context.server || process.env.APP_BUILD !== 'true' ? html : html.replace(WEB_FONTS_BLOCK, '')),
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localFontsForApp()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: false,
    exclude: ['node_modules/**', 'e2e/**'],
  },
})
