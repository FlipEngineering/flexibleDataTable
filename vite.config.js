import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const isLocalDev = env.VITE_LOCAL_DEV === 'true'
  
  console.log(`Running in ${mode} mode with local dev: ${isLocalDev ? 'enabled' : 'disabled'}`)
  
  return {
    plugins: [react()],
    
    // Development server config
    server: {
      port: 3000,
      open: true,
      // Add CORS headers in development mode to simulate GitHub Pages behavior
      cors: true
    },
    
    // Base path - use root for local development, but GitHub path for production
    base: command === 'serve' || isLocalDev ? '/' : '/flexibleDataTable/',
    
    // Build configuration
    build: {
      // Full minification in production, less in development for easier debugging
      minify: mode === 'production' && !isLocalDev,
      cssMinify: true,
      // Source maps in development for easier debugging
      sourcemap: mode !== 'production' || isLocalDev
    },
    
    // Define env variables for use in the app
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __DEV_MODE__: mode !== 'production' || isLocalDev
    }
  }
})