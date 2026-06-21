import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      {
        name: 'replace-api-url',
        transform(code, id) {
          // Only replace during build, and only for source JS/JSX files
          if (command === 'build' && (id.endsWith('.js') || id.endsWith('.jsx'))) {
            return {
              code: code.replace(/http:\/\/localhost:5000/g, ''),
              map: null
            };
          }
          return null;
        }
      }
    ],
    server: {
      port: 5174
    }
  }
})
