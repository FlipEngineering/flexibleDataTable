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
        border: '1px solid var(--border-color, #303030)',
        borderRadius: '8px',
        marginBottom: 16,
        backgroundColor: 'var(--component-background, #1f1f1f)',
        color: 'var(--text-color, rgba(255, 255, 255, 0.85))',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div style={{ 
        marginBottom: 12, 
        borderBottom: '1px solid var(--border-color-split, #303030)', 
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
            color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.45))',
            transition: 'all 0.3s'
          }}
          title="Refresh database tables"
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-color, #1890ff)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-color-secondary, rgba(255, 255, 255, 0.45))'}
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
          <Title level={5} style={{ color: 'var(--heading-color, rgba(255, 255, 255, 0.85))' }}>
            Select Table
          </Title>
          {tables.length > 0 ? (
            <div style={{ marginBottom: 16, minHeight: '150px' }}>
              {tables.map(table => (
                <div 
                  key={table.id}
                  onClick={() => {
                    onSelectTable(table.id);
                    message.info(`Loading data from ${table.name || table.id} table...`);
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    backgroundColor: selectedTable === table.id 
                      ? 'var(--primary-color, #1890ff)' 
                      : 'var(--component-background, #1f1f1f)',
                    color: selectedTable === table.id 
                      ? 'white' 
                      : 'var(--text-color, rgba(255, 255, 255, 0.85))',
                    fontWeight: selectedTable === table.id ? 'bold' : 'normal',
                    border: '1px solid var(--border-color, #303030)',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Tooltip title={table.description}>
                    <div style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {table.name}
                    </div>
                  </Tooltip>
                </div>
              ))}
            </div>
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
                DATABASE ERROR
              </div>
              <p style={{ margin: '4px 0', padding: '0 16px' }}>
                No accessible tables found in your Supabase database.
              </p>
              <p style={{ margin: '4px 0', padding: '0 16px', fontSize: '12px' }}>
                Please create the required tables in your Supabase project or check CORS settings.
              </p>
              
              <div style={{ 
                margin: '12px 8px',
                padding: '8px',
                backgroundColor: 'rgba(24, 144, 255, 0.1)',
                borderRadius: '4px',
                border: '1px solid #1890ff',
                fontSize: '12px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#1890ff' }}>Troubleshooting Steps:</h4>
                <ol style={{ margin: '0', paddingLeft: '20px', textAlign: 'left' }}>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>CORS Settings:</strong> Add <code>{window.location.origin}</code> to your Supabase allowed origins
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Create Tables:</strong> Run SQL to create required tables in Supabase
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Permissions:</strong> Ensure anon role can access your tables
                  </li>
                  <li style={{ marginBottom: '4px' }}>
                    <strong>Environment Variables:</strong> Make sure your build includes VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
                  </li>
                </ol>
              </div>
              
              <div style={{ margin: '12px 8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1890ff' }}>
                  Quick Setup SQL:
                </div>
                <div style={{ 
                  padding: '8px', 
                  background: '#1e1e1e', 
                  borderRadius: '4px',
                  fontSize: '11px',
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: '100px',
                  color: '#e6e6e6'
                }}>
                  <pre style={{ margin: 0 }}>
{`-- Run this SQL in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS product_summary (
  id SERIAL PRIMARY KEY,
  sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  price NUMERIC,
  cost NUMERIC,
  quantity INTEGER,
  reorder_level INTEGER,
  status TEXT,
  profit_margin NUMERIC GENERATED ALWAYS AS (price - cost) STORED,
  needs_reorder BOOLEAN GENERATED ALWAYS AS (quantity <= reorder_level) STORED
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT,
  description TEXT
);

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Office Supplies', 'Office stationary and supplies'),
('Furniture', 'Office and home furniture'),
('Kitchen', 'Kitchen appliances and utensils'),
('Books', 'Books and publications');

-- Insert sample products
INSERT INTO product_summary (sku, name, description, category, price, cost, quantity, reorder_level, status) VALUES
('E-LAPTOP-001', 'Business Laptop', '15-inch business laptop with 16GB RAM', 'Electronics', 1299.99, 950.00, 25, 5, 'active'),
('E-PHONE-002', 'Smartphone X', 'Latest smartphone model with dual camera', 'Electronics', 899.99, 650.00, 42, 10, 'active'),
('O-DESK-001', 'Standing Desk', 'Adjustable height standing desk', 'Office Supplies', 499.99, 300.00, 8, 3, 'active'),
('F-CHAIR-002', 'Ergonomic Chair', 'Fully adjustable ergonomic office chair', 'Furniture', 349.99, 200.00, 12, 5, 'active'),
('B-BIZ-001', 'Business Strategy Book', 'Best-selling business strategy guide', 'Books', 24.99, 12.00, 45, 10, 'active');`}
                  </pre>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                <button 
                  style={{
                    backgroundColor: '#ff4d4f',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '4px 15px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 0 rgba(0,0,0,0.045)',
                    height: '32px'
                  }}
                  onClick={handleRefresh}
                >
                  Retry Connection
                </button>
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button
                    style={{
                      backgroundColor: '#1e1e1e',
                      color: 'rgba(255, 255, 255, 0.85)',
                      borderRadius: '4px',
                      padding: '4px 15px',
                      border: '1px solid #303030',
                      cursor: 'pointer',
                      boxShadow: '0 2px 0 rgba(0,0,0,0.045)',
                      height: '32px'
                    }}
                  >Go to Supabase</button>
                </a>
              </div>
            </div>
          )}
          
          {selectedTable && (
            <div style={{ 
              backgroundColor: 'var(--item-hover-bg, rgba(255, 255, 255, 0.08))',
              padding: '8px',
              borderRadius: '4px'
            }}>
              <Text style={{ color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.45))' }}>
                Viewing table: <Text strong style={{ color: 'var(--text-color, rgba(255, 255, 255, 0.85))' }}>{tables.find(t => t.id === selectedTable)?.name || selectedTable}</Text>
              </Text>
              <div style={{ marginTop: 4 }}>
                <Text style={{ color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.45))' }}>
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