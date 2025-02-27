# Dynamic SQL-backed DataTable Component

A flexible React table component that can display and edit data from SQL databases with various column types and formula support.

## Features

- **Dynamic Columns**: Columns are generated based on database schema
- **Multiple Column Types**: Support for text, number, select, checkbox, and formula fields
- **Filtering & Sorting**: Built-in filtering and sorting for all columns
- **Row Management**: Add, edit, and delete rows with confirmation modals
- **Row Reordering**: Move selected rows up or down
- **Formula Support**: Excel-like formulas for calculated fields
- **SQL Integration**: Designed to work with SQL database backends

## Usage

### Basic Usage

```jsx
import { DataTable } from './components/DataTable';

// Column definitions (normally loaded from database schema)
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    type: 'number',
    required: true,
  },
  {
    title: 'Name',
    dataIndex: 'name',
    type: 'text',
    required: true,
  },
  {
    title: 'Department',
    dataIndex: 'department',
    type: 'select',
    required: true,
    options: [
      { value: 'engineering', label: 'Engineering' },
      { value: 'marketing', label: 'Marketing' },
      // More options...
    ],
  },
  // More columns...
];

// Data (normally loaded from database)
const data = [
  { id: 1, name: 'John Doe', department: 'engineering' },
  { id: 2, name: 'Jane Smith', department: 'marketing' },
  // More rows...
];

// Event handlers
const handleSave = (values, key, newData) => {
  // Update database with changed values
};

const handleDelete = (key, newData) => {
  // Delete record from database
};

const handleAdd = (record, newData) => {
  // Add new record to database
};

// Render component
return (
  <DataTable
    tableName="Employee Records"
    columns={columns}
    dataSource={data}
    onSave={handleSave}
    onDelete={handleDelete}
    onAdd={handleAdd}
    onUpdate={handleUpdate}
    formulaEnabled={true}
  />
);
```

### SQL Integration

The component includes a `DatabaseConnector` module with functions for SQL integration:

```jsx
import { DataTable, DatabaseConnector } from './components/DataTable';
import { useEffect, useState } from 'react';

const SQLTableView = ({ tableName }) => {
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadTableData = async () => {
      // Load schema and convert to DataTable columns
      const tableColumns = await DatabaseConnector.fetchTableSchema(tableName);
      setColumns(tableColumns);
      
      // Load data
      const tableData = await DatabaseConnector.fetchTableData(tableName);
      setData(tableData);
      
      setLoading(false);
    };
    
    loadTableData();
  }, [tableName]);
  
  const handleSave = async (values, key, newData) => {
    // Save to database
    await DatabaseConnector.saveRecord(tableName, values, false);
    setData(newData);
  };
  
  // Similar handlers for delete, add, update...
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <DataTable
      tableName={tableName}
      columns={columns}
      dataSource={data}
      onSave={handleSave}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
    />
  );
};
```

## Formula Support

The component includes a formula parser to support Excel-like formulas:

```jsx
// Column definition with formula
{
  title: 'Total',
  dataIndex: 'total',
  type: 'formula',
  formula: '=SUM(price,tax)',
}
```

Supported functions:
- `SUM`: Add values
- `AVG`: Calculate average
- `MIN`: Find minimum value
- `MAX`: Find maximum value
- `COUNT`: Count items
- `IF`: Conditional logic

## Column Types

The component supports the following column types:

- `text`: Standard text input
- `number`: Numeric input
- `select`: Dropdown selection
- `checkbox`: Boolean checkbox
- `formula`: Calculated field

## Props

| Prop | Type | Description |
|------|------|-------------|
| `tableName` | string | Title displayed above the table |
| `columns` | array | Column definitions |
| `dataSource` | array | Table data |
| `onSave` | function | Called when a record is saved |
| `onDelete` | function | Called when a record is deleted |
| `onAdd` | function | Called when a record is added |
| `onUpdate` | function | Called when records are reordered |
| `formulaEnabled` | boolean | Enable/disable formula support |

## Dependencies

- React 16.8+ (for hooks)
- Ant Design 4.x (for UI components)