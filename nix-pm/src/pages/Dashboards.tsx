import { useEffect, useState, useMemo } from 'react';
import { supersetService } from '../services/superset';
import { Plus, ArrowLeft, MoreVertical, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ActionsMenu } from '../components/ActionsMenu';
import config from '../config/env';

export function Dashboards() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const itemsPerPage = 12;

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const data = await supersetService.getDashboards();
      console.log('Dashboards loaded:', data);
      setDashboards(data);
    } catch (err) {
      setError('Failed to load dashboards. Check console for details.');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedDashboard(null);
    setIsCreatingNew(false);
  };

  const handleEditDashboard = (dashboardId: number) => {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (dashboard) {
      setSelectedDashboard(dashboard);
    }
  };

  const handleDeleteDashboard = async (dashboardId: number) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) {
      return;
    }

    try {
      await supersetService.deleteDashboard(dashboardId);
      loadDashboards();
      if (selectedDashboard?.id === dashboardId) {
        setSelectedDashboard(null);
      }
    } catch (err) {
      console.error('Failed to delete dashboard:', err);
      alert('Failed to delete dashboard. Check console for details.');
    }
  };

  const handleExportDashboard = async (dashboardId: number) => {
    try {
      await supersetService.exportDashboard(dashboardId);
    } catch (err) {
      console.error('Failed to export dashboard:', err);
      alert('Failed to export dashboard. Check console for details.');
    }
  };

  const filteredAndSortedDashboards = useMemo(() => {
    let filtered = dashboards;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(dashboard =>
        dashboard.dashboard_title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(dashboard =>
        statusFilter === 'published' ? dashboard.published : !dashboard.published
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.dashboard_title.localeCompare(b.dashboard_title);
      } else {
        // Sort by recent (changed_on)
        return new Date(b.changed_on).getTime() - new Date(a.changed_on).getTime();
      }
    });

    return filtered;
  }, [dashboards, searchQuery, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedDashboards.length / itemsPerPage);
  const paginatedDashboards = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDashboards.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedDashboards, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

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

  // Full-screen view when a dashboard is selected or creating new
  if (selectedDashboard || isCreatingNew) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboards
            </button>
            {selectedDashboard && (
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedDashboard.dashboard_title}
              </h2>
            )}
            {isCreatingNew && (
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Dashboard
              </h2>
            )}
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <iframe
            key={isCreatingNew ? 'new-dashboard' : selectedDashboard?.id}
            src={
              isCreatingNew
                ? `${config.SUPERSET_IFRAME_URL}/dashboard/new/`
                : `${config.SUPERSET_IFRAME_URL}/superset/dashboard/${selectedDashboard?.id}/?standalone=true`
            }
            className="absolute border-0"
            style={{
              top: isCreatingNew ? '-60px' : 0,
              left: 0,
              width: '100%',
              height: isCreatingNew ? 'calc(100% + 60px)' : '100%'
            }}
            title={isCreatingNew ? 'Create New Dashboard' : selectedDashboard?.dashboard_title}
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
          <h2 className="text-2xl font-semibold text-gray-900">Dashboards</h2>
          <button
            onClick={() => setIsCreatingNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Dashboard
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
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
        {filteredAndSortedDashboards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-2">
                {dashboards.length === 0 ? 'No dashboards available' : 'No dashboards match your filters'}
              </p>
              <p className="text-sm text-gray-500">
                {dashboards.length === 0 ? 'Create your first dashboard to get started' : 'Try adjusting your search or filters'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedDashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                onClick={() => setSelectedDashboard(dashboard)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1 truncate">
                    {dashboard.dashboard_title}
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
                        onEdit={() => handleEditDashboard(dashboard.id)}
                        onDelete={() => handleDeleteDashboard(dashboard.id)}
                        onExport={() => handleExportDashboard(dashboard.id)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dashboard.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  Modified {dashboard.changed_on_delta_humanized || 'recently'}
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
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedDashboards.length)} of {filteredAndSortedDashboards.length}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
