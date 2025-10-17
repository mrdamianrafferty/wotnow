import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import type { WeatherMetricsSnapshot } from '../lib/monitoring/weatherMetrics';

type ProviderSnapshot = WeatherMetricsSnapshot['providers'][number];
type EndpointSnapshot = ProviderSnapshot['endpoints'][number];

const REFRESH_INTERVAL_MS = 15000;

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatTimestamp = (iso?: string) => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  } catch {
    return '—';
  }
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const calcFailureStreakClass = (count: number) => {
  if (count >= 5) return 'badge badge-error';
  if (count >= 3) return 'badge badge-warning';
  if (count > 0) return 'badge badge-info';
  return 'badge badge-success';
};

const calcSuccessRateClass = (rate: number) => {
  if (!Number.isFinite(rate)) return 'badge badge-neutral';
  if (rate >= 0.95) return 'badge badge-success';
  if (rate >= 0.8) return 'badge badge-info';
  if (rate >= 0.5) return 'badge badge-warning';
  return 'badge badge-error';
};

export default function WeatherMetricsPage() {
  const [data, setData] = useState<WeatherMetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [providerFilter, setProviderFilter] = useState<string>('');

  const fetchMetrics = async () => {
    try {
      const query = providerFilter ? `?provider=${encodeURIComponent(providerFilter)}` : '';
      const res = await fetch(`/api/weather-metrics${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load metrics (${res.status})`);
      const snapshot: WeatherMetricsSnapshot = await res.json();
      setData(snapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const id = setInterval(fetchMetrics, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, providerFilter]);

  const handleReset = async () => {
    try {
      await fetch('/api/weather-metrics?reset=true', { method: 'POST' });
      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset metrics');
    }
  };

  const providers = useMemo<ProviderSnapshot[]>(() => data?.providers ?? [], [data]);

  const uptime = useMemo(() => {
    if (!data) return '—';
    return formatDuration(data.uptimeSeconds);
  }, [data]);

  return (
    <>
      <Head>
        <title>Weather API Metrics • Go Daisy</title>
      </Head>

      <div className="min-h-screen bg-base-200 py-10 px-4 md:px-10 lg:px-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Weather API Metrics</h1>
              <p className="text-base-content/70">
                Real-time view of outbound weather provider usage and health. Data resets on server restart unless manually cleared.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="label cursor-pointer gap-2">
                <span className="label-text text-base-content/70">Auto-refresh</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                />
              </label>
              <button className="btn btn-sm btn-outline" onClick={fetchMetrics}>
                Refresh Now
              </button>
              <button className="btn btn-sm btn-error" onClick={handleReset}>
                Reset Metrics
              </button>
            </div>
          </header>

          {loading ? (
            <div className="card bg-base-100 shadow">
              <div className="card-body items-center">
                <span className="loading loading-spinner loading-lg text-primary" />
                <p className="mt-4 text-base-content/70">Loading metrics…</p>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-error shadow-lg">
              <span>{error}</span>
            </div>
          ) : !data ? (
            <div className="alert alert-info shadow-lg">
              <span>No metrics collected yet. Trigger any weather endpoint and refresh.</span>
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="stat bg-base-100 shadow rounded-box">
                  <div className="stat-title">Uptime</div>
                  <div className="stat-value text-primary text-2xl">{uptime}</div>
                  <div className="stat-desc">
                    Started {formatTimestamp(data.startedAt)}
                  </div>
                </div>
                <div className="stat bg-base-100 shadow rounded-box">
                  <div className="stat-title">Total Requests</div>
                  <div className="stat-value text-2xl">{data.totalRequests}</div>
                  <div className="stat-desc">{providers.length} providers</div>
                </div>
                <div className="stat bg-base-100 shadow rounded-box">
                  <div className="stat-title">Successful</div>
                  <div className="stat-value text-success text-2xl">
                    {providers.reduce((sum, p) => sum + p.successes, 0)}
                  </div>
                  <div className="stat-desc text-success">
                    {formatPercent(
                      data.totalRequests ? providers.reduce((sum, p) => sum + p.successes, 0) / data.totalRequests : 0
                    )}{' '}
                    success rate
                  </div>
                </div>
                <div className="stat bg-base-100 shadow rounded-box">
                  <div className="stat-title">Failures</div>
                  <div className="stat-value text-error text-2xl">
                    {providers.reduce((sum, p) => sum + p.failures, 0)}
                  </div>
                  <div className="stat-desc text-error">
                    {providers.reduce((sum, p) => sum + p.consecutiveFailures, 0)} current streak
                  </div>
                </div>
              </section>

              <section className="bg-base-100 shadow rounded-box">
                <div className="p-6 border-b border-base-200 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Provider Metrics</h2>
                    <p className="text-base-content/70">
                      Filter by provider to drill into endpoint performance. Sorted by total request volume.
                    </p>
                  </div>
                  {providers.length > 1 && (
                    <div className="form-control w-full max-w-xs">
                      <label className="label">
                        <span className="label-text">Provider filter</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={providerFilter}
                        onChange={(event) => setProviderFilter(event.target.value)}
                      >
                        <option value="">All providers</option>
                        {providers.map((provider) => (
                          <option key={provider.provider} value={provider.provider}>
                            {provider.provider} ({provider.requests} reqs)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Requests</th>
                        <th>Success</th>
                        <th>Failure</th>
                        <th>Success Rate</th>
                        <th>Last Request</th>
                        <th>Last Status</th>
                        <th>Failure Streak</th>
                        <th>Last Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map((provider) => (
                        <ProviderRow key={provider.provider} provider={provider} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ProviderRow({ provider }: { provider: ProviderSnapshot }) {
  return (
    <>
      <tr className="hover">
        <td className="font-medium">
          <div className="flex flex-col">
            <span>{provider.provider}</span>
            {provider.lastEndpoint && (
              <span className="text-xs text-base-content/60">Last endpoint: {provider.lastEndpoint}</span>
            )}
            {provider.lastNote && (
              <span className="text-xs text-base-content/50 break-words">Note: {provider.lastNote}</span>
            )}
          </div>
        </td>
        <td>{provider.requests}</td>
        <td className="text-success">{provider.successes}</td>
        <td className="text-error">{provider.failures}</td>
        <td>
          <span className={calcSuccessRateClass(provider.successRate)}>
            {formatPercent(provider.successRate)}
          </span>
        </td>
        <td>
          <div className="flex flex-col text-sm">
            <span>Req: {formatTimestamp(provider.lastRequestAt)}</span>
            <span className="text-success">OK: {formatTimestamp(provider.lastSuccessAt)}</span>
            <span className="text-error">Fail: {formatTimestamp(provider.lastFailureAt)}</span>
          </div>
        </td>
        <td>{provider.lastStatus ?? '—'}</td>
        <td>
          <span className={calcFailureStreakClass(provider.consecutiveFailures)}>
            {provider.consecutiveFailures}
          </span>
        </td>
        <td className="max-w-xs">
          <span className="text-xs text-error">
            {provider.lastError ?? '—'}
          </span>
        </td>
      </tr>
      <tr>
        <td colSpan={9} className="bg-base-200/40">
          <EndpointsTable endpoints={provider.endpoints} />
        </td>
      </tr>
    </>
  );
}

function EndpointsTable({ endpoints }: { endpoints: EndpointSnapshot[] }) {
  if (!endpoints.length) {
    return <div className="p-4 text-sm text-base-content/60">No endpoint metrics recorded.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Requests</th>
            <th>Success</th>
            <th>Failure</th>
            <th>Success Rate</th>
            <th>Last Request</th>
            <th>Last Status</th>
            <th>Last Error</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((endpoint) => (
            <tr key={endpoint.endpoint}>
              <td className="font-medium">{endpoint.endpoint}</td>
              <td>{endpoint.requests}</td>
              <td className="text-success">{endpoint.successes}</td>
              <td className="text-error">{endpoint.failures}</td>
              <td>
                <span className={calcSuccessRateClass(endpoint.successRate)}>
                  {formatPercent(endpoint.successRate)}
                </span>
              </td>
              <td>
                <div className="flex flex-col text-xs">
                  <span>Req: {formatTimestamp(endpoint.lastRequestAt)}</span>
                  <span className="text-success">OK: {formatTimestamp(endpoint.lastSuccessAt)}</span>
                  <span className="text-error">Fail: {formatTimestamp(endpoint.lastFailureAt)}</span>
                </div>
              </td>
              <td>{endpoint.lastStatus ?? '—'}</td>
              <td className="max-w-md">
                <span className="text-xs text-error">{endpoint.lastError ?? '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
