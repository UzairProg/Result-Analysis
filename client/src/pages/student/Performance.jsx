import { Sidebar, Topbar } from '../../components/Layout';
import { LineChart } from 'lucide-react';

export default function Performance() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Performance Trends" subtitle="Track your academic progress over time" />
        <main className="page-content">
          <div className="page-header">
            <h2 className="page-title">Performance Trends</h2>
            <p className="page-subtitle">Visualize your SGPA growth across semesters.</p>
          </div>
          <div className="card">
            <div className="empty-state">
              <LineChart size={40} color="var(--text-tertiary)" />
              <p style={{ margin: 0, fontWeight: 500 }}>Performance Visualization</p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Charts and trend analysis coming in Step 2.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
