# Plan de Tareas - Alertas Multi-Nivel y Detección de Anomalías

**Fecha**: 5 de Octubre 2025
**Branch**: `feature/kpi-alerts`
**Objetivo**: Implementar alertas por niveles de granularidad y detección de anomalías

---

## 📋 Tareas Principales

### 1. Alertas Multi-Nivel (Scope/Granularidad)
Implementar alertas que puedan definirse a diferentes niveles de agregación:
- **Global**: Toda la red
- **Provincial**: Por provincia específica
- **Regional**: Por región
- **Zipcode**: Por código postal
- **Celda**: Por celda específica
- **Nodo**: Por nodo específico

### 2. Detección de Anomalías
Implementar alertas basadas en anomaly detection usando métodos estadísticos:
- Z-score (desviaciones estándar)
- IQR (Interquartile Range)
- Moving Average con bandas de confianza

### 3. Integración con Superset
Importar datasets multi-nivel y configurar filtros dinámicos en dashboards.

---

## 🏗️ Arquitectura de Solución

### Estructura de Niveles

```typescript
// Nuevos tipos para alertas multi-nivel
type AlertScope = 'global' | 'provincia' | 'region' | 'zipcode' | 'celda' | 'nodo';

interface ScopeFilter {
  scope: AlertScope;
  scope_value?: string; // ID de provincia, región, zipcode, celda, o nodo
}

// Mapeo de scope a tabla de datos
const DATASET_BY_SCOPE: Record<AlertScope, string> = {
  global: 'kpi_global_15min',
  provincia: 'kpi_provincia_15min',
  region: 'kpi_region_15min',
  zipcode: 'kpi_zipcode_15min',
  celda: 'kpi_celda_15min',
  nodo: 'kpi_nodo_15min'
};

// Columnas de filtro por scope
const FILTER_COLUMN_BY_SCOPE: Record<AlertScope, string | null> = {
  global: null,
  provincia: 'provincia_id',
  region: 'region_id',
  zipcode: 'zipcode',
  celda: 'celda_id',
  nodo: 'nodo_id'
};
```

---

## 📝 Tareas Detalladas

### FASE 1: Backend - Alertas Multi-Nivel

#### 1.1 Actualizar Schema de Base de Datos
```sql
-- Añadir columnas de scope a tabla alerts
ALTER TABLE alerts
  ADD COLUMN scope VARCHAR(50) NOT NULL DEFAULT 'global',
  ADD COLUMN scope_value VARCHAR(255);

-- Índices para mejorar performance
CREATE INDEX idx_alerts_scope ON alerts(scope, scope_value);
```

**Archivo**: `nix-pm-backend/migrations/003_add_alert_scope.sql`

#### 1.2 Actualizar Tipos TypeScript
**Archivo**: `nix-pm-backend/src/types/alerts.ts`

```typescript
// Añadir a tipos existentes
export type AlertScope = 'global' | 'provincia' | 'region' | 'zipcode' | 'celda' | 'nodo';

export interface ScopeFilter {
  scope: AlertScope;
  scope_value?: string;
}

// Actualizar CreateAlertSchema
export const CreateAlertSchema = z.object({
  // ... campos existentes
  scope: z.enum(['global', 'provincia', 'region', 'zipcode', 'celda', 'nodo']).default('global'),
  scope_value: z.string().optional(),
});

// Actualizar interface Alert
export interface Alert {
  // ... campos existentes
  scope: AlertScope;
  scope_value?: string;
}
```

#### 1.3 Actualizar Statistics Service
**Archivo**: `nix-pm-backend/src/services/statisticsService.ts`

```typescript
// Nueva función con scope
export async function calculateKPIStatisticsWithScope(
  kpiName: string,
  scope: AlertScope,
  scopeValue?: string,
  timeWindow: TimeWindow = '1day'
): Promise<KPIStatistics> {
  const dataset = DATASET_BY_SCOPE[scope];
  const filterColumn = FILTER_COLUMN_BY_SCOPE[scope];

  let whereClause = `
    WHERE timestamp >= NOW() - INTERVAL '${getTimeWindowInterval(timeWindow)}'
      AND "${kpiName}" IS NOT NULL
  `;

  if (filterColumn && scopeValue) {
    whereClause += ` AND ${filterColumn} = $2`;
  }

  const query = `
    SELECT
      timestamp,
      "${kpiName}" as value
    FROM ${dataset}
    ${whereClause}
    ORDER BY timestamp DESC
  `;

  const params = filterColumn && scopeValue ? [scopeValue] : [];
  const rows = await queryDatabase<{ timestamp: Date; value: number }>(query, params);

  // ... resto del cálculo igual
}
```

#### 1.4 Actualizar Threshold Service
**Archivo**: `nix-pm-backend/src/services/thresholdService.ts`

```typescript
export async function evaluateThresholdAlert(alert: Alert): Promise<boolean> {
  const dataset = DATASET_BY_SCOPE[alert.scope];
  const filterColumn = FILTER_COLUMN_BY_SCOPE[alert.scope];

  // Construir query con filtro de scope
  let whereClause = `
    WHERE timestamp >= NOW() - INTERVAL '${interval}'
      AND "${config.metric}" IS NOT NULL
  `;

  const params: any[] = [];
  if (filterColumn && alert.scope_value) {
    whereClause += ` AND ${filterColumn} = $1`;
    params.push(alert.scope_value);
  }

  const query = `
    SELECT ${aggFunction}("${config.metric}") as value
    FROM ${dataset}
    ${whereClause}
  `;

  // ... resto igual
}
```

---

### FASE 2: Backend - Detección de Anomalías

#### 2.1 Crear Anomaly Detection Service
**Archivo**: `nix-pm-backend/src/services/anomalyService.ts`

```typescript
import { queryDatabase } from '../config/database';
import { Alert, AlertScope } from '../types/alerts';
import { mean, standardDeviation, quantile } from 'simple-statistics';

export type AnomalyMethod = 'zscore' | 'iqr' | 'moving_average';

export interface AnomalyConfig {
  method: AnomalyMethod;
  sensitivity: number; // 1-10, donde 10 es más sensible
  baseline_period: string; // e.g., '7days', '30days'
}

// Método Z-Score
export async function detectAnomalyZScore(
  currentValue: number,
  historicalValues: number[],
  sensitivity: number
): Promise<{ isAnomaly: boolean; score: number }> {
  const avg = mean(historicalValues);
  const stddev = standardDeviation(historicalValues);

  // sensitivity 1-10 -> threshold 3-1 desviaciones
  const threshold = 4 - (sensitivity * 0.3);

  const zScore = Math.abs((currentValue - avg) / stddev);

  return {
    isAnomaly: zScore > threshold,
    score: zScore
  };
}

// Método IQR (Interquartile Range)
export async function detectAnomalyIQR(
  currentValue: number,
  historicalValues: number[],
  sensitivity: number
): Promise<{ isAnomaly: boolean; score: number }> {
  const q1 = quantile(historicalValues, 0.25);
  const q3 = quantile(historicalValues, 0.75);
  const iqr = q3 - q1;

  // sensitivity 1-10 -> multiplier 3-0.5
  const multiplier = 3.5 - (sensitivity * 0.3);

  const lowerBound = q1 - (multiplier * iqr);
  const upperBound = q3 + (multiplier * iqr);

  const isAnomaly = currentValue < lowerBound || currentValue > upperBound;
  const score = Math.max(
    Math.abs(currentValue - lowerBound) / iqr,
    Math.abs(currentValue - upperBound) / iqr
  );

  return { isAnomaly, score };
}

// Método Moving Average
export async function detectAnomalyMovingAverage(
  currentValue: number,
  historicalValues: number[],
  sensitivity: number,
  windowSize: number = 24 // 24 horas si son muestras de 15min
): Promise<{ isAnomaly: boolean; score: number }> {
  const recentValues = historicalValues.slice(-windowSize);
  const avg = mean(recentValues);
  const stddev = standardDeviation(recentValues);

  const threshold = 3 - (sensitivity * 0.2);
  const deviations = Math.abs(currentValue - avg) / stddev;

  return {
    isAnomaly: deviations > threshold,
    score: deviations
  };
}

// Función principal de evaluación
export async function evaluateAnomalyAlert(alert: Alert): Promise<boolean> {
  const config = alert.config as AnomalyConfig;
  const dataset = DATASET_BY_SCOPE[alert.scope];
  const filterColumn = FILTER_COLUMN_BY_SCOPE[alert.scope];

  // Obtener valor actual
  let currentQuery = `
    SELECT "${alert.kpi_name}" as value
    FROM ${dataset}
    WHERE "${alert.kpi_name}" IS NOT NULL
  `;

  if (filterColumn && alert.scope_value) {
    currentQuery += ` AND ${filterColumn} = $1`;
  }

  currentQuery += ` ORDER BY timestamp DESC LIMIT 1`;

  const params = filterColumn && alert.scope_value ? [alert.scope_value] : [];
  const currentResult = await queryDatabase<{ value: number }>(currentQuery, params);

  if (currentResult.length === 0) return false;
  const currentValue = Number(currentResult[0].value);

  // Obtener valores históricos (baseline)
  let historicalQuery = `
    SELECT "${alert.kpi_name}" as value
    FROM ${dataset}
    WHERE timestamp >= NOW() - INTERVAL '${config.baseline_period}'
      AND "${alert.kpi_name}" IS NOT NULL
  `;

  if (filterColumn && alert.scope_value) {
    historicalQuery += ` AND ${filterColumn} = $1`;
  }

  historicalQuery += ` ORDER BY timestamp`;

  const historicalResult = await queryDatabase<{ value: number }>(
    historicalQuery,
    params
  );

  const historicalValues = historicalResult.map(r => Number(r.value));

  // Aplicar método de detección
  let result;
  switch (config.method) {
    case 'zscore':
      result = await detectAnomalyZScore(currentValue, historicalValues, config.sensitivity);
      break;
    case 'iqr':
      result = await detectAnomalyIQR(currentValue, historicalValues, config.sensitivity);
      break;
    case 'moving_average':
      result = await detectAnomalyMovingAverage(currentValue, historicalValues, config.sensitivity);
      break;
    default:
      throw new Error(`Unknown anomaly method: ${config.method}`);
  }

  // Si es anomalía, crear trigger
  if (result.isAnomaly) {
    await createAlertTrigger({
      alert_id: alert.id,
      triggered_at: new Date(),
      value: currentValue,
      expected_value: mean(historicalValues),
      anomaly_score: result.score,
      metadata: {
        method: config.method,
        sensitivity: config.sensitivity,
        baseline_period: config.baseline_period
      }
    });
  }

  return result.isAnomaly;
}
```

#### 2.2 Actualizar Scheduler para Anomalías
**Archivo**: `nix-pm-backend/src/services/schedulerService.ts`

```typescript
// En la función checkAlerts
const alerts = await getAllActiveAlerts();

for (const alert of alerts) {
  try {
    let triggered = false;

    if (alert.alert_type === 'threshold') {
      triggered = await evaluateThresholdAlert(alert);
    } else if (alert.alert_type === 'anomaly') {
      triggered = await evaluateAnomalyAlert(alert);
    }

    // ... resto igual
  } catch (error) {
    // ... manejo de errores
  }
}
```

#### 2.3 Actualizar API Routes
**Archivo**: `nix-pm-backend/src/routes/alerts.ts`

```typescript
// Actualizar endpoint POST /api/alerts
router.post('/', async (req: Request, res: Response) => {
  // ... validación existente

  // Validar scope
  if (req.body.scope !== 'global' && !req.body.scope_value) {
    return res.status(400).json({
      success: false,
      error: 'scope_value is required for non-global scopes'
    });
  }

  // Crear alerta con scope
  const alert = await createAlert({
    ...req.body,
    scope: req.body.scope || 'global',
    scope_value: req.body.scope_value
  });

  // ... resto
});
```

---

### FASE 3: Frontend - Alertas Multi-Nivel

#### 3.1 Actualizar Tipos Frontend
**Archivo**: `nix-pm/src/types/alerts.ts`

```typescript
export type AlertScope = 'global' | 'provincia' | 'region' | 'zipcode' | 'celda' | 'nodo';

export const SCOPE_LABELS: Record<AlertScope, string> = {
  global: 'Global (Toda la red)',
  provincia: 'Por Provincia',
  region: 'Por Región',
  zipcode: 'Por Código Postal',
  celda: 'Por Celda',
  nodo: 'Por Nodo'
};

export interface ScopeFilter {
  scope: AlertScope;
  scope_value?: string;
}

// Añadir a CreateAlertDto
export interface CreateAlertDto {
  // ... campos existentes
  scope: AlertScope;
  scope_value?: string;
}
```

#### 3.2 Actualizar Semantic Layer
**Archivo**: `nix-pm/src/services/semanticLayer.ts`

```typescript
// Actualizar estructura para incluir múltiples datasets
interface KPI {
  name: string;
  description: string;
  datasets: {
    scope: AlertScope;
    dataset_name: string;
  }[];
}

// Ejemplo de estructura actualizada
const semanticLayerWithScopes = [
  {
    category: "Accessibility",
    kpi: [
      {
        name: "erab_est_success_rate_all_qci",
        description: "Success rate of E-RAB establishment",
        datasets: [
          { scope: 'global', dataset_name: 'kpi_global_15min' },
          { scope: 'provincia', dataset_name: 'kpi_provincia_15min' },
          { scope: 'celda', dataset_name: 'kpi_celda_15min' },
          { scope: 'nodo', dataset_name: 'kpi_nodo_15min' }
        ]
      }
    ]
  }
];
```

#### 3.3 Actualizar CreateAlert - Paso 1 (Scope Selection)
**Archivo**: `nix-pm/src/pages/CreateAlert.tsx`

```typescript
// Añadir estados para scope
const [selectedScope, setSelectedScope] = useState<AlertScope>('global');
const [scopeValue, setScopeValue] = useState<string>('');
const [scopeOptions, setScopeOptions] = useState<Array<{ id: string; name: string }>>([]);

// Cargar opciones según el scope seleccionado
useEffect(() => {
  if (selectedScope !== 'global') {
    loadScopeOptions(selectedScope);
  }
}, [selectedScope]);

async function loadScopeOptions(scope: AlertScope) {
  // Llamar endpoint para obtener lista de provincias/regiones/etc
  const options = await alertsService.getScopeOptions(scope);
  setScopeOptions(options);
}

// Añadir UI para selección de scope
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Nivel de Alerta
  </label>
  <select
    value={selectedScope}
    onChange={(e) => setSelectedScope(e.target.value as AlertScope)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
  >
    {Object.entries(SCOPE_LABELS).map(([value, label]) => (
      <option key={value} value={value}>{label}</option>
    ))}
  </select>
</div>

{selectedScope !== 'global' && (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Seleccionar {SCOPE_LABELS[selectedScope].split('Por ')[1]}
    </label>
    <select
      value={scopeValue}
      onChange={(e) => setScopeValue(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
    >
      <option value="">Seleccionar...</option>
      {scopeOptions.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
  </div>
)}
```

#### 3.4 Actualizar CreateAlert - Paso 2 (Anomaly Config)
**Archivo**: `nix-pm/src/pages/CreateAlert.tsx`

```typescript
// Añadir estados para anomalías
const [alertType, setAlertType] = useState<'threshold' | 'anomaly'>('threshold');
const [anomalyMethod, setAnomalyMethod] = useState<AnomalyMethod>('zscore');
const [sensitivity, setSensitivity] = useState<number>(5);
const [baselinePeriod, setBaselinePeriod] = useState<string>('7days');

// UI para configuración de anomalías
{alertType === 'anomaly' && (
  <>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Método de Detección
      </label>
      <select
        value={anomalyMethod}
        onChange={(e) => setAnomalyMethod(e.target.value as AnomalyMethod)}
        className="w-full px-3 py-2 border rounded-lg"
      >
        <option value="zscore">Z-Score (Desviaciones Estándar)</option>
        <option value="iqr">IQR (Rango Intercuartil)</option>
        <option value="moving_average">Media Móvil</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Sensibilidad: {sensitivity}/10
      </label>
      <input
        type="range"
        min="1"
        max="10"
        value={sensitivity}
        onChange={(e) => setSensitivity(Number(e.target.value))}
        className="w-full"
      />
      <p className="text-xs text-gray-500 mt-1">
        Mayor valor = más sensible a cambios pequeños
      </p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Periodo Base (Histórico)
      </label>
      <select
        value={baselinePeriod}
        onChange={(e) => setBaselinePeriod(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg"
      >
        <option value="1day">1 día</option>
        <option value="7days">7 días</option>
        <option value="30days">30 días</option>
        <option value="90days">90 días</option>
      </select>
    </div>
  </>
)}
```

---

### FASE 4: Superset - Datasets y Filtros

#### 4.1 Importar Datasets en Superset
**Acción**: Importar manualmente o via API los siguientes datasets:

```bash
# Conectar a PostgreSQL en Superset
# Database: tfspain-postgres.postgres.database.azure.com:5432/pm_db

# Datasets a añadir:
1. kpi_global_15min
2. kpi_provincia_15min
3. kpi_region_15min
4. kpi_zipcode_15min
5. kpi_celda_15min
6. kpi_nodo_15min
```

#### 4.2 Crear Dashboards con Filtros Dinámicos
**Archivo**: Configuración en Superset UI

1. **Dashboard Global**
   - Chart: KPI trends over time
   - Dataset: `kpi_global_15min`
   - Sin filtros adicionales

2. **Dashboard Provincial**
   - Chart: KPI por provincia
   - Dataset: `kpi_provincia_15min`
   - Filtro: provincia_id (dropdown)

3. **Dashboard por Celda**
   - Chart: KPI por celda
   - Dataset: `kpi_celda_15min`
   - Filtro: celda_id (dropdown)

4. **Dashboard por Nodo**
   - Chart: KPI por nodo
   - Dataset: `kpi_nodo_15min`
   - Filtro: nodo_id (dropdown)

#### 4.3 Actualizar Semantic Layer JSON
**Archivo**: `/Users/alejandromedina/dev/FC/PM/semantic.json`

```json
[
  {
    "category": "Accessibility",
    "kpi": [
      {
        "name": "erab_est_success_rate_all_qci",
        "description": "Success rate of E-RAB establishment",
        "datasets": {
          "global": "kpi_global_15min",
          "provincia": "kpi_provincia_15min",
          "region": "kpi_region_15min",
          "zipcode": "kpi_zipcode_15min",
          "celda": "kpi_celda_15min",
          "nodo": "kpi_nodo_15min"
        }
      }
    ]
  }
]
```

---

### FASE 5: Endpoints Adicionales

#### 5.1 Endpoint para Opciones de Scope
**Archivo**: `nix-pm-backend/src/routes/scope.ts`

```typescript
import { Router } from 'express';
import { queryDatabase } from '../config/database';

const router = Router();

// GET /api/scope/:type/options
router.get('/:type/options', async (req, res) => {
  const { type } = req.params;

  let query = '';
  switch (type) {
    case 'provincia':
      query = 'SELECT DISTINCT provincia_id as id, provincia_name as name FROM kpi_provincia_15min ORDER BY name';
      break;
    case 'region':
      query = 'SELECT DISTINCT region_id as id, region_name as name FROM kpi_region_15min ORDER BY name';
      break;
    case 'zipcode':
      query = 'SELECT DISTINCT zipcode as id, zipcode as name FROM kpi_zipcode_15min ORDER BY name';
      break;
    case 'celda':
      query = 'SELECT DISTINCT celda_id as id, celda_name as name FROM kpi_celda_15min ORDER BY name';
      break;
    case 'nodo':
      query = 'SELECT DISTINCT nodo_id as id, nodo_name as name FROM kpi_nodo_15min ORDER BY name';
      break;
    default:
      return res.status(400).json({ error: 'Invalid scope type' });
  }

  const options = await queryDatabase<{ id: string; name: string }>(query);
  res.json({ success: true, data: options });
});

export default router;
```

---

## 📦 Instalación de Dependencias

### Backend
```bash
# Instalar librería de estadísticas (si no está)
npm install simple-statistics
npm install @types/simple-statistics --save-dev
```

### Frontend
```bash
# Ya instalado: recharts para visualización
# No se necesitan nuevas dependencias
```

---

## ✅ Checklist de Implementación

### Backend
- [ ] Migración de BD para añadir columnas `scope` y `scope_value`
- [ ] Actualizar tipos en `alerts.ts` para incluir scope
- [ ] Modificar `statisticsService.ts` para soportar scope
- [ ] Modificar `thresholdService.ts` para soportar scope
- [ ] Crear `anomalyService.ts` con métodos z-score, IQR, moving average
- [ ] Actualizar `schedulerService.ts` para evaluar anomalías
- [ ] Crear rutas `/api/scope/:type/options` para obtener listas
- [ ] Actualizar rutas de alerts para validar scope

### Frontend
- [ ] Actualizar tipos en `alerts.ts` con scope
- [ ] Añadir selector de scope en CreateAlert paso 1
- [ ] Añadir selector de scope_value (provincia, celda, etc)
- [ ] Añadir configuración de anomalías en paso 2
- [ ] Actualizar `alertsService.ts` con nuevos endpoints
- [ ] Mostrar scope en Alerts listing
- [ ] Mostrar scope en AlertDetails
- [ ] Actualizar gráfica de timeseries con scope

### Superset
- [ ] Importar dataset `kpi_provincia_15min`
- [ ] Importar dataset `kpi_region_15min`
- [ ] Importar dataset `kpi_zipcode_15min`
- [ ] Importar dataset `kpi_celda_15min`
- [ ] Importar dataset `kpi_nodo_15min`
- [ ] Crear dashboards con filtros por scope
- [ ] Configurar permisos de acceso

### Capa Semántica
- [ ] Actualizar `semantic.json` con datasets multi-nivel
- [ ] Actualizar servicio frontend para leer nuevos campos

---

## 🧪 Testing

### Casos de Prueba

#### Alertas Multi-Nivel
1. **Alerta Global**
   - Crear alerta global threshold
   - Verificar que consulta `kpi_global_15min`
   - Verificar que no aplica filtros adicionales

2. **Alerta Provincial**
   - Crear alerta para provincia específica
   - Verificar que consulta `kpi_provincia_15min`
   - Verificar filtro `WHERE provincia_id = 'MADRID'`

3. **Alerta por Celda**
   - Crear alerta para celda específica
   - Verificar que consulta `kpi_celda_15min`
   - Verificar filtro `WHERE celda_id = 'CELDA_001'`

#### Anomalías
1. **Z-Score**
   - Crear alerta con método z-score, sensibilidad 5
   - Insertar valor anómalo (>3 desviaciones)
   - Verificar que dispara alerta

2. **IQR**
   - Crear alerta con método IQR, sensibilidad 7
   - Insertar valor fuera de rango
   - Verificar trigger con anomaly_score

3. **Moving Average**
   - Crear alerta con moving average
   - Verificar detección de picos/valles

---

## 📊 Estructura de Datos de Ejemplo

### Alert con Scope Provincial y Anomaly Detection
```json
{
  "name": "Anomalía en Tráfico DL - Madrid",
  "description": "Detecta patrones anormales en tráfico descendente para Madrid",
  "kpi_name": "dl_pdcp_sdu_traffic_all_qci",
  "dataset_name": "kpi_provincia_15min",
  "alert_type": "anomaly",
  "scope": "provincia",
  "scope_value": "MADRID",
  "enabled": true,
  "check_frequency": "15min",
  "config": {
    "method": "zscore",
    "sensitivity": 6,
    "baseline_period": "30days"
  }
}
```

### Alert con Scope Celda y Threshold
```json
{
  "name": "Alto Tráfico - Celda Centro",
  "description": "Alerta cuando el tráfico supera umbral en celda específica",
  "kpi_name": "dl_pdcp_sdu_traffic_all_qci",
  "dataset_name": "kpi_celda_15min",
  "alert_type": "threshold",
  "scope": "celda",
  "scope_value": "CELDA_CENTRO_001",
  "enabled": true,
  "check_frequency": "15min",
  "config": {
    "metric": "dl_pdcp_sdu_traffic_all_qci",
    "threshold_upper": 50000,
    "comparison": "greater_than",
    "time_window": "1hour",
    "aggregation": "avg"
  }
}
```

---

## 🚀 Orden de Ejecución Sugerido

### Mañana (Día 1)
1. **9:00 - 10:00**: Migración BD + Actualizar tipos backend
2. **10:00 - 11:30**: Modificar services (statistics, threshold) para scope
3. **11:30 - 13:00**: Implementar anomaly detection (z-score, IQR)
4. **14:00 - 15:30**: Crear endpoint scope options + actualizar scheduler
5. **15:30 - 17:00**: Testing backend con Postman/curl
6. **17:00 - 18:00**: Actualizar tipos frontend + scope selection UI
7. **18:00 - 19:00**: Integrar anomaly config en CreateAlert

### Día 2 (Si necesario)
1. **9:00 - 11:00**: Importar datasets en Superset
2. **11:00 - 13:00**: Crear dashboards con filtros
3. **14:00 - 16:00**: Actualizar semantic layer
4. **16:00 - 18:00**: Testing end-to-end
5. **18:00 - 19:00**: Documentación y refinamiento

---

## 📚 Recursos y Referencias

### Anomaly Detection
- **Z-Score**: Detecta valores que están a N desviaciones estándar de la media
- **IQR**: Detecta outliers usando percentiles (Q1, Q3)
- **Moving Average**: Compara con media móvil reciente

### Datasets Multi-Nivel
```
kpi_global_15min       -> Agregación total de red
kpi_provincia_15min    -> Agregado por provincia
kpi_region_15min       -> Agregado por región
kpi_zipcode_15min      -> Agregado por código postal
kpi_celda_15min        -> Por celda individual
kpi_nodo_15min         -> Por nodo individual
```

---

## 🔧 Configuración de Desarrollo

### Variables de Entorno
```bash
# .env (backend)
DATABASE_URL=postgresql://user:pass@tfspain-postgres.postgres.database.azure.com:5432/pm_db
SCHEDULER_INTERVAL=5min
ANOMALY_DEFAULT_BASELINE=7days
```

### Puertos
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Superset: `http://localhost:8088`

---

## 📝 Notas Importantes

1. **Performance**: Las queries con scope añaden un filtro WHERE, mejorar con índices
2. **Anomalías**: Requieren histórico suficiente (mínimo 7 días recomendado)
3. **Scope Global**: No añade filtros, consulta tabla completa
4. **Validación**: Scope_value es obligatorio excepto para scope='global'
5. **Superset**: Los datasets deben tener las columnas de filtro adecuadas

---

## 🎯 Objetivos del Día

✅ Implementar alertas multi-nivel funcionales
✅ Implementar detección de anomalías con 3 métodos
✅ Integrar datasets en Superset con filtros
✅ Actualizar UI para soportar nuevas features
✅ Testing completo de todas las combinaciones

---

**Próximos pasos después de completar**:
- Notificaciones (email, Slack)
- Dashboard de anomalías detectadas
- Reportes automáticos
- Machine Learning para predicción
