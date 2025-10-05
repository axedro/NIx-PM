import { useEffect, useState } from 'react';
import supersetDatasetsService from '../services/supersetDatasetsService';

interface SupersetDataset {
  id?: number;
  dataset_name: string;
  postgres_table: string;
  geographic_level: 'global' | 'provincia' | 'region' | 'zipcode' | 'celda' | 'nodo';
  time_aggregation: '15m' | '1h' | '1d' | '1w' | '1m';
  kpis: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface KPI {
  name: string;
  description: string;
  category: string;
}

const GEOGRAPHIC_LEVELS = [
  { value: 'global', label: 'Global' },
  { value: 'provincia', label: 'Province' },
  { value: 'region', label: 'Region' },
  { value: 'zipcode', label: 'Zipcode' },
  { value: 'celda', label: 'Cell' },
  { value: 'nodo', label: 'Node' },
];

const TIME_AGGREGATIONS = [
  { value: '15m', label: '15 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
];

export default function Settings() {
  const [datasets, setDatasets] = useState<SupersetDataset[]>([]);
  const [availableKPIs, setAvailableKPIs] = useState<KPI[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<Array<{ name: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDataset, setEditingDataset] = useState<SupersetDataset | null>(null);
  const [formData, setFormData] = useState<Partial<SupersetDataset>>({
    dataset_name: '',
    postgres_table: '',
    geographic_level: 'global',
    time_aggregation: '15m',
    kpis: [],
    is_active: true,
  });
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [datasetsData, kpisData, tablesData] = await Promise.all([
        supersetDatasetsService.getAllDatasets(),
        supersetDatasetsService.getAvailableKPIs(),
        supersetDatasetsService.getAvailableTables(),
      ]);
      setDatasets(datasetsData);
      setAvailableKPIs(kpisData);
      setAvailableTables(tablesData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadTableColumns = async (tableName: string) => {
    try {
      const columns = await supersetDatasetsService.getTableColumns(tableName);
      setTableColumns(columns);

      // Filter KPIs that exist as columns in the table
      const columnNames = new Set(columns.map(col => col.name));
      const matchingKPIs = availableKPIs.filter(kpi => columnNames.has(kpi.name));

      // Auto-select matching KPIs
      setSelectedKPIs(new Set(matchingKPIs.map(kpi => kpi.name)));
    } catch (error) {
      console.error('Error loading table columns:', error);
    }
  };

  const handleEdit = async (dataset: SupersetDataset) => {
    setEditingDataset(dataset);
    setFormData(dataset);
    setSelectedKPIs(new Set(dataset.kpis.map(k => k.name)));

    // Load columns for the selected table
    if (dataset.postgres_table) {
      await loadTableColumns(dataset.postgres_table);
    }

    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingDataset(null);
    setFormData({
      dataset_name: '',
      postgres_table: '',
      geographic_level: 'global',
      time_aggregation: '15m',
      kpis: [],
      is_active: true,
    });
    setSelectedKPIs(new Set());
    setTableColumns([]);
    setShowModal(true);
  };

  const handleTableChange = async (tableName: string) => {
    setFormData({
      ...formData,
      postgres_table: tableName,
      dataset_name: tableName // Auto-fill dataset name with table name
    });
    if (tableName) {
      await loadTableColumns(tableName);
    } else {
      setTableColumns([]);
      setSelectedKPIs(new Set());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const kpisToSave = availableKPIs.filter(kpi => selectedKPIs.has(kpi.name));

      const datasetToSave = {
        ...formData,
        kpis: kpisToSave,
      } as SupersetDataset;

      if (editingDataset && editingDataset.id) {
        await supersetDatasetsService.updateDataset(editingDataset.id, datasetToSave);
      } else {
        await supersetDatasetsService.createDataset(datasetToSave);
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving dataset:', error);
      alert('Error saving dataset');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      await supersetDatasetsService.deleteDataset(id);
      loadData();
    } catch (error) {
      console.error('Error deleting dataset:', error);
      alert('Error deleting dataset');
    }
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

  // Group KPIs by category, filtered by table columns
  const kpisByCategory = (() => {
    const columnNames = new Set(tableColumns.map(col => col.name));
    const filteredKPIs = tableColumns.length > 0
      ? availableKPIs.filter(kpi => columnNames.has(kpi.name))
      : availableKPIs;

    return filteredKPIs.reduce((acc, kpi) => {
      if (!acc[kpi.category]) {
        acc[kpi.category] = [];
      }
      acc[kpi.category].push(kpi);
      return acc;
    }, {} as Record<string, KPI[]>);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dataset Configuration</h1>
          <p className="text-gray-600 mt-1">Manage Superset datasets with geographic and time aggregation</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + New Dataset
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Table
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Geographic Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Aggregation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                KPIs
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {datasets.map((dataset) => (
              <tr key={dataset.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {dataset.dataset_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dataset.postgres_table}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {GEOGRAPHIC_LEVELS.find(l => l.value === dataset.geographic_level)?.label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {TIME_AGGREGATIONS.find(t => t.value === dataset.time_aggregation)?.label}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dataset.kpis.length} KPIs
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    dataset.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {dataset.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(dataset)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => dataset.id && handleDelete(dataset.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingDataset ? 'Edit Dataset' : 'New Dataset'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    value={formData.dataset_name}
                    onChange={(e) => setFormData({ ...formData, dataset_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Table
                  </label>
                  <select
                    value={formData.postgres_table}
                    onChange={(e) => handleTableChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a table...</option>
                    {availableTables.map(table => (
                      <option key={table} value={table}>{table}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Geographic Level
                  </label>
                  <select
                    value={formData.geographic_level}
                    onChange={(e) => setFormData({ ...formData, geographic_level: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {GEOGRAPHIC_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Aggregation
                  </label>
                  <select
                    value={formData.time_aggregation}
                    onChange={(e) => setFormData({ ...formData, time_aggregation: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {TIME_AGGREGATIONS.map(time => (
                      <option key={time.value} value={time.value}>{time.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active dataset
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select KPIs {tableColumns.length > 0 && `(${Object.values(kpisByCategory).flat().length} available in table)`}
                </label>
                {!formData.postgres_table && (
                  <p className="text-sm text-gray-500 mb-2">Select a table to see available KPIs</p>
                )}
                <div className="border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
                  {Object.entries(kpisByCategory).map(([category, kpis]) => (
                    <div key={category} className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">{category.replace('_', ' ')}</h3>
                      <div className="space-y-2 ml-4">
                        {kpis.map((kpi) => (
                          <div key={kpi.name} className="flex items-start">
                            <input
                              type="checkbox"
                              id={kpi.name}
                              checked={selectedKPIs.has(kpi.name)}
                              onChange={() => toggleKPI(kpi.name)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                            />
                            <label htmlFor={kpi.name} className="ml-2 block text-sm text-gray-700">
                              <span className="font-medium">{kpi.name}</span>
                              <p className="text-xs text-gray-500">{kpi.description}</p>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingDataset ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
