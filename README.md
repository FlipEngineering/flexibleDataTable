# React Dynamic DataTable Demo

A flexible React table component with SQL database integration, featuring dynamic columns, multiple data types, and formula support.

## Features

- **Dynamic Columns**: Generated from database schema
- **Multiple Data Types**: Text, number, select, checkbox, formula
- **Row Operations**: Add, edit, delete, reorder
- **Filtering & Sorting**: Built into all columns
- **Formula Support**: Excel-like formulas (SUM, AVG, MIN, MAX, COUNT, IF)
- **SQL Integration**: Ready to connect to database backends

## Getting Started

### Prerequisites

- Node.js 14+ and npm/yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/react-dynamic-datatable.git
cd react-dynamic-datatable
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

## Project Structure

- `/src/components/DataTable/` - Main component directory
  - `DataTable.jsx` - Core table component
  - `DataTable.css` - Styling
  - `DataTableExample.jsx` - Demo with sample data
  - `FormulaParser.js` - Formula evaluation engine
  - `DatabaseConnector.js` - SQL database integration
  - `README.md` - Component documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.