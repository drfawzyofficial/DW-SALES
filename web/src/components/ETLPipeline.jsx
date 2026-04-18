import { useState, useEffect } from 'react'
import './ETLPipeline.css'

const API_BASE = 'http://localhost:5001/api'

const ETL_STEPS = [
  {
    id: 'extract',
    phase: 'Extract',
    icon: '📥',
    color: 'cyan',
    title: 'Extract Data',
    code: `def extract_data(csv_path):
    df = pd.read_csv(csv_path)
    return df`,
    details: [
      'Read raw sales data from CSV file',
      'Load into a pandas DataFrame',
      'Preserves all original columns and data types',
      '1,020 rows extracted (including duplicates)',
    ],
  },
  {
    id: 'transform',
    phase: 'Transform',
    icon: '🔄',
    color: 'purple',
    title: 'Transform & Clean',
    code: `def transform_data(df):
    # Handle missing values
    df["customer_name"].fillna("Unknown")
    df["quantity"].fillna(median_qty)

    # Convert date to datetime
    df["date"] = pd.to_datetime(df["date"])

    # Remove duplicates
    df.drop_duplicates(subset=["order_id"])

    # Create total_amount
    df["total_amount"] = df["quantity"] * df["price"]

    # Normalize into star schema
    dim_customers = df[["customer_id", ...]]
    dim_products  = df[["product_id", ...]]
    dim_date      = build_date_dimension(df)
    fact_sales    = build_fact_table(df)`,
    details: [
      'Fill missing customer_name → "Unknown"',
      'Fill missing quantity → median value',
      'Convert date strings to datetime objects',
      'Remove 20 duplicate rows (1,020 → 1,000)',
      'Create total_amount = quantity × price',
      'Normalize into 3 dimension + 1 fact tables',
    ],
  },
  {
    id: 'load',
    phase: 'Load',
    icon: '📤',
    color: 'emerald',
    title: 'Load to PostgreSQL',
    code: `def load_data(engine, tables):
    # Load dimensions first (parent tables)
    dim_customers.to_sql("dim_customers", engine)
    dim_products.to_sql("dim_products", engine)
    dim_date.to_sql("dim_date", engine)

    # Then load fact table (has FK references)
    fact_sales.to_sql("fact_sales", engine)`,
    details: [
      'Connect to PostgreSQL via SQLAlchemy',
      'Create tables with proper constraints & indexes',
      'Load dimension tables first (parents)',
      'Load fact table last (foreign key dependencies)',
      'Batch insert with method="multi" for speed',
    ],
  },
]

function ETLPipeline() {
  const [activeStep, setActiveStep] = useState(0)
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/etl-log`)
      .then(r => r.json())
      .then(data => {
        setLog(data.log || [])
        setLoading(false)
      })
      .catch(() => {
        setLog(['Could not fetch ETL log. Make sure the API server is running.'])
        setLoading(false)
      })
  }, [])

  const step = ETL_STEPS[activeStep]

  return (
    <div className="etl-pipeline">
      <h2 className="section-title">⚙️ ETL Pipeline</h2>
      <p className="section-subtitle">
        ETL stands for <strong>Extract</strong>, <strong>Transform</strong>, <strong>Load</strong> —
        the three phases of moving data from source systems into the data warehouse.
      </p>

      {/* Pipeline Flow */}
      <div className="pipeline-flow">
        {ETL_STEPS.map((s, i) => (
          <div key={s.id} className="pipeline-step-wrapper">
            <button
              className={`pipeline-step step-${s.color} ${activeStep === i ? 'active' : ''}`}
              onClick={() => setActiveStep(i)}
              id={`step-${s.id}`}
            >
              <span className="step-icon">{s.icon}</span>
              <span className="step-phase">{s.phase}</span>
            </button>
            {i < ETL_STEPS.length - 1 && (
              <div className="pipeline-arrow">
                <span>→</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step Detail */}
      <div className={`step-detail card step-detail-${step.color}`}>
        <div className="step-detail-header">
          <h3 className="card-title">
            <span>{step.icon}</span>
            {step.title}
            <span className={`badge badge-${step.color}`}>{step.phase}</span>
          </h3>
        </div>

        <div className="step-content-grid">
          <div className="step-code-section">
            <h4 className="step-section-title">💻 Code</h4>
            <pre className="code-block">
              <code>{step.code}</code>
            </pre>
          </div>

          <div className="step-details-section">
            <h4 className="step-section-title">📋 What Happens</h4>
            <ul className="step-details-list">
              {step.details.map((d, i) => (
                <li key={i} className="step-detail-item" style={{ animationDelay: `${i * 0.08}s` }}>
                  <span className="check-icon">✓</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Data Flow Visual */}
      <div className="data-flow card">
        <h3 className="card-title">🔀 Data Flow Overview</h3>
        <div className="flow-diagram">
          <div className="flow-node flow-source">
            <span>📄</span>
            <strong>CSV File</strong>
            <small>1,020 raw rows</small>
          </div>
          <div className="flow-connector">→</div>
          <div className="flow-node flow-process">
            <span>🐍</span>
            <strong>Python ETL</strong>
            <small>Clean & Normalize</small>
          </div>
          <div className="flow-connector">→</div>
          <div className="flow-node flow-dest">
            <span>🐘</span>
            <strong>PostgreSQL</strong>
            <small>Star Schema</small>
          </div>
          <div className="flow-connector">→</div>
          <div className="flow-node flow-output">
            <span>📊</span>
            <strong>Analytics</strong>
            <small>SQL Queries</small>
          </div>
        </div>
      </div>

      {/* ETL Log */}
      <div className="etl-log card">
        <h3 className="card-title">📝 ETL Execution Log</h3>
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            Loading log...
          </div>
        ) : (
          <div className="log-content">
            {log.map((line, i) => (
              <div
                key={i}
                className={`log-line ${
                  line.includes('✅') ? 'log-success' :
                  line.includes('❌') ? 'log-error' :
                  line.includes('INFO') ? 'log-info' : ''
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ETLPipeline
