import React, { useEffect, useState } from 'react';
import Head from 'next/head';

interface HealthMetrics {
  total_rectangles: number;
  rectangles_with_data: number;
  avg_success_rate_7d: number;
  total_ingestions_24h: number;
  successful_ingestions_24h: number;
  failed_ingestions_24h: number;
}

interface RecentLog {
  id: string;
  rectangle_code: string;
  status: 'success' | 'partial' | 'failed';
  timestamp: string;
  variables_fetched: number;
}

interface Alert {
  id: string;
  rectangle_code: string;
  alert_type: string;
  message: string;
  timestamp: string;
  severity: 'warning' | 'error' | 'critical';
}

interface StaleRectangle {
  rectangle_code: string;
  days_since_update: number;
}

interface FailingRectangle {
  rectangle_code: string;
  consecutive_failures: number;
  success_rate_7d: number;
}

interface StatusData {
  health_score: number;
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  summary: {
    total_rectangles: number;
    rectangles_with_data: number;
    rectangles_stale: number;
    rectangles_failing: number;
    avg_success_rate_7d: number;
    unresolved_alerts: number;
  };
  health_metrics: HealthMetrics[];
  recent_logs: RecentLog[];
  alerts: Alert[];
  stale_rectangles: StaleRectangle[];
  failing_rectangles: FailingRectangle[];
  timestamp: string;
}

export default function CopernicusStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/copernicus-status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const statusData = await response.json();
      setData(statusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (autoRefresh) {
      const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'warning';
      case 'critical': return 'error';
      default: return 'neutral';
    }
  };

  const getHealthEmoji = (status: string) => {
    switch (status) {
      case 'excellent': return '🎉';
      case 'good': return '✅';
      case 'fair': return '⚠️';
      case 'poor': return '😰';
      case 'critical': return '🚨';
      default: return '❓';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      success: 'badge-success',
      partial: 'badge-warning',
      failed: 'badge-error',
    };
    return colors[status as keyof typeof colors] || 'badge-neutral';
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      warning: 'badge-warning',
      error: 'badge-error',
      critical: 'badge-error badge-lg',
    };
    return colors[severity as keyof typeof colors] || 'badge-neutral';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-lg">Loading Copernicus Status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const metrics = data.health_metrics[0] || {};
  const successRate24h = metrics.total_ingestions_24h > 0 
    ? (metrics.successful_ingestions_24h / metrics.total_ingestions_24h) * 100 
    : 0;

  return (
    <>
      <Head>
        <title>Copernicus Marine Data Status | WotNow</title>
        <meta name="description" content="Real-time monitoring dashboard for Copernicus Marine biogeochemical data ingestion" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-base-300 dark:to-base-200 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                🌊 Copernicus Marine Status
              </h1>
              <p className="text-sm text-base-content/70 mt-1">
                Last updated: {new Date(data.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? '⏸️ Pause' : '▶️ Auto-refresh'}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={fetchStatus}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Health Score Hero */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-center md:text-left">
                  <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                    {data.health_score}
                  </h2>
                  <p className="text-2xl font-semibold mt-2">
                    {getHealthEmoji(data.health_status)} {data.health_status.toUpperCase()}
                  </p>
                </div>
                <div className="flex-1 w-full">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall System Health</span>
                      <span className="font-semibold">{data.health_score}%</span>
                    </div>
                    <progress 
                      className={`progress progress-${getHealthColor(data.health_status)} w-full h-6`} 
                      value={data.health_score} 
                      max="100"
                    ></progress>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-figure text-primary text-3xl">📦</div>
              <div className="stat-title">Total Rectangles</div>
              <div className="stat-value text-primary">{data.summary.total_rectangles}</div>
              <div className="stat-desc">
                {data.summary.rectangles_with_data} with data
              </div>
              <progress 
                className="progress progress-primary w-full mt-2" 
                value={data.summary.rectangles_with_data} 
                max={data.summary.total_rectangles}
              ></progress>
            </div>

            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-figure text-success text-3xl">✅</div>
              <div className="stat-title">7-Day Success Rate</div>
              <div className="stat-value text-success">{data.summary.avg_success_rate_7d.toFixed(1)}%</div>
              <div className="stat-desc">Average across all rectangles</div>
              <progress 
                className="progress progress-success w-full mt-2" 
                value={data.summary.avg_success_rate_7d} 
                max="100"
              ></progress>
            </div>

            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-figure text-info text-3xl">📊</div>
              <div className="stat-title">24h Ingestions</div>
              <div className="stat-value text-info">{metrics.total_ingestions_24h || 0}</div>
              <div className="stat-desc">
                {metrics.successful_ingestions_24h || 0} successful
              </div>
              <progress 
                className="progress progress-info w-full mt-2" 
                value={successRate24h} 
                max="100"
              ></progress>
            </div>

            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-figure text-error text-3xl">🚨</div>
              <div className="stat-title">Active Alerts</div>
              <div className="stat-value text-error">{data.summary.unresolved_alerts}</div>
              <div className="stat-desc">
                {data.summary.rectangles_failing} rectangles failing
              </div>
              {data.summary.unresolved_alerts > 0 && (
                <progress 
                  className="progress progress-error w-full mt-2" 
                  value={data.summary.unresolved_alerts} 
                  max="10"
                ></progress>
              )}
            </div>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Activity */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">
                  <span className="text-2xl">📝</span> Recent Ingestions
                </h2>
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead>
                      <tr>
                        <th>Rectangle</th>
                        <th>Status</th>
                        <th>Variables</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_logs.slice(0, 8).map((log) => (
                        <tr key={log.id}>
                          <td className="font-mono font-semibold">{log.rectangle_code}</td>
                          <td>
                            <span className={`badge badge-sm ${getStatusBadge(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-outline badge-sm">{log.variables_fetched}/7</span>
                          </td>
                          <td className="text-xs">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">
                  <span className="text-2xl">⚠️</span> Active Alerts
                </h2>
                {data.alerts.length === 0 ? (
                  <div className="alert alert-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>No active alerts! 🎉</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {data.alerts.map((alert) => (
                      <div key={alert.id} className="alert alert-warning">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`badge ${getSeverityBadge(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            <span className="font-mono font-semibold">{alert.rectangle_code}</span>
                          </div>
                          <p className="text-sm mt-1">{alert.message}</p>
                          <p className="text-xs text-base-content/60 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stale Data */}
            {data.stale_rectangles.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    <span className="text-2xl">⏰</span> Stale Data
                    <span className="badge badge-warning">{data.stale_rectangles.length}</span>
                  </h2>
                  <div className="overflow-x-auto max-h-60">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Rectangle</th>
                          <th>Last Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.stale_rectangles.slice(0, 10).map((rect, idx) => (
                          <tr key={idx}>
                            <td className="font-mono">{rect.rectangle_code}</td>
                            <td className="text-xs">{rect.days_since_update}d ago</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Failing Rectangles */}
            {data.failing_rectangles.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    <span className="text-2xl">❌</span> Failing Rectangles
                    <span className="badge badge-error">{data.failing_rectangles.length}</span>
                  </h2>
                  <div className="overflow-x-auto max-h-60">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Rectangle</th>
                          <th>Failures</th>
                          <th>Success Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.failing_rectangles.slice(0, 10).map((rect) => (
                          <tr key={rect.rectangle_code}>
                            <td className="font-mono">{rect.rectangle_code}</td>
                            <td>
                              <span className="badge badge-error badge-sm">
                                {rect.consecutive_failures}x
                              </span>
                            </td>
                            <td>
                              <progress 
                                className="progress progress-error w-16 h-2" 
                                value={rect.success_rate_7d} 
                                max="100"
                              ></progress>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-base-content/60 py-4">
            <p>🌊 Copernicus Marine Data • Real-time monitoring • Auto-refreshes every 30s</p>
          </div>

        </div>
      </div>
    </>
  );
}
