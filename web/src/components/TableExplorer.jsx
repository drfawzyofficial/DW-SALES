import { useState, useEffect } from 'react'
import './TableExplorer.css'

const API_BASE = 'http://localhost:5001/api'

const TABLE_INFO = {
  dim_customers: { icon: '👥', color: 'emerald', type: 'Dimension' },
  dim_products: { icon: '🛍️', color: 'purple', type: 'Dimension' },
  dim_date: { icon: '📅', color: 'amber', type: 'Dimension' },
  fact_sales: { icon: '📦', color: 'blue', type: 'Fact' },
}

function TableExplorer() {
  const [selectedTable, setSelectedTable] = useState('fact_sales')
  const [schema, setSchema] = useState(null)
  const [sampleData, setSampleData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/schema`)
      .then(r => r.json())
      .then(data => {
        setSchema(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/sample/${selectedTable}`)
      .then(r => r.json())
      .then(data => {
        setSampleData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedTable])

  const info = TABLE_INFO[selectedTable]
  const tableSchema = schema?.[selectedTable]

  return (
    <div className="table-explorer">
      <h2 className="section-title">🗄️ Data Explorer</h2>
      <p className="section-subtitle">
        Browse the actual data stored in PostgreSQL. Select a table below to see its schema and sample rows.
      </p>

      {/* Table Selector */}
      <div className="table-selector">
        {Object.entries(TABLE_INFO).map(([name, t]) => (
          <button
            key={name}
            className={`table-select-btn ${selectedTable === name ? 'active' : ''} ts-${t.color}`}
            onClick={() => setSelectedTable(name)}
            id={`explore-${name}`}
          >
            <span className="ts-icon">{t.icon}</span>
            <div className="ts-info">
              <span className="ts-name">{name}</span>
              <span className="ts-type">{t.type}</span>
            </div>
            {schema && (
              <span className="ts-count">{schema[name]?.row_count} rows</span>
            )}
          </button>
        ))}
      </div>

      {/* Schema Info */}
      {tableSchema && (
        <div className={`explorer-card card explorer-${info.color}`}>
          <h3 className="card-title">
            <span>{info.icon}</span>
            {selectedTable}
            <span className={`badge badge-${info.color}`}>{info.type}</span>
            <span className="row-count-badge">{tableSchema.row_count} rows</span>
          </h3>

          <h4 className="explorer-subtitle">📋 Table Schema</h4>
          <div className="schema-chips">
            {tableSchema.columns.map(col => (
              <div key={col.column_name} className="schema-chip">
                <span className="chip-name">{col.column_name}</span>
                <span className="chip-type">{col.data_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Data */}
      <div className="card">
        <h3 className="card-title">🔍 Sample Data (first 10 rows)</h3>
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            Loading...
          </div>
        ) : sampleData.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(sampleData[0]).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val !== null ? String(val) : <span className="null-val">NULL</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No data available. Run the ETL pipeline first.</p>
        )}
      </div>
    </div>
  )
}

export default TableExplorer
