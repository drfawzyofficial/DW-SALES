import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">
            <span className="logo-icon">🏗️</span>
            <div>
              <h1 className="logo-text">Sales Data Warehouse</h1>
              <p className="logo-sub">Educational Dashboard — Star Schema, Snowflake Schema &amp; ETL Pipeline</p>
            </div>
          </div>
        </div>
        <div className="header-badges">
          <span className="tech-badge">🐍 Python</span>
          <span className="tech-badge">🐘 PostgreSQL</span>
          <span className="tech-badge">⚛️ React</span>
        </div>
      </div>
    </header>
  )
}

export default Header
