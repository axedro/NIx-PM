import { useEffect, useState } from 'react';
import { supersetService } from '../services/superset';
import { Plus } from 'lucide-react';

export function Dashboards() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const data = await supersetService.getDashboards();
      console.log('Dashboards loaded:', data);
      setDashboards(data);
      if (data.length > 0) {
        setSelectedDashboard(data[0]);
      }
    } catch (err) {
      setError('Failed to load dashboards. Check console for details.');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading dashboards...</div>
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
          <h2 className="text-2xl font-semibold text-gray-900">Dashboards</h2>
          <button
            onClick={() => {
              setIsCreatingNew(true);
              setSelectedDashboard(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create New Dashboard
          </button>
        </div>
        {dashboards.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                onClick={() => {
                  setSelectedDashboard(dashboard);
                  setIsCreatingNew(false);
                }}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  selectedDashboard?.id === dashboard.id && !isCreatingNew
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dashboard.dashboard_title}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 p-4 overflow-hidden">
        {isCreatingNew ? (
          <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex-1 relative overflow-hidden">
              <iframe
                key="new-dashboard"
                src="http://localhost:8088/dashboard/new/"
                className="absolute border-0"
                style={{
                  top: '-60px',
                  left: 0,
                  width: '100%',
                  height: 'calc(100% + 60px)'
                }}
                title="Create New Dashboard"
                allow="fullscreen"
              />
            </div>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-2">No dashboards available</p>
              <p className="text-sm text-gray-500">Create dashboards in Superset to view them here</p>
            </div>
          </div>
        ) : selectedDashboard ? (
          <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex-1 relative overflow-hidden">
              <iframe
                key={selectedDashboard.id}
                src={`http://localhost:8088/superset/dashboard/${selectedDashboard.id}/?standalone=true`}
                className="absolute inset-0 w-full h-full border-0"
                title={selectedDashboard.dashboard_title}
                allow="fullscreen"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
