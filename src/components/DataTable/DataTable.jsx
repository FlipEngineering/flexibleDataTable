import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Input, Select, Checkbox, Modal, Form, 
  Space, Tooltip, message 
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, PlusOutlined, 
  ArrowUpOutlined, ArrowDownOutlined, SearchOutlined 
} from '@ant-design/icons';
import './DataTable.css';

const DataTable = ({ 
  tableName = 'Data Table',
  dataSource: initialData = [],
  columns: initialColumns = [],
  onSave,
  onDelete,
  onAdd,
  onUpdate,
  formulaEnabled = true
}) => {
  const [dataSource, setDataSource] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({});

  useEffect(() => {
    // Add key to each data item if not present
    const dataWithKeys = initialData.map((item, index) => ({
      ...item,
      key: item.key || item.id || index.toString(),
    }));
    setDataSource(dataWithKeys);

    // Set up columns with sorting, filtering and render functions
    const processedColumns = processColumns(initialColumns);
    setColumns(processedColumns);
  }, [initialData, initialColumns]);

  // Process column definitions to add filtering, sorting and render functions
  const processColumns = (cols) => {
    return cols.map(column => {
      const baseColumn = {
        ...column,
        title: column.title,
        dataIndex: column.dataIndex,
        key: column.dataIndex,
        sorter: (a, b) => {
          if (typeof a[column.dataIndex] === 'number') {
            return a[column.dataIndex] - b[column.dataIndex];
          }
          return (a[column.dataIndex] || '').localeCompare(b[column.dataIndex] || '');
        },
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder={`Search ${column.title}`}
              value={selectedKeys[0]}
              onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
              onPressEnter={() => confirm()}
              style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                icon={<SearchOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
              <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
                Reset
              </Button>
            </Space>
          </div>
        ),
        onFilter: (value, record) => {
          const cellValue = record[column.dataIndex];
          return cellValue
            ? cellValue.toString().toLowerCase().includes(value.toLowerCase())
            : false;
        },
        filterIcon: filtered => (
          <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
        ),
      };
      
      // Add custom render based on column type
      switch (column.type) {
        case 'number':
          return {
            ...baseColumn,
            render: (text) => <span>{text}</span>,
          };
        case 'select':
          return {
            ...baseColumn,
            render: (text) => <span>{text}</span>,
          };
        case 'checkbox':
          return {
            ...baseColumn,
            render: (checked) => <Checkbox checked={checked} disabled />,
          };
        case 'formula':
          return {
            ...baseColumn,
            render: (text, record) => {
              if (!formulaEnabled) return <span>{text}</span>;
              try {
                // This is a simple example of formula evaluation
                // In a real app, you would use a more robust formula parser
                const formula = column.formula || '';
                if (!formula) return <span>{text}</span>;
                
                // Example: =SUM(field1,field2)
                if (formula.startsWith('=SUM(') && formula.endsWith(')')) {
                  const fields = formula.substring(5, formula.length - 1).split(',');
                  const sum = fields.reduce((acc, field) => {
                    const value = parseFloat(record[field.trim()]) || 0;
                    return acc + value;
                  }, 0);
                  return <span>{sum}</span>;
                }
                
                return <span>{text}</span>;
              } catch (e) {
                console.error('Formula evaluation error:', e);
                return <span>Error</span>;
              }
            },
          };
        default:
          return {
            ...baseColumn,
            render: (text) => <span>{text}</span>,
          };
      }
    }).concat({
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              type="link"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              icon={<DeleteOutlined />}
              onClick={() => showDeleteConfirm(record)}
              type="link"
              danger
            />
          </Tooltip>
        </Space>
      ),
    });
  };

  const moveRow = (direction) => {
    if (selectedRowKeys.length !== 1) {
      message.warning('Please select exactly one row to move');
      return;
    }

    const selectedKey = selectedRowKeys[0];
    const index = dataSource.findIndex(item => item.key === selectedKey);
    
    if (index === -1) return;
    
    let newIndex;
    if (direction === 'up' && index > 0) {
      newIndex = index - 1;
    } else if (direction === 'down' && index < dataSource.length - 1) {
      newIndex = index + 1;
    } else {
      return;
    }
    
    const newData = [...dataSource];
    const item = newData.splice(index, 1)[0];
    newData.splice(newIndex, 0, item);
    
    setDataSource(newData);
    if (onUpdate) {
      onUpdate(newData);
    }
  };

  const showDeleteConfirm = (record) => {
    setCurrentRecord(record);
    setIsDeleteModalVisible(true);
  };

  const handleDelete = () => {
    const newData = dataSource.filter(item => item.key !== currentRecord.key);
    setDataSource(newData);
    setIsDeleteModalVisible(false);
    
    if (onDelete) {
      onDelete(currentRecord.key, newData);
    }
    
    message.success('Record deleted successfully');
  };

  const handleEdit = (record) => {
    setCurrentRecord(record);
    form.setFieldsValue(record);
    setIsEditModalVisible(true);
  };

  const handleEditSave = () => {
    form.validateFields().then(values => {
      const newData = dataSource.map(item => {
        if (item.key === currentRecord.key) {
          return { ...item, ...values };
        }
        return item;
      });
      
      setDataSource(newData);
      setIsEditModalVisible(false);
      
      if (onSave) {
        onSave(values, currentRecord.key, newData);
      }
      
      message.success('Record updated successfully');
    });
  };

  const showAddModal = () => {
    form.resetFields();
    setIsAddModalVisible(true);
  };

  const handleAddSave = () => {
    form.validateFields().then(values => {
      const newKey = Date.now().toString();
      const newRecord = {
        ...values,
        key: newKey,
      };
      
      const newData = [...dataSource, newRecord];
      setDataSource(newData);
      setIsAddModalVisible(false);
      
      if (onAdd) {
        onAdd(newRecord, newData);
      }
      
      message.success('Record added successfully');
    });
  };

  const renderFormItem = (column) => {
    switch (column.type) {
      case 'number':
        return <Form.Item 
          name={column.dataIndex}
          label={column.title}
          rules={[{ required: column.required }]}
        >
          <Input type="number" />
        </Form.Item>;
        
      case 'select':
        return <Form.Item 
          name={column.dataIndex}
          label={column.title}
          rules={[{ required: column.required }]}
        >
          <Select>
            {(column.options || []).map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>;
        
      case 'checkbox':
        return <Form.Item 
          name={column.dataIndex}
          label={column.title}
          valuePropName="checked"
          rules={[{ required: column.required }]}
        >
          <Checkbox />
        </Form.Item>;
        
      default:
        return <Form.Item 
          name={column.dataIndex}
          label={column.title}
          rules={[{ required: column.required }]}
        >
          <Input />
        </Form.Item>;
    }
  };

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h2>{tableName}</h2>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={showAddModal}
          >
            Add New
          </Button>
        </Space>
      </div>
      
      <div className="data-table-actions">
        <Space>
          <Button 
            icon={<ArrowUpOutlined />} 
            onClick={() => moveRow('up')}
            disabled={selectedRowKeys.length !== 1}
          >
            Move Up
          </Button>
          <Button 
            icon={<ArrowDownOutlined />} 
            onClick={() => moveRow('down')}
            disabled={selectedRowKeys.length !== 1}
          >
            Move Down
          </Button>
        </Space>
      </div>
      
      <Table
        rowSelection={{
          type: 'radio',
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        columns={columns}
        dataSource={dataSource}
        pagination={{ pageSize: 10 }}
        // Remove horizontal scrolling to use full width
        bordered
        size="middle"
      />
      
      {/* Delete Confirmation Modal */}
      <Modal
        title="Confirm Delete"
        open={isDeleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="Yes, Delete"
        cancelText="Cancel"
      >
        <p>Are you sure you want to delete this record?</p>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        title="Edit Record"
        open={isEditModalVisible}
        onOk={handleEditSave}
        onCancel={() => setIsEditModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          {columns
            .filter(col => col.key !== 'actions')
            .map(column => renderFormItem(column))}
        </Form>
      </Modal>
      
      {/* Add New Modal */}
      <Modal
        title="Add New Record"
        open={isAddModalVisible}
        onOk={handleAddSave}
        onCancel={() => setIsAddModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          {columns
            .filter(col => col.key !== 'actions')
            .map(column => renderFormItem(column))}
        </Form>
      </Modal>
    </div>
  );
};

export default DataTable;