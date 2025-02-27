import React, { useState, useEffect } from 'react';
import { Input, Select, Button, message } from 'antd';
import { SearchOutlined, DatabaseOutlined } from '@ant-design/icons';
import DataTable from './DataTable';
import TableSelector from './TableSelector';
import { 
  fetchProducts, 
  searchProducts, 
  fetchCategories,
  saveProduct, 
  deleteProduct,
  fetchTableData,
  getTableColumns
} from './DatabaseConnector';

const { Option } = Select;

const DataTableExample = () => {
  const [tableData, setTableData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedTable, setSelectedTable] = useState('product_summary');
  const [columns, setColumns] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugConsole, setShowDebugConsole] = useState(true);
  
  // Custom debug logger function
  const logDebug = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const newLog = {
      id: Date.now(),
      timestamp,
      message,
      type // 'info', 'success', 'error', 'warning'
    };
    setDebugLogs(prevLogs => [newLog, ...prevLogs].slice(0, 50)); // Keep last 50 logs
    
    // Also log to browser console
    switch(type) {
      case 'error':
        console.error(`[${timestamp}] ${message}`);
        break;
      case 'warning':
        console.warn(`[${timestamp}] ${message}`);
        break;
      case 'success':
        console.log(`%c[${timestamp}] ${message}`, 'color: green');
        break;
      default:
        console.log(`[${timestamp}] ${message}`);
    }
  };
  
  // Load table columns when selected table changes
  useEffect(() => {
    const loadTableColumns = async () => {
      setLoading(true);
      logDebug(`Loading columns for table: ${selectedTable}`, 'info');
      try {
        const tableColumns = await getTableColumns(selectedTable);
        setColumns(tableColumns);
        logDebug(`Loaded ${tableColumns.length} columns for ${selectedTable}`, 'success');
      } catch (error) {
        const errorMsg = `Error loading table columns: ${error.message}`;
        logDebug(errorMsg, 'error');
        message.error('Failed to load table structure');
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedTable) {
      loadTableColumns();
    }
  }, [selectedTable]);

  // Function to load table data
  const loadTableData = async (tableId) => {
    setLoading(true);
    logDebug(`Loading data from table: ${tableId}`, 'info');
    try {
      // Load categories for filtering if we're on the products table
      if (tableId === 'product_summary' || tableId === 'products') {
        logDebug('Fetching categories for product filtering', 'info');
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
        logDebug(`Loaded ${categoriesData?.length || 0} categories`, 'success');
      }
      
      // Load data for the selected table
      const data = await fetchTableData(tableId);
      setTableData(data);
      
      const logMsg = `Loaded ${data?.length || 0} rows from ${tableId} table`;
      logDebug(logMsg, 'success');
      
      // Log schema details for debugging
      if (data && data.length > 0) {
        const sampleRow = data[0];
        const fields = Object.keys(sampleRow).join(', ');
        logDebug(`Table schema: ${fields}`, 'info');
      } else {
        logDebug(`Table ${tableId} is empty or inaccessible`, 'warning');
      }
    } catch (error) {
      const errorMsg = `Error loading ${tableId} table data: ${error.message}`;
      logDebug(errorMsg, 'error');
      message.error(`Failed to load ${tableId} table data`);
    } finally {
      setLoading(false);
    }
  };
  
  // Load table data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [selectedTable]);

  // Filter products when category or status changes (only for product_summary)
  useEffect(() => {
    if (selectedTable !== 'product_summary' && selectedTable !== 'products') {
      return;
    }
    
    const applyFilters = async () => {
      setLoading(true);
      try {
        const filters = {};
        if (selectedCategory) filters.category_id = selectedCategory;
        if (selectedStatus) filters.status = selectedStatus;
        
        const filteredProducts = await fetchProducts(filters);
        setTableData(filteredProducts);
      } catch (error) {
        console.error('Error applying filters:', error);
        message.error('Failed to filter products');
      } finally {
        setLoading(false);
      }
    };
    
    applyFilters();
  }, [selectedCategory, selectedStatus, selectedTable]);

  // Handle search
  const handleSearch = async () => {
    if (selectedTable !== 'product_summary' && selectedTable !== 'products') {
      message.info('Search is currently only available for the Products table');
      return;
    }
    
    if (!searchTerm.trim()) {
      // If search is cleared, reset to all products
      const productsData = await fetchProducts();
      setTableData(productsData);
      return;
    }
    
    setLoading(true);
    try {
      const results = await searchProducts(searchTerm);
      setTableData(results);
    } catch (error) {
      console.error('Error searching products:', error);
      message.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle table change
  const handleTableChange = (tableId) => {
    logDebug(`Switching to table: ${tableId}`, 'info');
    setSelectedTable(tableId);
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedStatus(null);
  };
  
  // Collect environment info for debugging
  useEffect(() => {
    // Log environment info once on component mount
    const isDev = import.meta.env.DEV || false;
    const mode = isDev ? 'Development' : 'Production';
    logDebug(`Environment: ${mode} mode`, 'info');
    
    const hasSupabaseUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
    const hasSupabaseKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
    logDebug(`Supabase URL defined: ${hasSupabaseUrl}`, hasSupabaseUrl ? 'success' : 'warning');
    logDebug(`Supabase Key defined: ${hasSupabaseKey}`, hasSupabaseKey ? 'success' : 'warning');
    
    // Check browser capabilities
    logDebug(`Browser: ${navigator.userAgent}`, 'info');
  }, []);

  // Event handlers for DataTable
  const handleSave = async (values, key, newData) => {
    try {
      // Generic update for any table
      if (selectedTable === 'product_summary' || selectedTable === 'products') {
        // Find the product to update
        const product = tableData.find(p => p.key === key);
        if (!product) return;
        
        // Update the product in database
        await saveProduct({ ...product, ...values }, false);
      } else {
        // For other tables, we would need to implement specific update logic
        message.info(`Update operations for ${selectedTable} not yet implemented`);
        return;
      }
      
      message.success('Record updated successfully');
      
      // Update local state
      setTableData(newData);
    } catch (error) {
      console.error('Error updating record:', error);
      message.error('Failed to update record');
    }
  };

  const handleDelete = async (key, newData) => {
    try {
      if (selectedTable === 'product_summary' || selectedTable === 'products') {
        // Find the product to delete
        const product = tableData.find(p => p.key === key);
        if (!product) return;
        
        // Delete from database
        await deleteProduct(product.id);
      } else {
        // For other tables, we would need to implement specific delete logic
        message.info(`Delete operations for ${selectedTable} not yet implemented`);
        return;
      }
      
      message.success('Record deleted successfully');
      
      // Update local state
      setTableData(newData);
    } catch (error) {
      console.error('Error deleting record:', error);
      message.error('Failed to delete record');
    }
  };

  const handleAdd = async (record, newData) => {
    try {
      if (selectedTable === 'product_summary' || selectedTable === 'products') {
        // Add to database
        await saveProduct(record, true);
      } else {
        // For other tables, we would need to implement specific add logic
        message.info(`Add operations for ${selectedTable} not yet implemented`);
        return;
      }
      
      message.success('Record added successfully');
      
      // Update local state
      setTableData(newData);
    } catch (error) {
      console.error('Error adding record:', error);
      message.error('Failed to add record');
    }
  };

  // Get table name for display
  const getTableDisplayName = () => {
    switch (selectedTable) {
      case 'product_summary':
        return 'Products';
      case 'categories':
        return 'Categories';
      case 'suppliers':
        return 'Suppliers';
      case 'customers':
        return 'Customers';
      case 'orders':
        return 'Orders';
      case 'transactions':
        return 'Transactions';
      default:
        return selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1);
    }
  };

  // Toggle debug console
  const toggleDebugConsole = () => {
    setShowDebugConsole(prev => !prev);
    logDebug(`Debug console ${showDebugConsole ? 'hidden' : 'shown'}`, 'info');
  };
  
  // Clear debug logs
  const clearDebugLogs = () => {
    setDebugLogs([]);
    logDebug('Debug logs cleared', 'info');
  };

  return (
    <div className="sql-explorer">
      <div className="explorer-container" style={{ display: 'flex', width: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar */}
          <div className="explorer-sidebar" style={{ 
            width: '300px', 
            background: 'var(--component-background, #fff)', 
            borderRight: '1px solid var(--border-color-split, #f0f0f0)',
            padding: '20px 16px',
            height: 'calc(100vh - 250px)',
            overflowY: 'auto'
          }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'var(--heading-color, rgba(0, 0, 0, 0.85))'
            }}>
              <DatabaseOutlined style={{ marginRight: 10, color: 'var(--primary-color, #1890ff)' }} />
              SQL Explorer
            </h2>
            <p style={{ color: 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))' }}>
              View and manage all tables in your PostgreSQL database
            </p>
            
            <TableSelector 
              selectedTable={selectedTable}
              onSelectTable={handleTableChange}
            />
          
          {/* Only show filters for product tables */}
          {(selectedTable === 'product_summary' || selectedTable === 'products') && (
            <>
              <h3 style={{ color: 'var(--heading-color, rgba(0, 0, 0, 0.85))' }}>Filters</h3>
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onPressEnter={handleSearch}
                    style={{ width: '100%' }}
                    suffix={
                      <Button 
                        type="text" 
                        icon={<SearchOutlined />} 
                        onClick={handleSearch}
                      />
                    }
                  />
                </div>
                
                <div style={{ marginBottom: 8 }}>
                  <Select
                    placeholder="Filter by Category"
                    allowClear
                    style={{ width: '100%' }}
                    onChange={value => setSelectedCategory(value)}
                    value={selectedCategory}
                  >
                    {categories.map(category => (
                      <Option key={category.id} value={category.id}>{category.name}</Option>
                    ))}
                  </Select>
                </div>
                
                <div style={{ marginBottom: 8 }}>
                  <Select
                    placeholder="Filter by Status"
                    allowClear
                    style={{ width: '100%' }}
                    onChange={value => setSelectedStatus(value)}
                    value={selectedStatus}
                  >
                    <Option value="active">Active</Option>
                    <Option value="discontinued">Discontinued</Option>
                    <Option value="out_of_stock">Out of Stock</Option>
                    <Option value="backordered">Backordered</Option>
                  </Select>
                </div>
              </div>
            </>
          )}
          
          <div style={{ 
            margin: '24px 0', 
            padding: '16px', 
            background: 'var(--item-hover-bg, rgba(0, 0, 0, 0.02))', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color-split, #f0f0f0)',
            color: 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))'
          }}>
            <h3 style={{ color: 'var(--heading-color, rgba(0, 0, 0, 0.85))' }}>Database Integration</h3>
            <p>This component connects to PostgreSQL database with:</p>
            <ul>
              <li>Dynamic table selection</li>
              <li>Automatic schema detection</li>
              <li>CRUD operations</li>
              <li>Filtering and search</li>
            </ul>
            
            <div style={{ 
              marginTop: 16, 
              display: 'flex', 
              justifyContent: 'center' 
            }}>
              <Button 
                type="primary" 
                onClick={() => loadTableData(selectedTable)}
                loading={loading}
              >
                Refresh Table Data
              </Button>
            </div>
          </div>
        </div>
        
          {/* Main content */}
          <div className="explorer-content" style={{ 
            flex: 1, 
            padding: '20px 24px',
            background: 'var(--body-background, #fff)',
            color: 'var(--text-color, rgba(0, 0, 0, 0.85))'
          }}>
            <DataTable
              tableName={getTableDisplayName()}
              columns={columns}
              dataSource={tableData.map(item => ({ ...item, key: item.id }))}
              onSave={handleSave}
              onDelete={handleDelete}
              onAdd={handleAdd}
              loading={loading}
              formulaEnabled={selectedTable === 'product_summary'}
            />

            {tableData.length === 0 && !loading && (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--text-color-secondary, rgba(0, 0, 0, 0.45))'
              }}>
                <div style={{ fontSize: '72px', lineHeight: '72px', marginBottom: '16px' }}>📋</div>
                <h3 style={{ color: 'var(--heading-color, rgba(0, 0, 0, 0.85))' }}>No data found</h3>
                <p>This table appears to be empty or not available.</p>
                <div style={{ marginBottom: '16px' }}>
                  {selectedTable && selectedTable.includes('DUMMY') && (
                    <div style={{
                      display: 'inline-block',
                      margin: '8px 0',
                      padding: '4px 12px',
                      backgroundColor: 'var(--warning-color, #faad14)',
                      color: 'var(--text-color-inverse, #fff)',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      DUMMY DATA MODE ACTIVE
                    </div>
                  )}
                </div>
                <Button 
                  type="primary" 
                  onClick={() => loadTableData(selectedTable)}
                  style={{ marginTop: '8px' }}
                >
                  Refresh Data
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Debug Console */}
        {showDebugConsole && (
          <div style={{ 
            borderTop: '1px solid var(--border-color-split, #f0f0f0)',
            backgroundColor: 'var(--component-background, #000)',
            color: 'var(--text-color-inverse, #fff)',
            padding: '8px',
            height: '150px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '8px',
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--component-background, #000)',
              padding: '4px',
              zIndex: 1
            }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>Debug Console</span>
                <span style={{ marginLeft: '12px', opacity: 0.7 }}>
                  {debugLogs.length} logs
                </span>
              </div>
              <div>
                <Button 
                  size="small" 
                  onClick={clearDebugLogs} 
                  style={{ marginRight: '8px' }}
                >
                  Clear
                </Button>
                <Button 
                  size="small" 
                  onClick={toggleDebugConsole}
                >
                  Hide
                </Button>
              </div>
            </div>
            <div>
              {debugLogs.map(log => (
                <div 
                  key={log.id} 
                  style={{ 
                    padding: '2px 0',
                    color: log.type === 'error' ? '#ff4d4f' :
                          log.type === 'warning' ? '#faad14' :
                          log.type === 'success' ? '#52c41a' : '#fff'
                  }}
                >
                  <span style={{ opacity: 0.7, marginRight: '8px' }}>[{log.timestamp}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
              {debugLogs.length === 0 && (
                <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
                  No logs to display
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Debug toggle button (when hidden) */}
        {!showDebugConsole && (
          <Button 
            type="primary" 
            size="small"
            onClick={toggleDebugConsole}
            style={{ 
              position: 'fixed', 
              bottom: '10px', 
              right: '10px',
              opacity: 0.8,
              zIndex: 1000
            }}
          >
            Show Debug Console
          </Button>
        )}
      </div>
    </div>
  );
};

export default DataTableExample;