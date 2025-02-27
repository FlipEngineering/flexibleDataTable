import React, { useState, useEffect } from 'react';
import { Select, Tooltip, Typography, Spin, message } from 'antd';
import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchAvailableTables } from './DatabaseConnector';

const { Option } = Select;
const { Title, Text } = Typography;

/**
 * TableSelector component displays a dropdown to select from available database tables
 * @param {Object} props Component props
 * @param {string} props.selectedTable Currently selected table
 * @param {Function} props.onSelectTable Callback when table is selected
 */
const TableSelector = ({ selectedTable, onSelectTable }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to load tables from the database
  const loadTables = async () => {
    setLoading(true);
    try {
      const availableTables = await fetchAvailableTables();
      setTables(availableTables);
      
      // If no table is selected and we have tables, select the first one
      if (!selectedTable && availableTables.length > 0) {
        onSelectTable(availableTables[0].id);
      }

      // If the currently selected table doesn't exist in the available tables,
      // select the first one instead
      if (selectedTable && !availableTables.find(t => t.id === selectedTable)) {
        message.warning('The previously selected table is no longer available');
        if (availableTables.length > 0) {
          onSelectTable(availableTables[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      message.error('Failed to load database tables');
    } finally {
      setLoading(false);
    }
  };

  // Load tables on initial mount
  useEffect(() => {
    loadTables();
  }, []);

  return (
    <div
      style={{ 
        border: '1px solid var(--border-color, #d9d9d9)',
        borderRadius: '8px',
        marginBottom: 16,
        backgroundColor: 'var(--component-background, #fff)',
        color: 'var(--text-color, rgba(0, 0, 0, 0.85))',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ 
        marginBottom: 12, 
        borderBottom: '1px solid var(--border-color-split, #f0f0f0)', 
        paddingBottom: 8,
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DatabaseOutlined style={{ marginRight: 8, color: 'var(--primary-color, #1890ff)' }} />
          <span style={{ fontWeight: 'bold' }}>Database Tables</span>
        </div>
        <div 
          onClick={loadTables} 
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '4px',
            color: 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))'
          }}
          title="Refresh database tables"
        >
          <ReloadOutlined spin={loading} />
        </div>
      </div>
  
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
          <div style={{ marginTop: 8 }}>Loading tables...</div>
        </div>
      ) : (
        <>
          <Title level={5} style={{ color: 'var(--heading-color, rgba(0, 0, 0, 0.85))' }}>
            Select Table
          </Title>
          <Select
            style={{ width: '100%', marginBottom: 16 }}
            placeholder="Select a table"
            value={selectedTable}
            onChange={(value) => {
              onSelectTable(value);
              message.info(`Loading data from ${tables.find(t => t.id === value)?.name || value} table...`);
            }}
            loading={loading}
            dropdownStyle={{ 
              backgroundColor: 'var(--component-background, #fff)',
              color: 'var(--text-color, rgba(0, 0, 0, 0.85))'
            }}
          >
            {tables.map(table => (
              <Option key={table.id} value={table.id}>
                <Tooltip title={table.description}>
                  <div>{table.name}</div>
                </Tooltip>
              </Option>
            ))}
          </Select>
          
          {selectedTable && (
            <div style={{ 
              backgroundColor: 'var(--item-hover-bg, rgba(0, 0, 0, 0.02))',
              padding: '8px',
              borderRadius: '4px'
            }}>
              <Text style={{ color: 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))' }}>
                Viewing table: <Text strong style={{ color: 'var(--text-color, rgba(0, 0, 0, 0.85))' }}>{tables.find(t => t.id === selectedTable)?.name || selectedTable}</Text>
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text style={{ color: 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))' }}>
                  {tables.find(t => t.id === selectedTable)?.description || 'Table data'}
                </Text>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TableSelector;