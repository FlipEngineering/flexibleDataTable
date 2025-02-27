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
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Function to load tables from the database
  const loadTables = async () => {
    setLoading(true);
    
    // Force browser refresh if this is a retry
    if (refreshCounter > 0) {
      console.log('🔄 Forcing a clean table fetch on retry #' + refreshCounter);
    }
    
    try {
      // Try to get tables from the real database
      const availableTables = await fetchAvailableTables();
      
      console.log('✅ Found database tables:', availableTables.map(t => t.id).join(', '));
      setTables(availableTables);
      
      // If no table is selected and we have tables, select the first one
      if (!selectedTable && availableTables.length > 0) {
        onSelectTable(availableTables[0].id);
        message.success(`Connected to ${availableTables.length} database tables`);
      }
      
      // Force clear any previously selected table that no longer exists
      if (selectedTable && !availableTables.find(t => t.id === selectedTable)) {
        message.info('Previously selected table is no longer available');
        if (availableTables.length > 0) {
          onSelectTable(availableTables[0].id);
        }
      }
    } catch (error) {
      console.error('Database connection error:', error);
      message.error(`Database connection failed: ${error.message}`);
      setTables([]);
      
      // If we've been trying without success, retry a few times
      if (refreshCounter < 3) {
        setTimeout(() => {
          setRefreshCounter(prev => prev + 1);
        }, 2000); // Wait 2 seconds before trying again
      }
    } finally {
      setLoading(false);
    }
  };

  // Load tables on initial mount or when refresh counter changes
  useEffect(() => {
    loadTables();
  }, [refreshCounter]);
  
  // Manual refresh function for the refresh button
  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

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
          onClick={handleRefresh} 
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '4px',
            color: 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))',
            transition: 'all 0.3s'
          }}
          title="Refresh database tables"
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-color, #1890ff)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))'}
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
          {tables.length > 0 ? (
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
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px 0', 
              color: 'var(--error-color, #ff4d4f)',
              border: '1px dashed var(--error-color, #ff4d4f)',
              borderRadius: '4px',
              margin: '8px 0'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                No Tables Found
              </div>
              <p style={{ margin: '4px 0', padding: '0 16px' }}>
                Could not find any tables in your Supabase database. Please create tables in your Supabase project first.
              </p>
              <Button 
                type="primary" 
                onClick={handleRefresh} 
                style={{ marginTop: '12px' }}
                danger
              >
                Retry Connection
              </Button>
            </div>
          )}
          
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
              
              {tables.find(t => t.id === selectedTable)?.name?.includes('DUMMY') && (
                <div style={{
                  marginTop: 8,
                  padding: '4px 8px',
                  backgroundColor: 'var(--warning-color, #faad14)',
                  color: 'var(--text-color-inverse, #fff)',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  textAlign: 'center'
                }}>
                  USING MOCK DATA
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TableSelector;