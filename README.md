# FlexibleDataTable Demo

A live demo of this project is available at:

[https://flipengineering.github.io/flexibleDataTable](https://flipengineering.github.io/flexibleDataTable)

## Deployment Instructions

This project is configured for easy deployment on GitHub Pages:

1. Fork or clone this repository
2. Install dependencies: `npm install`
3. Set up Supabase integration (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md))
4. Configure GitHub repository secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
5. Push to your main branch to trigger deployment

The GitHub Actions workflow will automatically build and deploy to GitHub Pages.

---

# React Dynamic DataTable Demo

A flexible React table component with SQL database integration, featuring dynamic columns, multiple data types, and formula support.

## Features

- **Dynamic Columns**: Generated from database schema
- **Multiple Data Types**: Text, number, select, checkbox, formula
- **Row Operations**: Add, edit, delete, reorder
- **Filtering & Sorting**: Built into all columns
- **Formula Support**: Excel-like formulas (SUM, AVG, MIN, MAX, COUNT, IF)
- **SQL Integration**: Ready to connect to database backends
- **SQL Query Interface**: Debug console includes SQL terminal for direct data queries (in development)
- **Debugging Tools**: Enhanced debug console with query testing and error analysis

## Getting Started

### Prerequisites

- Node.js 14+ and npm/yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/FlipEngineering/flexibleDataTable.git
cd flexibleDataTable
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will open in your default browser at http://localhost:3000.

## Usage

The demo shows an employee database table with various column types and Excel-like formula support. You can:

- **Add new records**: Click the "Add New" button
- **Edit records**: Click the pen icon on a row
- **Delete records**: Click the trash icon on a row (with confirmation)
- **Reorder rows**: Select a row and use the Move Up/Down buttons
- **Filter data**: Use the filter icon in column headers
- **Sort data**: Click column headers
- **Query data with SQL**: Open the debug console and use the SQL terminal (in development)
- **View query errors**: See detailed error messages and hints in the debug console

## Project Structure

- `/src/components/DataTable/` - Main component directory
  - `DataTable.jsx` - Core table component
  - `DataTable.css` - Styling
  - `DataTableExample.jsx` - Inventory management demo with SQL query functionality
  - `FormulaParser.js` - Formula evaluation engine
  - `DatabaseConnector.js` - Supabase PostgreSQL integration and SQL query execution
  - `TableSelector.jsx` - Database table selector component
  - `README.md` - Component documentation

## Database Integration

This project now includes a full PostgreSQL database integration via Supabase:

- **Inventory Management Schema**:
  - Categories, Products, and Transactions tables
  - Custom views for product summaries
  - Full-text search function across multiple columns
  
- **Security Features**:
  - Row Level Security (RLS) policies
  - Environment variable configuration
  - Safe credential management

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed setup instructions.

## Local Development

To develop and test the application locally without deploying to GitHub Pages (which has a 10 builds per hour limit):

1. Create a `.env.local` file in the project root with the following content:

```
# Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Development mode settings
VITE_LOCAL_DEV=true
VITE_DEBUG_MODE=true
```

2. Replace `your_supabase_url` and `your_supabase_anon_key` with your actual Supabase credentials.

3. Run the development server:

```bash
npm run dev
```

The application will start in local development mode with:
- Full debug logging enabled
- No base path prefix (so URLs work correctly locally)
- Source maps for easier debugging
- Database connections using your local credentials
- Access to the SQL terminal in the debug console

This approach allows you to develop and test features locally before bundling multiple changes for a single GitHub Pages deployment.

## SQL Query Functionality (In Development)

The debug console now includes an SQL terminal that allows you to run basic SQL queries directly against the data:

- Currently supports basic SELECT queries with WHERE and LIMIT clauses
- Query results are displayed in the main table component
- Includes detailed error messages and hints when queries fail
- "Back to Original Table" button returns to normal table view
- Example queries are provided to get started

**Note**: This feature is still in development and has the following limitations:
- Only SELECT queries are supported for security reasons
- Complex operations like JOINs and GROUP BY are not yet implemented
- The SQL parser is client-side only and may not match PostgreSQL syntax exactly
- Large result sets may impact performance

## License

This project is licensed under the MIT License - see the LICENSE file for details.
