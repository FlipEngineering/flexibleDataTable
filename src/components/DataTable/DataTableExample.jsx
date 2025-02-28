import React, { useState, useEffect } from 'react';
import { Input, Select, Button, message as antMessage } from 'antd';
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
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlQueryResult, setSqlQueryResult] = useState(null);
  const [sqlQueryError, setSqlQueryError] = useState(null);
  const [sqlQueryRunning, setSqlQueryRunning] = useState(false);
  
  // Enhanced debug logger function with detailed logging and popup notifications
  const logDebug = (message, type = 'info', details = null, showPopup = false) => {
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
    
    // Store the message text in a local variable to avoid name conflicts
    const msgText = message; 
    
    switch(type) {
      case 'error':
        console.error(logPrefix + msgText, details || '');
        // Always show popup for errors
        antMessage.error(msgText);
        break;
      case 'warning':
        console.warn(logPrefix + msgText, details || '');
        // Show popup for warnings if requested
        if (showPopup) antMessage.warning(msgText);
        break;
      case 'success':
        console.log(`%c${logPrefix}${msgText}`, 'color: green', details || '');
        // Show popup for success if requested
        if (showPopup) antMessage.success(msgText);
        break;
      case 'db':
        console.log(`%c${logPrefix}${msgText}`, 'color: #52c41a; font-weight: bold', details || '');
        // Only show popup for DB errors or if specifically requested
        if (showPopup || (msgText.includes('ERROR') && msgText.includes('DB'))) {
          antMessage.error(`Database Error: ${msgText.replace('[DB]', '')}`);
        }
        break;
      default:
        console.log(logPrefix + msgText, details || '');
        // Show popup for info if requested
        if (showPopup) antMessage.info(msgText);
    }
    
    // Auto-scroll the debug console to show newest logs if not manually scrolled
    setTimeout(() => {
      const logsContainer = document.getElementById('debug-console-logs');
      if (logsContainer) {
        // Check if auto-scroll is enabled
        const autoScroll = logsContainer.getAttribute('data-auto-scroll') !== 'false';
        
        // Only auto-scroll if user hasn't manually scrolled up
        if (autoScroll) {
          logsContainer.scrollTop = 0; // Scroll to top since logs are in reverse order (newest first)
        }
      }
    }, 50);
  };
  
  // Database-specific logger
  const logDB = (operation, target, status, details = null, showPopup = false) => {
    const message = `[DB] ${operation} ${target}: ${status}`;
    const type = status === 'SUCCESS' ? 'success' : 
                status === 'ERROR' ? 'error' : 
                status === 'WARNING' ? 'warning' : 'db';
    
    // Pass the showPopup parameter to logDebug
    logDebug(message, type, details, showPopup);
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
        antMessage.error('Failed to load table structure');
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
            errorObject: catError,
            code: catError.code,
            details: catError.details || {},
            stack: catError.stack
          }, true); // Show popup for category fetch errors
        }
      }
      
      // Start database fetch with detailed timing
      const startTime = performance.now();
      
      try {
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
          logDebug(`Table ${tableId} is empty`, 'warning', null, true);
        }
      } catch (dbError) {
        // Enhanced error logging with more details
        const errorDetails = {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details || {},
          hint: dbError.hint,
          stack: dbError.stack,
          tableId: tableId,
          url: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'not defined',
          timestamp: new Date().toISOString()
        };
        
        // Log detailed error information to debug console
        logDB('FETCH', `data from ${tableId}`, 'ERROR', errorDetails, true);
        
        // Show specific error notification based on error type
        if (dbError.code && dbError.code.startsWith('22')) {
          antMessage.error(`Database syntax error: ${dbError.message}`);
        } else if (dbError.code && dbError.code.startsWith('23')) {
          antMessage.error(`Database constraint violation: ${dbError.message}`);
        } else if (dbError.code && dbError.code.startsWith('42')) {
          antMessage.error(`Invalid database object or syntax: ${dbError.message}`);
        } else {
          antMessage.error(`Failed to load ${tableId} table data: ${dbError.message}`);
        }
        
        // Return mock data as fallback
        if (tableId.includes('product')) {
          setTableData(mockData.product_summary || []);
          logDebug('Falling back to mock product data', 'warning', null, true);
        } else if (tableId.includes('categories')) {
          setTableData(mockData.categories || []);
          logDebug('Falling back to mock category data', 'warning', null, true);
        } else {
          setTableData([]);
        }
      }
    } catch (error) {
      // Detailed error logging for overall operation
      logDB('FETCH', `data from ${tableId}`, 'ERROR', {
        error: error.message,
        stack: error.stack,
        tableId: tableId,
        url: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'not defined'
      }, true); // Force popup for this critical error
      
      antMessage.error(`Failed to load ${tableId} table data: ${error.message}`);
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
        antMessage.error('Failed to filter products');
      } finally {
        setLoading(false);
      }
    };
    
    applyFilters();
  }, [selectedCategory, selectedStatus, selectedTable]);

  // Handle search
  const handleSearch = async () => {
    if (selectedTable !== 'product_summary' && selectedTable !== 'products') {
      antMessage.info('Search is currently only available for the Products table');
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
      antMessage.error('Search failed');
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
  
  // Debug console height control - try to get saved height or default to 300px
  const [debugHeight, setDebugHeight] = useState(() => {
    // Try to get saved height from localStorage
    const savedHeight = localStorage.getItem('debugConsoleHeight');
    return savedHeight ? parseInt(savedHeight, 10) : 300;
  });
  
  // Apply height when it changes
  useEffect(() => {
    // Apply height to DOM
    const container = document.getElementById('debug-console-container');
    if (container) {
      container.style.setProperty('height', `${debugHeight}px`, 'important');
      
      // Save to localStorage for persistence
      localStorage.setItem('debugConsoleHeight', debugHeight);
    }
  }, [debugHeight]);
  
  // Initialize the SQL query field with default query when debug console is shown
  useEffect(() => {
    if (showDebugConsole && !sqlQuery) {
      // Set a default SQL query using the current selected table
      setSqlQuery(`SELECT * FROM ${selectedTable} LIMIT 10;`);
      
      // Log welcome message
      logDebug('SQL Terminal ready - enter a query and click Execute', 'db', {
        mode: 'Demo / Local SQL Parser',
        supported: 'Basic SELECT queries with simple WHERE conditions',
        tip: 'Use example queries above or press Ctrl+Enter to execute'
      });
    }
  }, [showDebugConsole, selectedTable]);
  
  // Handle drag resize functionality
  const handleResizeDrag = (e) => {
    e.preventDefault();
    
    // Initial measurements
    const startY = e.clientY;
    const container = document.getElementById('debug-console-container');
    if (!container) return;
    
    const startHeight = container.offsetHeight;
    console.log(`Starting resize drag from height: ${startHeight}px`);
    
    // Track if mouse is down
    let isDragging = true;
    
    // Handle mouse movement
    const handleMouseMove = (moveEvent) => {
      if (!isDragging) return;
      
      // Calculate how far mouse has moved
      const deltaY = startY - moveEvent.clientY;
      
      // Dragging up = increase height, down = decrease
      let newHeight = startHeight + deltaY;
      
      // Apply constraints
      const minHeight = 100;
      const maxHeight = window.innerHeight * 0.8;
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
      
      // Apply new height directly to DOM
      container.style.setProperty('height', `${newHeight}px`, 'important');
      
      // Update state to keep React in sync
      setDebugHeight(newHeight);
    };
    
    // Handle mouse up - end resize
    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Save final height
      if (container) {
        const finalHeight = container.offsetHeight;
        console.log(`Resize complete. New height: ${finalHeight}px`);
      }
    };
    
    // Add listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Listen for database operation events from DatabaseConnector
  useEffect(() => {
    // Event handler for database operations
    const handleDatabaseOperation = (e) => {
      const { operation, target, status, rows, timestamp } = e.detail;
      logDB(operation, target, status, {
        timestamp,
        rows: rows || 0,
        ...e.detail
      });
    };
    
    // Event handler for database errors
    const handleDatabaseError = (e) => {
      const { operation, target, message, code, hint, details, stack } = e.detail;
      
      // Log error with full details
      logDB(operation, target, 'ERROR', {
        message,
        code,
        hint,
        details,
        stack,
        timestamp: e.detail.timestamp
      }, true); // Always show popup for database errors
      
      // Show specific error message based on error type
      if (code && code.startsWith('22')) {
        antMessage.error(`Database syntax error: ${message}`);
      } else if (code && code.startsWith('23')) {
        antMessage.error(`Database constraint violation: ${message}`);
      } else if (code && code.startsWith('42')) { 
        antMessage.error(`Invalid database object: ${message}`);
      } else {
        antMessage.error(`Database error: ${message}`);
      }
    };
    
    // Event handler for connection status
    const handleConnectionSuccess = (e) => {
      logDebug(e.detail.message, 'success', null, true);
    };
    
    const handleConnectionError = (e) => {
      logDebug(e.detail.message, 'error', {
        error: e.detail.error,
        timestamp: e.detail.timestamp
      }, true);
    };

    // Add event listeners
    window.addEventListener('supabase:operation', handleDatabaseOperation);
    window.addEventListener('supabase:error', handleDatabaseError);
    window.addEventListener('supabase:connectionSuccess', handleConnectionSuccess);
    window.addEventListener('supabase:connectionError', handleConnectionError);
    
    // Cleanup
    return () => {
      window.removeEventListener('supabase:operation', handleDatabaseOperation);
      window.removeEventListener('supabase:error', handleDatabaseError);
      window.removeEventListener('supabase:connectionSuccess', handleConnectionSuccess);
      window.removeEventListener('supabase:connectionError', handleConnectionError);
    };
  }, []);

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
    }, 1000);
  }, []);

  // Event handlers for DataTable
  const handleSave = async (values, key, newData) => {
    try {
      // Find the record to update
      const record = tableData.find(p => p.key === key);
      if (!record) {
        // Show popup notification
        logDebug('Record not found', 'error', { key, availableRecords: tableData.length }, true);
        return;
      }
      
      // Show loading indicator
      antMessage.loading({ content: 'Saving to database...', key: 'saveOperation' });
      
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
          logDB('UPDATE', `product ${record.id || record.key}`, 'STARTED', {
            id: record.id || record.key,
            fields: Object.keys(processedValues),
            timestamp: new Date().toISOString()
          });
          
          // Start timing the operation
          const startTime = performance.now();
          
          try {
            // Update the product in database
            const savedData = await saveProduct(updatePayload, false);
            
            // Calculate time taken
            const endTime = performance.now();
            const updateTime = (endTime - startTime).toFixed(2);
            
            if (savedData) {
              // Operation was successful
              antMessage.success({ content: 'Record updated in database', key: 'saveOperation', duration: 2 });
              
              // Log success with timing details
              logDB('UPDATE', `product ${record.id || record.key}`, 'SUCCESS', {
                id: record.id || record.key,
                timeMs: updateTime,
                fields: Object.keys(processedValues),
                response: savedData
              }, true); // Show success popup
              
              // Refresh data to get server-calculated fields
              await loadTableData(selectedTable);
            } else {
              throw new Error('Save operation returned no data');
            }
          } catch (error) {
            // Enhanced error handling with detailed logging and user-friendly message
            const errorMessage = error.message || 'Unknown database error';
            
            // Show user-friendly error with popup
            antMessage.error({ 
              content: `Failed to update record: ${errorMessage}`, 
              key: 'saveOperation', 
              duration: 5 
            });
            
            // Log detailed error information with popup notification
            logDB('UPDATE', `product ${record.id || record.key}`, 'ERROR', {
              id: record.id || record.key,
              error: errorMessage,
              details: error.details || {},
              stack: error.stack,
              table: selectedTable,
              fields: Object.keys(values),
              timestamp: new Date().toISOString()
            }, true); // force popup for this error
          }
        } catch (error) {
          // This catches errors in the validation phase
          antMessage.error({ content: `Failed to update product: ${error.message}`, key: 'saveOperation', duration: 3 });
          
          // Log detailed error information with popup notification
          logDB('UPDATE', `product validation`, 'ERROR', {
            error: error.message,
            stack: error.stack,
            table: selectedTable,
            fields: Object.keys(values)
          }, true);
        }
      } else {
        // Generic table update
        try {
          // Check if table includes "DUMMY" (indicating mock data)
          if (selectedTable.includes('DUMMY')) {
            // Just update local state for mock data
            setTableData(newData);
            antMessage.success({ content: 'Record updated (mock mode)', key: 'saveOperation', duration: 2 });
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
            
            antMessage.success({ content: 'Record updated in database', key: 'saveOperation', duration: 2 });
            
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
          antMessage.error({ content: `Failed to update record: ${error.message}`, key: 'saveOperation', duration: 3 });
          
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
      antMessage.error({ content: 'Failed to update record in database', key: 'saveOperation', duration: 2 });
      
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
        antMessage.error({ content: 'Record not found', duration: 2 });
        return;
      }
      
      // Show loading indicator
      antMessage.loading({ content: 'Deleting from database...', key: 'deleteOperation' });
      
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
            antMessage.success({ content: 'Record deleted from database', key: 'deleteOperation', duration: 2 });
            
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
          antMessage.error({ content: `Failed to delete product: ${error.message}`, key: 'deleteOperation', duration: 3 });
          
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
            antMessage.success({ content: 'Record deleted (mock mode)', key: 'deleteOperation', duration: 2 });
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
            
            antMessage.success({ content: 'Record deleted from database', key: 'deleteOperation', duration: 2 });
            
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
          antMessage.error({ content: `Failed to delete record: ${error.message}`, key: 'deleteOperation', duration: 3 });
          
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
      antMessage.error({ content: 'Failed to delete record from database', key: 'deleteOperation', duration: 2 });
      
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
      antMessage.loading({ content: 'Adding to database...', key: 'addOperation' });
      
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
            antMessage.success({ content: 'Record added to database', key: 'addOperation', duration: 2 });
            
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
          antMessage.error({ content: `Failed to add product: ${error.message}`, key: 'addOperation', duration: 3 });
          
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
            antMessage.success({ content: 'Record added (mock mode)', key: 'addOperation', duration: 2 });
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
            
            antMessage.success({ content: 'Record added to database', key: 'addOperation', duration: 2 });
            
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
          antMessage.error({ content: `Failed to add record: ${error.message}`, key: 'addOperation', duration: 3 });
          
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
      antMessage.error({ content: 'Failed to add record to database', key: 'addOperation', duration: 2 });
      
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
    // Check if we're in SQL query mode
    if (localStorage.getItem('currentMode') === 'sql_query') {
      return localStorage.getItem('sqlQueryLabel') || 'SQL Query Results';
    }
    
    // Otherwise use normal table names
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
  
  // Function to directly initialize resize handle functionality
  // Will be called from useEffect after render
  const initializeResizeHandles = () => {
    console.log("Initializing resize handlers");
    
    // Get elements
    const container = document.getElementById('debug-console-container');
    const topHandle = document.getElementById('debug-console-resize-handle');
    const bottomHandle = document.getElementById('debug-console-resize-handle-bottom');
    
    if (!container || !topHandle || !bottomHandle) {
      console.error("Could not find resize elements", {
        container: Boolean(container),
        topHandle: Boolean(topHandle),
        bottomHandle: Boolean(bottomHandle)
      });
      return;
    }
    
    // Top handle resize function
    const initTopResize = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("Top resize activated");
      const startY = e.clientY;
      const startHeight = container.offsetHeight;
      
      const onMouseMove = (event) => {
        const delta = startY - event.clientY;
        const newHeight = startHeight + delta;
        if (newHeight >= 50 && newHeight <= window.innerHeight * 0.8) {
          container.style.height = `${newHeight}px`;
        }
      };
      
      const onMouseUp = () => {
        console.log("Top resize complete");
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('mouseup', onMouseUp, true);
        localStorage.setItem('debugConsoleHeight', container.offsetHeight);
      };
      
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    };
    
    // Bottom handle resize function
    const initBottomResize = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("Bottom resize activated");
      const startY = e.clientY;
      const startHeight = container.offsetHeight;
      
      const onMouseMove = (event) => {
        const delta = event.clientY - startY;
        const newHeight = startHeight + delta;
        if (newHeight >= 50 && newHeight <= window.innerHeight * 0.8) {
          container.style.height = `${newHeight}px`;
        }
      };
      
      const onMouseUp = () => {
        console.log("Bottom resize complete");
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('mouseup', onMouseUp, true);
        localStorage.setItem('debugConsoleHeight', container.offsetHeight);
      };
      
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    };
    
    // Add event listeners
    topHandle.addEventListener('mousedown', initTopResize);
    bottomHandle.addEventListener('mousedown', initBottomResize);
    
    console.log("Resize handlers initialized");
  };
  
  // Clear debug logs and SQL results
  const clearDebugLogs = () => {
    // Actually clear logs array
    setDebugLogs([]);
    
    // Also clear any SQL query results
    setSqlQueryResult(null);
    setSqlQueryError(null);
    
    // Force a render update in case the state update doesn't trigger it
    setTimeout(() => {
      const debugConsole = document.getElementById('debug-console-logs');
      if (debugConsole) {
        debugConsole.innerHTML = '<div style="opacity: 0.5; text-align: center; padding: 20px 0;">No logs to display</div>';
      }
    }, 50);
  };
  
  // Execute SQL query and display results in the main table component
  const executeSQL = async () => {
    if (!sqlQuery.trim()) {
      logDebug('SQL query cannot be empty', 'warning', null, true);
      return;
    }
    
    // Save the current table name so we can return to it later
    localStorage.setItem('lastSelectedTable', selectedTable);
    
    // Reset previous results and set loading state
    setSqlQueryResult(null);
    setSqlQueryError(null);
    setSqlQueryRunning(true);
    setLoading(true);
    
    try {
      // Log that we're starting SQL execution
      logDebug(`Executing SQL query: ${sqlQuery}`, 'db', { query: sqlQuery });
      
      // Basic validation - make sure it's a SELECT query
      const trimmedQuery = sqlQuery.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select ')) {
        logDebug('Only SELECT queries are allowed', 'error', {
          query: sqlQuery,
          reason: 'Non-SELECT query attempted'
        }, true);
        
        setSqlQueryError({
          message: 'Only SELECT queries are allowed for safety reasons',
          hint: 'For security, only read-only operations are permitted'
        });
        
        setLoading(false);
        setSqlQueryRunning(false);
        return;
      }
      
      // Extract table name to help with column formatting
      let targetTable = "";
      const fromMatch = /\sfrom\s+([^\s,;]+)/i.exec(sqlQuery);
      if (fromMatch && fromMatch[1]) {
        targetTable = fromMatch[1].trim();
      }
      
      // Start timing the query
      const startTime = performance.now();
      
      try {
        // In this demo, we'll use a simplified approach with client-side filtering
        // This prevents network errors when the SQL function isn't available
        
        logDebug('Executing SQL query in demo mode', 'info', {
          query: sqlQuery
        });
        
        // Simple SQL-like filtering implementation for demo purposes
        let data = [...tableData]; // Start with current table data
        let error = null;
        
        // Apply very basic SQL-like filtering if WHERE clause is present
        const wherePart = sqlQuery.toLowerCase().indexOf(' where ');
        if (wherePart > 0) {
          try {
            // Extract the WHERE condition
            const whereCondition = sqlQuery.substring(wherePart + 7).trim();
            
            // Simple parsing for basic conditions (column = value, column < value, etc.)
            // Only supporting simple comparison operations for demo
            const operators = ['>=', '<=', '!=', '<>', '=', '>', '<'];
            let foundOperator = '';
            let column = '';
            let value = '';
            
            // Find which operator is used in the condition
            for (const op of operators) {
              if (whereCondition.includes(op)) {
                foundOperator = op;
                [column, value] = whereCondition
                  .split(op)
                  .map(part => part.trim().replace(/;$/, ''));
                break;
              }
            }
            
            if (foundOperator && column) {
              // Parse value - handle strings, numbers, etc.
              let parsedValue;
              
              // Handle quoted strings
              if ((value.startsWith("'") && value.endsWith("'")) ||
                  (value.startsWith('"') && value.endsWith('"'))) {
                parsedValue = value.substring(1, value.length - 1);
              } else if (value.toLowerCase() === 'true') {
                parsedValue = true;
              } else if (value.toLowerCase() === 'false') {
                parsedValue = false;
              } else if (value.toLowerCase() === 'null') {
                parsedValue = null;
              } else {
                // Try to parse as number if possible
                const num = parseFloat(value);
                parsedValue = isNaN(num) ? value : num;
              }
              
              // Now filter the data based on the condition
              data = data.filter(row => {
                const rowValue = row[column];
                
                switch(foundOperator) {
                  case '=': return rowValue === parsedValue;
                  case '!=':
                  case '<>': return rowValue !== parsedValue;
                  case '>': return rowValue > parsedValue;
                  case '<': return rowValue < parsedValue;
                  case '>=': return rowValue >= parsedValue;
                  case '<=': return rowValue <= parsedValue;
                  default: return true;
                }
              });
              
              logDebug(`Applied filter: ${column} ${foundOperator} ${value}`, 'info', {
                rowsMatched: data.length
              });
            }
          } catch (filterError) {
            console.log('Error applying SQL filter:', filterError);
            // Continue with unfiltered data
            logDebug('Could not apply SQL filter, showing all data', 'warning');
          }
        }
        
        // Apply LIMIT if present
        const limitPart = sqlQuery.toLowerCase().indexOf(' limit ');
        if (limitPart > 0) {
          try {
            const limitStr = sqlQuery.substring(limitPart + 7).trim();
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit) && limit > 0) {
              data = data.slice(0, limit);
              logDebug(`Applied LIMIT ${limit}`, 'info');
            }
          } catch (limitError) {
            console.log('Error applying LIMIT:', limitError);
          }
        }
        
        // Calculate execution time
        const endTime = performance.now();
        const queryTime = (endTime - startTime).toFixed(2);
        
        if (error && (!data || data.length === 0)) {
          // Log and handle SQL error
          logDebug(`SQL Error: ${error.message}`, 'error', {
            query: sqlQuery,
            error: error.message,
            hint: error.hint,
            details: error.details
          }, true);
          
          setSqlQueryError({
            message: error.message,
            hint: error.hint || 'Query could not be executed'
          });
        } else {
          // We have data - either from real query or fallback to current table
          const resultData = data || tableData;
          const resultCount = resultData.length;
          
          // Log success
          logDebug(`SQL query executed (${queryTime}ms, ${resultCount} rows)`, 'success', {
            query: sqlQuery,
            rows: resultCount,
            timeMs: queryTime,
            sample: resultCount > 0 ? resultData[0] : null
          });
          
          // Create result object with query metadata
          const result = {
            data: resultData,
            rows: resultCount,
            timeMs: queryTime,
            columns: resultData && resultData.length > 0 ? Object.keys(resultData[0]) : []
          };
          
          // Store the result
          setSqlQueryResult(result);
          
          // Update the main table with the query results
          if (resultData && resultData.length > 0) {
            // Get columns from the first row
            const firstRow = resultData[0];
            const dynamicColumns = Object.keys(firstRow).map(key => {
              // Try to infer column type
              const value = firstRow[key];
              const type = typeof value;
              
              return {
                title: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                dataIndex: key,
                key: key,
                type: type === 'number' ? 'number' : 
                      type === 'boolean' ? 'checkbox' : 'text',
                sorter: true,
                filterable: true
              };
            });
            
            // Update the table data and columns
            setTableData(resultData.map((item, index) => ({ ...item, key: item.id || index })));
            setColumns(dynamicColumns);
            
            // Store the current table name for reference, but DON'T try to use it as a real table
            const queryResultsLabel = `SQL Query Results (${resultCount} rows)`;
            
            // Create an object to track that we're in SQL query mode without changing the selectedTable
            // This prevents the system from trying to load this as a real table
            localStorage.setItem('currentMode', 'sql_query');
            localStorage.setItem('sqlQueryLabel', queryResultsLabel);
            
            // Update UI to show we're in SQL query mode, but keep the real table name internally
            document.title = queryResultsLabel;
          }
        }
      } catch (err) {
        // Handle execution errors
        logDebug(`SQL execution failed: ${err.message}`, 'error', {
          query: sqlQuery,
          error: err.message,
          stack: err.stack
        }, true);
        
        setSqlQueryError({
          message: err.message,
          hint: 'An unexpected error occurred during execution'
        });
      }
    } finally {
      // Reset loading states
      setLoading(false);
      setSqlQueryRunning(false);
    }
  };

  return (
    <>
      <div className="sql-explorer" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div className="explorer-main-area" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
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
              justifyContent: 'center', 
              gap: '10px'
            }}>
              <Button 
                type="primary" 
                onClick={() => loadTableData(selectedTable)}
                loading={loading}
              >
                Refresh Table Data
              </Button>
              
              {/* Show this button when we're in SQL query results mode */}
              {localStorage.getItem('currentMode') === 'sql_query' && (
                <Button 
                  onClick={() => {
                    // Get the original table name (saved when executing SQL)
                    const originalTable = localStorage.getItem('lastSelectedTable') || 'product_summary';
                    
                    // Reset to the original table
                    setSelectedTable(originalTable);
                    
                    // Clear SQL query mode flags
                    localStorage.removeItem('currentMode');
                    localStorage.removeItem('sqlQueryLabel');
                    
                    // Reset title
                    document.title = document.title.replace(/SQL Query Results.*/, originalTable);
                    
                    // Load the original table data
                    loadTableData(originalTable);
                    
                    // Log action
                    logDebug(`Restored original table view: ${originalTable}`, 'info');
                  }}
                >
                  Back to Original Table
                </Button>
              )}
            </div>
          </div>
        </div>
        
          {/* Main content */}
          <div className="explorer-content" style={{ 
            flex: 1, 
            padding: '20px 24px',
            background: 'var(--body-background, #141414)',
            color: 'var(--text-color, rgba(255, 255, 255, 0.85))',
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0
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
      
      {/* Debug Console Section - Separate from main area */}
      {showDebugConsole && (
        <div 
          id="debug-console-container"
          style={{
            position: 'relative',
            borderTop: '1px solid #333',
            height: `${debugHeight}px !important`, /* Use state for height with !important */
            maxHeight: '80vh', /* Maximum height */
            minHeight: '100px', /* Minimum height */
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#141414',
            padding: '0px',
            transition: 'height 0.3s ease'
          }}
        >
          {/* Drag handle for resizing */}
          <div
            className="debug-console-drag-handle"
            style={{
              height: '10px',
              backgroundColor: '#333',
              borderBottom: '1px solid #444',
              cursor: 'ns-resize',
              position: 'relative',
              zIndex: 101
            }}
            onMouseDown={handleResizeDrag}
          >
            <div 
              style={{
                width: '40px',
                height: '4px',
                backgroundColor: '#666',
                borderRadius: '2px',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>
          
          {/* Console header */}
          <div
            style={{
              height: '24px',
              backgroundColor: '#2a2a2a',
              borderBottom: '1px solid #444',
              padding: '0 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '12px' }}>
              Debug Console
            </div>
            <div style={{ color: '#aaa', fontSize: '11px', display: 'flex', alignItems: 'center' }}>
              {debugLogs.length} logs | {debugHeight}px
              <Button 
                size="small" 
                onClick={() => {
                  // Execute a deliberately invalid SQL command to test error handling
                  logDebug('Testing SQL error handling with invalid query...', 'info');
                  // Using direct supabase client to execute raw SQL
                  supabase.rpc('execute_sql', { sql_command: 'SELECT * FROM non_existent_table;' })
                    .then(result => {
                      if (result.error) {
                        throw result.error;
                      }
                      logDebug('SQL test executed successfully', 'success');
                    })
                    .catch(error => {
                      // Log as explicit error type instead of warning
                      logDebug(`SQL Error: ${error.message}`, 'error', {
                        query: 'SELECT * FROM non_existent_table;',
                        error: error.message,
                        code: error.code || 'UNKNOWN',
                        hint: 'This is a deliberate test of error handling',
                        details: error.details || 'Test error for debugging purposes'
                      }, true);
                      
                      // Also set the SQL terminal to show this error 
                      setSqlQuery('SELECT * FROM non_existent_table;');
                      setSqlQueryError({
                        message: error.message,
                        code: error.code || 'UNKNOWN',
                        hint: 'This error was triggered by the Test SQL Error button',
                        details: error.details || {}
                      });
                      // Switch to SQL terminal to show the error
                      setSqlQueryResult({
                        data: [],
                        rows: 0,
                        timeMs: 0,
                        columns: []
                      });
                    });
                }}
                style={{ marginLeft: '10px', fontSize: '10px' }}
                title="Test SQL error handling"
              >
                Test SQL Error
              </Button>
            </div>
          </div>
          
          {/* Debug Console Content */}
          <div
            id="debug-console"
            style={{
              flex: 1,
              backgroundColor: 'var(--component-background, #141414)',
              color: 'white',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Console header and tabs */}
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
                <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '16px' }}>
                  <input 
                    type="checkbox" 
                    id="errors-only-toggle"
                    checked={showOnlyErrors}
                    onChange={() => setShowOnlyErrors(!showOnlyErrors)}
                    style={{ marginRight: '4px' }}
                  />
                  <label 
                    htmlFor="errors-only-toggle" 
                    style={{ 
                      fontSize: '12px', 
                      cursor: 'pointer',
                      color: showOnlyErrors ? '#ff4d4f' : '#aaa'
                    }}
                  >
                    Show errors only
                  </label>
                </div>
              </div>
              <div>
                <Button 
                  size="small" 
                  onClick={() => {
                    // Find the most recent errors and their context with a max of 50 lines
                    let lastNormalLogIndex = -1;
                    
                    // Find all error logs
                    const errorLogs = debugLogs
                      .filter(log => log.type === 'error' || log.message.includes('ERROR'));
                    
                    if (errorLogs.length > 0) {
                      // Find the last normal log before the errors
                      const firstErrorIndex = debugLogs.findIndex(
                        log => log.id === errorLogs[0].id
                      );
                      
                      // Find the last normal log before the first error
                      for (let i = 0; i < firstErrorIndex; i++) {
                        if (debugLogs[i].type !== 'error' && !debugLogs[i].message.includes('ERROR')) {
                          lastNormalLogIndex = i;
                        }
                      }
                      
                      // Add a context header
                      let copyText = "=== ERROR LOG FOR TROUBLESHOOTING ===\n\n";
                      
                      // Add system and environment info
                      copyText += `Environment: ${import.meta.env.DEV ? 'Development' : 'Production'}\n`;
                      copyText += `Browser: ${navigator.userAgent}\n`;
                      copyText += `Database URL defined: ${Boolean(supabaseUrl)}\n`;
                      copyText += `Database Key defined: ${Boolean(supabaseKey)}\n`;
                      copyText += `Current table: ${selectedTable}\n`;
                      copyText += `Timestamp: ${new Date().toISOString()}\n\n`;
                      
                      // Create a combined log array starting from the last normal log
                      const relevantLogs = lastNormalLogIndex !== -1
                        ? debugLogs.slice(lastNormalLogIndex)  // Start from last normal log
                        : errorLogs;  // If no normal log found, just use error logs
                      
                      // Limit to 50 log entries
                      const limitedLogs = relevantLogs.slice(0, 50);
                      
                      // Add the logs
                      copyText += "LOG ENTRIES:\n";
                      limitedLogs.forEach(log => {
                        const typePrefix = log.type === 'error' ? '[ERROR] ' : 
                                        log.type === 'warning' ? '[WARNING] ' :
                                        log.type === 'success' ? '[SUCCESS] ' :
                                        log.type === 'db' ? '[DB] ' : '[INFO] ';
                        
                        copyText += `${log.timestamp} ${typePrefix}${log.message}\n`;
                        
                        // Include details if available
                        if (log.details) {
                          if (typeof log.details === 'object') {
                            try {
                              const detailsText = JSON.stringify(log.details, null, 2);
                              copyText += `  Details: ${detailsText}\n`;
                            } catch (e) {
                              copyText += `  Details: ${log.details.toString()}\n`;
                            }
                          } else {
                            copyText += `  Details: ${log.details}\n`;
                          }
                        }
                        copyText += "\n";
                      });
                      
                      // Copy to clipboard
                      navigator.clipboard.writeText(copyText);
                      antMessage.success('Error logs copied to clipboard (up to 50 lines)');
                    } else {
                      antMessage.info('No error logs to copy');
                    }
                  }} 
                  style={{ marginRight: '8px', backgroundColor: '#ff4d4f', color: 'white' }}
                  title="Copy recent errors for troubleshooting"
                >
                  Copy Errors
                </Button>
                <Button 
                  size="small"
                  onClick={() => {
                    // Create a full log export with all details
                    if (debugLogs.length === 0) {
                      antMessage.info('No logs to export');
                      return;
                    }
                    
                    // Create header with system info
                    let exportText = "=== FULL LOG EXPORT ===\n\n";
                    
                    // Add system info
                    exportText += `Environment: ${import.meta.env.DEV ? 'Development' : 'Production'}\n`;
                    exportText += `Browser: ${navigator.userAgent}\n`;
                    exportText += `Database URL defined: ${Boolean(supabaseUrl)}\n`;
                    exportText += `Database Key defined: ${Boolean(supabaseKey)}\n`;
                    exportText += `Current table: ${selectedTable}\n`;
                    exportText += `Log count: ${debugLogs.length}\n`;
                    exportText += `Export time: ${new Date().toISOString()}\n\n`;
                    
                    // Add all logs with formatting based on type
                    exportText += "===== LOGS =====\n\n";
                    
                    debugLogs.forEach(log => {
                      // Format based on log type
                      const typePrefix = log.type === 'error' ? '[ERROR] ' : 
                                       log.type === 'warning' ? '[WARNING] ' :
                                       log.type === 'success' ? '[SUCCESS] ' :
                                       log.type === 'db' ? '[DB] ' : '[INFO] ';
                      
                      exportText += `${log.timestamp} ${typePrefix}${log.message}\n`;
                      
                      // Add details if available
                      if (log.details) {
                        if (typeof log.details === 'object') {
                          try {
                            const detailsText = JSON.stringify(log.details, null, 2);
                            exportText += `  Details: ${detailsText}\n`;
                          } catch (e) {
                            exportText += `  Details: ${log.details.toString()}\n`;
                          }
                        } else {
                          exportText += `  Details: ${log.details}\n`;
                        }
                      }
                      
                      exportText += "\n";
                    });
                    
                    // Create a blob and download link
                    const blob = new Blob([exportText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `log_export_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    antMessage.success('Logs exported to file');
                  }}
                  style={{ marginRight: '8px', backgroundColor: '#52c41a', color: 'white' }}
                  title="Export all logs to a text file"
                >
                  Export All
                </Button>
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
            
            {/* SQL Terminal at the top */}
            <div className="sql-terminal-top" style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '10px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                fontSize: '12px', 
                marginBottom: '4px', 
                color: '#aaa', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>SQL Query</span>
                  <span style={{ 
                    marginLeft: '8px', 
                    backgroundColor: 'rgba(255, 173, 20, 0.2)', 
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: '#faad14',
                    fontSize: '10px'
                  }}>
                    Demo Mode
                  </span>
                </div>
                <div>
                  <span style={{ cursor: 'pointer', textDecoration: 'underline', marginLeft: '15px', color: '#1890ff', fontSize: '11px' }}
                    onClick={() => setSqlQuery('SELECT * FROM product_summary LIMIT 10;')}>
                    Products
                  </span>
                  <span style={{ cursor: 'pointer', textDecoration: 'underline', marginLeft: '15px', color: '#1890ff', fontSize: '11px' }}
                    onClick={() => setSqlQuery('SELECT * FROM categories;')}>
                    Categories
                  </span>
                  <span style={{ cursor: 'pointer', textDecoration: 'underline', marginLeft: '15px', color: '#1890ff', fontSize: '11px' }}
                    onClick={() => setSqlQuery('SELECT name, category, price, quantity FROM product_summary WHERE quantity < 20;')}>
                    Low Stock
                  </span>
                </div>
              </div>
              
              <div style={{ 
                marginBottom: '4px',
                fontSize: '10px',
                color: '#aaa',
              }}>
                Supports basic filtering (WHERE column = value) and LIMIT clauses • Client-side processing
              </div>
              
              <div style={{ display: 'flex' }}>
                <Input.TextArea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter SQL query to display in main table..."
                  onKeyDown={(e) => {
                    // Execute query on Ctrl+Enter or Shift+Enter
                    if ((e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
                      e.preventDefault(); // Prevent new line
                      executeSQL();
                    }
                  }}
                  style={{
                    fontFamily: 'monospace',
                    backgroundColor: '#0a0a0a',
                    color: '#fff',
                    border: '1px solid #333',
                    flex: 1
                  }}
                  rows={1}
                />
                <Button
                  type="primary"
                  onClick={executeSQL}
                  loading={sqlQueryRunning}
                  disabled={!sqlQuery.trim()}
                  style={{ marginLeft: '8px' }}
                >
                  Run
                </Button>
              </div>
              
              <div style={{ fontSize: '10px', color: '#aaa', textAlign: 'right', marginTop: '2px' }}>
                Ctrl+Enter to execute • Results will appear in main table
                {sqlQueryResult && (
                  <span style={{ color: '#52c41a', marginLeft: '10px' }}>
                    Last query: {sqlQueryResult.rows} {sqlQueryResult.rows === 1 ? 'row' : 'rows'} in {sqlQueryResult.timeMs}ms
                  </span>
                )}
              </div>
            </div>
            
            {/* Query Error */}
            {sqlQueryError && (
              <div style={{
                backgroundColor: 'rgba(255,77,79,0.2)',
                border: '1px solid #ff4d4f',
                padding: '8px',
                marginBottom: '8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#ff4d4f', fontWeight: 'bold', marginBottom: '4px' }}>
                  Query Error
                </div>
                <div style={{ marginBottom: '4px' }}>
                  {typeof sqlQueryError === 'string' ? sqlQueryError : sqlQueryError.message}
                </div>
                {sqlQueryError.hint && (
                  <div style={{ color: '#aaa' }}>
                    Hint: {sqlQueryError.hint}
                  </div>
                )}
                {sqlQueryError.code && (
                  <div style={{ color: '#aaa' }}>
                    Code: {sqlQueryError.code}
                  </div>
                )}
              </div>
            )}
            
            {/* Console logs section */}
            <div 
              id="debug-console-logs"
              style={{
                overflowY: 'auto',
                flex: 1,
                textAlign: 'left',
                width: '100%',
                boxSizing: 'border-box'
              }}
              data-auto-scroll="true"
              onScroll={(e) => {
                const target = e.target;
                // Mark if user has manually scrolled
                if (target.scrollTop > 0 && 
                    target.scrollTop < target.scrollHeight - target.clientHeight - 50) {
                  target.setAttribute('data-auto-scroll', 'false');
                } else if (target.scrollTop === 0) { 
                  // User scrolled back to top (newest messages)
                  target.setAttribute('data-auto-scroll', 'true');
                }
              }}
              >
                {/* Filter logs if showOnlyErrors is enabled */}
                {(showOnlyErrors 
                  ? debugLogs.filter(log => log.type === 'error' || log.message.includes('ERROR')) 
                  : debugLogs
                ).map(log => (
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
                              log.type === 'db' ? '#52c41a' : '#fff',
                        fontWeight: log.type === 'error' || log.type === 'db' ? 'bold' : 'normal'
                      }}>
                        {log.message}
                      </span>
                    </div>
                    
                    {/* Show details if available */}
                    {log.details && (
                      <div className="debug-log-details" style={{ 
                        marginLeft: '16px', 
                        marginTop: '2px',
                        fontSize: '11px',
                        color: '#aaa',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '8px',
                        borderRadius: '2px',
                        textAlign: 'left',
                        fontFamily: 'Consolas, Monaco, "Andale Mono", monospace'
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
                {showOnlyErrors && 
                  debugLogs.filter(log => log.type === 'error' || log.message.includes('ERROR')).length === 0 && (
                  <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
                    No error logs to display
                  </div>
                )}
              </div>
            </div>
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
    </>
  );
};

export default DataTableExample;