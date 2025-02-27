import React from 'react';
import { DataTableExample } from './components/DataTable';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>React Dynamic DataTable Demo</h1>
        <p>A flexible table component with SQL database integration</p>
      </header>
      <main className="App-main">
        <DataTableExample />
      </main>
      <footer className="App-footer">
        <p>© 2025 - Dynamic DataTable Component</p>
      </footer>
    </div>
  );
}

export default App;