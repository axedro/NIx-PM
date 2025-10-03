import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supersetService } from '../services/superset';

interface CreateChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChartCreated: () => void;
}

export function CreateChartModal({ isOpen, onClose, onChartCreated }: CreateChartModalProps) {
  const [chartName, setChartName] = useState('');
  const [vizType, setVizType] = useState('table');
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDatasets();
    }
  }, [isOpen]);

  const loadDatasets = async () => {
    try {
      const data = await supersetService.getDatasets();
      setDatasets(data);
      if (data.length > 0) {
        setSelectedDataset(data[0].id);
      }
    } catch (err) {
      setError('Failed to load datasets');
      console.error('Dataset load error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDataset) {
      setError('Please select a dataset');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await supersetService.createChart({
        slice_name: chartName,
        viz_type: vizType,
        datasource_id: selectedDataset,
        datasource_type: 'table',
        params: JSON.stringify({
          viz_type: vizType,
          datasource: `${selectedDataset}__table`,
        }),
      });

      setChartName('');
      setVizType('table');
      onChartCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create chart');
      console.error('Chart creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const vizTypes = [
    { value: 'table', label: 'Table' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'area', label: 'Area Chart' },
    { value: 'big_number_total', label: 'Big Number' },
    { value: 'box_plot', label: 'Box Plot' },
    { value: 'bubble', label: 'Bubble Chart' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Chart</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="chartName" className="block text-sm font-medium text-gray-700 mb-1">
              Chart Name
            </label>
            <input
              id="chartName"
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              placeholder="Enter chart name"
            />
          </div>

          <div>
            <label htmlFor="vizType" className="block text-sm font-medium text-gray-700 mb-1">
              Visualization Type
            </label>
            <select
              id="vizType"
              value={vizType}
              onChange={(e) => setVizType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {vizTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dataset" className="block text-sm font-medium text-gray-700 mb-1">
              Dataset
            </label>
            {datasets.length === 0 ? (
              <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                No datasets available. Please create a dataset in Superset first.
              </div>
            ) : (
              <select
                id="dataset"
                value={selectedDataset || ''}
                onChange={(e) => setSelectedDataset(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.table_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || datasets.length === 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Chart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
