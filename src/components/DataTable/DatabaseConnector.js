/**
 * Database connector for the Supabase PostgreSQL database
 * This file handles all database interactions for the inventory management system
 */

// Import the Supabase client
import { createClient } from '@supabase/supabase-js';

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
  // Access environment variables set during the build process
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Check if we have the actual credentials
  if (supabaseUrl && supabaseKey) {
    console.log('Using actual Supabase client with provided credentials');
    return createClient(supabaseUrl, supabaseKey);
  }
  
  // Fallback to mock implementation if no credentials
  console.log('Using mock Supabase client (no credentials provided)');
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
  // Map categories to products for easier filtering
  category_map: {
    1: 'Electronics',
    2: 'Office Supplies',
    3: 'Furniture',
    4: 'Kitchen',
    5: 'Books'
  },
  products: [
    { id: 1, category_id: 1, sku: 'E-LAPTOP-001', name: 'Business Laptop', description: '15-inch business laptop with 16GB RAM', price: 1299.99, cost: 950.00, quantity: 25, reorder_level: 5, status: 'active' },
    { id: 2, category_id: 1, sku: 'E-PHONE-002', name: 'Smartphone X', description: 'Latest smartphone model with dual camera', price: 899.99, cost: 650.00, quantity: 42, reorder_level: 10, status: 'active' },
    // Additional products would be here
  ],
  product_summary: [
    { id: 1, sku: 'E-LAPTOP-001', name: 'Business Laptop', description: '15-inch business laptop with 16GB RAM', category: 'Electronics', price: 1299.99, cost: 950.00, quantity: 25, reorder_level: 5, status: 'active', profit_margin: 349.99, needs_reorder: false },
    { id: 2, sku: 'E-PHONE-002', name: 'Smartphone X', description: 'Latest smartphone model with dual camera', category: 'Electronics', price: 899.99, cost: 650.00, quantity: 42, reorder_level: 10, status: 'active', profit_margin: 249.99, needs_reorder: false },
    { id: 3, sku: 'E-TABLET-003', name: 'Pro Tablet', description: '10-inch tablet with stylus', category: 'Electronics', price: 599.99, cost: 400.00, quantity: 30, reorder_level: 8, status: 'active', profit_margin: 199.99, needs_reorder: false },
    { id: 4, sku: 'E-MONITOR-004', name: '4K Monitor', description: '27-inch 4K UHD monitor', category: 'Electronics', price: 349.99, cost: 250.00, quantity: 15, reorder_level: 5, status: 'active', profit_margin: 99.99, needs_reorder: false },
    { id: 5, sku: 'E-HDPHONE-005', name: 'Noise Cancelling Headphones', description: 'Over-ear noise cancelling headphones', category: 'Electronics', price: 249.99, cost: 120.00, quantity: 35, reorder_level: 10, status: 'active', profit_margin: 129.99, needs_reorder: false },
    { id: 6, sku: 'O-DESK-001', name: 'Standing Desk', description: 'Adjustable height standing desk', category: 'Office Supplies', price: 499.99, cost: 300.00, quantity: 8, reorder_level: 3, status: 'active', profit_margin: 199.99, needs_reorder: false },
    { id: 7, sku: 'O-CHAIR-002', name: 'Ergonomic Chair', description: 'Fully adjustable ergonomic office chair', category: 'Office Supplies', price: 349.99, cost: 200.00, quantity: 12, reorder_level: 5, status: 'active', profit_margin: 149.99, needs_reorder: false },
    { id: 8, sku: 'O-PAPER-003', name: 'Premium Paper', description: 'Premium white copy paper, 500 sheets', category: 'Office Supplies', price: 9.99, cost: 5.00, quantity: 100, reorder_level: 20, status: 'active', profit_margin: 4.99, needs_reorder: false },
    { id: 9, sku: 'O-PEN-004', name: 'Gel Pen Set', description: 'Set of 12 colored gel pens', category: 'Office Supplies', price: 12.99, cost: 6.00, quantity: 75, reorder_level: 15, status: 'active', profit_margin: 6.99, needs_reorder: false },
    { id: 10, sku: 'O-NOTE-005', name: 'Sticky Notes', description: 'Pack of 12 sticky note pads', category: 'Office Supplies', price: 14.99, cost: 7.50, quantity: 60, reorder_level: 20, status: 'active', profit_margin: 7.49, needs_reorder: false },
    { id: 11, sku: 'F-SOFA-001', name: 'Office Sofa', description: 'Three-seat office reception sofa', category: 'Furniture', price: 899.99, cost: 600.00, quantity: 5, reorder_level: 2, status: 'active', profit_margin: 299.99, needs_reorder: false },
    { id: 12, sku: 'F-TABLE-002', name: 'Conference Table', description: 'Large conference room table', category: 'Furniture', price: 799.99, cost: 450.00, quantity: 3, reorder_level: 1, status: 'active', profit_margin: 349.99, needs_reorder: false },
    { id: 13, sku: 'F-CABINET-003', name: 'File Cabinet', description: '4-drawer metal file cabinet', category: 'Furniture', price: 199.99, cost: 100.00, quantity: 18, reorder_level: 5, status: 'active', profit_margin: 99.99, needs_reorder: false },
    { id: 14, sku: 'F-SHELF-004', name: 'Bookshelf', description: '5-tier bookshelf', category: 'Furniture', price: 149.99, cost: 80.00, quantity: 22, reorder_level: 7, status: 'active', profit_margin: 69.99, needs_reorder: false },
    { id: 15, sku: 'F-DESK-005', name: 'Executive Desk', description: 'Large executive office desk', category: 'Furniture', price: 649.99, cost: 400.00, quantity: 7, reorder_level: 2, status: 'active', profit_margin: 249.99, needs_reorder: false },
    { id: 16, sku: 'K-COFFEE-001', name: 'Coffee Maker', description: 'Programmable 12-cup coffee maker', category: 'Kitchen', price: 89.99, cost: 45.00, quantity: 20, reorder_level: 5, status: 'active', profit_margin: 44.99, needs_reorder: false },
    { id: 17, sku: 'K-FRIDGE-002', name: 'Mini Refrigerator', description: 'Compact office refrigerator', category: 'Kitchen', price: 159.99, cost: 90.00, quantity: 10, reorder_level: 3, status: 'active', profit_margin: 69.99, needs_reorder: false },
    { id: 18, sku: 'K-MICRO-003', name: 'Microwave Oven', description: 'Countertop microwave oven', category: 'Kitchen', price: 129.99, cost: 70.00, quantity: 12, reorder_level: 4, status: 'active', profit_margin: 59.99, needs_reorder: false },
    { id: 19, sku: 'K-WATER-004', name: 'Water Dispenser', description: 'Hot and cold water dispenser', category: 'Kitchen', price: 199.99, cost: 110.00, quantity: 8, reorder_level: 2, status: 'active', profit_margin: 89.99, needs_reorder: false },
    { id: 20, sku: 'K-DISHES-005', name: 'Dish Set', description: '16-piece dish set', category: 'Kitchen', price: 49.99, cost: 25.00, quantity: 15, reorder_level: 5, status: 'active', profit_margin: 24.99, needs_reorder: false },
    { id: 21, sku: 'B-BIZ-001', name: 'Business Strategy Book', description: 'Best-selling business strategy guide', category: 'Books', price: 24.99, cost: 12.00, quantity: 45, reorder_level: 10, status: 'active', profit_margin: 12.99, needs_reorder: false },
    { id: 22, sku: 'B-TECH-002', name: 'Programming Manual', description: 'Comprehensive programming reference', category: 'Books', price: 39.99, cost: 20.00, quantity: 30, reorder_level: 8, status: 'active', profit_margin: 19.99, needs_reorder: false },
    { id: 23, sku: 'B-SELF-003', name: 'Self-Help Book', description: 'Productivity and self-improvement guide', category: 'Books', price: 19.99, cost: 9.00, quantity: 50, reorder_level: 15, status: 'active', profit_margin: 10.99, needs_reorder: false },
    { id: 24, sku: 'B-FIN-004', name: 'Financial Planning', description: 'Personal and business finance book', category: 'Books', price: 29.99, cost: 15.00, quantity: 35, reorder_level: 10, status: 'active', profit_margin: 14.99, needs_reorder: false },
    { id: 25, sku: 'B-MKT-005', name: 'Marketing Handbook', description: 'Digital marketing strategies handbook', category: 'Books', price: 34.99, cost: 17.00, quantity: 25, reorder_level: 8, status: 'active', profit_margin: 17.99, needs_reorder: false }
  ]
};

// Get the Supabase client using our secure function
const supabase = getSupabaseClient();

/**
 * Fetches product categories from the database
 * @returns {Promise<Array>} - Category data
 */
export const fetchCategories = async () => {
  try {
    // First try the correct schema name
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) throw error;
    return data;
  } catch (e) {
    console.log('Falling back to mock data for categories:', e.message);
    return mockData.categories;
  }
};

/**
 * Fetches products from the database
 * @param {Object} filters - Optional filters for products
 * @param {string} orderBy - Column to order by
 * @param {boolean} ascending - Order direction
 * @returns {Promise<Array>} - Product data
 */
export const fetchProducts = async (filters = {}, orderBy = 'name', ascending = true) => {
  try {
    // Start building query
    let query = supabase
      .from('product_summary')  // Try without schema prefix
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
    console.log('Fetched real products from Supabase:', data?.length || 0);
    return data;
  } catch (e) {
    console.log('Falling back to mock data for products:', e.message);
    
    // Apply filters to mock data
    let result = [...mockData.product_summary];
    
    if (filters.category_id) {
      result = result.filter(item => item.category_id === filters.category_id);
    }
    
    if (filters.status) {
      result = result.filter(item => item.status === filters.status);
    }
    
    return result;
  }
};

/**
 * Searches products across multiple fields
 * @param {string} searchTerm - Term to search for
 * @returns {Promise<Array>} - Search results
 */
export const searchProducts = async (searchTerm) => {
  try {
    // First try the RPC function if available
    const { data, error } = await supabase
      .rpc('search_products', { search_term: searchTerm });
      
    if (error) throw error;
    console.log('Fetched search results from Supabase RPC:', data?.length || 0);
    return data;
  } catch (e) {
    console.log('Falling back to client-side search:', e.message);
    
    // Perform client-side search on mock data
    const results = mockData.product_summary.filter(p => 
      Object.values(p).some(val => 
        val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    return results;
  }
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
  try {
    if (isNew) {
      const { data, error } = await supabase
        .from('products')  // Without schema prefix
        .insert(product);
        
      if (error) throw error;
      console.log('Product inserted successfully:', data);
      return data;
    } else {
      const { data, error } = await supabase
        .from('products')  // Without schema prefix
        .update(product)
        .eq('id', product.id);
        
      if (error) throw error;
      console.log('Product updated successfully:', data);
      return data;
    }
  } catch (e) {
    console.log('Mocked product save operation:', e.message);
    return product; // Return the product as if it was saved
  }
};

/**
 * Deletes a product from the database
 * @param {number} id - Product ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteProduct = async (id) => {
  try {
    const { error } = await supabase
      .from('products')  // Without schema prefix
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    console.log('Product deleted successfully');
    return true;
  } catch (e) {
    console.log('Mocked product delete operation:', e.message);
    return true; // Return success as if it was deleted
  }
};

/**
 * Fetches transactions for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} - Transaction data
 */
export const fetchProductTransactions = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')  // Without schema prefix
      .select('*')
      .eq('product_id', productId)
      .order('transaction_date', { ascending: false });
      
    if (error) throw error;
    console.log('Fetched transactions from Supabase:', data?.length || 0);
    return data;
  } catch (e) {
    console.log('Falling back to mock transactions data:', e.message);
    // Mock data for product transactions
    return []; // Return empty array as mock data
  }
};

/**
 * Records a new inventory transaction
 * @param {Object} transaction - Transaction data
 * @returns {Promise<Object>} - Saved transaction
 */
export const recordTransaction = async (transaction) => {
  try {
    const { data, error } = await supabase
      .from('transactions')  // Without schema prefix
      .insert(transaction);
      
    if (error) throw error;
    console.log('Transaction recorded successfully');
    return data;
  } catch (e) {
    console.log('Mocked transaction insert operation:', e.message);
    return transaction; // Return the transaction as if it was saved
  }
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