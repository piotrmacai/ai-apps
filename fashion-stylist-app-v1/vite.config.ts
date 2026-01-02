
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  // Support both API_KEY (standard) and GOOGLE_API_KEY (user preference)
  const finalApiKey = env.API_KEY || env.GOOGLE_API_KEY;

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY so it is available in the client-side code
      // This maps the server-side/build-time environment variable to the client global
      'process.env.API_KEY': JSON.stringify(finalApiKey)
    }
  }
})
