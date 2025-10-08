import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { supersetService } from '../services/superset';
import { semanticLayerService, type KPI, type ChartType } from '../services/semanticLayer';

interface CreateChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChartCreated: () => void;
}

export function CreateChartModal({ isOpen, onClose, onChartCreated }: CreateChartModalProps) {
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
    if (isOpen) {
      loadSemanticLayer();
    }
  }, [isOpen]);

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
    // In production, this would generate an actual Superset chart preview
    const kpiList = Array.from(selectedKPIs).join(', ');
    setPreviewUrl(`Preview: ${kpiList} as ${selectedChartType.name}`);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // Get the dataset from the first selected KPI
      const firstKPI = Array.from(selectedKPIs)[0];
      const dataset = semanticLayerService.getDatasetForKPI(firstKPI);

      if (!dataset) {
        throw new Error('Dataset not found for selected KPI');
      }

      // Get dataset ID from Superset
      const datasets = await supersetService.getDatasets();
      const datasetObj = datasets.find((d: any) => d.table_name === dataset);

      if (!datasetObj) {
        throw new Error(`Dataset "${dataset}" not found in Superset`);
      }

      // Create the chart
      await supersetService.createChart({
        slice_name: chartName || `${selectedChartType.name} - ${Array.from(selectedKPIs).join(', ')}`,
        viz_type: selectedChartType.id,
        datasource_id: datasetObj.id,
        datasource_type: 'table',
        params: JSON.stringify({
          viz_type: selectedChartType.id,
          datasource: `${datasetObj.id}__table`,
          metrics: Array.from(selectedKPIs),
        }),
      });

      setChartName('');
      setSelectedKPIs(new Set());
      setSelectedChartType(null);
      setPreviewUrl(null);
      onChartCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Failed to create chart');
      console.error('Chart creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Chart</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-12 gap-4 p-6">
            {/* Column 1: KPI Selection */}
            <div className="col-span-3 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
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
            <div className="col-span-3 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
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
            <div className="col-span-6 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
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

        {/* Footer with Chart Name and Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
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
              onClick={onClose}
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
    </div>
  );
}
