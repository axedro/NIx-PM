import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { semanticLayerService } from '../services/semanticLayer';
import { alertsService } from '../services/alertsService';
import type {
  CreateAlertDto,
  ThresholdConfig,
  KPIStatistics,
  TimeWindow,
  CheckFrequency,
  AggregationMethod,
  ComparisonOperator,
} from '../types/alerts';
import {
  TIME_WINDOW_LABELS,
  CHECK_FREQUENCY_LABELS,
  AGGREGATION_LABELS,
  COMPARISON_LABELS,
} from '../types/alerts';

interface KPI {
  name: string;
  description: string;
  dataset: string;
}

interface Category {
  category: string;
  kpi: KPI[];
}

export function CreateAlert() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: KPI Selection
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);

  // Step 2: Alert Configuration
  const [alertName, setAlertName] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  const [comparison, setComparison] = useState<ComparisonOperator>('greater_than');
  const [thresholdUpper, setThresholdUpper] = useState<string>('');
  const [thresholdLower, setThresholdLower] = useState<string>('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1hour');
  const [aggregation, setAggregation] = useState<AggregationMethod>('avg');
  const [checkFrequency, setCheckFrequency] = useState<CheckFrequency>('15min');

  // Step 2: Timeseries data
  const [timeseriesData, setTimeseriesData] = useState<Array<{ timestamp: Date; value: number }>>([]);
  const [loadingTimeseries, setLoadingTimeseries] = useState(false);

  // Step 3: Statistics Preview
  const [statistics, setStatistics] = useState<KPIStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadSemanticLayer();
  }, []);

  useEffect(() => {
    if (step === 2 && selectedKPI) {
      loadTimeseries();
    }
  }, [step, selectedKPI]);

  async function loadSemanticLayer() {
    try {
      await semanticLayerService.loadSemanticLayer();
      const cats = semanticLayerService.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setExpandedCategories(new Set([cats[0].category]));
      }
    } catch (err) {
      setError('Failed to load KPIs');
    }
  }

  function toggleCategory(category: string) {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  }

  function handleSelectKPI(kpi: KPI) {
    setSelectedKPI(kpi);
    // Auto-generate alert name
    setAlertName(`${kpi.name} Alert`);
  }

  async function loadTimeseries() {
    if (!selectedKPI) return;

    setLoadingTimeseries(true);
    try {
      const data = await alertsService.getKPITimeseries(
        selectedKPI.name,
        selectedKPI.dataset,
        100
      );
      setTimeseriesData(data);
    } catch (err: any) {
      console.error('Failed to load timeseries:', err);
      setTimeseriesData([]);
    } finally {
      setLoadingTimeseries(false);
    }
  }

  async function handleNext() {
    if (step === 1) {
      if (!selectedKPI) {
        setError('Please select a KPI');
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      if (!alertName.trim()) {
        setError('Please enter an alert name');
        return;
      }
      if (comparison === 'greater_than' && !thresholdUpper) {
        setError('Please enter an upper threshold');
        return;
      }
      if (comparison === 'less_than' && !thresholdLower) {
        setError('Please enter a lower threshold');
        return;
      }
      if (comparison === 'between' && (!thresholdUpper || !thresholdLower)) {
        setError('Please enter both thresholds');
        return;
      }
      setError(null);
      await loadStatistics();
      setStep(3);
    }
  }

  async function loadStatistics() {
    if (!selectedKPI) return;

    setLoadingStats(true);
    try {
      const stats = await alertsService.calculateStatistics(
        selectedKPI.name,
        selectedKPI.dataset,
        timeWindow
      );
      setStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
      setStatistics(null);
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleCreate() {
    if (!selectedKPI) return;

    setLoading(true);
    setError(null);

    try {
      const config: ThresholdConfig = {
        metric: selectedKPI.name,
        comparison,
        time_window: timeWindow,
        aggregation,
      };

      if (thresholdUpper) {
        config.threshold_upper = parseFloat(thresholdUpper);
      }
      if (thresholdLower) {
        config.threshold_lower = parseFloat(thresholdLower);
      }

      const alertData: CreateAlertDto = {
        name: alertName,
        description: alertDescription || undefined,
        kpi_name: selectedKPI.name,
        dataset_name: selectedKPI.dataset,
        alert_type: 'threshold',
        enabled: true,
        check_frequency: checkFrequency,
        config,
      };

      await alertsService.createAlert(alertData);
      navigate('/alerts');
    } catch (err: any) {
      setError(err.message || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/alerts')}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Alerts
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Create New Alert</h2>
        </div>

        {/* Progress Steps */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-24 text-xs text-gray-600">
          <span className={step === 1 ? 'font-medium text-blue-600' : ''}>Select KPI</span>
          <span className={step === 2 ? 'font-medium text-blue-600' : ''}>Configure</span>
          <span className={step === 3 ? 'font-medium text-blue-600' : ''}>Review</span>
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

        <div className="max-w-4xl mx-auto">
          {/* Step 1: KPI Selection */}
          {step === 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select KPI to Monitor</h3>

              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.category}>
                    <button
                      onClick={() => toggleCategory(category.category)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <span className="font-medium text-gray-900">
                        {category.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-500">({category.kpi.length})</span>
                    </button>
                    {expandedCategories.has(category.category) && (
                      <div className="ml-4 mt-2 space-y-1">
                        {category.kpi.map((kpi) => (
                          <button
                            key={kpi.name}
                            onClick={() => handleSelectKPI(kpi)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              selectedKPI?.name === kpi.name
                                ? 'bg-blue-100 border-2 border-blue-500'
                                : 'hover:bg-gray-50 border-2 border-transparent'
                            }`}
                          >
                            <div className="font-medium text-gray-900">{kpi.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{kpi.description}</div>
                            <div className="text-xs text-gray-500 mt-1">Dataset: {kpi.dataset}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && selectedKPI && (
            <div className="space-y-6">
              {/* KPI Timeseries Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">KPI Historical Data</h3>
                <p className="text-sm text-gray-600 mb-4">Last 100 samples</p>

                {loadingTimeseries ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Loading chart data...
                  </div>
                ) : timeseriesData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No data available
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={timeseriesData.map(d => ({
                          timestamp: new Date(d.timestamp).toLocaleString(),
                          value: Number(d.value),
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name={selectedKPI.name}
                        />
                        {/* Reference Lines */}
                        <ReferenceLine
                          y={Math.max(...timeseriesData.map(d => Number(d.value)))}
                          stroke="#ef4444"
                          strokeDasharray="5 5"
                          label={{
                            value: `Max: ${Math.max(...timeseriesData.map(d => Number(d.value))).toLocaleString()}`,
                            position: 'right',
                            fill: '#ef4444',
                            fontSize: 12,
                          }}
                        />
                        <ReferenceLine
                          y={
                            timeseriesData.reduce((sum, d) => sum + Number(d.value), 0) /
                            timeseriesData.length
                          }
                          stroke="#f59e0b"
                          strokeDasharray="5 5"
                          label={{
                            value: `Mean: ${(
                              timeseriesData.reduce((sum, d) => sum + Number(d.value), 0) /
                              timeseriesData.length
                            ).toLocaleString()}`,
                            position: 'right',
                            fill: '#f59e0b',
                            fontSize: 12,
                          }}
                        />
                        <ReferenceLine
                          y={Math.min(...timeseriesData.map(d => Number(d.value)))}
                          stroke="#10b981"
                          strokeDasharray="5 5"
                          label={{
                            value: `Min: ${Math.min(...timeseriesData.map(d => Number(d.value))).toLocaleString()}`,
                            position: 'right',
                            fill: '#10b981',
                            fontSize: 12,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Configuration Form */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Alert</h3>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Selected KPI</div>
                  <div className="text-sm text-blue-700 mt-1">{selectedKPI.name}</div>
                </div>

                <div className="space-y-4">
                {/* Alert Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={alertName}
                    onChange={(e) => setAlertName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter alert name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={alertDescription}
                    onChange={(e) => setAlertDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>

                {/* Time Window */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Window
                  </label>
                  <select
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {Object.entries(TIME_WINDOW_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Aggregation Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aggregation Method
                  </label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as AggregationMethod)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {Object.entries(AGGREGATION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Comparison Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Condition
                  </label>
                  <select
                    value={comparison}
                    onChange={(e) => setComparison(e.target.value as ComparisonOperator)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {Object.entries(COMPARISON_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Thresholds */}
                {(comparison === 'greater_than' || comparison === 'between') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upper Threshold <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={thresholdUpper}
                      onChange={(e) => setThresholdUpper(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter upper threshold value"
                      step="any"
                    />
                  </div>
                )}

                {(comparison === 'less_than' || comparison === 'between') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lower Threshold <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={thresholdLower}
                      onChange={(e) => setThresholdLower(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter lower threshold value"
                      step="any"
                    />
                  </div>
                )}

                {/* Check Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check Frequency
                  </label>
                  <select
                    value={checkFrequency}
                    onChange={(e) => setCheckFrequency(e.target.value as CheckFrequency)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {Object.entries(CHECK_FREQUENCY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    How often the backend should check this alert condition
                  </p>
                </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Statistics */}
          {step === 3 && selectedKPI && (
            <div className="space-y-4">
              {/* Alert Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Configuration</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{alertName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">KPI</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedKPI.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Time Window</dt>
                    <dd className="mt-1 text-sm text-gray-900">{TIME_WINDOW_LABELS[timeWindow]}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Aggregation</dt>
                    <dd className="mt-1 text-sm text-gray-900">{AGGREGATION_LABELS[aggregation]}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Condition</dt>
                    <dd className="mt-1 text-sm text-gray-900">{COMPARISON_LABELS[comparison]}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Check Frequency</dt>
                    <dd className="mt-1 text-sm text-gray-900">{CHECK_FREQUENCY_LABELS[checkFrequency]}</dd>
                  </div>
                  {thresholdUpper && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Upper Threshold</dt>
                      <dd className="mt-1 text-sm font-semibold text-red-600">{parseFloat(thresholdUpper).toLocaleString()}</dd>
                    </div>
                  )}
                  {thresholdLower && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600">Lower Threshold</dt>
                      <dd className="mt-1 text-sm font-semibold text-orange-600">{parseFloat(thresholdLower).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Statistics */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">KPI Statistics</h3>
                  <span className="text-sm text-gray-500">({TIME_WINDOW_LABELS[timeWindow]})</span>
                </div>

                {loadingStats ? (
                  <div className="text-center py-8 text-gray-500">Loading statistics...</div>
                ) : statistics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Minimum</div>
                      <div className="text-xl font-semibold text-gray-900 mt-1">
                        {statistics.min_value.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Maximum</div>
                      <div className="text-xl font-semibold text-gray-900 mt-1">
                        {statistics.max_value.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-700">Average</div>
                      <div className="text-xl font-semibold text-blue-900 mt-1">
                        {statistics.avg_value.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">Median</div>
                      <div className="text-xl font-semibold text-gray-900 mt-1">
                        {statistics.median_value.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-red-600">
                    Failed to load statistics. The alert will still be created.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Alert'}
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
