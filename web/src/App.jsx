import { useState } from 'react'
import './App.css'
import Header from './components/Header'
import Overview from './components/Overview'
import StarSchema from './components/StarSchema'
import SnowflakeSchema from './components/SnowflakeSchema'
import ETLPipeline from './components/ETLPipeline'
import Dashboard from './components/Dashboard'
import TableExplorer from './components/TableExplorer'

const TABS = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'schema', label: 'Star Schema', icon: '⭐' },
  { id: 'snowflake', label: 'Snowflake Schema', icon: '❄️' },
  { id: 'etl', label: 'ETL Pipeline', icon: '⚙️' },
  { id: 'dashboard', label: 'Analytics', icon: '📊' },
  { id: 'tables', label: 'Data Explorer', icon: '🗄️' },
]

function App() {
  const [activeTab, setActiveTab] = useState('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <Overview onNavigate={setActiveTab} />
      case 'schema': return <StarSchema />
      case 'snowflake': return <SnowflakeSchema />
      case 'etl': return <ETLPipeline />
      case 'dashboard': return <Dashboard />
      case 'tables': return <TableExplorer />
      default: return <Overview onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="app">
      <Header />
      <nav className="tab-nav">
        <div className="tab-nav-inner">
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <main className="main-content">
        {renderTab()}
      </main>
    </div>
  )
}

export default App
