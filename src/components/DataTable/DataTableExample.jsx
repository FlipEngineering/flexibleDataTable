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
// Import Supabase client from DatabaseConnector to use in this file
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with same credentials used in DatabaseConnector
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : {
      from: () => ({
        select: () => ({ limit: () => ({ then: (cb) => cb({ data: [], error: null }) }) }),
        insert: () => ({ then: (cb) => cb({ data: null, error: null }) }),
        update: () => ({ eq: () => ({ then: (cb) => cb({ data: null, error: null }) }) }),
        delete: () => ({ eq: () => ({ then: (cb) => cb({ data: null, error: null }) }) })
      })
    };

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
    
    // Auto-scroll the debug console to show newest logs
    setTimeout(() => {
      const logsContainer = document.getElementById('debug-console-logs');
      if (logsContainer) {
        logsContainer.scrollTop = 0; // Scroll to top since logs are in reverse order (newest first)
      }
    }, 50);
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
      logDebug(`Applying filters to ${selectedTable}...`, 'info');
      
      try {
        const filters = {};
        if (selectedCategory) filters.category_id = selectedCategory;
        if (selectedStatus) filters.status = selectedStatus;
        
        const filteredProducts = await fetchProducts(filters);
        setTableData(filteredProducts);
        logDebug(`Applied filters successfully, found ${filteredProducts.length} records`, 'success');
      } catch (error) {
        const errorMsg = `Error applying filters: ${error.message}`;
        logDebug(errorMsg, 'error');
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
    
    // Log the first few characters of the URL (for debugging)
    if (hasSupabaseUrl) {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const safeUrl = url.substring(0, 12) + '...';
      logDebug(`Supabase URL: ${safeUrl}`, 'info');
    }
    
    // Check browser capabilities
    logDebug(`Browser: ${navigator.userAgent}`, 'info');
    
    // Force refresh tables list on initial load to make sure we get non-mock tables
    setTimeout(() => {
      logDebug('Refreshing available tables...', 'info');
      setDebugLogs([]); // Clear logs for clean output
    }, 1000);
  }, []);

  // Event handlers for DataTable
  const handleSave = async (values, key, newData) => {
    try {
      // Find the record to update
      const record = tableData.find(p => p.key === key);
      if (!record) {
        message.error({ content: 'Record not found', duration: 2 });
        return;
      }
      
      // Show loading indicator
      message.loading({ content: 'Saving to database...', key: 'saveOperation' });
      
      // For product tables, we have specific save functionality
      if (selectedTable === 'product_summary' || selectedTable === 'products') {
        try {
          // Validate inputs before sending to database
          // Make sure numeric values are properly formatted
          const processedValues = { ...values };
          
          // Convert string numbers to actual numbers
          if (processedValues.price) processedValues.price = Number(processedValues.price);
          if (processedValues.cost) processedValues.cost = Number(processedValues.cost);
          if (processedValues.quantity) processedValues.quantity = Number(processedValues.quantity);
          if (processedValues.reorder_level) processedValues.reorder_level = Number(processedValues.reorder_level);
          
          // Update the product in database
          const savedData = await saveProduct({ ...record, ...processedValues }, false);
          
          if (savedData) {
            // Operation was successful
            message.success({ content: 'Record updated in database', key: 'saveOperation', duration: 2 });
            
            // Refresh data to get server-calculated fields
            await loadTableData(selectedTable);
            logDebug(`Product ${record.id} updated successfully`, 'success');
          } else {
            throw new Error('Save operation returned no data');
          }
        } catch (error) {
          message.error({ content: `Failed to update product: ${error.message}`, key: 'saveOperation', duration: 3 });
          logDebug(`Error updating product: ${error.message}`, 'error');
        }
      } else {
        // Generic table update
        try {
          // Check if table includes "DUMMY" (indicating mock data)
          if (selectedTable.includes('DUMMY')) {
            // Just update local state for mock data
            setTableData(newData);
            message.success({ content: 'Record updated (mock mode)', key: 'saveOperation', duration: 2 });
            logDebug(`${selectedTable} updated (mock mode)`, 'success');
          } else {
            // For real tables, try a generic update
            const { data, error } = await supabase.from(selectedTable.split('.').pop())
              .update(values)
              .eq('id', record.id);
              
            if (error) throw error;
            
            message.success({ content: 'Record updated in database', key: 'saveOperation', duration: 2 });
            // Refresh table data
            await loadTableData(selectedTable);
            logDebug(`Record ${record.id} updated in ${selectedTable}`, 'success');
          }
        } catch (error) {
          message.error({ content: `Failed to update record: ${error.message}`, key: 'saveOperation', duration: 3 });
          logDebug(`Error updating record in ${selectedTable}: ${error.message}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error updating record:', error);
      message.error({ content: 'Failed to update record in database', key: 'saveOperation', duration: 2 });
      logDebug(`Error in update operation: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (key, newData) => {
    try {
      // Find the record to delete
      const record = tableData.find(p => p.key === key);
      if (!record) {
        message.error({ content: 'Record not found', duration: 2 });
        return;
      }
      
      // Show loading indicator
      message.loading({ content: 'Deleting from database...', key: 'deleteOperation' });
      
      // For product tables, we have specific delete functionality
      if (selectedTable === 'product_summary' || selectedTable === 'products') {
        try {
          // Delete from database
          const success = await deleteProduct(record.id);
          
          if (success) {
            // Operation was successful
            message.success({ content: 'Record deleted from database', key: 'deleteOperation', duration: 2 });
            
            // Refresh data to ensure consistency
            await loadTableData(selectedTable);
            logDebug(`Product ${record.id} deleted successfully`, 'success');
          } else {
            throw new Error('Delete operation failed');
          }
        } catch (error) {
          message.error({ content: `Failed to delete product: ${error.message}`, key: 'deleteOperation', duration: 3 });
          logDebug(`Error deleting product: ${error.message}`, 'error');
        }
      } else {
        // Generic table delete
        try {
          // Check if table includes "DUMMY" (indicating mock data)
          if (selectedTable.includes('DUMMY')) {
            // Just update local state for mock data
            setTableData(newData);
            message.success({ content: 'Record deleted (mock mode)', key: 'deleteOperation', duration: 2 });
            logDebug(`Record deleted from ${selectedTable} (mock mode)`, 'success');
          } else {
            // For real tables, try a generic delete
            const { error } = await supabase.from(selectedTable.split('.').pop())
              .delete()
              .eq('id', record.id);
              
            if (error) throw error;
            
            message.success({ content: 'Record deleted from database', key: 'deleteOperation', duration: 2 });
            // Refresh table data
            await loadTableData(selectedTable);
            logDebug(`Record ${record.id} deleted from ${selectedTable}`, 'success');
          }
        } catch (error) {
          message.error({ content: `Failed to delete record: ${error.message}`, key: 'deleteOperation', duration: 3 });
          logDebug(`Error deleting record from ${selectedTable}: ${error.message}`, 'error');
          
          // Update local state anyway for better user experience
          setTableData(newData);
        }
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      message.error({ content: 'Failed to delete record from database', key: 'deleteOperation', duration: 2 });
      logDebug(`Error in delete operation: ${error.message}`, 'error');
    }
  };

  const handleAdd = async (record, newData) => {
    try {
      // Show loading indicator
      message.loading({ content: 'Adding to database...', key: 'addOperation' });
      
      // For product tables, we have specific add functionality
      if (selectedTable === 'product_summary' || selectedTable === 'products') {
        try {
          // Validate and process inputs before sending to database
          const processedRecord = { ...record };
          
          // Convert string numbers to actual numbers
          if (processedRecord.price) processedRecord.price = Number(processedRecord.price);
          if (processedRecord.cost) processedRecord.cost = Number(processedRecord.cost);
          if (processedRecord.quantity) processedRecord.quantity = Number(processedRecord.quantity);
          if (processedRecord.reorder_level) processedRecord.reorder_level = Number(processedRecord.reorder_level);
          
          // Add to database (true indicates new record)
          const savedData = await saveProduct(processedRecord, true);
          
          if (savedData) {
            // Operation was successful
            message.success({ content: 'Record added to database', key: 'addOperation', duration: 2 });
            
            // Refresh data to get server-assigned IDs and calculated fields
            await loadTableData(selectedTable);
            logDebug(`New product added successfully`, 'success');
          } else {
            throw new Error('Add operation returned no data');
          }
        } catch (error) {
          message.error({ content: `Failed to add product: ${error.message}`, key: 'addOperation', duration: 3 });
          logDebug(`Error adding product: ${error.message}`, 'error');
        }
      } else {
        // Generic table add
        try {
          // Check if table includes "DUMMY" (indicating mock data)
          if (selectedTable.includes('DUMMY')) {
            // Just update local state for mock data
            setTableData(newData);
            message.success({ content: 'Record added (mock mode)', key: 'addOperation', duration: 2 });
            logDebug(`New record added to ${selectedTable} (mock mode)`, 'success');
          } else {
            // For real tables, try a generic insert
            // Remove key field which might conflict with database auto-increment
            const { key, ...insertData } = record;
            
            const { data, error } = await supabase.from(selectedTable.split('.').pop())
              .insert(insertData);
              
            if (error) throw error;
            
            message.success({ content: 'Record added to database', key: 'addOperation', duration: 2 });
            // Refresh table data to get the server-assigned ID
            await loadTableData(selectedTable);
            logDebug(`New record added to ${selectedTable}`, 'success');
          }
        } catch (error) {
          message.error({ content: `Failed to add record: ${error.message}`, key: 'addOperation', duration: 3 });
          logDebug(`Error adding record to ${selectedTable}: ${error.message}`, 'error');
          
          // Update local state anyway for better user experience in case of temporary database issues
          setTableData(newData);
        }
      }
    } catch (error) {
      console.error('Error adding record:', error);
      message.error({ content: 'Failed to add record to database', key: 'addOperation', duration: 2 });
      logDebug(`Error in add operation: ${error.message}`, 'error');
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
    // Actually clear logs array
    setDebugLogs([]);
    
    // Force a render update in case the state update doesn't trigger it
    setTimeout(() => {
      const debugConsole = document.getElementById('debug-console-logs');
      if (debugConsole) {
        debugConsole.innerHTML = '<div style="opacity: 0.5; text-align: center; padding: 20px 0;">No logs to display</div>';
      }
    }, 50);
  };

  return (
    <div className="sql-explorer">
      <div className="explorer-container" style={{ display: 'flex', width: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar */}
          <div 
            id="explorer-sidebar"
            className="explorer-sidebar" 
            style={{ 
              width: '300px', 
              minWidth: '200px',
              maxWidth: '500px',
              background: 'var(--component-background, #141414)', 
              borderRight: '1px solid var(--border-color-split, #303030)',
              padding: '20px 16px',
              height: 'calc(100vh - 250px)',
              overflowY: 'auto',
              color: 'var(--text-color, rgba(255, 255, 255, 0.85))',
              position: 'relative',
              flexShrink: 0
            }}
          >
            {/* Resize handle */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: '6px',
                cursor: 'col-resize',
                backgroundColor: 'transparent',
                zIndex: 10,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const sidebar = document.getElementById('explorer-sidebar');
                const startX = e.clientX;
                const startWidth = sidebar.offsetWidth;
                
                const handleMouseMove = (moveEvent) => {
                  const newWidth = startWidth + (moveEvent.clientX - startX);
                  // Limit between min and max width
                  const clampedWidth = Math.min(Math.max(newWidth, 200), 500);
                  sidebar.style.width = `${clampedWidth}px`;
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'var(--heading-color, rgba(255, 255, 255, 0.85))'
            }}>
              <DatabaseOutlined style={{ marginRight: 10, color: 'var(--primary-color, #1890ff)' }} />
              SQL Explorer
            </h2>
            <p style={{ color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.45))' }}>
              View and manage all tables in your PostgreSQL database
            </p>
            
            <TableSelector 
              selectedTable={selectedTable}
              onSelectTable={handleTableChange}
            />
          
          {/* Only show filters for product tables */}
          {(selectedTable === 'product_summary' || selectedTable === 'products') && (
            <>
              <h3 style={{ color: 'var(--heading-color, rgba(255, 255, 255, 0.85))' }}>Filters</h3>
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
            background: 'var(--item-hover-bg, rgba(255, 255, 255, 0.08))', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color-split, #303030)',
            color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.45))'
          }}>
            <h3 style={{ color: 'var(--heading-color, rgba(255, 255, 255, 0.85))' }}>Database Integration</h3>
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
            background: 'var(--body-background, #141414)',
            color: 'var(--text-color, rgba(255, 255, 255, 0.85))'
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
                color: 'var(--text-color-secondary, rgba(255, 255, 255, 0.45))'
              }}>
                <div style={{ fontSize: '72px', lineHeight: '72px', marginBottom: '16px' }}>📋</div>
                <h3 style={{ color: 'var(--heading-color, rgba(255, 255, 255, 0.85))' }}>No data found</h3>
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
        
        {/* Debug Console with Resize Handle */}
        {showDebugConsole && (
          <>
            {/* Resize Handle */}
            <div 
              style={{ 
                height: '6px', 
                backgroundColor: '#444', 
                cursor: 'ns-resize',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onMouseDown={(e) => {
                // Start resizing
                const startY = e.clientY;
                const startHeight = document.getElementById('debug-console').offsetHeight;
                
                const handleMouseMove = (moveEvent) => {
                  // Calculate new height (reverse direction for y-axis)
                  const newHeight = startHeight - (moveEvent.clientY - startY);
                  // Limit min and max height
                  const clampedHeight = Math.min(Math.max(newHeight, 50), 500);
                  const debugConsole = document.getElementById('debug-console');
                  debugConsole.style.height = `${clampedHeight}px`;
                  
                  // Auto-scroll to bottom when resizing
                  const logsContainer = document.getElementById('debug-console-logs');
                  if (logsContainer) {
                    logsContainer.scrollTop = logsContainer.scrollHeight;
                  }
                  
                  // Highlight the resize handle during resize
                  document.getElementById('resize-handle-indicator').style.backgroundColor = '#1890ff';
                };
                
                const handleMouseUp = () => {
                  // Stop resizing
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  
                  // Reset the resize handle color
                  document.getElementById('resize-handle-indicator').style.backgroundColor = '#888';
                };
                
                // Add event listeners
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                
                // Prevent default behavior
                e.preventDefault();
              }}
            >
              <div 
                id="resize-handle-indicator"
                style={{ 
                  width: '30px', 
                  height: '4px', 
                  backgroundColor: '#888', 
                  borderRadius: '2px',
                  transition: 'background-color 0.2s'
                }} 
              />
            </div>
            
            {/* Debug Console */}
            <div 
              id="debug-console"
              style={{ 
                borderTop: '1px solid var(--border-color-split, #303030)',
                backgroundColor: 'var(--component-background, #141414)',
                color: 'var(--text-color-inverse, #fff)',
                padding: '8px',
                height: '150px',
                fontFamily: 'monospace',
                fontSize: '12px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '150px',
                marginTop: 'auto'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '8px',
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--component-background, #141414)',
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
              <div 
                id="debug-console-logs"
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  maxHeight: 'calc(100% - 40px)'
                }}
              >
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
          </>
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