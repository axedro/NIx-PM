import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supersetService } from '../services/superset';
import { semanticLayerService } from '../services/semanticLayer';
import supersetDatasetsService from '../services/supersetDatasetsService';
import config from '../config/env';

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
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());
  const [selectedChartType, setSelectedChartType] = useState<ChartType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedChartCategories, setExpandedChartCategories] = useState<Set<string>>(new Set(['Evolution']));
  const [categories, setCategories] = useState<any[]>([]);
  const [chartTypesByCategory, setChartTypesByCategory] = useState<Record<string, ChartType[]>>({});
  const [timeGrain, setTimeGrain] = useState('P1D'); // Default: daily
  const [timeRange, setTimeRange] = useState('No filter'); // Default: no filter
  const [availableDatasets, setAvailableDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<any | null>(null);
  const [selectedSpatialLevel, setSelectedSpatialLevel] = useState<string>('');
  const [availableTimeGranularities, setAvailableTimeGranularities] = useState<string[]>([]);

  useEffect(() => {
    loadSemanticLayer();
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const datasets = await supersetDatasetsService.getAllDatasets({ active_only: true });
      setAvailableDatasets(datasets as any);
      if (datasets.length > 0) {
        // Get unique spatial levels
        const firstSpatialLevel = datasets[0].geographic_level;
        setSelectedSpatialLevel(firstSpatialLevel);

        // Get time granularities for first spatial level
        const timeGrains = datasets
          .filter((d: any) => d.geographic_level === firstSpatialLevel)
          .map((d: any) => d.time_aggregation);
        setAvailableTimeGranularities(timeGrains);

        // Set first dataset as default
        setSelectedDataset(datasets[0] as any);
        setTimeGrain(datasets[0].time_aggregation);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

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

  const handleSpatialLevelChange = (spatialLevel: string) => {
    setSelectedSpatialLevel(spatialLevel);

    // Get available time granularities for this spatial level
    const timeGrains = availableDatasets
      .filter((d: any) => d.geographic_level === spatialLevel)
      .map((d: any) => d.time_aggregation);
    setAvailableTimeGranularities(timeGrains);

    // Select first available time grain
    if (timeGrains.length > 0) {
      const firstTimeGrain = timeGrains[0];
      setTimeGrain(firstTimeGrain);

      // Find and set the matching dataset
      const matchingDataset = availableDatasets.find(
        (d: any) => d.geographic_level === spatialLevel && d.time_aggregation === firstTimeGrain
      );
      setSelectedDataset(matchingDataset || null);
    }
  };

  const handleTimeGrainChange = (newTimeGrain: string) => {
    setTimeGrain(newTimeGrain);

    // Find and set the matching dataset
    const matchingDataset = availableDatasets.find(
      (d: any) => d.geographic_level === selectedSpatialLevel && d.time_aggregation === newTimeGrain
    );
    setSelectedDataset(matchingDataset || null);
  };

  const handlePreview = async () => {
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
      // Use the selected dataset's postgres table
      if (!selectedDataset) {
        throw new Error('Please select a spatial aggregation level');
      }

      const datasetName = selectedDataset.postgres_table;

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
      let spatialColumn = null;

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

        // Find spatial column based on the selected dataset's geographic level
        // Map geographic level to expected column name
        const geoLevelToColumn: Record<string, string> = {
          'provincia': 'province',
          'region': 'region',
          'zipcode': 'postal_code',
          'celda': 'cell',
          'nodo': 'node'
        };

        const expectedColumnName = geoLevelToColumn[selectedDataset?.geographic_level || ''];

        if (expectedColumnName && selectedDataset?.geographic_level !== 'global') {
          // Look for the expected column name
          spatialColumn = datasetDetails.columns.find((col: any) =>
            col.column_name.toLowerCase() === expectedColumnName.toLowerCase() ||
            col.column_name.toLowerCase().includes(expectedColumnName.toLowerCase())
          )?.column_name;
        }

        console.log('Temporal column found:', temporalColumn);
        console.log('Spatial column found:', spatialColumn);
      }

      console.log('Time column:', timeColumn);
      console.log('Spatial column:', spatialColumn);
      console.log('Selected spatial level:', selectedDataset?.geographic_level);
      console.log('Selected KPIs:', Array.from(selectedKPIs));

      // Map chart types to Superset's expected viz_type values
      const vizTypeMapping: Record<string, string> = {
        'line': 'echarts_timeseries_line',
        'area': 'echarts_area',
        'smooth_line': 'echarts_timeseries_smooth',
        'stepped_line': 'echarts_timeseries_step',
        'bar': 'echarts_timeseries_bar',
        'dist_bar': 'dist_bar',
        'column': 'echarts_timeseries_bar',
        'mixed_timeseries': 'mixed_timeseries',
        'pie': 'pie',
        'donut': 'pie',
        'table': 'table',
        'pivot_table': 'pivot_table_v2',
        'big_number': 'big_number',
        'big_number_total': 'big_number_total',
        'histogram': 'histogram',
        'box_plot': 'box_plot',
        'treemap': 'treemap_v2',
        'sunburst': 'sunburst_v2',
        'world_map': 'world_map',
        'country_map': 'country_map',
        'time_table': 'time_table'
      };

      const vizType = vizTypeMapping[selectedChartType.id] || selectedChartType.id;
      console.log('Chart type mapping:', selectedChartType.id, '->', vizType);

      // Build metrics array using SQL expression type
      const metrics = Array.from(selectedKPIs).map((kpiName, index) => ({
        expressionType: 'SQL',
        sqlExpression: `SUM(${kpiName})`,
        label: kpiName,
        optionName: `metric_${kpiName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${index}`
      }));

      // Build adhoc_filters array
      // Add spatial filter if not global (empty filter for cross-filter compatibility)
      const adhocFilters: any[] = [];

      if (selectedDataset?.geographic_level !== 'global' && spatialColumn) {
        adhocFilters.push({
          clause: 'WHERE',
          subject: spatialColumn,
          operator: 'IN',
          comparator: [],
          expressionType: 'SIMPLE',
          isExtra: false,
          filterOptionName: `filter_${spatialColumn.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        });
      }

      // Build minimal form_data - don't include columns array to let Superset load them
      // Use user-selected time grain and range
      const formData = {
        datasource: `${datasetObj.id}__table`,
        viz_type: vizType,
        granularity_sqla: timeColumn || 'timestamp',
        time_range: timeRange,
        time_grain_sqla: timeGrain,
        metrics: metrics,
        adhoc_filters: adhocFilters
      };

      console.log('Form data for Superset:', formData);

      // Use the new endpoint format with datasource parameters
      const formDataEncoded = encodeURIComponent(JSON.stringify(formData));
      const exploreUrl = `${config.SUPERSET_URL}/superset/explore/?datasource_type=table&datasource_id=${datasetObj.id}&form_data=${formDataEncoded}`;

      console.log('Opening Superset with form_data:', formData);
      console.log('Explore URL:', exploreUrl);
      console.log('Form data JSON:', JSON.stringify(formData));

      // Navigate to a chart creation view with the iframe
      navigate('/charts/create-superset', {
        state: {
          exploreUrl,
          kpis: Array.from(selectedKPIs),
          chartType: selectedChartType.name,
          timeColumn: timeColumn
        }
      });
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
      <div className="flex-1 overflow-hidden p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="h-[calc(100%-100px)] grid grid-cols-12 gap-4">
          {/* Column 1: Configuration */}
          <div className="col-span-3 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Configuration</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Spatial Aggregation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spatial Aggregation
                </label>
                <select
                  value={selectedSpatialLevel}
                  onChange={(e) => handleSpatialLevelChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {Array.from(new Set(availableDatasets.map(d => d.geographic_level))).map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Granularity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Granularity
                </label>
                <select
                  value={timeGrain}
                  onChange={(e) => handleTimeGrainChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={!selectedSpatialLevel}
                >
                  {availableTimeGranularities.map(grain => (
                    <option key={grain} value={grain}>
                      {grain}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="No filter">None</option>
                  <option value="today">Today</option>
                  <option value="yesterday : today">Today and Yesterday</option>
                  <option value="Last week">Last 7 days</option>
                  <option value="Last month">Last 30 days</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Column 2: KPI Selection */}
          <div className="col-span-5 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
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

          {/* Column 3: Chart Type Selection */}
          <div className="col-span-4 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
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
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 mt-6 mb-6">
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
            disabled={loading || selectedKPIs.size === 0 || !selectedChartType}
            className="flex-1 bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Preview Chart'}
          </button>
        </div>
      </div>
    </div>
  );
}
