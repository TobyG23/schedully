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
  const [exportPeriod, setExportPeriod] = useState('current'); // 'current', 'previous', 'custom'
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
    if (selectedLocation) {
      loadTimesheets();
    }
  }, [selectedLocation]);

  const loadData = async () => {
    try {
      const [statusRes, locRes] = await Promise.all([
        timesheetsAPI.getStatus(),
        locationsAPI.getAll(),
      ]);
      setStatus(statusRes.data);
      setLocations(locRes.data);
      if (locRes.data.length > 0) {
        setSelectedLocation(locRes.data[0].id);
      }
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
    if (!selectedLocation) {
      toast.error('Selecciona una sucursal');
      return;
    }
    setActionLoading(true);
    try {
      await timesheetsAPI.clockIn(selectedLocation);
      toast.success('Entrada registrada');
      loadData();
      loadTimesheets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al registrar entrada');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await timesheetsAPI.clockOut();
      toast.success('Salida registrada');
      loadData();
      loadTimesheets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al registrar salida');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      await timesheetsAPI.startBreak();
      toast.success('Descanso iniciado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al iniciar descanso');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      await timesheetsAPI.endBreak();
      toast.success('Descanso terminado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al terminar descanso');
    } finally {
      setActionLoading(false);
    }
  };

  const getElapsedTime = () => {
    if (!status.timesheet?.clockIn) return '00:00:00';
    const start = new Date(status.timesheet.clockIn);
    const diff = differenceInMinutes(currentTime, start);
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    const seconds = currentTime.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      let startDate, endDate;

      if (exportPeriod === 'current') {
        startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      } else if (exportPeriod === 'previous') {
        const prevMonth = subMonths(new Date(), 1);
        startDate = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(prevMonth), 'yyyy-MM-dd');
      } else {
        startDate = customDateRange.startDate;
        endDate = customDateRange.endDate;
      }

      const response = await timesheetsAPI.getAll({
        locationId: selectedLocation,
        startDate,
        endDate,
      });

      const data = response.data;

      if (data.length === 0) {
        toast.error('No hay registros para exportar en el período seleccionado');
        return;
      }

      // Preparar datos para Excel
      const excelData = data.map((ts) => ({
        'Fecha': format(new Date(ts.date), 'dd/MM/yyyy'),
        'Empleado': `${ts.user.firstName} ${ts.user.lastName}`,
        'Entrada': ts.clockIn ? format(new Date(ts.clockIn), 'HH:mm') : '-',
        'Inicio Break': ts.breakStart ? format(new Date(ts.breakStart), 'HH:mm') : '-',
        'Fin Break': ts.breakEnd ? format(new Date(ts.breakEnd), 'HH:mm') : '-',
        'Salida': ts.clockOut ? format(new Date(ts.clockOut), 'HH:mm') : '-',
        'Horas Trabajadas': ts.totalMinutes ? `${Math.floor(ts.totalMinutes / 60)}h ${ts.totalMinutes % 60}m` : '-',
        'Minutos Totales': ts.totalMinutes || 0,
        'Estado': ts.status === 'APPROVED' ? 'Aprobado' : ts.status === 'REJECTED' ? 'Rechazado' : 'Pendiente',
      }));

      // Crear libro de Excel
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 12 }, // Fecha
        { wch: 25 }, // Empleado
        { wch: 10 }, // Entrada
        { wch: 12 }, // Inicio Break
        { wch: 10 }, // Fin Break
        { wch: 10 }, // Salida
        { wch: 16 }, // Horas Trabajadas
        { wch: 15 }, // Minutos Totales
        { wch: 12 }, // Estado
      ];
      ws['!cols'] = colWidths;

      // Obtener nombre de sucursal
      const locationName = locations.find(l => l.id === selectedLocation)?.name || 'Sucursal';

      // Descargar archivo
      const fileName = `Asistencia_${locationName}_${startDate}_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Archivo exportado correctamente');
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar los datos');
    } finally {
      setExportLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asistencia</h1>
        <p className="text-gray-600">Registra tu entrada y salida</p>
      </div>

      {/* Clock Card */}
      <div className="card p-6">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-gray-500 mb-6">
            {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </div>

          {status.status === 'NOT_CLOCKED_IN' ? (
            <div className="space-y-4">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="input max-w-xs mx-auto"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <div>
                <button
                  onClick={handleClockIn}
                  disabled={actionLoading}
                  className="btn-primary px-8 py-3 text-lg"
                >
                  <PlayIcon className="h-6 w-6 mr-2" />
                  Registrar Entrada
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                {status.status === 'ON_BREAK' ? 'En Descanso' : 'Trabajando'}
              </div>

              <div className="text-3xl font-mono font-semibold text-primary-600">
                {getElapsedTime()}
              </div>

              <div className="text-sm text-gray-500">
                Entrada: {format(new Date(status.timesheet.clockIn), 'HH:mm')} -
                {status.timesheet.location?.name}
              </div>

              <div className="flex justify-center gap-4">
                {status.status === 'CLOCKED_IN' && (
                  <button
                    onClick={handleStartBreak}
                    disabled={actionLoading}
                    className="btn-secondary"
                  >
                    <PauseIcon className="h-5 w-5 mr-2" />
                    Iniciar Descanso
                  </button>
                )}

                {status.status === 'ON_BREAK' && (
                  <button
                    onClick={handleEndBreak}
                    disabled={actionLoading}
                    className="btn-secondary"
                  >
                    <PlayIcon className="h-5 w-5 mr-2" />
                    Terminar Descanso
                  </button>
                )}

                <button
                  onClick={handleClockOut}
                  disabled={actionLoading}
                  className="btn-danger"
                >
                  <StopIcon className="h-5 w-5 mr-2" />
                  Registrar Salida
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Exportar Asistencia a Excel</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Sucursal</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="input"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Período</label>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  className="input"
                >
                  <option value="current">Mes actual</option>
                  <option value="previous">Mes anterior</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {exportPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Desde</label>
                    <input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Hasta</label>
                    <input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportLoading}
                className="btn-primary"
              >
                {exportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exportando...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Timesheets (for managers) */}
      {canViewAllLocations() || hasRole('MANAGER', 'SUPERVISOR') ? (
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Asistencia de Hoy</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="input w-auto text-sm"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowExportModal(true)}
                className="btn-secondary btn-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Exportar
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {timesheets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClockIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                No hay registros de asistencia hoy
              </div>
            ) : (
              timesheets.map((ts) => (
                <div key={ts.id} className="px-4 py-3 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                    {ts.user.firstName[0]}{ts.user.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {ts.user.firstName} {ts.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {ts.shift?.position?.name || 'Sin turno asignado'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">
                        🟢 {ts.clockIn && format(new Date(ts.clockIn), 'HH:mm')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">Entrada</div>
                  </div>
                  {/* Break info */}
                  <div className="text-center min-w-[80px]">
                    {ts.breakStart ? (
                      <>
                        <div className="text-sm">
                          <span className="text-yellow-600">
                            ☕ {format(new Date(ts.breakStart), 'HH:mm')}
                          </span>
                          {ts.breakEnd && (
                            <span className="text-blue-600">
                              {' → '}{format(new Date(ts.breakEnd), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {ts.breakEnd
                            ? `${Math.floor(differenceInMinutes(new Date(ts.breakEnd), new Date(ts.breakStart)))} min`
                            : 'En descanso'
                          }
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-300">Sin break</div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">
                        {ts.clockOut ? `🔴 ${format(new Date(ts.clockOut), 'HH:mm')}` : '🔴 --:--'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">Salida</div>
                  </div>
                  <div className="text-right min-w-[60px]">
                    {ts.totalMinutes ? (
                      <div className="text-sm font-medium text-gray-700">
                        {Math.floor(ts.totalMinutes / 60)}h {ts.totalMinutes % 60}m
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">--</div>
                    )}
                  </div>
                  <div>
                    {ts.clockOut ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : ts.breakStart && !ts.breakEnd ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                      </span>
                    ) : (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
