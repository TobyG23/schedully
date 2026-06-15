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
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// ─── Stat card with integrated skeleton ────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconBg, iconColor, description, loading }) {
  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2.5">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-14" />
          </div>
          <div className="h-11 w-11 bg-gray-200 rounded-xl" />
        </div>
        <div className="pt-3 border-t border-gray-100">
          <div className="h-2.5 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-navy-800 tabular-nums">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

// ─── Location card skeleton ─────────────────────────────────────────────────
function LocationCardSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-3.5 bg-gray-200 rounded w-28 mb-2" />
          <div className="h-2.5 bg-gray-200 rounded w-36" />
        </div>
        <div className="h-5 bg-gray-200 rounded-full w-14" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="p-2 bg-gray-50 rounded">
            <div className="h-5 bg-gray-200 rounded w-8 mx-auto mb-1" />
            <div className="h-2 bg-gray-200 rounded w-12 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    to: '/scheduler',
    icon: CalendarDaysIcon,
    label: 'Horarios',
    desc: 'Gestionar turnos de la semana',
  },
  {
    to: '/employees',
    icon: UsersIcon,
    label: 'Empleados',
    desc: 'Ver y editar personal',
  },
  {
    to: '/attendance',
    icon: ClockIcon,
    label: 'Asistencia',
    desc: 'Registrar entrada y salida',
  },
  {
    to: '/time-off',
    icon: CalendarDaysIcon,
    label: 'Solicitudes',
    desc: 'Tiempo libre y vacaciones',
  },
];

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

  const STATS = [
    {
      label: 'Empleados',
      value: data?.totals?.totalEmployees ?? 0,
      icon: UsersIcon,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      description: 'Personal activo en la empresa',
    },
    {
      label: 'Trabajando ahora',
      value: data?.totals?.clockedIn ?? 0,
      icon: ClockIcon,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      description: 'Con entrada registrada hoy',
    },
    {
      label: 'Turnos hoy',
      value: data?.totals?.todayShifts ?? 0,
      icon: CalendarDaysIcon,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-500',
      description: 'Turnos programados para hoy',
    },
    {
      label: 'Alertas',
      value: data?.totals?.alerts ?? 0,
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      description: 'Eventos que requieren atención',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">
            Hola, {user?.firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {canViewAllLocations()
              ? 'Vista general de todas las sucursales'
              : 'Tu panel de control'}
          </p>
        </div>
        {canViewAllLocations() && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-700 self-start">
            <BuildingStorefrontIcon className="h-4 w-4" />
            Vista Central
          </span>
        )}
      </div>

      {/* ── Stats grid ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </div>

      {/* ── Branch overview (admin only) ─────────────────── */}
      {canViewAllLocations() && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-navy-800">Sucursales</h2>
            <Link
              to="/locations"
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Ver todas <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? [0, 1, 2].map((i) => <LocationCardSkeleton key={i} />)
              : data?.locations?.map((location) => (
                  <Link
                    key={location.id}
                    to={`/scheduler/${location.id}`}
                    className="card-hover p-4 block"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-navy-800 flex items-center gap-2 text-sm">
                          {location.name}
                          {location.isHeadquarters && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-100 text-primary-700 rounded-md">
                              Central
                            </span>
                          )}
                        </h3>
                        {location.address && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                            {location.address}
                          </p>
                        )}
                      </div>
                      {location.stats.alerts > 0 ? (
                        <span className="badge-warning text-[11px]">
                          {location.stats.alerts} alerta{location.stats.alerts !== 1 && 's'}
                        </span>
                      ) : (
                        <span className="badge-success flex items-center gap-1 text-[11px]">
                          <CheckCircleIcon className="h-3 w-3" /> OK
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="py-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-navy-800 tabular-nums">
                          {location.stats.totalEmployees}
                        </p>
                        <p className="text-[11px] text-gray-500">Empleados</p>
                      </div>
                      <div className="py-2 bg-emerald-50 rounded-lg">
                        <p className="text-lg font-bold text-emerald-600 tabular-nums">
                          {location.stats.clockedIn}
                        </p>
                        <p className="text-[11px] text-emerald-600/80">Activos</p>
                      </div>
                      <div className="py-2 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600 tabular-nums">
                          {location.stats.todayShifts}
                        </p>
                        <p className="text-[11px] text-blue-600/80">Turnos</p>
                      </div>
                    </div>

                    {(location.stats.openShifts > 0 || location.stats.pendingRequests > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                        {location.stats.openShifts > 0 && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            {location.stats.openShifts} turno{location.stats.openShifts !== 1 && 's'} abierto{location.stats.openShifts !== 1 && 's'}
                          </span>
                        )}
                        {location.stats.pendingRequests > 0 && (
                          <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                            {location.stats.pendingRequests} solicitud{location.stats.pendingRequests !== 1 && 'es'}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
          </div>
        </section>
      )}

      {/* ── Recent alerts ────────────────────────────────── */}
      {alerts.length > 0 && (
        <section className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <BellAlertIcon className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-navy-800 text-sm">Alertas recientes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="px-5 py-3 flex items-start gap-3">
                <div
                  className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                    alert.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}
                >
                  <ExclamationTriangleIcon
                    className={`h-4 w-4 ${
                      alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-navy-800">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(alert.date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick actions ────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-navy-800 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="card-hover p-4 flex items-center gap-3 group"
            >
              <div className="p-2 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors flex-shrink-0">
                <Icon className="h-5 w-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-800">{label}</p>
                <p className="text-xs text-gray-500 truncate">{desc}</p>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
