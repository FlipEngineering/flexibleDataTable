import React, { useState, useEffect } from 'react';
import { Input, Select, Button, message, Row, Col, Layout } from 'antd';
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
const { Sider, Content } = Layout;

const DataTableExample = () => {
  const [tableData, setTableData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedTable, setSelectedTable] = useState('product_summary');
  const [columns, setColumns] = useState([]);
  
  // Load table columns when selected table changes
  useEffect(() => {
    const loadTableColumns = async () => {
      setLoading(true);
      try {
        const tableColumns = await getTableColumns(selectedTable);
        setColumns(tableColumns);
      } catch (error) {
        console.error('Error loading table columns:', error);
        message.error('Failed to load table structure');
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedTable) {
      loadTableColumns();
    }
  }, [selectedTable]);

  // Load table data when selected table changes
  useEffect(() => {
    const loadTableData = async () => {
      setLoading(true);
      try {
        // Load categories for filtering if we're on the products table
        if (selectedTable === 'product_summary' || selectedTable === 'products') {
          const categoriesData = await fetchCategories();
          setCategories(categoriesData);
        }
        
        // Load data for the selected table
        const data = await fetchTableData(selectedTable);
        setTableData(data);
      } catch (error) {
        console.error('Error loading table data:', error);
        message.error('Failed to load table data');
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedTable) {
      loadTableData();
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
    setSelectedTable(tableId);
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedStatus(null);
  };

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

  return (
    <Layout style={{ background: '#fff', minHeight: '100vh' }}>
      <Sider 
        width={300} 
        style={{ 
          background: '#fff', 
          borderRight: '1px solid #f0f0f0',
          padding: '20px 16px'
        }}
      >
        <h2 style={{ display: 'flex', alignItems: 'center' }}>
          <DatabaseOutlined style={{ marginRight: 10 }} />
          SQL Explorer
        </h2>
        <p>View and manage all tables in your PostgreSQL database</p>
        
        <TableSelector 
          selectedTable={selectedTable}
          onSelectTable={handleTableChange}
        />
        
        {/* Only show filters for product tables */}
        {(selectedTable === 'product_summary' || selectedTable === 'products') && (
          <>
            <h3>Filters</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onPressEnter={handleSearch}
                  style={{ width: '100%' }}
                  suffix={<Button type="text" icon={<SearchOutlined />} onClick={handleSearch} />}
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
        
        <div style={{ margin: '24px 0', padding: '16px', background: '#f0f2f5', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
          <h3>Database Integration</h3>
          <p>This component connects to PostgreSQL database with:</p>
          <ul>
            <li>Dynamic table selection</li>
            <li>Automatic schema detection</li>
            <li>CRUD operations</li>
            <li>Filtering and search</li>
          </ul>
        </div>
      </Sider>
      
      <Content style={{ padding: '20px 24px' }}>
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
      </Content>
    </Layout>
  );
};

export default DataTableExample;