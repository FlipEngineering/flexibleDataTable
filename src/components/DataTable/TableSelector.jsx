import React, { useState, useEffect } from 'react';
import { Select, Card, Tooltip, Typography, Spin } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
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

  useEffect(() => {
    const loadTables = async () => {
      try {
        const availableTables = await fetchAvailableTables();
        setTables(availableTables);
        
        // If no table is selected and we have tables, select the first one
        if (!selectedTable && availableTables.length > 0) {
          onSelectTable(availableTables[0].id);
        }
      } catch (error) {
        console.error('Error loading tables:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTables();
  }, []);

  return (
    <div
      style={{ 
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        marginBottom: 16,
        background: 'white',
        padding: '16px'
      }}
    >
      <div style={{ 
        marginBottom: 12, 
        borderBottom: '1px solid #f0f0f0', 
        paddingBottom: 8,
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <DatabaseOutlined style={{ marginRight: 8 }} />
        <span style={{ fontWeight: 'bold' }}>Database Tables</span>
      </div>
  
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
          <div style={{ marginTop: 8 }}>Loading tables...</div>
        </div>
      ) : (
        <>
          <Title level={5}>Select Table</Title>
          <Select
            style={{ width: '100%', marginBottom: 16 }}
            placeholder="Select a table"
            value={selectedTable}
            onChange={onSelectTable}
            loading={loading}
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
            <div>
              <Text type="secondary">
                Viewing table: <Text strong>{tables.find(t => t.id === selectedTable)?.name || selectedTable}</Text>
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">
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