import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timesheetsAPI, locationsAPI } from '../services/api';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { format, differenceInMinutes, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ─── Colored status dot (replaces emoji) ──────────────────────────────────
function StatusDot({ color = 'bg-gray-400', pulse = false }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

export default function Attendance() {
  const { user, hasRole, canViewAllLocations } = useAuth();
  const [status, setStatus] = useState({ status: 'NOT_CLOCKED_IN', timesheet: null });
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('current');
  const [showExportModal, setShowExportModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedLocation) loadTimesheets();
  }, [selectedLocation]);

  const loadData = async () => {
    try {
      const [statusRes, locRes] = await Promise.all([
        timesheetsAPI.getStatus(),
        locationsAPI.getAll(),
      ]);
      setStatus(statusRes.data);
      setLocations(locRes.data);
      if (locRes.data.length > 0) setSelectedLocation(locRes.data[0].id);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadTimesheets = async () => {
    try {
      const today = new Date();
      const response = await timesheetsAPI.getAll({
        locationId: selectedLocation,
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      });
      setTimesheets(response.data);
    } catch (error) {
      console.error('Error loading timesheets:', error);
    }
  };

  const handleClockIn = async () => {
    if (!selectedLocation) { toast.error('Selecciona una sucursal'); return; }
    setActionLoading(true);
    try {
      await timesheetsAPI.clockIn(selectedLocation);
      toast.success('Entrada registrada');
      loadData(); loadTimesheets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al registrar entrada');
    } finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await timesheetsAPI.clockOut();
      toast.success('Salida registrada');
      loadData(); loadTimesheets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al registrar salida');
    } finally { setActionLoading(false); }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      await timesheetsAPI.startBreak();
      toast.success('Descanso iniciado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al iniciar descanso');
    } finally { setActionLoading(false); }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      await timesheetsAPI.endBreak();
      toast.success('Descanso terminado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al terminar descanso');
    } finally { setActionLoading(false); }
  };

  const getElapsedTime = () => {
    if (!status.timesheet?.clockIn) return '00:00:00';
    const diff = differenceInMinutes(currentTime, new Date(status.timesheet.clockIn));
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    const seconds = currentTime.getSeconds();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      let startDate, endDate;
      if (exportPeriod === 'current') {
        startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        endDate   = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      } else if (exportPeriod === 'previous') {
        const prev = subMonths(new Date(), 1);
        startDate = format(startOfMonth(prev), 'yyyy-MM-dd');
        endDate   = format(endOfMonth(prev), 'yyyy-MM-dd');
      } else {
        startDate = customDateRange.startDate;
        endDate   = customDateRange.endDate;
      }

      const response = await timesheetsAPI.getAll({ locationId: selectedLocation, startDate, endDate });
      const data = response.data;

      if (data.length === 0) {
        toast.error('No hay registros para exportar en el período seleccionado');
        return;
      }

      const excelData = data.map((ts) => ({
        'Fecha':           format(new Date(ts.date), 'dd/MM/yyyy'),
        'Empleado':        `${ts.user.firstName} ${ts.user.lastName}`,
        'Entrada':         ts.clockIn  ? format(new Date(ts.clockIn),  'HH:mm') : '-',
        'Inicio Break':    ts.breakStart ? format(new Date(ts.breakStart), 'HH:mm') : '-',
        'Fin Break':       ts.breakEnd   ? format(new Date(ts.breakEnd),   'HH:mm') : '-',
        'Salida':          ts.clockOut ? format(new Date(ts.clockOut), 'HH:mm') : '-',
        'Horas Trabajadas': ts.totalMinutes ? `${Math.floor(ts.totalMinutes / 60)}h ${ts.totalMinutes % 60}m` : '-',
        'Minutos Totales': ts.totalMinutes || 0,
        'Estado':          ts.status === 'APPROVED' ? 'Aprobado' : ts.status === 'REJECTED' ? 'Rechazado' : 'Pendiente',
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
      ws['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 15 }, { wch: 12 },
      ];

      const locationName = locations.find(l => l.id === selectedLocation)?.name || 'Sucursal';
      XLSX.writeFile(wb, `Asistencia_${locationName}_${startDate}_${endDate}.xlsx`);
      toast.success('Archivo exportado correctamente');
      setShowExportModal(false);
    } catch (error) {
      toast.error('Error al exportar los datos');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-40 animate-pulse" />
        <div className="card animate-pulse h-64" />
      </div>
    );
  }

  const isClockedIn = status.status !== 'NOT_CLOCKED_IN';
  const isOnBreak   = status.status === 'ON_BREAK';

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Asistencia</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registra tu entrada y salida</p>
      </div>

      {/* ── Clock card ─────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {/* Dark time display */}
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 px-6 py-8 text-center">
          <p className="text-navy-400 text-xs font-semibold tracking-widest uppercase mb-3">
            {format(currentTime, 'EEEE', { locale: es })}
          </p>
          <div className="tabular-nums">
            <span className="text-5xl font-mono font-bold text-white tracking-tight">
              {format(currentTime, 'HH:mm')}
            </span>
            <span className="text-2xl font-mono text-navy-400">
              :{format(currentTime, 'ss')}
            </span>
          </div>
          <p className="text-navy-400 text-sm mt-2">
            {format(currentTime, "d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        {/* Actions area */}
        <div className="p-6 text-center">
          {!isClockedIn ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Selecciona tu sucursal</p>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="input max-w-xs mx-auto"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="btn-primary px-8 py-3 text-base"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Registrar Entrada
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-medium text-sm">
                <StatusDot color="bg-emerald-500" pulse />
                {isOnBreak ? 'En Descanso' : 'Trabajando'}
              </div>

              <div className="text-3xl font-mono font-bold text-primary-600 tabular-nums">
                {getElapsedTime()}
              </div>

              <p className="text-sm text-gray-500">
                Entrada:{' '}
                <span className="font-medium text-navy-800">
                  {format(new Date(status.timesheet.clockIn), 'HH:mm')}
                </span>
                {' · '}
                {status.timesheet.location?.name}
              </p>

              <div className="flex justify-center gap-3">
                {!isOnBreak && (
                  <button onClick={handleStartBreak} disabled={actionLoading} className="btn-secondary">
                    <PauseIcon className="h-4 w-4 mr-2" />
                    Iniciar Descanso
                  </button>
                )}
                {isOnBreak && (
                  <button onClick={handleEndBreak} disabled={actionLoading} className="btn-secondary">
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Terminar Descanso
                  </button>
                )}
                <button onClick={handleClockOut} disabled={actionLoading} className="btn-danger">
                  <StopIcon className="h-4 w-4 mr-2" />
                  Registrar Salida
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Export modal ───────────────────────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-navy-800 mb-4">Exportar Asistencia a Excel</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Sucursal</label>
                <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="input">
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Período</label>
                <select value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} className="input">
                  <option value="current">Mes actual</option>
                  <option value="previous">Mes anterior</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              {exportPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Desde</label>
                    <input type="date" value={customDateRange.startDate} onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })} className="input" />
                  </div>
                  <div>
                    <label className="label">Hasta</label>
                    <input type="date" value={customDateRange.endDate} onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })} className="input" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowExportModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleExportExcel} disabled={exportLoading} className="btn-primary">
                {exportLoading ? (
                  <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block" />Exportando...</>
                ) : (
                  <><ArrowDownTrayIcon className="h-4 w-4 mr-2" />Exportar Excel</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Today's timesheets (managers) ──────────────────── */}
      {(canViewAllLocations() || hasRole('MANAGER', 'SUPERVISOR')) && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-navy-800 text-sm">Asistencia de Hoy</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="input text-xs w-auto py-1"
              >
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
              <button onClick={() => setShowExportModal(true)} className="btn-secondary btn-sm">
                <ArrowDownTrayIcon className="h-3.5 w-3.5 mr-1" />
                Exportar
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {timesheets.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <ClockIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-navy-800 mb-1">Sin registros hoy</p>
                <p className="text-xs text-gray-500">No hay asistencia registrada en esta sucursal</p>
              </div>
            ) : (
              timesheets.map((ts) => (
                <div key={ts.id} className="px-5 py-3.5 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 flex-shrink-0">
                    {ts.user.firstName[0]}{ts.user.lastName[0]}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy-800">
                      {ts.user.firstName} {ts.user.lastName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {ts.shift?.position?.name || 'Sin turno asignado'}
                    </div>
                  </div>

                  {/* Clock in */}
                  <div className="text-center min-w-[64px]">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-medium text-sm">
                      <StatusDot color="bg-emerald-500" />
                      {ts.clockIn ? format(new Date(ts.clockIn), 'HH:mm') : '--:--'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Entrada</div>
                  </div>

                  {/* Break */}
                  <div className="text-center min-w-[80px]">
                    {ts.breakStart ? (
                      <>
                        <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium">
                          <PauseIcon className="h-3 w-3" />
                          {format(new Date(ts.breakStart), 'HH:mm')}
                          {ts.breakEnd && (
                            <span className="text-blue-500">→{format(new Date(ts.breakEnd), 'HH:mm')}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {ts.breakEnd
                            ? `${Math.floor(differenceInMinutes(new Date(ts.breakEnd), new Date(ts.breakStart)))} min`
                            : 'En descanso'}
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-gray-300 text-center">Sin break</div>
                    )}
                  </div>

                  {/* Clock out */}
                  <div className="text-center min-w-[64px]">
                    <div className="flex items-center justify-center gap-1.5 text-rose-500 font-medium text-sm">
                      <StatusDot color="bg-rose-500" />
                      {ts.clockOut ? format(new Date(ts.clockOut), 'HH:mm') : '--:--'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Salida</div>
                  </div>

                  {/* Total */}
                  <div className="text-right min-w-[52px]">
                    {ts.totalMinutes ? (
                      <div className="text-sm font-semibold text-navy-800 tabular-nums">
                        {Math.floor(ts.totalMinutes / 60)}h{ts.totalMinutes % 60 > 0 ? ` ${ts.totalMinutes % 60}m` : ''}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">--</div>
                    )}
                  </div>

                  {/* Status icon */}
                  <div className="flex-shrink-0 w-5">
                    {ts.clockOut ? (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                    ) : isOnBreak ? (
                      <StatusDot color="bg-amber-400" pulse />
                    ) : (
                      <StatusDot color="bg-emerald-500" pulse />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
