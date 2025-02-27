/**
 * Database connector for the Supabase PostgreSQL database
 * This file handles all database interactions for the inventory management system
 */

// Import the Supabase client in a real implementation
// import { createClient } from '@supabase/supabase-js';

// For secure connection on GitHub Pages:
// 1. In a real implementation, we'd get these from environment variables
// 2. For GitHub Pages (static hosting), we need an alternative approach

/**
 * This function safely initializes the Supabase client without exposing keys in the repository
 * For GitHub Pages, you would:
 * 1. Set up environment variables in your CI/CD pipeline
 * 2. Or use runtime configuration loaded at startup
 * 3. Never directly embed the API key in your code
 * 
 * For local development:
 * - Use .env files and environment variables
 * - Add .env to .gitignore
 */
const getSupabaseClient = () => {
  // For production with GitHub Pages, use a configuration approach:
  // 1. During build, replace these placeholders with actual values using environment variables
  // 2. Or load configuration at runtime from a secure API endpoint
  // 3. Or use a GitHub Pages compatible solution like Netlify or Vercel environment variables
  
  // If using the actual client:
  // const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  // const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  // return createClient(supabaseUrl, supabaseKey);
  
  // For now, use our mock implementation
  return mockSupabase;
};

// Since we can't install the package in this environment, we'll simulate the client
const mockSupabase = {
  from: (table) => ({
    select: (columns = '*') => ({
      eq: (column, value) => ({
        order: (column, { ascending }) => ({
          then: (callback) => {
            console.log(`Querying ${table} with filter ${column}=${value}`);
            return mockData[table] ? callback({ data: mockData[table], error: null }) : callback({ data: [], error: null });
          }
        }),
        then: (callback) => {
          console.log(`Querying ${table} with filter ${column}=${value}`);
          const filteredData = mockData[table] ? 
            mockData[table].filter(row => row[column] === value) : 
            [];
          return callback({ data: filteredData, error: null });
        }
      }),
      ilike: (column, value) => ({
        then: (callback) => {
          console.log(`Querying ${table} with ILIKE filter ${column} ILIKE %${value}%`);
          const filteredData = mockData[table] ? 
            mockData[table].filter(row => String(row[column]).toLowerCase().includes(value.toLowerCase())) : 
            [];
          return callback({ data: filteredData, error: null });
        }
      }),
      order: (column, { ascending }) => ({
        then: (callback) => {
          console.log(`Querying ${table} ordered by ${column} ${ascending ? 'ASC' : 'DESC'}`);
          return mockData[table] ? callback({ data: mockData[table], error: null }) : callback({ data: [], error: null });
        }
      }),
      then: (callback) => {
        console.log(`Querying all data from ${table}`);
        return mockData[table] ? callback({ data: mockData[table], error: null }) : callback({ data: [], error: null });
      }
    }),
    insert: (data) => ({
      then: (callback) => {
        console.log(`Inserting data into ${table}`, data);
        return callback({ data, error: null });
      }
    }),
    update: (data) => ({
      eq: (column, value) => ({
        then: (callback) => {
          console.log(`Updating ${table} where ${column}=${value}`, data);
          return callback({ data, error: null });
        }
      })
    }),
    delete: () => ({
      eq: (column, value) => ({
        then: (callback) => {
          console.log(`Deleting from ${table} where ${column}=${value}`);
          return callback({ data: null, error: null });
        }
      })
    }),
    rpc: (functionName, params) => ({
      then: (callback) => {
        console.log(`Calling RPC function ${functionName} with params`, params);
        if (functionName === 'search_products') {
          const results = mockData.product_summary ? 
            mockData.product_summary.filter(p => 
              Object.values(p).some(val => 
                val && String(val).toLowerCase().includes(params.search_term.toLowerCase())
              )
            ) : [];
          return callback({ data: results, error: null });
        }
        return callback({ data: [], error: null });
      }
    })
  })
};

// Mock data for our tables
const mockData = {
  categories: [
    { id: 1, name: 'Electronics', description: 'Electronic devices and accessories' },
    { id: 2, name: 'Office Supplies', description: 'Office stationary and supplies' },
    { id: 3, name: 'Furniture', description: 'Office and home furniture' },
    { id: 4, name: 'Kitchen', description: 'Kitchen appliances and utensils' },
    { id: 5, name: 'Books', description: 'Books and publications' }
  ],
  products: [
    { id: 1, category_id: 1, sku: 'E-LAPTOP-001', name: 'Business Laptop', description: '15-inch business laptop with 16GB RAM', price: 1299.99, cost: 950.00, quantity: 25, reorder_level: 5, status: 'active' },
    { id: 2, category_id: 1, sku: 'E-PHONE-002', name: 'Smartphone X', description: 'Latest smartphone model with dual camera', price: 899.99, cost: 650.00, quantity: 42, reorder_level: 10, status: 'active' },
    // Additional products would be here
  ],
  product_summary: [
    { id: 1, sku: 'E-LAPTOP-001', name: 'Business Laptop', description: '15-inch business laptop with 16GB RAM', category: 'Electronics', price: 1299.99, cost: 950.00, quantity: 25, reorder_level: 5, status: 'active', profit_margin: 349.99, needs_reorder: false },
    { id: 2, sku: 'E-PHONE-002', name: 'Smartphone X', description: 'Latest smartphone model with dual camera', category: 'Electronics', price: 899.99, cost: 650.00, quantity: 42, reorder_level: 10, status: 'active', profit_margin: 249.99, needs_reorder: false },
    // More product summaries would be here
  ]
};

// Get the Supabase client using our secure function
const supabase = getSupabaseClient();

/**
 * Fetches product categories from the database
 * @returns {Promise<Array>} - Category data
 */
export const fetchCategories = async () => {
  const { data, error } = await supabase
    .from('inventory.categories')
    .select('*')
    .order('name', { ascending: true });
    
  if (error) throw error;
  return data;
};

/**
 * Fetches products from the database
 * @param {Object} filters - Optional filters for products
 * @param {string} orderBy - Column to order by
 * @param {boolean} ascending - Order direction
 * @returns {Promise<Array>} - Product data
 */
export const fetchProducts = async (filters = {}, orderBy = 'name', ascending = true) => {
  // Start building query
  let query = supabase
    .from('inventory.product_summary')
    .select('*');
    
  // Apply filters if provided
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  // Apply ordering
  query = query.order(orderBy, { ascending });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
};

/**
 * Searches products across multiple fields
 * @param {string} searchTerm - Term to search for
 * @returns {Promise<Array>} - Search results
 */
export const searchProducts = async (searchTerm) => {
  const { data, error } = await supabase
    .rpc('search_products', { search_term: searchTerm });
    
  if (error) throw error;
  return data;
};

/**
 * Fetches product schema/columns for the DataTable
 * @returns {Array} - Column definitions
 */
export const getProductColumns = () => {
  return [
    {
      title: 'SKU',
      dataIndex: 'sku',
      type: 'text',
      required: true,
      sorter: true,
      filterable: true,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      type: 'text',
      required: true,
      sorter: true,
      filterable: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      type: 'text',
      required: true,
      sorter: true,
      filterable: true,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      type: 'number',
      required: true,
      sorter: true,
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      type: 'number',
      required: false,
      sorter: true,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      type: 'number',
      required: true,
      sorter: true,
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorder_level',
      type: 'number',
      required: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      type: 'select',
      required: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'discontinued', label: 'Discontinued' },
        { value: 'out_of_stock', label: 'Out of Stock' },
        { value: 'backordered', label: 'Backordered' }
      ],
      sorter: true,
      filterable: true,
    },
    {
      title: 'Profit Margin',
      dataIndex: 'profit_margin',
      type: 'number',
      readOnly: true,
      sorter: true,
    },
    {
      title: 'Needs Reorder',
      dataIndex: 'needs_reorder',
      type: 'checkbox',
      readOnly: true,
    }
  ];
};

/**
 * Saves a product to the database (insert or update)
 * @param {Object} product - Product data
 * @param {boolean} isNew - Whether this is a new product or an update
 * @returns {Promise<Object>} - Saved product
 */
export const saveProduct = async (product, isNew = false) => {
  if (isNew) {
    const { data, error } = await supabase
      .from('inventory.products')
      .insert(product);
      
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('inventory.products')
      .update(product)
      .eq('id', product.id);
      
    if (error) throw error;
    return data;
  }
};

/**
 * Deletes a product from the database
 * @param {number} id - Product ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteProduct = async (id) => {
  const { error } = await supabase
    .from('inventory.products')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
};

/**
 * Fetches transactions for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} - Transaction data
 */
export const fetchProductTransactions = async (productId) => {
  const { data, error } = await supabase
    .from('inventory.transactions')
    .select('*')
    .eq('product_id', productId)
    .order('transaction_date', { ascending: false });
    
  if (error) throw error;
  return data;
};

/**
 * Records a new inventory transaction
 * @param {Object} transaction - Transaction data
 * @returns {Promise<Object>} - Saved transaction
 */
export const recordTransaction = async (transaction) => {
  const { data, error } = await supabase
    .from('inventory.transactions')
    .insert(transaction);
    
  if (error) throw error;
  return data;
};

export default {
  fetchCategories,
  fetchProducts,
  searchProducts,
  getProductColumns,
  saveProduct,
  deleteProduct,
  fetchProductTransactions,
  recordTransaction
};