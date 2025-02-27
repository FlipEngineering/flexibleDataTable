import React, { useState } from 'react';
import DataTable from './DataTable';

const DataTableExample = () => {
  // Sample column definitions
  const [columns] = useState([
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
      title: 'Email',
      dataIndex: 'email',
      type: 'text',
      required: true,
    },
    {
      title: 'Age',
      dataIndex: 'age',
      type: 'number',
      required: false,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      type: 'select',
      required: true,
      options: [
        { value: 'engineering', label: 'Engineering' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' },
        { value: 'hr', label: 'Human Resources' },
        { value: 'finance', label: 'Finance' },
      ],
    },
    {
      title: 'Active',
      dataIndex: 'active',
      type: 'checkbox',
      required: false,
    },
    {
      title: 'Salary',
      dataIndex: 'salary',
      type: 'number',
      required: false,
    },
    {
      title: 'Bonus',
      dataIndex: 'bonus',
      type: 'number',
      required: false,
    },
    {
      title: 'Total Compensation',
      dataIndex: 'totalComp',
      type: 'formula',
      formula: '=SUM(salary,bonus)',
      required: false,
    },
  ]);

  // Sample data
  const [data] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 32,
      department: 'engineering',
      active: true,
      salary: 85000,
      bonus: 10000,
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      age: 28,
      department: 'marketing',
      active: true,
      salary: 72000,
      bonus: 8000,
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      age: 45,
      department: 'sales',
      active: true,
      salary: 95000,
      bonus: 15000,
    },
    {
      id: 4,
      name: 'Alice Williams',
      email: 'alice.williams@example.com',
      age: 36,
      department: 'hr',
      active: false,
      salary: 68000,
      bonus: 5000,
    },
    {
      id: 5,
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com',
      age: 41,
      department: 'finance',
      active: true,
      salary: 110000,
      bonus: 20000,
    },
    {
      id: 6,
      name: 'Diana Lee',
      email: 'diana.lee@example.com',
      age: 29,
      department: 'engineering',
      active: true,
      salary: 78000,
      bonus: 8000,
    },
    {
      id: 7,
      name: 'Edward Miller',
      email: 'edward.miller@example.com',
      age: 33,
      department: 'sales',
      active: true,
      salary: 88000,
      bonus: 12000,
    },
    {
      id: 8,
      name: 'Fiona Davis',
      email: 'fiona.davis@example.com',
      age: 27,
      department: 'marketing',
      active: false,
      salary: 65000,
      bonus: 6000,
    },
  ]);

  // Event handlers
  const handleSave = (values, key, newData) => {
    console.log('Saved:', values);
    console.log('Updated data:', newData);
    // In a real app, this would send an update to the database
  };

  const handleDelete = (key, newData) => {
    console.log('Deleted record with key:', key);
    console.log('Updated data:', newData);
    // In a real app, this would send a delete request to the database
  };

  const handleAdd = (record, newData) => {
    console.log('Added new record:', record);
    console.log('Updated data:', newData);
    // In a real app, this would send an insert to the database
  };

  const handleUpdate = (newData) => {
    console.log('Updated data (reordered):', newData);
    // In a real app, this would update row orders in the database
  };

  return (
    <div>
      <h1>Employee Database</h1>
      <p>This table uses dynamic columns loaded from a database with various data types and formula support.</p>
      
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
      
      <div style={{ margin: '24px 0', padding: '16px', background: '#2a2a2a', borderRadius: '8px', border: '1px solid #444' }}>
        <h3>Integration with Database:</h3>
        <p>In a production environment, this table would:</p>
        <ul>
          <li>Load columns and data from SQL queries dynamically</li>
          <li>Send updates back to the database on changes</li>
          <li>Support complex formula calculations</li>
          <li>Implement row-level permissions</li>
        </ul>
      </div>
    </div>
  );
};

export default DataTableExample;