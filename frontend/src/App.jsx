import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import Employees from './pages/Employees';
import Locations from './pages/Locations';
import Positions from './pages/Positions';
import TimeOff from './pages/TimeOff';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import TimeClock from './pages/TimeClock';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      {/* Ruta publica para el reloj de asistencia en tablets */}
      <Route path="/timeclock/:token" element={<TimeClock />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/scheduler" element={<Scheduler />} />
                <Route path="/scheduler/:locationId" element={<Scheduler />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/positions" element={<Positions />} />
                <Route path="/time-off" element={<TimeOff />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
