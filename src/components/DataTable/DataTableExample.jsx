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
  
  // Enhanced debug logger function with detailed logging
  const logDebug = (message, type = 'info', details = null) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    
    // Create the log entry
    const newLog = {
      id: Date.now(),
      timestamp,
      message,
      type, // 'info', 'success', 'error', 'warning', 'db'
      details // Optional detailed information (like error objects, data payloads, etc.)
    };
    
    // Format details if they exist
    let formattedDetails = '';
    if (details) {
      if (typeof details === 'object') {
        try {
          // Try to stringify the object, but handle circular references
          formattedDetails = '\n' + JSON.stringify(details, null, 2);
        } catch (e) {
          formattedDetails = '\n[Complex object: ' + (details.message || details.toString()) + ']';
        }
      } else {
        formattedDetails = '\n' + details;
      }
    }
    
    // Update the logs state (newest first)
    setDebugLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100)); // Keep last 100 logs
    
    // Also log to browser console with appropriate formatting
    const logPrefix = `[${timestamp}] `;
    switch(type) {
      case 'error':
        console.error(logPrefix + message, details || '');
        break;
      case 'warning':
        console.warn(logPrefix + message, details || '');
        break;
      case 'success':
        console.log(`%c${logPrefix}${message}`, 'color: green', details || '');
        break;
      case 'db':
        console.log(`%c${logPrefix}${message}`, 'color: blue; font-weight: bold', details || '');
        break;
      default:
        console.log(logPrefix + message, details || '');
    }
    
    // Auto-scroll the debug console to show newest logs
    setTimeout(() => {
      const logsContainer = document.getElementById('debug-console-logs');
      if (logsContainer) {
        logsContainer.scrollTop = 0; // Scroll to top since logs are in reverse order (newest first)
      }
    }, 50);
  };
  
  // Database-specific logger
  const logDB = (operation, target, status, details = null) => {
    const message = `[DB] ${operation} ${target}: ${status}`;
    const type = status === 'SUCCESS' ? 'success' : 
                status === 'ERROR' ? 'error' : 
                status === 'WARNING' ? 'warning' : 'db';
    
    logDebug(message, type, details);
  };
  
  // Load table columns when selected table changes
  useEffect(() => {
    const loadTableColumns = async () => {
      setLoading(true);
      logDB('FETCH', `columns for ${selectedTable}`, 'STARTED');
      try {
        const tableColumns = await getTableColumns(selectedTable);
        setColumns(tableColumns);
        logDB('FETCH', `columns for ${selectedTable}`, 'SUCCESS', {
          count: tableColumns.length,
          columns: tableColumns.map(col => col.dataIndex)
        });
      } catch (error) {
        logDB('FETCH', `columns for ${selectedTable}`, 'ERROR', {
          error: error.message,
          stack: error.stack
        });
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
    logDB('FETCH', `data from ${tableId}`, 'STARTED');
    try {
      // Load categories for filtering if we're on the products table
      if (tableId === 'product_summary' || tableId === 'products') {
        logDB('FETCH', 'categories for filtering', 'STARTED');
        try {
          const categoriesData = await fetchCategories();
          setCategories(categoriesData);
          logDB('FETCH', 'categories', 'SUCCESS', {
            count: categoriesData?.length || 0,
            categories: categoriesData?.map(c => c.name) || []
          });
        } catch (catError) {
          logDB('FETCH', 'categories', 'ERROR', {
            error: catError.message,
            stack: catError.stack
          });
        }
      }
      
      // Start database fetch with detailed timing
      const startTime = performance.now();
      
      // Load data for the selected table
      const data = await fetchTableData(tableId);
      const endTime = performance.now();
      const fetchTime = (endTime - startTime).toFixed(2);
      
      setTableData(data);
      
      // Record successful fetch with timing and data info
      logDB('FETCH', `data from ${tableId}`, 'SUCCESS', {
        count: data?.length || 0,
        fetchTimeMs: fetchTime,
        tableId: tableId,
        sample: data && data.length > 0 ? { id: data[0].id } : null,
        fields: data && data.length > 0 ? Object.keys(data[0]) : []
      });
      
      // Provide a user-friendly message
      if (data?.length === 0) {
        logDebug(`Table ${tableId} is empty`, 'warning');
      }
    } catch (error) {
      // Detailed error logging
      logDB('FETCH', `data from ${tableId}`, 'ERROR', {
        error: error.message,
        stack: error.stack,
        tableId: tableId,
        url: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'not defined'
      });
      
      message.error(`Failed to load ${tableId} table data: ${error.message}`);
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
          
          // Log the update operation start with details
          const updatePayload = { ...record, ...processedValues };
          logDB('UPDATE', `product ${record.id}`, 'STARTED', {
            id: record.id,
            fields: Object.keys(processedValues)
          });
          
          // Start timing the operation
          const startTime = performance.now();
          
          // Update the product in database
          const savedData = await saveProduct(updatePayload, false);
          
          // Calculate time taken
          const endTime = performance.now();
          const updateTime = (endTime - startTime).toFixed(2);
          
          if (savedData) {
            // Operation was successful
            message.success({ content: 'Record updated in database', key: 'saveOperation', duration: 2 });
            
            // Log success with timing details
            logDB('UPDATE', `product ${record.id}`, 'SUCCESS', {
              id: record.id,
              timeMs: updateTime,
              fields: Object.keys(processedValues),
              response: savedData
            });
            
            // Refresh data to get server-calculated fields
            await loadTableData(selectedTable);
          } else {
            throw new Error('Save operation returned no data');
          }
        } catch (error) {
          message.error({ content: `Failed to update product: ${error.message}`, key: 'saveOperation', duration: 3 });
          
          // Log detailed error information
          logDB('UPDATE', `product ${record.id}`, 'ERROR', {
            id: record.id,
            error: error.message,
            stack: error.stack,
            table: selectedTable,
            fields: Object.keys(values)
          });
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
            const tableName = selectedTable.split('.').pop();
            
            logDB('UPDATE', `record in ${tableName}`, 'STARTED', {
              id: record.id,
              table: tableName,
              fields: Object.keys(values)
            });
            
            const startTime = performance.now();
            
            const { data, error } = await supabase.from(tableName)
              .update(values)
              .eq('id', record.id);
            
            const endTime = performance.now();
            const updateTime = (endTime - startTime).toFixed(2);
              
            if (error) throw error;
            
            message.success({ content: 'Record updated in database', key: 'saveOperation', duration: 2 });
            
            // Log success with details
            logDB('UPDATE', `record in ${tableName}`, 'SUCCESS', {
              id: record.id,
              timeMs: updateTime,
              table: tableName,
              fields: Object.keys(values),
              response: data
            });
            
            // Refresh table data
            await loadTableData(selectedTable);
          }
        } catch (error) {
          message.error({ content: `Failed to update record: ${error.message}`, key: 'saveOperation', duration: 3 });
          
          // Log detailed error information
          logDB('UPDATE', `record in ${selectedTable}`, 'ERROR', {
            id: record.id,
            error: error.message,
            stack: error.stack,
            table: selectedTable,
            fields: Object.keys(values),
            sqlErrorCode: error.code
          });
        }
      }
    } catch (error) {
      console.error('Error updating record:', error);
      message.error({ content: 'Failed to update record in database', key: 'saveOperation', duration: 2 });
      
      // Log the overall operation failure
      logDB('UPDATE', 'record', 'CRITICAL_ERROR', {
        error: error.message,
        stack: error.stack,
        table: selectedTable
      });
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
          // Log the delete operation start
          logDB('DELETE', `product ${record.id}`, 'STARTED', {
            id: record.id,
            product: record.name || 'unknown',
            table: selectedTable
          });
          
          // Start timing the operation
          const startTime = performance.now();
          
          // Delete from database
          const success = await deleteProduct(record.id);
          
          // Calculate time taken
          const endTime = performance.now();
          const deleteTime = (endTime - startTime).toFixed(2);
          
          if (success) {
            // Operation was successful
            message.success({ content: 'Record deleted from database', key: 'deleteOperation', duration: 2 });
            
            // Log success with timing information
            logDB('DELETE', `product ${record.id}`, 'SUCCESS', {
              id: record.id,
              product: record.name || 'unknown',
              timeMs: deleteTime,
              table: selectedTable
            });
            
            // Refresh data to ensure consistency
            await loadTableData(selectedTable);
          } else {
            throw new Error('Delete operation failed');
          }
        } catch (error) {
          message.error({ content: `Failed to delete product: ${error.message}`, key: 'deleteOperation', duration: 3 });
          
          // Log detailed error information
          logDB('DELETE', `product ${record.id}`, 'ERROR', {
            id: record.id,
            error: error.message,
            stack: error.stack,
            table: selectedTable
          });
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
            const tableName = selectedTable.split('.').pop();
            
            // Log the delete operation start
            logDB('DELETE', `record from ${tableName}`, 'STARTED', {
              id: record.id,
              table: tableName
            });
            
            // Start timing the operation
            const startTime = performance.now();
            
            const { error } = await supabase.from(tableName)
              .delete()
              .eq('id', record.id);
            
            // Calculate time taken
            const endTime = performance.now();
            const deleteTime = (endTime - startTime).toFixed(2);
              
            if (error) throw error;
            
            message.success({ content: 'Record deleted from database', key: 'deleteOperation', duration: 2 });
            
            // Log success with timing information
            logDB('DELETE', `record from ${tableName}`, 'SUCCESS', {
              id: record.id,
              timeMs: deleteTime,
              table: tableName
            });
            
            // Refresh table data
            await loadTableData(selectedTable);
          }
        } catch (error) {
          message.error({ content: `Failed to delete record: ${error.message}`, key: 'deleteOperation', duration: 3 });
          
          // Log detailed error information
          logDB('DELETE', `record from ${selectedTable}`, 'ERROR', {
            id: record.id,
            error: error.message,
            stack: error.stack,
            table: selectedTable,
            sqlErrorCode: error.code
          });
          
          // Update local state anyway for better user experience
          setTableData(newData);
        }
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      message.error({ content: 'Failed to delete record from database', key: 'deleteOperation', duration: 2 });
      
      // Log the overall operation failure
      logDB('DELETE', 'record', 'CRITICAL_ERROR', {
        error: error.message,
        stack: error.stack,
        table: selectedTable
      });
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
          
          // Log the add operation start with details
          logDB('INSERT', 'new product', 'STARTED', {
            fields: Object.keys(processedRecord),
            table: selectedTable,
            product: processedRecord.name || 'unnamed product'
          });
          
          // Start timing the operation
          const startTime = performance.now();
          
          // Add to database (true indicates new record)
          const savedData = await saveProduct(processedRecord, true);
          
          // Calculate time taken
          const endTime = performance.now();
          const insertTime = (endTime - startTime).toFixed(2);
          
          if (savedData) {
            // Operation was successful
            message.success({ content: 'Record added to database', key: 'addOperation', duration: 2 });
            
            // Log success with timing details
            logDB('INSERT', 'new product', 'SUCCESS', {
              timeMs: insertTime,
              table: selectedTable,
              product: processedRecord.name || 'unnamed product',
              id: savedData.id || 'unknown',
              response: savedData
            });
            
            // Refresh data to get server-assigned IDs and calculated fields
            await loadTableData(selectedTable);
          } else {
            throw new Error('Add operation returned no data');
          }
        } catch (error) {
          message.error({ content: `Failed to add product: ${error.message}`, key: 'addOperation', duration: 3 });
          
          // Log detailed error information
          logDB('INSERT', 'new product', 'ERROR', {
            error: error.message,
            stack: error.stack,
            table: selectedTable,
            fields: Object.keys(record)
          });
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
            const tableName = selectedTable.split('.').pop();
            
            // Log the insert operation start
            logDB('INSERT', `record into ${tableName}`, 'STARTED', {
              fields: Object.keys(insertData),
              table: tableName
            });
            
            // Start timing the operation
            const startTime = performance.now();
            
            const { data, error } = await supabase.from(tableName)
              .insert(insertData);
            
            // Calculate time taken
            const endTime = performance.now();
            const insertTime = (endTime - startTime).toFixed(2);
              
            if (error) throw error;
            
            message.success({ content: 'Record added to database', key: 'addOperation', duration: 2 });
            
            // Log success with timing details
            logDB('INSERT', `record into ${tableName}`, 'SUCCESS', {
              timeMs: insertTime,
              table: tableName,
              fields: Object.keys(insertData),
              response: data
            });
            
            // Refresh table data to get the server-assigned ID
            await loadTableData(selectedTable);
          }
        } catch (error) {
          message.error({ content: `Failed to add record: ${error.message}`, key: 'addOperation', duration: 3 });
          
          // Log detailed error information
          logDB('INSERT', `record into ${selectedTable}`, 'ERROR', {
            error: error.message,
            stack: error.stack,
            table: selectedTable,
            sqlErrorCode: error.code,
            fields: Object.keys(record)
          });
          
          // Update local state anyway for better user experience in case of temporary database issues
          setTableData(newData);
        }
      }
    } catch (error) {
      console.error('Error adding record:', error);
      message.error({ content: 'Failed to add record to database', key: 'addOperation', duration: 2 });
      
      // Log the overall operation failure
      logDB('INSERT', 'record', 'CRITICAL_ERROR', {
        error: error.message,
        stack: error.stack,
        table: selectedTable
      });
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
                      padding: '3px 0',
                      borderBottom: '1px dotted rgba(255,255,255,0.1)',
                      marginBottom: '3px'
                    }}
                  >
                    <div>
                      <span style={{ 
                        opacity: 0.7, 
                        marginRight: '8px',
                        fontSize: '10px' 
                      }}>[{log.timestamp}]</span>
                      <span style={{ 
                        color: log.type === 'error' ? '#ff4d4f' :
                              log.type === 'warning' ? '#faad14' :
                              log.type === 'success' ? '#52c41a' :
                              log.type === 'db' ? '#1890ff' : '#fff',
                        fontWeight: log.type === 'error' || log.type === 'db' ? 'bold' : 'normal'
                      }}>
                        {log.message}
                      </span>
                    </div>
                    
                    {/* Show details if available */}
                    {log.details && (
                      <div style={{ 
                        marginLeft: '16px', 
                        marginTop: '2px',
                        fontSize: '11px',
                        color: '#aaa',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '4px',
                        borderRadius: '2px'
                      }}>
                        {typeof log.details === 'object' ? 
                          JSON.stringify(log.details, null, 2) : 
                          log.details}
                      </div>
                    )}
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