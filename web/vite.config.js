import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@design-system': path.resolve(__dirname, 'src/design-system'),
      '@tokens': path.resolve(__dirname, 'src/design-system/tokens'),
      '@components': path.resolve(__dirname, 'src/design-system/components'),
    },
  },
  server: {
    port: 3000,
    host: true
  }
})
