/**
 * GalaxySchema.jsx
 * -----------------
 * Educational component that teaches students about the Galaxy Schema
 * (Fact Constellation) design pattern.
 *
 * What is a Galaxy Schema?
 * A Galaxy Schema (also called Fact Constellation) uses MULTIPLE fact tables
 * that SHARE dimension tables. This is how real-world data warehouses work —
 * a business has many measurable processes (sales, returns, inventory, etc.)
 * that all reference the same entities (customers, products, dates).
 *
 * This component provides:
 *   1. Interactive visual diagram showing two fact tables sharing dimensions
 *   2. Detailed table definitions with column info
 *   3. Side-by-side comparison of all three schemas (Star, Snowflake, Galaxy)
 *   4. SQL query examples showing cross-fact analysis
 *   5. Pros/Cons educational cards
 */

import { useState, useEffect } from 'react'
import './GalaxySchema.css'

const API_BASE = 'http://localhost:5001/api'

// ── Table definitions for the Galaxy Schema ──────────────────────────────
const TABLES = {
  fact_sales_galaxy: {
    type: 'Fact',
    color: 'blue',
    icon: '📦',
    description: 'The sales fact table — identical structure to the star schema version. In the galaxy schema, it coexists alongside other fact tables (like returns), and they SHARE the same dimension tables. This is the key difference from star/snowflake schemas.',
    columns: [
      { name: 'order_id', type: 'INTEGER', key: 'PK', desc: 'Unique order identifier' },
      { name: 'date_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_date (SHARED)' },
      { name: 'customer_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_customers (SHARED)' },
      { name: 'product_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_products (SHARED)' },
      { name: 'quantity', type: 'INTEGER', key: '', desc: 'Number of units sold' },
      { name: 'price', type: 'FLOAT', key: '', desc: 'Unit price at time of sale' },
      { name: 'total_amount', type: 'FLOAT', key: '', desc: 'quantity × price' },
    ],
  },
  fact_returns_galaxy: {
    type: 'Fact',
    color: 'rose',
    icon: '🔄',
    description: 'The returns fact table — a SECOND fact table that tracks product returns. It shares dim_customers, dim_products, and dim_date with fact_sales_galaxy, but also has its OWN dimension: dim_return_reasons. This multi-fact, shared-dimension pattern is the essence of the galaxy schema.',
    columns: [
      { name: 'return_id', type: 'INTEGER', key: 'PK', desc: 'Unique return identifier' },
      { name: 'order_id', type: 'INTEGER', key: '', desc: 'Original order that was returned' },
      { name: 'date_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_date (SHARED)' },
      { name: 'customer_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_customers (SHARED)' },
      { name: 'product_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_products (SHARED)' },
      { name: 'quantity_returned', type: 'INTEGER', key: '', desc: 'Number of units returned' },
      { name: 'refund_amount', type: 'FLOAT', key: '', desc: 'Total refund value' },
      { name: 'reason_id', type: 'INTEGER', key: 'FK', desc: 'Links to dim_return_reasons (UNIQUE to returns)' },
    ],
  },
  dim_customers: {
    type: 'Shared Dimension',
    color: 'emerald',
    icon: '👥',
    description: 'Customer dimension — SHARED between both fact tables. Both fact_sales_galaxy and fact_returns_galaxy reference this same table via customer_id. This sharing is what makes it a "constellation" — multiple stars (fact tables) connected by shared dimensions.',
    columns: [
      { name: 'customer_id', type: 'INTEGER', key: 'PK', desc: 'Unique customer identifier' },
      { name: 'customer_name', type: 'VARCHAR(100)', key: '', desc: 'Full name of customer' },
      { name: 'country', type: 'VARCHAR(50)', key: '', desc: 'Customer country' },
    ],
  },
  dim_products: {
    type: 'Shared Dimension',
    color: 'purple',
    icon: '🛍️',
    description: 'Product dimension — SHARED between both fact tables. Enables analysis of which products are sold most AND which are returned most, using the same product definitions across both business processes.',
    columns: [
      { name: 'product_id', type: 'INTEGER', key: 'PK', desc: 'Unique product identifier' },
      { name: 'product_name', type: 'VARCHAR(100)', key: '', desc: 'Name of the product' },
      { name: 'category', type: 'VARCHAR(50)', key: '', desc: 'Product category (Electronics, etc.)' },
      { name: 'price', type: 'FLOAT', key: '', desc: 'Base unit price' },
    ],
  },
  dim_date: {
    type: 'Shared Dimension',
    color: 'amber',
    icon: '📅',
    description: 'Date dimension — SHARED between both fact tables. Allows time-based analysis of both sales and returns using the same calendar, enabling questions like "Compare monthly sales vs returns".',
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
  dim_return_reasons: {
    type: 'Unique Dimension',
    color: 'cyan',
    icon: '❓',
    description: 'Return reasons dimension — UNIQUE to fact_returns_galaxy. This dimension is only referenced by the returns fact table, not by sales. In a galaxy schema, some dimensions are shared across all fact tables, while others are specific to a single fact table.',
    columns: [
      { name: 'reason_id', type: 'INTEGER', key: 'PK', desc: 'Unique reason identifier' },
      { name: 'reason_name', type: 'VARCHAR(100)', key: '', desc: 'Why the item was returned' },
    ],
  },
}

// ── SQL Comparison data ──────────────────────────────────────────────────
const SQL_COMPARISONS = [
  {
    title: 'Cross-Fact Analysis',
    description: 'The hallmark of the galaxy schema: joining data from MULTIPLE fact tables through shared dimensions.',
    sql: `-- Revenue vs Refunds by Category
-- Uses BOTH fact tables through shared dim_products
WITH sales AS (
  SELECT p.category,
         SUM(s.total_amount) AS revenue
  FROM fact_sales_galaxy s
  JOIN dim_products p
    ON s.product_id = p.product_id
  GROUP BY p.category
),
returns AS (
  SELECT p.category,
         SUM(r.refund_amount) AS refunds
  FROM fact_returns_galaxy r
  JOIN dim_products p
    ON r.product_id = p.product_id
  GROUP BY p.category
)
SELECT s.category,
       s.revenue,
       COALESCE(r.refunds, 0) AS refunds,
       s.revenue - COALESCE(r.refunds, 0)
         AS net_revenue
FROM sales s
LEFT JOIN returns r
  ON s.category = r.category;`,
    explanation: 'This query is IMPOSSIBLE in star/snowflake schemas because they only have one fact table. Galaxy schema enables cross-process analysis by joining two fact tables through shared dimensions.',
  },
  {
    title: 'Returns by Reason',
    description: 'Using the galaxy-specific dim_return_reasons dimension that only exists for the returns fact.',
    sql: `-- Why are customers returning products?
SELECT r.reason_name,
       COUNT(f.return_id) AS returns,
       SUM(f.quantity_returned) AS units,
       SUM(f.refund_amount) AS refunds
FROM fact_returns_galaxy f
JOIN dim_return_reasons r
  ON f.reason_id = r.reason_id
GROUP BY r.reason_name
ORDER BY returns DESC;`,
    explanation: 'dim_return_reasons is UNIQUE to the returns fact table. In a galaxy schema, each fact table can have both shared dimensions and its own unique dimensions.',
  },
  {
    title: 'Shared Dimension Query',
    description: 'Same customers dimension used by both sales and returns fact tables.',
    sql: `-- Customer returns analysis
-- Uses the SHARED dim_customers dimension
SELECT c.customer_name,
       c.country,
       COUNT(f.return_id) AS returns,
       SUM(f.refund_amount) AS refunds
FROM fact_returns_galaxy f
JOIN dim_customers c
  ON f.customer_id = c.customer_id
GROUP BY c.customer_name, c.country
ORDER BY refunds DESC
LIMIT 5;`,
    explanation: 'dim_customers is SHARED — the same table serves both fact_sales_galaxy and fact_returns_galaxy. This ensures consistent customer data across all business processes.',
  },
]

function GalaxySchema() {
  const [selectedTable, setSelectedTable] = useState('fact_sales_galaxy')
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSql, setActiveSql] = useState(0)
  const [revenueData, setRevenueData] = useState(null)
  const [returnReasonData, setReturnReasonData] = useState(null)

  const table = TABLES[selectedTable]

  // Fetch comparison data and analytics data
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/galaxy-comparison`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/galaxy-revenue-vs-returns`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/galaxy-returns-by-reason`).then(r => r.json()).catch(() => null),
    ]).then(([comp, rev, reasons]) => {
      setComparison(comp)
      setRevenueData(rev)
      setReturnReasonData(reasons)
      setLoading(false)
    })
  }, [])

  return (
    <div className="galaxy-schema">
      <h2 className="section-title">🌌 Galaxy Schema (Fact Constellation)</h2>
      <p className="section-subtitle">
        A Galaxy Schema uses <strong>multiple fact tables</strong> that <strong>share dimension tables</strong>.
        This models real-world scenarios where a business tracks many processes
        (sales, returns, inventory, shipping) all referencing the same entities.
      </p>

      {/* ── Visual Schema Diagram ──────────────────────────────────────── */}
      <div className="galaxy-diagram">
        <div className="galaxy-diagram-inner">
          {/* Shared dimensions (top row) */}
          <button
            className={`gx-node gx-dim-node gx-dim-left ${selectedTable === 'dim_customers' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_customers')}
            id="gx-dim-customers"
          >
            <span className="node-icon">👥</span>
            <span className="node-name">dim_customers</span>
            <span className="node-badge shared-badge">Shared</span>
          </button>

          <button
            className={`gx-node gx-dim-node gx-dim-center ${selectedTable === 'dim_date' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_date')}
            id="gx-dim-date"
          >
            <span className="node-icon">📅</span>
            <span className="node-name">dim_date</span>
            <span className="node-badge shared-badge">Shared</span>
          </button>

          <button
            className={`gx-node gx-dim-node gx-dim-right ${selectedTable === 'dim_products' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_products')}
            id="gx-dim-products"
          >
            <span className="node-icon">🛍️</span>
            <span className="node-name">dim_products</span>
            <span className="node-badge shared-badge">Shared</span>
          </button>

          {/* Fact tables (middle row) */}
          <button
            className={`gx-node gx-fact-node gx-fact-left ${selectedTable === 'fact_sales_galaxy' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('fact_sales_galaxy')}
            id="gx-fact-sales"
          >
            <span className="node-icon">📦</span>
            <span className="node-name">fact_sales_galaxy</span>
            <span className="node-badge fact-badge">Fact Table 1</span>
          </button>

          <button
            className={`gx-node gx-fact-node gx-fact-right ${selectedTable === 'fact_returns_galaxy' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('fact_returns_galaxy')}
            id="gx-fact-returns"
          >
            <span className="node-icon">🔄</span>
            <span className="node-name">fact_returns_galaxy</span>
            <span className="node-badge return-badge">Fact Table 2</span>
          </button>

          {/* Unique dimensions (bottom) */}
          <button
            className={`gx-node gx-unique-node gx-unique-bottom ${selectedTable === 'dim_return_reasons' ? 'selected' : ''}`}
            onClick={() => setSelectedTable('dim_return_reasons')}
            id="gx-dim-reasons"
          >
            <span className="node-icon">❓</span>
            <span className="node-name">dim_return_reasons</span>
            <span className="node-badge unique-badge">Unique Dim</span>
          </button>

          {/* Connection lines SVG */}
          <svg className="gx-lines" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
            {/* Sales fact → shared dimensions */}
            <line x1="260" y1="260" x2="120" y2="140" className="conn-line gx-shared-conn" />
            <line x1="280" y1="250" x2="400" y2="140" className="conn-line gx-shared-conn" />
            <line x1="320" y1="260" x2="680" y2="140" className="conn-line gx-shared-conn" />

            {/* Returns fact → shared dimensions */}
            <line x1="480" y1="260" x2="120" y2="140" className="conn-line gx-shared-conn" />
            <line x1="520" y1="250" x2="400" y2="140" className="conn-line gx-shared-conn" />
            <line x1="540" y1="260" x2="680" y2="140" className="conn-line gx-shared-conn" />

            {/* Returns fact → unique dimension */}
            <line x1="520" y1="340" x2="400" y2="430" className="conn-line gx-unique-conn" />
          </svg>
        </div>

        <div className="diagram-legend">
          <div className="legend-item">
            <span className="legend-line shared-legend"></span>
            <span>Shared FK (both facts → same dimension)</span>
          </div>
          <div className="legend-item">
            <span className="legend-line unique-legend"></span>
            <span>Unique FK (only returns → reason dimension)</span>
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

      {/* ── Revenue vs Returns Analysis ────────────────────────────────── */}
      {revenueData && returnReasonData && (
        <div className="galaxy-analytics-section">
          <h3 className="section-title" style={{ fontSize: '1.4rem' }}>
            📊 Cross-Fact Analytics (Galaxy Schema Power)
          </h3>
          <p className="section-subtitle">
            This analysis is <strong>only possible</strong> with the galaxy schema — it combines data
            from <strong>both fact tables</strong> (sales + returns) through shared dimensions.
          </p>

          <div className="analytics-grid">
            {/* Revenue vs Returns by Category */}
            <div className="analytics-card">
              <h4 className="analytics-card-title">
                <span>💰</span> Revenue vs Refunds by Category
              </h4>
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Revenue</th>
                      <th>Refunds</th>
                      <th>Net Revenue</th>
                      <th>Return Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.map((row, i) => (
                      <tr key={row.category} style={{ animationDelay: `${i * 0.05}s` }}>
                        <td className="category-cell">{row.category}</td>
                        <td className="revenue-cell">${row.total_revenue.toLocaleString()}</td>
                        <td className="refund-cell">-${row.total_refunds.toLocaleString()}</td>
                        <td className="net-cell">${row.net_revenue.toLocaleString()}</td>
                        <td className="rate-cell">
                          <span className="return-rate-badge">
                            {row.total_orders > 0
                              ? ((row.total_returns / row.total_orders) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Returns by Reason */}
            <div className="analytics-card">
              <h4 className="analytics-card-title">
                <span>❓</span> Returns by Reason
              </h4>
              <div className="reason-list">
                {returnReasonData.map((row, i) => (
                  <div key={row.reason_name} className="reason-item" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="reason-info">
                      <span className="reason-name">{row.reason_name}</span>
                      <span className="reason-count">{row.total_returns} returns</span>
                    </div>
                    <div className="reason-bar-wrap">
                      <div
                        className="reason-bar"
                        style={{
                          width: `${(row.total_returns / Math.max(...returnReasonData.map(r => r.total_returns))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="reason-refund">${row.total_refunds.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Three-Schema Comparison ────────────────────────────────────── */}
      {comparison && !loading && (
        <div className="comparison-section">
          <h3 className="section-title" style={{ fontSize: '1.4rem' }}>
            ⚡ Star vs Snowflake vs Galaxy Comparison
          </h3>
          <p className="section-subtitle">
            See how all three schema designs differ in structure, complexity, and capabilities.
          </p>

          <div className="triple-comparison">
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
                  <span className="metric-value">{comparison.star.fact_tables}</span>
                  <span className="metric-label">Fact Tables</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.star.total_columns}</span>
                  <span className="metric-label">Columns</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.star.joins_for_country_query}</span>
                  <span className="metric-label">JOINs</span>
                </div>
              </div>
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
                  <span className="metric-value">{comparison.snowflake.fact_tables}</span>
                  <span className="metric-label">Fact Tables</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.snowflake.total_columns}</span>
                  <span className="metric-label">Columns</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.snowflake.joins_for_country_query}</span>
                  <span className="metric-label">JOINs</span>
                </div>
              </div>
            </div>

            <div className="metric-card galaxy-metric">
              <div className="metric-header">
                <span className="metric-icon">🌌</span>
                <h4>Galaxy Schema</h4>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-value">{comparison.galaxy.total_tables}</span>
                  <span className="metric-label">Tables</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.galaxy.fact_tables}</span>
                  <span className="metric-label">Fact Tables</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.galaxy.total_columns}</span>
                  <span className="metric-label">Columns</span>
                </div>
                <div className="metric-item">
                  <span className="metric-value">{comparison.galaxy.joins_for_country_query}</span>
                  <span className="metric-label">JOINs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SQL Query Examples ─────────────────────────────────────────── */}
      <div className="sql-section">
        <h3 className="section-title" style={{ fontSize: '1.4rem' }}>
          🔍 Galaxy Schema SQL Queries
        </h3>
        <p className="section-subtitle">
          Galaxy schema enables queries that are <strong>impossible</strong> in star or snowflake schemas —
          especially <strong>cross-fact analysis</strong> that joins data from multiple business processes.
        </p>

        <div className="query-tabs">
          {SQL_COMPARISONS.map((q, i) => (
            <button
              key={i}
              className={`query-tab ${activeSql === i ? 'active' : ''}`}
              onClick={() => setActiveSql(i)}
              id={`galaxy-sql-${i}`}
            >
              {q.title}
            </button>
          ))}
        </div>

        <div className="sql-card galaxy-sql">
          <div className="sql-card-header">
            <span>🌌 {SQL_COMPARISONS[activeSql].title}</span>
          </div>
          <p className="sql-card-desc">{SQL_COMPARISONS[activeSql].description}</p>
          <pre className="sql-block"><code>{SQL_COMPARISONS[activeSql].sql}</code></pre>
          <p className="sql-explanation">{SQL_COMPARISONS[activeSql].explanation}</p>
        </div>
      </div>

      {/* ── Pros & Cons ──────────────────────────────────────────────── */}
      <div className="proscons-section">
        <h3 className="section-title" style={{ fontSize: '1.4rem' }}>
          📝 Star vs Snowflake vs Galaxy — When to Use Each
        </h3>

        <div className="triple-proscons">
          <div className="proscons-card star-proscons">
            <h4 className="proscons-title">
              <span>⭐</span> Star Schema
            </h4>
            <div className="pros">
              <h5 className="pros-title">✅ Advantages</h5>
              <ul>
                <li>Simplest queries — fewest JOINs</li>
                <li>Fastest query performance</li>
                <li>Easy for analysts to understand</li>
              </ul>
            </div>
            <div className="cons">
              <h5 className="cons-title">❌ Limitations</h5>
              <ul>
                <li>Data redundancy in dimensions</li>
                <li>Single business process only</li>
                <li>No cross-process analysis</li>
              </ul>
            </div>
            <div className="usecase">
              <h5>🎯 Best For</h5>
              <p>Simple data marts, quick OLAP queries, small warehouses</p>
            </div>
          </div>

          <div className="proscons-card snowflake-proscons">
            <h4 className="proscons-title">
              <span>❄️</span> Snowflake Schema
            </h4>
            <div className="pros">
              <h5 className="pros-title">✅ Advantages</h5>
              <ul>
                <li>No data redundancy</li>
                <li>Less storage space</li>
                <li>Better data integrity</li>
              </ul>
            </div>
            <div className="cons">
              <h5 className="cons-title">❌ Limitations</h5>
              <ul>
                <li>More complex queries (extra JOINs)</li>
                <li>Slower query execution</li>
                <li>Still single business process</li>
              </ul>
            </div>
            <div className="usecase">
              <h5>🎯 Best For</h5>
              <p>Large warehouses with strict normalization, frequently-updated dimensions</p>
            </div>
          </div>

          <div className="proscons-card galaxy-proscons">
            <h4 className="proscons-title">
              <span>🌌</span> Galaxy Schema
            </h4>
            <div className="pros">
              <h5 className="pros-title">✅ Advantages</h5>
              <ul>
                <li>Multiple business processes in one schema</li>
                <li>Cross-fact analysis (sales vs returns)</li>
                <li>Shared dimensions reduce redundancy</li>
                <li>Most realistic enterprise pattern</li>
              </ul>
            </div>
            <div className="cons">
              <h5 className="cons-title">❌ Limitations</h5>
              <ul>
                <li>Most complex to design and maintain</li>
                <li>Cross-fact queries can be expensive</li>
                <li>Requires careful dimension management</li>
              </ul>
            </div>
            <div className="usecase">
              <h5>🎯 Best For</h5>
              <p>Enterprise data warehouses, multi-process analytics, centralized reporting platforms</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Concepts ─────────────────────────────────────────────── */}
      <div className="concepts-grid">
        <div className="concept-card">
          <h4>🌌 Fact Constellation</h4>
          <p>Multiple fact tables sharing dimension tables — named because the resulting ER diagram looks like a constellation of stars.</p>
        </div>
        <div className="concept-card">
          <h4>🔗 Shared Dimensions</h4>
          <p>Dimension tables referenced by more than one fact table. These are the "common ground" that enables cross-fact analysis.</p>
        </div>
        <div className="concept-card">
          <h4>🎯 Conformed Dimensions</h4>
          <p>Shared dimensions that use the same definitions across all fact tables. Ensures consistent reporting across business processes.</p>
        </div>
        <div className="concept-card">
          <h4>📊 Cross-Fact Analysis</h4>
          <p>Querying across multiple fact tables through shared dimensions — e.g., comparing sales revenue vs return refunds by product.</p>
        </div>
      </div>
    </div>
  )
}

export default GalaxySchema
