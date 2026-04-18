import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import './Dashboard.css'

const API_BASE = 'http://localhost:5001/api'

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e']

const QUERIES = {
  country: {
    title: '📊 Total Sales by Country',
    sql: `SELECT c.country, COUNT(f.order_id) AS total_orders,
       SUM(f.quantity) AS total_units_sold,
       ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
FROM fact_sales f
JOIN dim_customers c ON f.customer_id = c.customer_id
GROUP BY c.country
ORDER BY total_revenue DESC;`,
  },
  products: {
    title: '🏆 Top 5 Products by Revenue',
    sql: `SELECT p.product_name, p.category,
       COUNT(f.order_id) AS times_ordered,
       ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
FROM fact_sales f
JOIN dim_products p ON f.product_id = p.product_id
GROUP BY p.product_name, p.category
ORDER BY total_revenue DESC
LIMIT 5;`,
  },
  monthly: {
    title: '📈 Monthly Revenue Trend',
    sql: `SELECT d.year, d.month,
       COUNT(f.order_id) AS total_orders,
       ROUND(SUM(f.total_amount)::numeric, 2) AS monthly_revenue
FROM fact_sales f
JOIN dim_date d ON f.date_id = d.date_id
GROUP BY d.year, d.month
ORDER BY d.year, d.month;`,
  },
  customers: {
    title: '👤 Top 10 Customers',
    sql: `SELECT c.customer_name, c.country,
       COUNT(f.order_id) AS total_orders,
       ROUND(SUM(f.total_amount)::numeric, 2) AS total_spent
FROM fact_sales f
JOIN dim_customers c ON f.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name, c.country
ORDER BY total_spent DESC LIMIT 10;`,
  },
}

function Dashboard() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [showSQL, setShowSQL] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/sales-by-country`).then(r => r.json()),
      fetch(`${API_BASE}/top-products`).then(r => r.json()),
      fetch(`${API_BASE}/monthly-revenue`).then(r => r.json()),
      fetch(`${API_BASE}/top-customers`).then(r => r.json()),
    ])
      .then(([country, products, monthly, customers]) => {
        setData({ country, products, monthly, customers })
        setLoading(false)
      })
      .catch(err => {
        console.error('API Error:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading analytics data... Make sure the API is running (python3 api.py)
      </div>
    )
  }

  if (!data.country) {
    return (
      <div className="loading">
        ❌ Could not load data. Please start the API server: <code>python3 api.py</code>
      </div>
    )
  }

  const formatCurrency = (val) => `$${(val / 1000).toFixed(1)}K`
  const tooltipFormatter = (val) => `$${val.toLocaleString()}`

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: ${Number(p.value).toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="dashboard">
      <h2 className="section-title">📊 Analytics Dashboard</h2>
      <p className="section-subtitle">
        Interactive visualizations of SQL query results from the data warehouse.
        Click <strong>"Show SQL"</strong> to see the query behind each chart.
      </p>

      {/* Summary Cards */}
      <div className="grid-4 summary-cards">
        <div className="summary-card">
          <div className="summary-value">${(data.country.reduce((s, c) => s + c.total_revenue, 0) / 1000).toFixed(0)}K</div>
          <div className="summary-label">Total Revenue</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{data.country.reduce((s, c) => s + c.total_orders, 0).toLocaleString()}</div>
          <div className="summary-label">Total Orders</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{data.country.length}</div>
          <div className="summary-label">Countries</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{data.products.length}</div>
          <div className="summary-label">Top Products</div>
        </div>
      </div>

      {/* Sales by Country */}
      <div className="chart-card card">
        <div className="chart-header">
          <h3 className="card-title">{QUERIES.country.title}</h3>
          <button className="sql-toggle" onClick={() => setShowSQL(showSQL === 'country' ? null : 'country')}>
            {showSQL === 'country' ? 'Hide SQL' : 'Show SQL'}
          </button>
        </div>
        {showSQL === 'country' && (
          <pre className="sql-block"><code>{QUERIES.country.sql}</code></pre>
        )}
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.country} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="country" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                {data.country.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products + Pie Chart */}
      <div className="grid-2">
        <div className="chart-card card">
          <div className="chart-header">
            <h3 className="card-title">{QUERIES.products.title}</h3>
            <button className="sql-toggle" onClick={() => setShowSQL(showSQL === 'products' ? null : 'products')}>
              {showSQL === 'products' ? 'Hide SQL' : 'Show SQL'}
            </button>
          </div>
          {showSQL === 'products' && (
            <pre className="sql-block"><code>{QUERIES.products.sql}</code></pre>
          )}
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.products} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis type="category" dataKey="product_name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_revenue" name="Revenue" radius={[0, 6, 6, 0]}>
                  {data.products.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card card">
          <h3 className="card-title">🥧 Revenue Distribution</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.products}
                  dataKey="total_revenue"
                  nameKey="product_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ product_name, percent }) => `${product_name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.products.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="chart-card card">
        <div className="chart-header">
          <h3 className="card-title">{QUERIES.monthly.title}</h3>
          <button className="sql-toggle" onClick={() => setShowSQL(showSQL === 'monthly' ? null : 'monthly')}>
            {showSQL === 'monthly' ? 'Hide SQL' : 'Show SQL'}
          </button>
        </div>
        {showSQL === 'monthly' && (
          <pre className="sql-block"><code>{QUERIES.monthly.sql}</code></pre>
        )}
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthly} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="monthly_revenue"
                name="Revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="chart-card card">
        <div className="chart-header">
          <h3 className="card-title">{QUERIES.customers.title}</h3>
          <button className="sql-toggle" onClick={() => setShowSQL(showSQL === 'customers' ? null : 'customers')}>
            {showSQL === 'customers' ? 'Hide SQL' : 'Show SQL'}
          </button>
        </div>
        {showSQL === 'customers' && (
          <pre className="sql-block"><code>{QUERIES.customers.sql}</code></pre>
        )}
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Country</th>
                <th>Orders</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c, i) => (
                <tr key={c.customer_id}>
                  <td className="rank">{i + 1}</td>
                  <td className="name">{c.customer_name}</td>
                  <td>{c.country}</td>
                  <td>{c.total_orders}</td>
                  <td className="amount">${c.total_spent.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
