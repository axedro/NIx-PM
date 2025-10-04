import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Bell, BellOff, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { alertsService } from '../services/alertsService';
import type { Alert } from '../types/alerts';
import { CHECK_FREQUENCY_LABELS, TIME_WINDOW_LABELS, AGGREGATION_LABELS } from '../types/alerts';

export function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  async function loadAlerts() {
    try {
      setLoading(true);
      setError(null);
      const params = filter === 'all' ? {} : { enabled: filter === 'enabled' };
      const data = await alertsService.getAlerts(params);
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleEnabled(alert: Alert) {
    try {
      if (alert.enabled) {
        await alertsService.disableAlert(alert.id);
      } else {
        await alertsService.enableAlert(alert.id);
      }
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle alert');
    }
  }

  async function handleDelete(alert: Alert) {
    if (!window.confirm(`Are you sure you want to delete "${alert.name}"?`)) {
      return;
    }

    try {
      await alertsService.deleteAlert(alert.id);
      await loadAlerts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete alert');
    }
  }

  function getStatusBadge(alert: Alert) {
    if (alert.enabled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Bell className="w-3 h-3" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <BellOff className="w-3 h-3" />
        Disabled
      </span>
    );
  }

  function getTypeBadge(type: string) {
    return (
      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {type === 'threshold' ? 'Threshold' : 'Anomaly'}
      </span>
    );
  }

  function formatLastChecked(lastChecked?: string) {
    if (!lastChecked) return 'Never';
    const date = new Date(lastChecked);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Alerts</h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitor KPIs and get notified when thresholds are exceeded
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadAlerts}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => navigate('/alerts/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Alert
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('enabled')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'enabled'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('disabled')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'disabled'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Disabled
          </button>
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first alert to start monitoring KPIs
            </p>
            <button
              onClick={() => navigate('/alerts/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Alert
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{alert.name}</h3>
                    {alert.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{alert.description}</p>
                    )}
                  </div>
                  {getStatusBadge(alert)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">KPI:</span>
                    <span className="font-medium text-gray-900 truncate ml-2">{alert.kpi_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type:</span>
                    {getTypeBadge(alert.alert_type)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Check Frequency:</span>
                    <span className="text-gray-900">{CHECK_FREQUENCY_LABELS[alert.check_frequency]}</span>
                  </div>
                  {alert.alert_type === 'threshold' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Window:</span>
                        <span className="text-gray-900">{TIME_WINDOW_LABELS[alert.config.time_window]}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Aggregation:</span>
                        <span className="text-gray-900">{AGGREGATION_LABELS[alert.config.aggregation]}</span>
                      </div>
                      {alert.config.threshold_upper !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Upper Threshold:</span>
                          <span className="font-medium text-red-600">{alert.config.threshold_upper.toLocaleString()}</span>
                        </div>
                      )}
                      {alert.config.threshold_lower !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Lower Threshold:</span>
                          <span className="font-medium text-orange-600">{alert.config.threshold_lower.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Last Checked:</span>
                    <span className="text-gray-900">{formatLastChecked(alert.last_checked_at)}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/alerts/${alert.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                  >
                    <Edit className="w-4 h-4" />
                    Details
                  </button>
                  <button
                    onClick={() => handleToggleEnabled(alert)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors border ${
                      alert.enabled
                        ? 'text-orange-700 hover:bg-orange-50 border-orange-300'
                        : 'text-green-700 hover:bg-green-50 border-green-300'
                    }`}
                    title={alert.enabled ? 'Disable' : 'Enable'}
                  >
                    {alert.enabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(alert)}
                    className="px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-300"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
