import { useEffect, useState } from 'react';
import { supersetService } from '../services/superset';
import { ExternalLink, Plus } from 'lucide-react';
import { CreateChartModal } from '../components/CreateChartModal';

export function Charts() {
  const [charts, setCharts] = useState<any[]>([]);
  const [selectedChart, setSelectedChart] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    try {
      setLoading(true);
      const data = await supersetService.getCharts();
      console.log('Charts loaded:', data);
      setCharts(data);
      if (data.length > 0) {
        setSelectedChart(data[0]);
      }
    } catch (err) {
      setError('Failed to load charts. Check console for details.');
      console.error('Charts load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChartCreated = () => {
    loadCharts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading charts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Charts</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create New Chart
          </button>
        </div>
        {charts.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {charts.map((chart) => (
              <button
                key={chart.id}
                onClick={() => setSelectedChart(chart)}
                className={`px-3 py-2 rounded-lg transition-all text-left ${
                  selectedChart?.id === chart.id
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                }`}
              >
                <div className="font-medium truncate text-sm">{chart.slice_name}</div>
                {chart.viz_type && (
                  <div className="text-xs opacity-75 mt-1 truncate">{chart.viz_type}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 p-4 overflow-hidden">
        {charts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-2">No charts available</p>
              <p className="text-sm text-gray-500">Create charts in Superset to view them here</p>
            </div>
          </div>
        ) : selectedChart ? (
          <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedChart.slice_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Type: {selectedChart.viz_type || 'Unknown'} • NIx PM Analytics
                </p>
              </div>
              <a
                href={`http://localhost:8088/explore/?slice_id=${selectedChart.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Superset
              </a>
            </div>
            <div className="flex-1 relative bg-gray-50">
              <iframe
                key={selectedChart.id}
                src={`http://localhost:8088/explore/?form_data=%7B%22slice_id%22%3A${selectedChart.id}%7D&standalone=3`}
                className="absolute inset-0 w-full h-full border-0"
                title={selectedChart.slice_name}
                allow="fullscreen"
              />
            </div>
          </div>
        ) : null}
      </div>

      <CreateChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onChartCreated={handleChartCreated}
      />
    </div>
  );
}
