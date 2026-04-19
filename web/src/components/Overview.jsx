import './Overview.css'

function Overview({ onNavigate }) {
  const features = [
    {
      icon: '⭐',
      title: 'Star Schema Design',
      desc: 'Learn how data is organized into Fact and Dimension tables for efficient analytical querying.',
      tab: 'schema',
      color: 'blue',
    },
    {
      icon: '❄️',
      title: 'Snowflake Schema',
      desc: 'Explore the normalized version of star schema — with sub-dimension tables and SQL comparison.',
      tab: 'snowflake',
      color: 'cyan',
    },
    {
      icon: '⚙️',
      title: 'ETL Pipeline',
      desc: 'Extract data from CSV, Transform it (clean, enrich, normalize), and Load into PostgreSQL.',
      tab: 'etl',
      color: 'purple',
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      desc: 'Visualize sales data with interactive charts — revenue by country, top products, monthly trends.',
      tab: 'dashboard',
      color: 'emerald',
    },
    {
      icon: '🗄️',
      title: 'Data Explorer',
      desc: 'Browse the actual data stored in each table — dimensions and fact table with live samples.',
      tab: 'tables',
      color: 'amber',
    },
  ]

  const techStack = [
    { name: 'Python', role: 'ETL scripting', icon: '🐍' },
    { name: 'pandas', role: 'Data transformation', icon: '🐼' },
    { name: 'SQLAlchemy', role: 'Database ORM', icon: '🔗' },
    { name: 'PostgreSQL', role: 'Data warehouse storage', icon: '🐘' },
    { name: 'Flask', role: 'REST API server', icon: '🌐' },
    { name: 'React + Recharts', role: 'Frontend dashboard', icon: '⚛️' },
  ]

  return (
    <div className="overview">
      {/* Hero */}
      <div className="hero animate-in">
        <div className="hero-content">
          <div className="hero-label">
            <span className="badge badge-blue">📚 Educational Project</span>
          </div>
          <h1 className="hero-title">
            End-to-End<br />
            <span className="gradient-text">Data Warehouse</span> Project
          </h1>
          <p className="hero-desc">
            A complete, production-like data warehouse built from scratch. Learn how to design
            both <strong>Star Schema</strong> and <strong>Snowflake Schema</strong>, write an ETL pipeline in Python,
            load data into PostgreSQL, and run analytical SQL queries — all visualized in this interactive dashboard.
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">1,000</span>
              <span className="stat-label">Sales Records</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">9</span>
              <span className="stat-label">Tables</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">15</span>
              <span className="stat-label">Products</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">6</span>
              <span className="stat-label">Countries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <h2 className="section-title">What You'll Learn</h2>
      <p className="section-subtitle">
        Navigate through each section to understand the building blocks of a data warehouse.
      </p>
      <div className="feature-grid">
        {features.map((f, i) => (
          <button
            key={f.tab}
            className={`feature-card feature-${f.color}`}
            onClick={() => onNavigate(f.tab)}
            style={{ animationDelay: `${i * 0.1}s` }}
            id={`feature-${f.tab}`}
          >
            <span className="feature-icon">{f.icon}</span>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
            <span className="feature-arrow">→</span>
          </button>
        ))}
      </div>

      {/* Tech Stack */}
      <h2 className="section-title" style={{ marginTop: 48 }}>Technology Stack</h2>
      <p className="section-subtitle">
        Tools and libraries used in this project.
      </p>
      <div className="tech-grid">
        {techStack.map((t, i) => (
          <div key={t.name} className="tech-item" style={{ animationDelay: `${i * 0.08}s` }}>
            <span className="tech-icon">{t.icon}</span>
            <div>
              <div className="tech-name">{t.name}</div>
              <div className="tech-role">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Overview
