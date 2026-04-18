import { useState } from 'react'
import './StarSchema.css'

const TABLES = {
  fact_sales: {
    type: 'Fact',
    color: 'blue',
    icon: '📦',
    description: 'The central fact table stores measurable business events (sales transactions). Each row is one order with foreign keys linking to dimension tables.',
    columns: [
      { name: 'order_id', type: 'INTEGER', key: 'PK', desc: 'Unique order identifier' },
      { name: 'date_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_date' },
      { name: 'customer_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_customers' },
      { name: 'product_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_products' },
      { name: 'quantity', type: 'INTEGER', key: '', desc: 'Number of units sold' },
      { name: 'price', type: 'FLOAT', key: '', desc: 'Unit price at time of sale' },
      { name: 'total_amount', type: 'FLOAT', key: '', desc: 'quantity × price' },
    ],
  },
  dim_customers: {
    type: 'Dimension',
    color: 'emerald',
    icon: '👥',
    description: 'Stores descriptive attributes about customers. Enables analysis by customer name or country without duplicating this data in the fact table.',
    columns: [
      { name: 'customer_id', type: 'INTEGER', key: 'PK', desc: 'Unique customer identifier' },
      { name: 'customer_name', type: 'VARCHAR(100)', key: '', desc: 'Full name of customer' },
      { name: 'country', type: 'VARCHAR(50)', key: '', desc: 'Customer country' },
    ],
  },
  dim_products: {
    type: 'Dimension',
    color: 'purple',
    icon: '🛍️',
    description: 'Contains product details like name, category, and base price. Enables grouping and filtering by product attributes.',
    columns: [
      { name: 'product_id', type: 'INTEGER', key: 'PK', desc: 'Unique product identifier' },
      { name: 'product_name', type: 'VARCHAR(100)', key: '', desc: 'Name of the product' },
      { name: 'category', type: 'VARCHAR(50)', key: '', desc: 'Product category (Electronics, etc.)' },
      { name: 'price', type: 'FLOAT', key: '', desc: 'Base unit price' },
    ],
  },
  dim_date: {
    type: 'Dimension',
    color: 'amber',
    icon: '📅',
    description: 'Pre-computed date attributes for time-based analysis. Allows easy grouping by year, month, quarter, or day of week.',
    columns: [
      { name: 'date_id', type: 'INTEGER', key: 'PK', desc: 'Surrogate key' },
      { name: 'full_date', type: 'DATE', key: '', desc: 'Actual calendar date' },
      { name: 'year', type: 'INTEGER', key: '', desc: 'Year (2023, 2024)' },
      { name: 'month', type: 'INTEGER', key: '', desc: 'Month number (1-12)' },
      { name: 'day', type: 'INTEGER', key: '', desc: 'Day of month (1-31)' },
      { name: 'quarter', type: 'INTEGER', key: '', desc: 'Quarter (1-4)' },
      { name: 'day_of_week', type: 'VARCHAR(15)', key: '', desc: 'Day name (Monday, etc.)' },
    ],
  },
}

function StarSchema() {
  const [selectedTable, setSelectedTable] = useState('fact_sales')
  const table = TABLES[selectedTable]

  return (
    <div className="star-schema">
      <h2 className="section-title">⭐ Star Schema Design</h2>
      <p className="section-subtitle">
        A star schema organizes data into a central <strong>Fact Table</strong> surrounded by
        <strong> Dimension Tables</strong>. Click on any table to explore its structure.
      </p>

      {/* Visual Schema Diagram */}
      <div className="schema-diagram">
        <div className="schema-ring">
          {/* Dimension tables around the fact */}
          <button
            className={`schema-node dim-node dim-top ${selectedTable === 'dim_date' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_date')}
            id="schema-dim-date"
          >
            <span className="node-icon">📅</span>
            <span className="node-name">dim_date</span>
            <span className="node-badge">Dimension</span>
          </button>

          <button
            className={`schema-node dim-node dim-left ${selectedTable === 'dim_customers' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_customers')}
            id="schema-dim-customers"
          >
            <span className="node-icon">👥</span>
            <span className="node-name">dim_customers</span>
            <span className="node-badge">Dimension</span>
          </button>

          {/* Center fact table */}
          <button
            className={`schema-node fact-node ${selectedTable === 'fact_sales' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('fact_sales')}
            id="schema-fact-sales"
          >
            <span className="node-icon">📦</span>
            <span className="node-name">fact_sales</span>
            <span className="node-badge">Fact Table</span>
          </button>

          <button
            className={`schema-node dim-node dim-right ${selectedTable === 'dim_products' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_products')}
            id="schema-dim-products"
          >
            <span className="node-icon">🛍️</span>
            <span className="node-name">dim_products</span>
            <span className="node-badge">Dimension</span>
          </button>

          {/* Connection lines */}
          <svg className="schema-lines" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet">
            <line x1="300" y1="120" x2="300" y2="170" className="conn-line" />
            <line x1="155" y1="240" x2="220" y2="220" className="conn-line" />
            <line x1="445" y1="240" x2="380" y2="220" className="conn-line" />
          </svg>
        </div>
      </div>

      {/* Table Detail */}
      <div className={`table-detail card detail-${table.color}`}>
        <div className="detail-header">
          <div>
            <div className="detail-title">
              <span>{table.icon}</span>
              <span>{selectedTable}</span>
              <span className={`badge badge-${table.color}`}>{table.type}</span>
            </div>
            <p className="detail-desc">{table.description}</p>
          </div>
        </div>

        <div className="columns-table-wrap">
          <table className="columns-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Key</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col, i) => (
                <tr key={col.name} style={{ animationDelay: `${i * 0.05}s` }}>
                  <td className="col-name">{col.name}</td>
                  <td><code className="col-type">{col.type}</code></td>
                  <td>
                    {col.key && (
                      <span className={`key-badge ${col.key === 'PK' ? 'key-pk' : 'key-fk'}`}>
                        {col.key}
                      </span>
                    )}
                  </td>
                  <td className="col-desc">{col.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Concepts */}
      <div className="concepts-grid">
        <div className="concept-card">
          <h4>🔑 Primary Key (PK)</h4>
          <p>Uniquely identifies each row. Every table has one. Used for lookups and joins.</p>
        </div>
        <div className="concept-card">
          <h4>🔗 Foreign Key (FK)</h4>
          <p>References a PK in another table. The fact table uses FKs to link to dimensions.</p>
        </div>
        <div className="concept-card">
          <h4>📦 Fact Table</h4>
          <p>Stores measurable events (metrics). Contains numeric data + foreign keys. Usually the largest table.</p>
        </div>
        <div className="concept-card">
          <h4>📐 Dimension Table</h4>
          <p>Stores descriptive attributes (who, what, when, where). Used for filtering and grouping.</p>
        </div>
      </div>
    </div>
  )
}

export default StarSchema
