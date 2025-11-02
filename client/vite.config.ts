import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        login: 'login.html',
        main: 'index.html'
      }
    }
  },
  server: {
    port: 8080
  }
})