import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function CreateChartSuperset() {
  const location = useLocation();
  const navigate = useNavigate();
  const { exploreUrl, chartName, kpis, chartType } = location.state || {};

  if (!exploreUrl) {
    navigate('/charts/create');
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/charts')}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Charts
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {chartName || 'Create Chart'}
              </h2>
              <p className="text-sm text-gray-600">
                {chartType} • KPIs: {kpis?.join(', ')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium">Save as:</span> "{chartName}" - Configure your chart and click "Save" in Superset
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <iframe
          src={exploreUrl}
          className="absolute border-0"
          style={{
            top: '-60px',
            left: 0,
            width: '100%',
            height: 'calc(100% + 60px)'
          }}
          title="Create Chart in Superset"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
