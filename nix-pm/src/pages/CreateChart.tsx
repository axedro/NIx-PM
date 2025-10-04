import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supersetService } from '../services/superset';
import { semanticLayerService } from '../services/semanticLayer';

interface KPI {
  name: string;
  description: string;
  dataset: string;
}

interface ChartType {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export function CreateChart() {
  const navigate = useNavigate();
  const [chartName, setChartName] = useState('');
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());
  const [selectedChartType, setSelectedChartType] = useState<ChartType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedChartCategories, setExpandedChartCategories] = useState<Set<string>>(new Set(['Evolution']));
  const [categories, setCategories] = useState<any[]>([]);
  const [chartTypesByCategory, setChartTypesByCategory] = useState<Record<string, ChartType[]>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSemanticLayer();
  }, []);

  const loadSemanticLayer = async () => {
    try {
      await semanticLayerService.loadSemanticLayer();
      setCategories(semanticLayerService.getCategories());
      setChartTypesByCategory(semanticLayerService.getChartTypesByCategory());
      // Expand first category by default
      if (semanticLayerService.getCategories().length > 0) {
        setExpandedCategories(new Set([semanticLayerService.getCategories()[0].category]));
      }
    } catch (err) {
      setError('Failed to load semantic layer');
      console.error('Semantic layer load error:', err);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleChartCategory = (category: string) => {
    const newExpanded = new Set(expandedChartCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedChartCategories(newExpanded);
  };

  const toggleKPI = (kpiName: string) => {
    const newSelected = new Set(selectedKPIs);
    if (newSelected.has(kpiName)) {
      newSelected.delete(kpiName);
    } else {
      newSelected.add(kpiName);
    }
    setSelectedKPIs(newSelected);
  };

  const handlePreview = () => {
    if (!selectedChartType || selectedKPIs.size === 0) {
      setError('Please select at least one KPI and a chart type');
      return;
    }

    // Generate preview URL (for now, just a placeholder)
    const kpiList = Array.from(selectedKPIs).join(', ');
    setPreviewUrl(`Preview: ${kpiList} as ${selectedChartType.name}`);
    setError(null);
  };

  const handleSubmit = async () => {
    if (selectedKPIs.size === 0) {
      setError('Please select at least one KPI');
      return;
    }

    if (!selectedChartType) {
      setError('Please select a chart type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the dataset from the first selected KPI (assuming all selected KPIs use same dataset)
      const firstKPI = Array.from(selectedKPIs)[0];
      const datasetName = semanticLayerService.getDatasetForKPI(firstKPI);

      if (!datasetName) {
        throw new Error('Dataset not found for selected KPI');
      }

      // Get dataset details from Superset
      const datasets = await supersetService.getDatasets();
      console.log('All datasets from API:', datasets);
      console.log('Looking for dataset:', datasetName);

      const datasetObj = datasets.find((d: any) => d.table_name === datasetName);

      if (!datasetObj) {
        setError(`Dataset "${datasetName}" not found in Superset. Available datasets: ${datasets.map(d => d.table_name).join(', ') || 'none'}`);
        throw new Error(`Dataset "${datasetName}" not found. Found ${datasets.length} datasets total.`);
      }

      console.log('Found dataset:', datasetObj);

      // Get full dataset details including columns
      const datasetDetails = await supersetService.getDatasetDetails(datasetObj.id);
      console.log('Dataset details with columns:', datasetDetails);

      // Find the time column in the dataset (look for columns with temporal type)
      let timeColumn = null;
      if (datasetDetails.columns) {
        console.log('Dataset columns:', datasetDetails.columns);

        const temporalColumn = datasetDetails.columns.find((col: any) =>
          col.is_dttm ||
          col.type_generic === 1 || // Temporal type
          col.column_name.toLowerCase().includes('time') ||
          col.column_name.toLowerCase().includes('date') ||
          col.column_name.toLowerCase().includes('timestamp')
        );
        timeColumn = temporalColumn?.column_name;

        console.log('Temporal column found:', temporalColumn);
      }

      console.log('Time column:', timeColumn);
      console.log('Selected KPIs:', Array.from(selectedKPIs));

      // Build metrics array using selected KPI names
      const metrics = Array.from(selectedKPIs);

      // Build proper metrics in adhoc format
      const adhocMetrics = metrics.map(metricName => ({
        expressionType: 'SIMPLE',
        column: {
          column_name: metricName,
          type: 'DOUBLE'
        },
        aggregate: 'AVG',
        label: metricName,
        optionName: `metric_${metricName}`
      }));

      // Simplified params that Superset expects
      const params: any = {
        datasource: `${datasetObj.id}__table`,
        viz_type: selectedChartType.id,
        metrics: adhocMetrics,
        adhoc_filters: [],
        row_limit: 10000,
      };

      // Add time-related params if time column exists
      if (timeColumn) {
        params.granularity_sqla = timeColumn;
        params.time_range = 'No filter';
        params.time_grain_sqla = 'P1D';

        // For line/area charts, add x_axis
        const timeSeriesCharts = ['line', 'area', 'smooth_line', 'stepped_line', 'mixed_timeseries'];
        if (timeSeriesCharts.includes(selectedChartType.id)) {
          params.x_axis = timeColumn;
          params.x_axis_time_format = 'smart_date';
          params.line_interpolation = 'linear';
          params.show_legend = true;
          params.rich_tooltip = true;
          params.show_markers = false;
        }
      } else {
        // If no time column, set a default time range
        params.time_range = 'No filter';
      }

      console.log('Chart params:', params);
      console.log('Chart params stringified:', JSON.stringify(params, null, 2));

      // Create the chart
      const response = await supersetService.createChart({
        slice_name: chartName || `${selectedChartType.name} - ${Array.from(selectedKPIs).join(', ')}`,
        viz_type: selectedChartType.id,
        datasource_id: datasetObj.id,
        datasource_type: 'table',
        params: JSON.stringify(params),
      });

      console.log('Chart created:', response);

      // Instead of navigating to charts list, open the chart in edit mode in Superset
      // This allows the user to configure it properly
      const chartId = response.id;
      window.open(`http://localhost:8088/explore/?slice_id=${chartId}`, '_blank');

      setTimeout(() => {
        navigate('/charts');
      }, 500);
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Failed to create chart');
      console.error('Chart creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/charts')}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Charts
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Create New Chart</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4 p-6">
          {/* Column 1: KPI Selection */}
          <div className="col-span-3 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Select KPIs</h3>
              <p className="text-xs text-gray-600 mt-1">
                {selectedKPIs.size} selected
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {categories.map((category) => (
                <div key={category.category} className="mb-2">
                  <button
                    onClick={() => toggleCategory(category.category)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    {expandedCategories.has(category.category) ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="font-medium text-sm text-gray-900">
                      {category.category.replace(/_/g, ' ')}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      ({category.kpi.length})
                    </span>
                  </button>
                  {expandedCategories.has(category.category) && (
                    <div className="ml-6 mt-1 space-y-1">
                      {category.kpi.map((kpi: KPI) => (
                        <label
                          key={kpi.name}
                          className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedKPIs.has(kpi.name)}
                            onChange={() => toggleKPI(kpi.name)}
                            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 break-words">
                              {kpi.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {kpi.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Chart Type Selection */}
          <div className="col-span-3 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Chart Type</h3>
              <p className="text-xs text-gray-600 mt-1">
                {selectedChartType ? selectedChartType.name : 'None selected'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {Object.entries(chartTypesByCategory).map(([category, types]) => (
                <div key={category} className="mb-2">
                  <button
                    onClick={() => toggleChartCategory(category)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    {expandedChartCategories.has(category) ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="font-medium text-sm text-gray-900">
                      {category}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      ({types.length})
                    </span>
                  </button>
                  {expandedChartCategories.has(category) && (
                    <div className="ml-6 mt-1 space-y-1">
                      {types.map((chartType) => (
                        <button
                          key={chartType.id}
                          onClick={() => setSelectedChartType(chartType)}
                          className={`w-full text-left px-3 py-2 rounded transition-colors ${
                            selectedChartType?.id === chartType.id
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-sm font-medium">{chartType.name}</div>
                          {chartType.description && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {chartType.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Preview */}
          <div className="col-span-6 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Preview</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {!previewUrl ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="mb-2">No preview available</p>
                    <p className="text-sm">Select KPIs and chart type, then click Preview</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 mb-2">Chart Preview</div>
                    <div className="text-sm text-gray-600">{previewUrl}</div>
                    <div className="mt-4 text-xs text-gray-500">
                      Selected KPIs: {Array.from(selectedKPIs).join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-6 bg-white">
        <div className="mb-4">
          <label htmlFor="chartName" className="block text-sm font-medium text-gray-700 mb-2">
            Chart Name (optional)
          </label>
          <input
            id="chartName"
            type="text"
            value={chartName}
            onChange={(e) => setChartName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Auto-generated if left empty"
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/charts')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={selectedKPIs.size === 0 || !selectedChartType}
            className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || selectedKPIs.size === 0 || !selectedChartType}
            className="flex-1 bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Save Chart'}
          </button>
        </div>
      </div>
    </div>
  );
}
