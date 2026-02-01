import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const reactNativeWebEntry = resolve(rootDir, 'node_modules/react-native-web/dist/index.js')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: reactNativeWebEntry },
      { find: /^react-native-web$/, replacement: reactNativeWebEntry },
    ],
  },
})
