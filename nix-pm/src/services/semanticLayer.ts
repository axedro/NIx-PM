export interface KPI {
  name: string;
  description: string;
  dataset: string;
}

export interface Category {
  category: string;
  kpi: KPI[];
}

export interface ChartType {
  id: string;
  name: string;
  category: string;
  description?: string;
}

class SemanticLayerService {
  private categories: Category[] = [];

  // Superset chart types organized by category
  private chartTypes: ChartType[] = [
    // Evolution charts (time series)
    { id: 'line', name: 'Line Chart', category: 'Evolution', description: 'Show trends over time' },
    { id: 'area', name: 'Area Chart', category: 'Evolution', description: 'Filled line chart' },
    { id: 'smooth_line', name: 'Smooth Line', category: 'Evolution', description: 'Smoothed trend lines' },
    { id: 'stepped_line', name: 'Stepped Line', category: 'Evolution', description: 'Step-wise changes' },
    { id: 'time_table', name: 'Time Table', category: 'Evolution', description: 'Tabular time series' },

    // Comparison charts
    { id: 'bar', name: 'Bar Chart', category: 'Comparison', description: 'Compare values across categories' },
    { id: 'dist_bar', name: 'Distribution Bar', category: 'Comparison', description: 'Show distributions' },
    { id: 'column', name: 'Column Chart', category: 'Comparison', description: 'Vertical bars' },
    { id: 'mixed_timeseries', name: 'Mixed Chart', category: 'Comparison', description: 'Combine multiple chart types' },

    // Part-to-whole charts
    { id: 'pie', name: 'Pie Chart', category: 'Part-to-Whole', description: 'Show proportions' },
    { id: 'donut', name: 'Donut Chart', category: 'Part-to-Whole', description: 'Pie with center hole' },
    { id: 'treemap', name: 'Treemap', category: 'Part-to-Whole', description: 'Hierarchical rectangles' },
    { id: 'sunburst', name: 'Sunburst', category: 'Part-to-Whole', description: 'Hierarchical radial' },

    // Distribution charts
    { id: 'histogram', name: 'Histogram', category: 'Distribution', description: 'Show data distribution' },
    { id: 'box_plot', name: 'Box Plot', category: 'Distribution', description: 'Statistical distribution' },

    // Ranking charts
    { id: 'table', name: 'Table', category: 'Ranking', description: 'Sortable data table' },
    { id: 'pivot_table', name: 'Pivot Table', category: 'Ranking', description: 'Multidimensional table' },

    // Single value
    { id: 'big_number', name: 'Big Number', category: 'Single Value', description: 'Display single metric' },
    { id: 'big_number_total', name: 'Big Number with Trend', category: 'Single Value', description: 'Metric with sparkline' },

    // Geographic
    { id: 'world_map', name: 'World Map', category: 'Geographic', description: 'Global geographic data' },
    { id: 'country_map', name: 'Country Map', category: 'Geographic', description: 'Country-level data' },
  ];

  async loadSemanticLayer(): Promise<void> {
    try {
      const response = await fetch('/semantic.json');
      this.categories = await response.json();
    } catch (error) {
      console.error('Failed to load semantic layer:', error);
      throw error;
    }
  }

  getCategories(): Category[] {
    return this.categories;
  }

  getChartTypes(): ChartType[] {
    return this.chartTypes;
  }

  getChartTypesByCategory(): Record<string, ChartType[]> {
    return this.chartTypes.reduce((acc, chartType) => {
      if (!acc[chartType.category]) {
        acc[chartType.category] = [];
      }
      acc[chartType.category].push(chartType);
      return acc;
    }, {} as Record<string, ChartType[]>);
  }

  getCategoryNames(): string[] {
    return this.categories.map(c => c.category);
  }

  getKPIsByCategory(category: string): KPI[] {
    const cat = this.categories.find(c => c.category === category);
    return cat?.kpi || [];
  }

  getAllKPIs(): KPI[] {
    return this.categories.flatMap(c => c.kpi);
  }

  getDatasetForKPI(kpiName: string): string | undefined {
    for (const category of this.categories) {
      const kpi = category.kpi.find(k => k.name === kpiName);
      if (kpi) return kpi.dataset;
    }
    return undefined;
  }
}

export const semanticLayerService = new SemanticLayerService();
