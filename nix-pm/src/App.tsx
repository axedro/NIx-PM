import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboards } from './pages/Dashboards';
import { Charts } from './pages/Charts';
import { CreateChart } from './pages/CreateChart';
import { CreateChartSuperset } from './pages/CreateChartSuperset';
import { Alerts } from './pages/Alerts';
import { CreateAlert } from './pages/CreateAlert';
import { AlertDetails } from './pages/AlertDetails';
import { supersetService } from './services/superset';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!supersetService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Restore session from sessionStorage on app mount
    supersetService.restoreSession();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboards" replace />} />
                  <Route path="/dashboards" element={<Dashboards />} />
                  <Route path="/charts" element={<Charts />} />
                  <Route path="/charts/create" element={<CreateChart />} />
                  <Route path="/charts/create-superset" element={<CreateChartSuperset />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/alerts/create" element={<CreateAlert />} />
                  <Route path="/alerts/:id" element={<AlertDetails />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
