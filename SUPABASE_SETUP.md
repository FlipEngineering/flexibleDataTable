# Connecting to Supabase Securely

This document explains how to securely connect the React DataTable component to your Supabase PostgreSQL database, especially when deploying to GitHub Pages.

## Local Development Setup

1. Install the Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Create a `.env` file in the project root (this file should never be committed to Git):
   ```
   VITE_SUPABASE_URL=https://your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Update the `getSupabaseClient()` function in `src/components/DataTable/DatabaseConnector.js`:
   ```javascript
   import { createClient } from '@supabase/supabase-js';

   const getSupabaseClient = () => {
     const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
     const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
     return createClient(supabaseUrl, supabaseKey);
   };
   ```

## GitHub Pages Deployment Options

### Option 1: Environment Variables in GitHub Actions

1. Store your Supabase URL and API key as GitHub repository secrets.

2. Create a GitHub Actions workflow that sets these as environment variables during build:
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Set up Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '16'
         - name: Install dependencies
           run: npm ci
         - name: Build
           run: npm run build
           env:
             VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
         - name: Deploy
           uses: JamesIves/github-pages-deploy-action@4.1.4
           with:
             branch: gh-pages
             folder: dist
   ```

### Option 2: Runtime Configuration

1. Create a configuration file that's generated during build:
   ```javascript
   // public/config.js (generated during build)
   window.REACT_APP_CONFIG = {
     supabaseUrl: "https://your-project-url.supabase.co",
     supabaseKey: "your-anon-key-here" 
   };
   ```

2. Load this configuration at runtime:
   ```javascript
   const getSupabaseClient = () => {
     // Get config from window object (loaded from public/config.js)
     const config = window.REACT_APP_CONFIG || {};
     return createClient(config.supabaseUrl, config.supabaseKey);
   };
   ```

### Option 3: Use Proxy API (Most Secure)

The most secure approach is to create a small API service that acts as a proxy between your GitHub Pages app and Supabase:

1. Create a small serverless function (AWS Lambda, Vercel Functions, Netlify Functions)
2. This function holds your Supabase credentials securely
3. Your GitHub Pages app calls this API instead of Supabase directly
4. The API performs the necessary operations and returns results

## Security Considerations

1. **Only use the anon key**, never the service key!
2. Set up proper Row Level Security (RLS) in Supabase
3. Restrict database operations to only what's needed
4. Set CORS policies to only allow your GitHub Pages domain
5. Monitor your API usage for unexpected patterns

## Testing Your Connection

Before deploying to GitHub Pages, test your connection locally:

```javascript
// Test file: src/testSupabase.js
import { getSupabaseClient } from './components/DataTable/DatabaseConnector';

async function testConnection() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('inventory.categories')
    .select('*');
    
  if (error) {
    console.error('Connection error:', error);
  } else {
    console.log('Connection successful!', data);
  }
}

testConnection();
```

Run this test using:
```bash
node -r dotenv/config src/testSupabase.js
```