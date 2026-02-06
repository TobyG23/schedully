import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  BuildingStorefrontIcon,
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, canViewAllLocations } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [overviewRes, alertsRes] = await Promise.all([
        dashboardAPI.getOverview(),
        dashboardAPI.getAlerts(),
      ]);
      setData(overviewRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            {canViewAllLocations()
              ? 'Vista general de todas las sucursales'
              : 'Tu panel de control'}
          </p>
        </div>
        {canViewAllLocations() && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-700">
            <BuildingStorefrontIcon className="h-4 w-4" />
            Vista Central
          </span>
        )}
      </div>

      {/* Stats generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.totals?.totalEmployees || 0}</p>
              <p className="text-sm text-gray-500">Empleados</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.totals?.clockedIn || 0}</p>
              <p className="text-sm text-gray-500">Trabajando ahora</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.totals?.todayShifts || 0}</p>
              <p className="text-sm text-gray-500">Turnos hoy</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.totals?.alerts || 0}</p>
              <p className="text-sm text-gray-500">Alertas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vista de sucursales (solo si puede ver todas) */}
      {canViewAllLocations() && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sucursales</h2>
            <Link
              to="/locations"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Ver todas <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.locations?.map((location) => (
              <Link
                key={location.id}
                to={`/scheduler/${location.id}`}
                className="card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {location.name}
                      {location.isHeadquarters && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded">
                          Central
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{location.address}</p>
                  </div>
                  {location.stats.alerts > 0 ? (
                    <span className="badge-warning">
                      {location.stats.alerts} alertas
                    </span>
                  ) : (
                    <span className="badge-success flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      OK
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-lg font-semibold text-gray-900">
                      {location.stats.totalEmployees}
                    </p>
                    <p className="text-xs text-gray-500">Empleados</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-lg font-semibold text-green-600">
                      {location.stats.clockedIn}
                    </p>
                    <p className="text-xs text-gray-500">Activos</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-lg font-semibold text-blue-600">
                      {location.stats.todayShifts}
                    </p>
                    <p className="text-xs text-gray-500">Turnos</p>
                  </div>
                </div>

                {(location.stats.openShifts > 0 || location.stats.pendingRequests > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    {location.stats.openShifts > 0 && (
                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                        {location.stats.openShifts} turnos abiertos
                      </span>
                    )}
                    {location.stats.pendingRequests > 0 && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {location.stats.pendingRequests} solicitudes
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Alertas Recientes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="px-4 py-3 flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    alert.severity === 'warning'
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                  }`}
                >
                  <ExclamationTriangleIcon
                    className={`h-5 w-5 ${
                      alert.severity === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(alert.date).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos rapidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/scheduler"
          className="card p-4 text-center hover:shadow-md transition-shadow group"
        >
          <CalendarDaysIcon className="h-8 w-8 mx-auto text-primary-600 group-hover:scale-110 transition-transform" />
          <p className="mt-2 text-sm font-medium text-gray-900">Ver Horarios</p>
        </Link>

        <Link
          to="/employees"
          className="card p-4 text-center hover:shadow-md transition-shadow group"
        >
          <UsersIcon className="h-8 w-8 mx-auto text-primary-600 group-hover:scale-110 transition-transform" />
          <p className="mt-2 text-sm font-medium text-gray-900">Empleados</p>
        </Link>

        <Link
          to="/attendance"
          className="card p-4 text-center hover:shadow-md transition-shadow group"
        >
          <ClockIcon className="h-8 w-8 mx-auto text-primary-600 group-hover:scale-110 transition-transform" />
          <p className="mt-2 text-sm font-medium text-gray-900">Asistencia</p>
        </Link>

        <Link
          to="/time-off"
          className="card p-4 text-center hover:shadow-md transition-shadow group"
        >
          <CalendarIcon className="h-8 w-8 mx-auto text-primary-600 group-hover:scale-110 transition-transform" />
          <p className="mt-2 text-sm font-medium text-gray-900">Solicitudes</p>
        </Link>
      </div>
    </div>
  );
}

function CalendarIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
