/**
 * SnowflakeSchema.jsx
 * --------------------
 * Educational component that teaches students about the Snowflake Schema design.
 *
 * What is a Snowflake Schema?
 * A snowflake schema is a variation of the star schema where dimension tables
 * are further NORMALIZED into sub-dimension tables. For example:
 *   - Star: dim_products has a "category" column (denormalized)
 *   - Snowflake: dim_products_sf has "category_id" → dim_categories has "category_name"
 *
 * This component provides:
 *   1. Interactive visual diagram showing the snowflake structure
 *   2. Detailed table definitions with column info
 *   3. Side-by-side comparison with star schema
 *   4. SQL query comparison showing the extra JOINs needed
 *   5. Pros/Cons educational cards
 */

import { useState, useEffect } from 'react'
import './SnowflakeSchema.css'

const API_BASE = 'http://localhost:5001/api'

// ── Table definitions for the Snowflake Schema ──────────────────────────────
// Each table entry describes its role, columns, and relationships.
// Students can click on any table to see its details.
const TABLES = {
  fact_sales_sf: {
    type: 'Fact',
    color: 'blue',
    icon: '📦',
    description: 'The central fact table — identical to the star schema version. It stores measurable sales events with foreign keys to dimension tables. In snowflake schema, the fact table itself does NOT change. The normalization only affects dimension tables.',
    columns: [
      { name: 'order_id', type: 'INTEGER', key: 'PK', desc: 'Unique order identifier' },
      { name: 'date_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_date' },
      { name: 'customer_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_customers_sf' },
      { name: 'product_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_products_sf' },
      { name: 'quantity', type: 'INTEGER', key: '', desc: 'Number of units sold' },
      { name: 'price', type: 'FLOAT', key: '', desc: 'Unit price at time of sale' },
      { name: 'total_amount', type: 'FLOAT', key: '', desc: 'quantity × price' },
    ],
  },
  dim_customers_sf: {
    type: 'Dimension',
    color: 'emerald',
    icon: '👥',
    description: 'Normalized customer dimension. Unlike the star schema version, the country column has been REPLACED with a country_id foreign key that references the dim_countries sub-dimension table. This eliminates storing the country name string repeatedly for each customer.',
    columns: [
      { name: 'customer_id', type: 'INTEGER', key: 'PK', desc: 'Unique customer identifier' },
      { name: 'customer_name', type: 'VARCHAR(100)', key: '', desc: 'Full name of customer' },
      { name: 'country_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_countries (was "country" string in star)' },
    ],
  },
  dim_products_sf: {
    type: 'Dimension',
    color: 'purple',
    icon: '🛍️',
    description: 'Normalized product dimension. The category column has been REPLACED with a category_id foreign key that references the dim_categories sub-dimension table. This means the category name is stored only once in dim_categories instead of being repeated for every product.',
    columns: [
      { name: 'product_id', type: 'INTEGER', key: 'PK', desc: 'Unique product identifier' },
      { name: 'product_name', type: 'VARCHAR(100)', key: '', desc: 'Name of the product' },
      { name: 'category_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_categories (was "category" string in star)' },
      { name: 'price', type: 'FLOAT', key: '', desc: 'Base unit price' },
    ],
  },
  dim_date: {
    type: 'Dimension',
    color: 'amber',
    icon: '📅',
    description: 'The date dimension is SHARED between star and snowflake schemas. It was already well-normalized in the star schema (no redundant data), so it does not need further normalization. This is common — not all dimensions need snowflaking.',
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
  dim_categories: {
    type: 'Sub-Dimension',
    color: 'rose',
    icon: '🏷️',
    description: 'Sub-dimension table extracted from dim_products. Each unique category (Electronics, Clothing, Home, etc.) is stored exactly ONCE with its own ID. dim_products_sf references this table via category_id. This is the "snowflaking" — normalizing attributes out of dimension tables.',
    columns: [
      { name: 'category_id', type: 'INTEGER', key: 'PK', desc: 'Unique category identifier' },
      { name: 'category_name', type: 'VARCHAR(50)', key: '', desc: 'Category name (Electronics, Clothing, etc.)' },
    ],
  },
  dim_countries: {
    type: 'Sub-Dimension',
    color: 'cyan',
    icon: '🌍',
    description: 'Sub-dimension table extracted from dim_customers. Each unique country (Egypt, Saudi Arabia, UAE, etc.) is stored exactly ONCE with its own ID. dim_customers_sf references this table via country_id. In star schema, the country string was repeated for every customer from that country.',
    columns: [
      { name: 'country_id', type: 'INTEGER', key: 'PK', desc: 'Unique country identifier' },
      { name: 'country_name', type: 'VARCHAR(50)', key: '', desc: 'Country name (Egypt, UAE, etc.)' },
    ],
  },
}

// ── SQL comparison data showing star vs snowflake queries ────────────────────
const SQL_COMPARISONS = [
  {
    title: 'Sales by Country',
    star: {
      joins: 1,
      sql: `SELECT c.country, COUNT(f.order_id), SUM(f.total_amount)
FROM fact_sales f
JOIN dim_customers c
  ON f.customer_id = c.customer_id
GROUP BY c.country;`,
      explanation: 'Only 1 JOIN needed — country is directly in dim_customers.',
    },
    snowflake: {
      joins: 2,
      sql: `SELECT co.country_name, COUNT(f.order_id), SUM(f.total_amount)
FROM fact_sales_sf f
JOIN dim_customers_sf c
  ON f.customer_id = c.customer_id
JOIN dim_countries co
  ON c.country_id = co.country_id
GROUP BY co.country_name;`,
      explanation: '2 JOINs needed — must go through dim_customers_sf → dim_countries to get country name.',
    },
  },
  {
    title: 'Products by Category',
    star: {
      joins: 1,
      sql: `SELECT p.product_name, p.category, SUM(f.total_amount)
FROM fact_sales f
JOIN dim_products p
  ON f.product_id = p.product_id
GROUP BY p.product_name, p.category;`,
      explanation: 'Only 1 JOIN needed — category is directly in dim_products.',
    },
    snowflake: {
      joins: 2,
      sql: `SELECT p.product_name, cat.category_name, SUM(f.total_amount)
FROM fact_sales_sf f
JOIN dim_products_sf p
  ON f.product_id = p.product_id
JOIN dim_categories cat
  ON p.category_id = cat.category_id
GROUP BY p.product_name, cat.category_name;`,
      explanation: '2 JOINs needed — must go through dim_products_sf → dim_categories to get category name.',
    },
  },
]

function SnowflakeSchema() {
  const [selectedTable, setSelectedTable] = useState('fact_sales_sf')
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeComparison, setActiveComparison] = useState(0)

  const table = TABLES[selectedTable]

  // Fetch comparison data from API
  useEffect(() => {
    fetch(`${API_BASE}/snowflake-comparison`)
      .then(r => r.json())
      .then(data => {
        setComparison(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="snowflake-schema">
      <h2 className="section-title">❄️ Snowflake Schema Design</h2>
      <p className="section-subtitle">
        A snowflake schema <strong>further normalizes</strong> dimension tables from the star schema.
        Descriptive attributes like <em>country</em> and <em>category</em> are extracted into
        <strong> sub-dimension tables</strong>, reducing data redundancy at the cost of more JOINs.
      </p>

      {/* ── Visual Schema Diagram ──────────────────────────────────────── */}
      <div className="sf-diagram">
        <div className="sf-diagram-inner">
          {/* Sub-dimensions (outer ring) */}
          <button
            className={`sf-node sf-sub-node sf-sub-top-left ${selectedTable === 'dim_countries' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_countries')}
            id="sf-dim-countries"
          >
            <span className="node-icon">🌍</span>
            <span className="node-name">dim_countries</span>
            <span className="node-badge sub-badge">Sub-Dim</span>
          </button>

          <button
            className={`sf-node sf-sub-node sf-sub-top-right ${selectedTable === 'dim_categories' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_categories')}
            id="sf-dim-categories"
          >
            <span className="node-icon">🏷️</span>
            <span className="node-name">dim_categories</span>
            <span className="node-badge sub-badge">Sub-Dim</span>
          </button>

          {/* Main dimensions (middle ring) */}
          <button
            className={`sf-node sf-dim-node sf-dim-left ${selectedTable === 'dim_customers_sf' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_customers_sf')}
            id="sf-dim-customers"
          >
            <span className="node-icon">👥</span>
            <span className="node-name">dim_customers_sf</span>
            <span className="node-badge dim-badge">Dimension</span>
          </button>

          <button
            className={`sf-node sf-dim-node sf-dim-top ${selectedTable === 'dim_date' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_date')}
            id="sf-dim-date"
          >
            <span className="node-icon">📅</span>
            <span className="node-name">dim_date</span>
            <span className="node-badge dim-badge">Dimension</span>
          </button>

          <button
            className={`sf-node sf-dim-node sf-dim-right ${selectedTable === 'dim_products_sf' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_products_sf')}
            id="sf-dim-products"
          >
            <span className="node-icon">🛍️</span>
            <span className="node-name">dim_products_sf</span>
            <span className="node-badge dim-badge">Dimension</span>
          </button>

          {/* Central fact table */}
          <button
            className={`sf-node sf-fact-node ${selectedTable === 'fact_sales_sf' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('fact_sales_sf')}
            id="sf-fact-sales"
          >
            <span className="node-icon">📦</span>
            <span className="node-name">fact_sales_sf</span>
            <span className="node-badge fact-badge">Fact Table</span>
          </button>

          {/* Connection lines SVG */}
          <svg className="sf-lines" viewBox="0 0 700 480" preserveAspectRatio="xMidYMid meet">
            {/* Fact → Dimensions */}
            <line x1="350" y1="290" x2="350" y2="140" className="conn-line primary-conn" />
            <line x1="270" y1="310" x2="160" y2="270" className="conn-line primary-conn" />
            <line x1="430" y1="310" x2="540" y2="270" className="conn-line primary-conn" />

            {/* Dimensions → Sub-dimensions (these show the snowflaking) */}
            <line x1="120" y1="230" x2="120" y2="120" className="conn-line snowflake-conn" />
            <line x1="580" y1="230" x2="580" y2="120" className="conn-line snowflake-conn" />
          </svg>
        </div>

        <div className="diagram-legend">
          <div className="legend-item">
            <span className="legend-line primary-legend"></span>
            <span>Standard FK relationship (same as star schema)</span>
          </div>
          <div className="legend-item">
            <span className="legend-line snowflake-legend"></span>
            <span>Snowflake normalization (extra FK to sub-dimension)</span>
          </div>
        </div>
      </div>

      {/* ── Table Detail ──────────────────────────────────────────────── */}
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

      {/* ── Star vs Snowflake Comparison ──────────────────────────────── */}
      {comparison && !loading && (
        <div className="comparison-section">
          <h3 className="section-title" style={{ fontSize: '1.4rem' }}>
            ⚡ Star vs Snowflake Comparison
          </h3>
          <p className="section-subtitle">
            Both schemas store the <strong>same data</strong> and produce <strong>identical results</strong>.
            The difference is in structure, query complexity, and storage efficiency.
          </p>

          {/* Metrics cards */}
          <div className="comparison-metrics">
            <div className="metric-card star-metric">
              <div className="metric-header">
                <span className="metric-icon">⭐</span>
                <h4>Star Schema</h4>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-value">{comparison.star.total_tables}</span>
                  <span className="metric-label">Tables</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.star.total_columns}</span>
                  <span className="metric-label">Total Columns</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.star.joins_for_country_query}</span>
                  <span className="metric-label">JOINs for Country</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.star.joins_for_product_query}</span>
                  <span className="metric-label">JOINs for Product</span>
                </div>
              </div>
            </div>

            <div className="vs-divider">
              <span>VS</span>
            </div>

            <div className="metric-card snowflake-metric">
              <div className="metric-header">
                <span className="metric-icon">❄️</span>
                <h4>Snowflake Schema</h4>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-value">{comparison.snowflake.total_tables}</span>
                  <span className="metric-label">Tables</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.snowflake.total_columns}</span>
                  <span className="metric-label">Total Columns</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.snowflake.joins_for_country_query}</span>
                  <span className="metric-label">JOINs for Country</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.snowflake.joins_for_product_query}</span>
                  <span className="metric-label">JOINs for Product</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SQL Query Comparison ──────────────────────────────────────── */}
      <div className="sql-comparison-section">
        <h3 className="section-title" style={{ fontSize: '1.4rem' }}>
          🔍 SQL Query Comparison
        </h3>
        <p className="section-subtitle">
          See how the same analytical question requires <strong>different SQL</strong> in each schema.
          The snowflake version always needs <strong>extra JOINs</strong> to reach sub-dimension values.
        </p>

        {/* Query selector tabs */}
        <div className="query-tabs">
          {SQL_COMPARISONS.map((q, i) => (
            <button
              key={i}
              className={`query-tab ${activeComparison === i ? 'active' : ''}`}
              onClick={() => setActiveComparison(i)}
              id={`sql-compare-${i}`}
            >
              {q.title}
            </button>
          ))}
        </div>

        <div className="sql-compare-grid">
          <div className="sql-compare-card star-sql">
            <div className="sql-compare-header">
              <span>⭐ Star Schema</span>
              <span className="join-count">{SQL_COMPARISONS[activeComparison].star.joins} JOIN{SQL_COMPARISONS[activeComparison].star.joins > 1 ? 'S' : ''}</span>
            </div>
            <pre className="sql-block"><code>{SQL_COMPARISONS[activeComparison].star.sql}</code></pre>
            <p className="sql-explanation">{SQL_COMPARISONS[activeComparison].star.explanation}</p>
          </div>

          <div className="sql-compare-card snowflake-sql">
            <div className="sql-compare-header">
              <span>❄️ Snowflake Schema</span>
              <span className="join-count">{SQL_COMPARISONS[activeComparison].snowflake.joins} JOINS</span>
            </div>
            <pre className="sql-block"><code>{SQL_COMPARISONS[activeComparison].snowflake.sql}</code></pre>
            <p className="sql-explanation">{SQL_COMPARISONS[activeComparison].snowflake.explanation}</p>
          </div>
        </div>
      </div>

      {/* ── Pros & Cons ──────────────────────────────────────────────── */}
      <div className="proscons-section">
        <h3 className="section-title" style={{ fontSize: '1.4rem' }}>
          📝 When to Use Each Schema
        </h3>

        <div className="proscons-grid">
          <div className="proscons-card star-proscons">
            <h4 className="proscons-title">
              <span>⭐</span> Star Schema
            </h4>
            <div className="pros">
              <h5 className="pros-title">✅ Advantages</h5>
              <ul>
                <li>Simpler queries — fewer JOINs needed</li>
                <li>Faster query performance (less joins = faster)</li>
                <li>Easier for analysts to understand and write SQL</li>
                <li>Most BI tools (Tableau, Power BI) prefer this format</li>
              </ul>
            </div>
            <div className="cons">
              <h5 className="cons-title">❌ Disadvantages</h5>
              <ul>
                <li>Data redundancy in dimension tables</li>
                <li>Uses more storage space</li>
                <li>Updates require changing multiple rows</li>
              </ul>
            </div>
            <div className="usecase">
              <h5>🎯 Best For</h5>
              <p>Data marts, OLAP cubes, reporting dashboards, small-medium data warehouses</p>
            </div>
          </div>

          <div className="proscons-card snowflake-proscons">
            <h4 className="proscons-title">
              <span>❄️</span> Snowflake Schema
            </h4>
            <div className="pros">
              <h5 className="pros-title">✅ Advantages</h5>
              <ul>
                <li>No data redundancy — fully normalized</li>
                <li>Less storage space required</li>
                <li>Easier to maintain data integrity</li>
                <li>Updating a category/country name only needs 1 row change</li>
              </ul>
            </div>
            <div className="cons">
              <h5 className="cons-title">❌ Disadvantages</h5>
              <ul>
                <li>More complex queries — extra JOINs required</li>
                <li>Slower query execution due to more JOINs</li>
                <li>Harder for non-technical users to navigate</li>
              </ul>
            </div>
            <div className="usecase">
              <h5>🎯 Best For</h5>
              <p>Large enterprise warehouses, environments with strict normalization requirements, frequently-updated dimensions</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Concepts ─────────────────────────────────────────────── */}
      <div className="concepts-grid">
        <div className="concept-card">
          <h4>❄️ Snowflaking</h4>
          <p>The process of normalizing dimension tables into sub-tables. Named because the resulting diagram looks like a snowflake with branches.</p>
        </div>
        <div className="concept-card">
          <h4>📊 Sub-Dimension</h4>
          <p>A table created by extracting attributes from a dimension table. Example: dim_categories was extracted from dim_products.</p>
        </div>
        <div className="concept-card">
          <h4>🔗 FK Chain</h4>
          <p>In snowflake, queries follow a chain: fact → dimension → sub-dimension. Each hop requires an additional JOIN in SQL.</p>
        </div>
        <div className="concept-card">
          <h4>⚖️ Normalization</h4>
          <p>Reducing data redundancy by splitting tables. Star = denormalized (faster reads). Snowflake = normalized (less redundancy).</p>
        </div>
      </div>
    </div>
  )
}

export default SnowflakeSchema
