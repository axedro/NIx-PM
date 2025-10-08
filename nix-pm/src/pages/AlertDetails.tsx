import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Trash2, RefreshCw, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { alertsService } from '../services/alertsService';
import type { Alert, AlertTrigger, AlertStatistics } from '../types/alerts';
import { TIME_WINDOW_LABELS, CHECK_FREQUENCY_LABELS, AGGREGATION_LABELS, COMPARISON_LABELS } from '../types/alerts';

export function AlertDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAlert();
      loadStatistics();
      loadTriggers();
    }
  }, [id]);

  async function loadAlert() {
    try {
      setLoading(true);
      const data = await alertsService.getAlertById(parseInt(id!));
      setAlert(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load alert');
    } finally {
      setLoading(false);
    }
  }

  async function loadStatistics() {
    try {
      const data = await alertsService.getAlertStatistics(parseInt(id!));
      setStatistics(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  }

  async function loadTriggers() {
    try {
      const data = await alertsService.getAlertTriggers(parseInt(id!), 20);
      setTriggers(data);
    } catch (err) {
      console.error('Failed to load triggers:', err);
    }
  }

  async function handleToggleEnabled() {
    if (!alert) return;

    try {
      if (alert.enabled) {
        await alertsService.disableAlert(alert.id);
      } else {
        await alertsService.enableAlert(alert.id);
      }
      await loadAlert();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle alert');
    }
  }

  async function handleDelete() {
    if (!alert || !window.confirm(`Are you sure you want to delete "${alert.name}"?`)) {
      return;
    }

    try {
      await alertsService.deleteAlert(alert.id);
      navigate('/alerts');
    } catch (err: any) {
      setError(err.message || 'Failed to delete alert');
    }
  }

  async function handleTest() {
    if (!alert) return;

    setTesting(true);
    setTestResult(null);
    try {
      const result = await alertsService.testAlert(alert.id);
      setTestResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to test alert');
    } finally {
      setTesting(false);
    }
  }

  async function handleResolveTrigger(triggerId: number) {
    try {
      await alertsService.resolveTrigger(triggerId);
      await loadTriggers();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve trigger');
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Alert not found</h3>
          <button
            onClick={() => navigate('/alerts')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Alerts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/alerts')}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{alert.name}</h2>
              {alert.description && (
                <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              Test Alert
            </button>
            <button
              onClick={handleToggleEnabled}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
                alert.enabled
                  ? 'text-orange-700 hover:bg-orange-50 border-orange-300'
                  : 'text-green-700 hover:bg-green-50 border-green-300'
              }`}
            >
              {alert.enabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {alert.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            testResult.would_trigger
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.would_trigger ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">Alert would trigger!</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Alert would NOT trigger</span>
                </>
              )}
            </div>
            <div className="text-sm">
              <div className={testResult.would_trigger ? 'text-red-700' : 'text-green-700'}>
                Current value: <span className="font-semibold">{testResult.current_value?.toLocaleString()}</span>
              </div>
              {testResult.reason && (
                <div className={testResult.would_trigger ? 'text-red-600' : 'text-green-600'}>
                  {testResult.reason}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alert Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Status</dt>
                  <dd className="mt-1">
                    {alert.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Bell className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <BellOff className="w-3 h-3" />
                        Disabled
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">KPI</dt>
                  <dd className="mt-1 text-sm text-gray-900">{alert.kpi_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Dataset</dt>
                  <dd className="mt-1 text-sm text-gray-900">{alert.dataset_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Check Frequency</dt>
                  <dd className="mt-1 text-sm text-gray-900">{CHECK_FREQUENCY_LABELS[alert.check_frequency]}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Time Window</dt>
                  <dd className="mt-1 text-sm text-gray-900">{TIME_WINDOW_LABELS[alert.config.time_window]}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Aggregation</dt>
                  <dd className="mt-1 text-sm text-gray-900">{AGGREGATION_LABELS[alert.config.aggregation]}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Condition</dt>
                  <dd className="mt-1 text-sm text-gray-900">{COMPARISON_LABELS[alert.config.comparison]}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Last Checked</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {alert.last_checked_at ? formatRelativeTime(alert.last_checked_at) : 'Never'}
                  </dd>
                </div>
                {alert.config.threshold_upper !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Upper Threshold</dt>
                    <dd className="mt-1 text-sm font-semibold text-red-600">{alert.config.threshold_upper.toLocaleString()}</dd>
                  </div>
                )}
                {alert.config.threshold_lower !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Lower Threshold</dt>
                    <dd className="mt-1 text-sm font-semibold text-orange-600">{alert.config.threshold_lower.toLocaleString()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-600">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(alert.created_at)}</dd>
                </div>
              </dl>
            </div>

            {/* Trigger History */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Trigger History</h3>
                <button
                  onClick={loadTriggers}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Refresh
                </button>
              </div>

              {triggers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No triggers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {triggers.map((trigger) => (
                    <div
                      key={trigger.id}
                      className={`p-3 rounded-lg border ${
                        trigger.resolved
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {trigger.resolved ? (
                              <CheckCircle className="w-4 h-4 text-gray-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${
                              trigger.resolved ? 'text-gray-700' : 'text-red-900'
                            }`}>
                              {formatDate(trigger.triggered_at)}
                            </span>
                          </div>
                          <div className={`text-sm mt-1 ${
                            trigger.resolved ? 'text-gray-600' : 'text-red-700'
                          }`}>
                            Value: <span className="font-semibold">{trigger.value.toLocaleString()}</span>
                            {trigger.metadata?.reason && (
                              <div className="mt-1">{trigger.metadata.reason}</div>
                            )}
                          </div>
                          {trigger.resolved && trigger.resolved_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Resolved {formatRelativeTime(trigger.resolved_at)}
                            </div>
                          )}
                        </div>
                        {!trigger.resolved && (
                          <button
                            onClick={() => handleResolveTrigger(trigger.id)}
                            className="ml-2 px-2 py-1 text-xs text-green-700 hover:bg-green-100 rounded transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Statistics</h3>
              </div>

              {statistics ? (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600">Minimum</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {statistics.min_value.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600">Maximum</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {statistics.max_value.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-700">Average</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {statistics.avg_value.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600">Median</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {statistics.median_value.toLocaleString()}
                    </div>
                  </div>
                  {statistics.stddev_value !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">Std Deviation</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {statistics.stddev_value.toLocaleString()}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Period: {TIME_WINDOW_LABELS[alert.config.time_window]}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No statistics available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
