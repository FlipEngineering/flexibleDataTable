# Project Notes for FlexibleDataTable

## Project Overview
This project is a React-based dynamic data table component with SQL database integration via Supabase. It features:
- Dynamic columns and table selection
- CRUD operations (Create, Read, Update, Delete)
- Filtering, sorting, and searching
- Responsive design with dark mode support
- Debug console for database connections

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Deployment
```bash
# Deploy to GitHub Pages manually
npm run deploy

# Commit and push to trigger GitHub Actions deployment
git add .
git commit -m "Your commit message"
git push origin main
```

## Database Integration

### Supabase Connection
- Supabase credentials are stored in GitHub secrets
- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- GitHub Actions automatically passes these during build

### Database Tables
- Main tables:
  - `product_summary` - Product inventory data
  - `categories` - Product categories
- The app automatically detects available tables
- Mock data is used as fallback if database is unavailable

## Debugging

### Debug Console
- Toggle with button in bottom-right
- Shows database connection status
- Logs operations and errors
- Shows environment information
- Helps troubleshoot database issues

### Common Issues
- If the tables are showing mock data (DUMMY), use the refresh button in the table selector
- If deployment fails, check GitHub Actions logs for errors
- If database connection fails, verify GitHub repository secrets are set correctly

## Important Files

- `/src/components/DataTable/DataTable.jsx` - Core table component
- `/src/components/DataTable/DatabaseConnector.js` - Supabase connection logic
- `/src/components/DataTable/TableSelector.jsx` - Database table selector component
- `/.github/workflows/deploy.yml` - GitHub Actions deployment configuration

## Future Improvements

- Add user authentication
- Implement more advanced filtering
- Enhance formula engine
- Add custom views and saved filters
- Implement data export functionality
- Add pagination server-side support

## Deployment Workflow

1. Make code changes locally
2. Test thoroughly with `npm run dev`
3. Commit changes with descriptive message
4. Push to GitHub (`git push origin main`)
5. GitHub Actions automatically builds and deploys to GitHub Pages
6. Verify deployment at [https://flipengineering.github.io/flexibleDataTable](https://flipengineering.github.io/flexibleDataTable)

## Troubleshooting Steps

1. Check the debug console for database connection issues
2. Verify GitHub secrets are properly set (SUPABASE_URL, SUPABASE_ANON_KEY)
3. Look at GitHub Actions logs for build/deployment errors
4. Try a hard refresh to clear browser cache
5. Check browser console for JavaScript errors