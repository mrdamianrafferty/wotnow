import React, { useEffect, useState } from 'react';
import Head from 'next/head';

interface HealthMetric {
  metric: string;
  value: number;
  status: 'info' | 'warning' | 'critical';
}

interface DashboardSummary {
  last_run: string | null;
  last_success_rate: number | string | null;
  avg_success_rate_7d: number | string | null;
  avg_success_rate_30d: number | string | null;
  rectangles_updated_24h: number | string | null;
  rectangles_failing: number | string | null;
  rectangles_stale: number | string | null;
  unresolved_alerts: number | string | null;
  alerts_24h: number | string | null;
}

interface IngestionLog {
  id: number;
  timestamp: string;
  target_date: string;
  success_rate: number | string | null;
  total_rectangles: number | null;
  successful: number | null;
  failed: number | null;
  partial: number | null;
  duration_minutes: number | null;
}

interface Alert {
  id: number;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  notification_method: string | null;
  details: Record<string, unknown> | null;
}

interface StaleRectangle {
  rectangle_code: string;
  last_update: string | null;
  hours_since_update: number | null;
}

interface FailingRectangle {
  rectangle_code: string;
  consecutive_failures: number | null;
  last_failed_ingestion: string | null;
  last_successful_ingestion: string | null;
  total_ingestions: number | null;
  successful_ingestions: number | null;
  notes: string | null;
}

interface StatusData {
  health_score: number;
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  summary: DashboardSummary;
  health_metrics: HealthMetric[];
  recent_logs: IngestionLog[];
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

  const getIngestionStatus = (log: IngestionLog) => {
    if ((log.failed ?? 0) > 0 && (log.successful ?? 0) === 0) return 'failed';
    if ((log.failed ?? 0) > 0 || (log.partial ?? 0) > 0) return 'partial';
    return 'success';
  };

  const getAlertClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'alert alert-error';
      case 'warning':
        return 'alert alert-warning';
      default:
        return 'alert alert-info';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      info: 'badge-info',
      warning: 'badge-warning',
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

  const metricMap = data.health_metrics.reduce<Record<string, HealthMetric>>((acc, metric) => {
    acc[metric.metric] = metric;
    return acc;
  }, {});

  const totalRectangles = Number(metricMap['total_rectangles']?.value ?? 0);
  const rectanglesWithData = Number(
    metricMap['rectangles_with_data']?.value ?? metricMap['total_rectangles']?.value ?? 0
  );
  const rectanglesStale = Number(
    data.summary.rectangles_stale ?? metricMap['rectangles_stale_48h']?.value ?? 0
  );
  const rectanglesFailing = Number(
    data.summary.rectangles_failing ?? metricMap['rectangles_failing']?.value ?? 0
  );
  const avgSuccessRate7d = Number(
    data.summary.avg_success_rate_7d ?? metricMap['average_success_rate_7d']?.value ?? 0
  );
  const unresolvedAlerts = Number(
    data.summary.unresolved_alerts ?? metricMap['unresolved_alerts']?.value ?? 0
  );
  const rectanglesUpdated24h = Number(data.summary.rectangles_updated_24h ?? 0);
  const lastRunSuccessRate = Number(data.summary.last_success_rate ?? 0);
  const lastRunTimestamp = data.summary.last_run ? new Date(data.summary.last_run) : null;

  const recentLogs = data.recent_logs ?? [];
  const now = Date.now();
  const last24hLogs = recentLogs.filter(
    (log) => now - new Date(log.timestamp).getTime() <= 24 * 60 * 60 * 1000
  );
  const totalIngestions24h = last24hLogs.reduce(
    (sum, log) => sum + Number(log.total_rectangles ?? 0),
    0
  );
  const successful24h = last24hLogs.reduce(
    (sum, log) => sum + Number(log.successful ?? 0),
    0
  );
  const failed24h = last24hLogs.reduce((sum, log) => sum + Number(log.failed ?? 0), 0);
  const partial24h = last24hLogs.reduce((sum, log) => sum + Number(log.partial ?? 0), 0);
  const successRate24h = totalIngestions24h
    ? (successful24h / totalIngestions24h) * 100
    : 0;

  const staleRectangles = data.stale_rectangles ?? [];
  const failingRectangles = data.failing_rectangles ?? [];

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
                Last updated: {new Date(data.timestamp).toLocaleTimeString()} · Last run:{' '}
                {lastRunTimestamp ? lastRunTimestamp.toLocaleString() : '—'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="stats shadow bg-base-100">
              <div className="stat">
                <div className="stat-figure text-primary text-3xl">📦</div>
                <div className="stat-title">Tracked Rectangles</div>
                <div className="stat-value text-primary">{totalRectangles}</div>
                <div className="stat-desc">
                  {rectanglesWithData} reporting in last 48h · {rectanglesUpdated24h} updated in 24h
                </div>
                {totalRectangles > 0 && (
                  <progress
                    className="progress progress-primary w-full mt-2"
                    value={rectanglesWithData}
                    max={totalRectangles}
                  ></progress>
                )}
              </div>
            </div>

            <div className="stats shadow bg-base-100">
              <div className="stat">
                <div className="stat-figure text-success text-3xl">✅</div>
                <div className="stat-title">7-Day Success Rate</div>
                <div className="stat-value text-success">{avgSuccessRate7d.toFixed(1)}%</div>
                <div className="stat-desc">
                  Last run {lastRunSuccessRate.toFixed(1)}%
                </div>
                <progress
                  className="progress progress-success w-full mt-2"
                  value={avgSuccessRate7d}
                  max={100}
                ></progress>
              </div>
            </div>

            <div className="stats shadow bg-base-100">
              <div className="stat">
                <div className="stat-figure text-info text-3xl">📊</div>
                <div className="stat-title">24h Ingestions</div>
                <div className="stat-value text-info">{totalIngestions24h}</div>
                <div className="stat-desc">
                  {successful24h} ok · {partial24h} partial · {failed24h} failed
                </div>
                <progress
                  className="progress progress-info w-full mt-2"
                  value={successRate24h}
                  max={100}
                ></progress>
              </div>
            </div>

            <div className="stats shadow bg-base-100">
              <div className="stat">
                <div className="stat-figure text-error text-3xl">🚨</div>
                <div className="stat-title">Active Alerts</div>
                <div className="stat-value text-error">{unresolvedAlerts}</div>
                <div className="stat-desc">
                  {rectanglesFailing} failing · {rectanglesStale} stale
                </div>
                {unresolvedAlerts > 0 && (
                  <progress
                    className="progress progress-error w-full mt-2"
                    value={unresolvedAlerts}
                    max={Math.max(unresolvedAlerts, 10)}
                  ></progress>
                )}
              </div>
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
                        <th>Run Time</th>
                        <th>Target Date</th>
                        <th>Status</th>
                        <th>Success Rate</th>
                        <th>Successful</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.slice(0, 8).map((log) => {
                        const status = getIngestionStatus(log);
                        const successRate = Number(log.success_rate ?? 0).toFixed(1);
                        const successful = Number(log.successful ?? 0);
                        const total = Number(log.total_rectangles ?? 0);
                        const partial = Number(log.partial ?? 0);
                        const duration = log.duration_minutes ?? null;
                        return (
                        <tr key={log.id}>
                          <td className="text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="font-mono text-xs">{log.target_date}</td>
                          <td>
                            <span className={`badge badge-sm ${getStatusBadge(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td>{successRate}%</td>
                          <td className="text-xs">
                            {successful}/{total}
                            {partial ? ` (+${partial} partial)` : ''}
                          </td>
                          <td className="text-xs">{duration !== null ? `${duration} min` : '—'}</td>
                        </tr>
                        );
                      })}
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
                    {data.alerts.map((alert) => {
                      const rectangle =
                        alert.details && typeof alert.details === 'object'
                          ? (alert.details as { rectangle_code?: string }).rectangle_code
                          : undefined;
                      return (
                        <div key={alert.id} className={getAlertClass(alert.severity)}>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`badge ${getSeverityBadge(alert.severity)}`}>
                                {alert.severity}
                              </span>
                              <span className="font-semibold capitalize">
                                {alert.alert_type.replace(/_/g, ' ')}
                              </span>
                              {rectangle && (
                                <span className="badge badge-outline badge-sm font-mono">
                                  {rectangle}
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1">{alert.message}</p>
                            <p className="text-xs text-base-content/60 mt-1">
                              {alert.notification_method
                                ? `Notified via ${alert.notification_method}`
                                : 'Notification pending'}{' '}
                              · {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Stale Data */}
            {staleRectangles.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    <span className="text-2xl">⏰</span> Stale Data
                    <span className="badge badge-warning">{staleRectangles.length}</span>
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
                        {staleRectangles.slice(0, 10).map((rect) => {
                          const hours = Number(rect.hours_since_update ?? 0);
                          const days = Math.floor(hours / 24);
                          const remainingHours = Math.round(hours % 24);
                          return (
                            <tr key={rect.rectangle_code}>
                              <td className="font-mono text-sm">{rect.rectangle_code}</td>
                              <td className="text-xs">
                                {rect.last_update
                                  ? new Date(rect.last_update).toLocaleString()
                                  : 'Unknown'}
                                <div className="text-base-content/60">
                                  {days}d {remainingHours}h ago
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Failing Rectangles */}
            {failingRectangles.length > 0 && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">
                    <span className="text-2xl">❌</span> Failing Rectangles
                    <span className="badge badge-error">{failingRectangles.length}</span>
                  </h2>
                  <div className="overflow-x-auto max-h-60">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Rectangle</th>
                          <th>Failures</th>
                          <th>Last Failure</th>
                          <th>Success Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failingRectangles.slice(0, 10).map((rect) => {
                          const totalAttempts = Number(rect.total_ingestions ?? 0);
                          const successfulAttempts = Number(rect.successful_ingestions ?? 0);
                          const successRate = totalAttempts
                            ? (successfulAttempts / totalAttempts) * 100
                            : 0;
                          return (
                            <tr key={rect.rectangle_code}>
                              <td className="font-mono text-sm">{rect.rectangle_code}</td>
                              <td>
                                <span className="badge badge-error badge-sm">
                                  {Number(rect.consecutive_failures ?? 0)}x
                                </span>
                              </td>
                              <td className="text-xs">
                                {rect.last_failed_ingestion
                                  ? new Date(rect.last_failed_ingestion).toLocaleString()
                                  : 'Unknown'}
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <progress
                                    className="progress progress-error w-24 h-2"
                                    value={successRate}
                                    max="100"
                                  ></progress>
                                  <span className="text-xs text-base-content/70">
                                    {successRate.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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

// Disable static generation for this status page
export async function getServerSideProps() {
  return { props: {} };
}
