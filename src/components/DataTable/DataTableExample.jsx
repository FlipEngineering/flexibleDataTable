import React, { useState, useEffect } from 'react';
import { Input, Select, Button, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import DataTable from './DataTable';
import { 
  fetchProducts, 
  searchProducts, 
  getProductColumns, 
  saveProduct, 
  deleteProduct,
  fetchCategories 
} from './DatabaseConnector';

const { Option } = Select;

const DataTableExample = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  
  // Get the column definitions from our database connector
  const columns = getProductColumns();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load categories for filtering
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
        
        // Load products
        const productsData = await fetchProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter products when category or status changes
  useEffect(() => {
    const applyFilters = async () => {
      setLoading(true);
      try {
        const filters = {};
        if (selectedCategory) filters.category_id = selectedCategory;
        if (selectedStatus) filters.status = selectedStatus;
        
        const filteredProducts = await fetchProducts(filters);
        setProducts(filteredProducts);
      } catch (error) {
        console.error('Error applying filters:', error);
        message.error('Failed to filter products');
      } finally {
        setLoading(false);
      }
    };
    
    applyFilters();
  }, [selectedCategory, selectedStatus]);

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If search is cleared, reset to all products
      const productsData = await fetchProducts();
      setProducts(productsData);
      return;
    }
    
    setLoading(true);
    try {
      const results = await searchProducts(searchTerm);
      setProducts(results);
    } catch (error) {
      console.error('Error searching products:', error);
      message.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Event handlers for DataTable
  const handleSave = async (values, key, newData) => {
    try {
      // Find the product to update
      const product = products.find(p => p.key === key);
      if (!product) return;
      
      // Update the product in database
      await saveProduct({ ...product, ...values }, false);
      message.success('Product updated successfully');
      
      // Update local state
      setProducts(newData);
    } catch (error) {
      console.error('Error updating product:', error);
      message.error('Failed to update product');
    }
  };

  const handleDelete = async (key, newData) => {
    try {
      // Find the product to delete
      const product = products.find(p => p.key === key);
      if (!product) return;
      
      // Delete from database
      await deleteProduct(product.id);
      message.success('Product deleted successfully');
      
      // Update local state
      setProducts(newData);
    } catch (error) {
      console.error('Error deleting product:', error);
      message.error('Failed to delete product');
    }
  };

  const handleAdd = async (record, newData) => {
    try {
      // Add to database
      await saveProduct(record, true);
      message.success('Product added successfully');
      
      // Update local state
      setProducts(newData);
    } catch (error) {
      console.error('Error adding product:', error);
      message.error('Failed to add product');
    }
  };

  return (
    <div>
      <h1>Inventory Management System</h1>
      <p>This table displays your real-time inventory data from PostgreSQL database.</p>
      
      {/* Filters and Search */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 250 }}
          suffix={<Button type="text" icon={<SearchOutlined />} onClick={handleSearch} />}
        />
        
        <Select
          placeholder="Filter by Category"
          allowClear
          style={{ width: 200 }}
          onChange={value => setSelectedCategory(value)}
          value={selectedCategory}
        >
          {categories.map(category => (
            <Option key={category.id} value={category.id}>{category.name}</Option>
          ))}
        </Select>
        
        <Select
          placeholder="Filter by Status"
          allowClear
          style={{ width: 200 }}
          onChange={value => setSelectedStatus(value)}
          value={selectedStatus}
        >
          <Option value="active">Active</Option>
          <Option value="discontinued">Discontinued</Option>
          <Option value="out_of_stock">Out of Stock</Option>
          <Option value="backordered">Backordered</Option>
        </Select>
      </div>
      
      <DataTable
        tableName="Inventory Products"
        columns={columns}
        dataSource={products.map(product => ({ ...product, key: product.id }))}
        onSave={handleSave}
        onDelete={handleDelete}
        onAdd={handleAdd}
        loading={loading}
        formulaEnabled={true}
      />
      
      <div style={{ margin: '24px 0', padding: '16px', background: '#f0f2f5', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
        <h3>Database Integration:</h3>
        <p>This table is now connected to our PostgreSQL database on Supabase with:</p>
        <ul>
          <li>Live data from the <code>inventory.product_summary</code> view</li>
          <li>CRUD operations for inventory management</li>
          <li>Global search using our custom <code>search_products</code> function</li>
          <li>Category and status filtering</li>
        </ul>
      </div>
    </div>
  );
};

export default DataTableExample;