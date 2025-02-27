import React from 'react';
import { DataTableExample } from './components/DataTable';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>SQL Explorer with FlexibleDataTable</h1>
        <p>A database management interface with dynamic table selection and CRUD operations</p>
      </header>
      <main className="App-main">
        <DataTableExample />
      </main>
      <footer className="App-footer">
        <p>© 2025 - FlipEngineering - FlexibleDataTable is open source and MIT licensed</p>
      </footer>
    </div>
  );
}

export default App;