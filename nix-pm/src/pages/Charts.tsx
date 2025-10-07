import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supersetService } from '../services/superset';
import { Plus, ArrowLeft, MoreVertical, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActionsMenu } from '../components/ActionsMenu';
import config from '../config/env';

export function Charts() {
  const navigate = useNavigate();
  const [charts, setCharts] = useState<any[]>([]);
  const [selectedChart, setSelectedChart] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vizTypeFilter, setVizTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const itemsPerPage = 12;

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    try {
      setLoading(true);
      const data = await supersetService.getCharts();
      console.log('Charts loaded:', data);
      setCharts(data);
    } catch (err) {
      setError('Failed to load charts. Check console for details.');
      console.error('Charts load error:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleEditChart = (chartId: number) => {
    setIsEditMode(true);
  };

  const handleDeleteChart = async (chartId: number) => {
    if (!confirm('Are you sure you want to delete this chart?')) {
      return;
    }

    try {
      await supersetService.deleteChart(chartId);
      loadCharts();
      if (selectedChart?.id === chartId) {
        setSelectedChart(null);
      }
    } catch (err) {
      console.error('Failed to delete chart:', err);
      alert('Failed to delete chart. Check console for details.');
    }
  };

  const handleExportChart = async (chartId: number) => {
    try {
      await supersetService.exportChart(chartId);
    } catch (err) {
      console.error('Failed to export chart:', err);
      alert('Failed to export chart. Check console for details.');
    }
  };

  const handleBack = () => {
    setSelectedChart(null);
    setIsEditMode(false);
  };

  const vizTypes = useMemo(() => {
    const types = new Set(charts.map(chart => chart.viz_type).filter(Boolean));
    return ['all', ...Array.from(types)];
  }, [charts]);

  const filteredAndSortedCharts = useMemo(() => {
    let filtered = charts;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(chart =>
        chart.slice_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply viz type filter
    if (vizTypeFilter !== 'all') {
      filtered = filtered.filter(chart => chart.viz_type === vizTypeFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.slice_name.localeCompare(b.slice_name);
      } else {
        // Sort by recent (changed_on)
        return new Date(b.changed_on).getTime() - new Date(a.changed_on).getTime();
      }
    });

    return filtered;
  }, [charts, searchQuery, vizTypeFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedCharts.length / itemsPerPage);
  const paginatedCharts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedCharts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedCharts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, vizTypeFilter, sortBy]);

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

  // Full-screen view when a chart is selected
  if (selectedChart) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Charts
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedChart.slice_name}
                </h2>
                <p className="text-sm text-gray-600">
                  Type: {selectedChart.viz_type || 'Unknown'}
                  {isEditMode && <span className="ml-2 text-blue-600 font-medium">• Edit Mode</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <button
                  onClick={() => setIsEditMode(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Exit Edit Mode
                </button>
              ) : (
                <ActionsMenu
                  onEdit={() => handleEditChart(selectedChart.id)}
                  onDelete={() => handleDeleteChart(selectedChart.id)}
                  onExport={() => handleExportChart(selectedChart.id)}
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <iframe
            key={`${selectedChart.id}-${isEditMode ? 'edit' : 'view'}`}
            src={
              isEditMode
                ? `${config.SUPERSET_IFRAME_URL}/explore/?slice_id=${selectedChart.id}`
                : `${config.SUPERSET_IFRAME_URL}/explore/?form_data=%7B%22slice_id%22%3A${selectedChart.id}%7D&standalone=3`
            }
            className="absolute border-0"
            style={
              isEditMode
                ? {
                    top: '-60px',
                    left: 0,
                    width: '100%',
                    height: 'calc(100% + 60px)'
                  }
                : {
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                  }
            }
            title={selectedChart.slice_name}
            allow="fullscreen"
          />
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Charts</h2>
          <button
            onClick={() => navigate('/charts/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Chart
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            value={vizTypeFilter}
            onChange={(e) => setVizTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {vizTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="recent">Recently modified</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredAndSortedCharts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-2">
                {charts.length === 0 ? 'No charts available' : 'No charts match your filters'}
              </p>
              <p className="text-sm text-gray-500">
                {charts.length === 0 ? 'Create your first chart to get started' : 'Try adjusting your search or filters'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedCharts.map((chart) => (
              <div
                key={chart.id}
                onClick={() => setSelectedChart(chart)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 truncate">
                    {chart.slice_name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Star className="w-4 h-4 text-gray-400" />
                    </button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionsMenu
                        onEdit={() => {
                          setSelectedChart(chart);
                          handleEditChart(chart.id);
                        }}
                        onDelete={() => handleDeleteChart(chart.id)}
                        onExport={() => handleExportChart(chart.id)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {chart.viz_type || 'Chart'}
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  Modified {chart.changed_on_delta_humanized || 'recently'}
                </div>
              </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <span className="ml-4 text-sm text-gray-600">
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedCharts.length)} of {filteredAndSortedCharts.length}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
