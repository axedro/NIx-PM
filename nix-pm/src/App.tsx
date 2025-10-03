import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboards } from './pages/Dashboards';
import { Charts } from './pages/Charts';
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
