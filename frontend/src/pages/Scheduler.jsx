import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shiftsAPI, locationsAPI, usersAPI, positionsAPI, timesheetsAPI } from '../services/api';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  PaperAirplaneIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ShiftModal from '../components/scheduler/ShiftModal';

export default function Scheduler() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { canViewAllLocations } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadShifts();
    }
  }, [selectedLocation, currentDate]);

  const loadInitialData = async () => {
    try {
      const [locRes, posRes] = await Promise.all([
        locationsAPI.getAll(),
        positionsAPI.getAll(),
      ]);
      setLocations(locRes.data);
      setPositions(posRes.data);

      if (locationId) {
        setSelectedLocation(locationId);
      } else if (locRes.data.length > 0) {
        setSelectedLocation(locRes.data[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const loadShifts = async () => {
    setLoading(true);
    try {
      const [shiftsRes, usersRes, timesheetsRes] = await Promise.all([
        shiftsAPI.getAll({
          locationId: selectedLocation,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
        }),
        usersAPI.getAll({ locationId: selectedLocation }),
        timesheetsAPI.getAll({
          locationId: selectedLocation,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
        }),
      ]);
      setShifts(shiftsRes.data);
      setUsers(usersRes.data);
      setTimesheets(timesheetsRes.data);
    } catch (error) {
      toast.error('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (e) => {
    const newLocationId = e.target.value;
    setSelectedLocation(newLocationId);
    navigate(`/scheduler/${newLocationId}`);
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const openNewShiftModal = (date, user) => {
    setSelectedShift(null);
    setSelectedDate(date);
    setSelectedUser(user);
    setModalOpen(true);
  };

  const openEditShiftModal = (shift) => {
    setSelectedShift(shift);
    setSelectedDate(null);
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleSaveShift = async (shiftData) => {
    try {
      if (selectedShift) {
        await shiftsAPI.update(selectedShift.id, shiftData);
        toast.success('Turno actualizado');
      } else {
        await shiftsAPI.create({
          ...shiftData,
          locationId: selectedLocation,
        });
        toast.success('Turno creado');
      }
      setModalOpen(false);
      loadShifts();
    } catch (error) {
      toast.error('Error al guardar turno');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!confirm('¿Eliminar este turno?')) return;
    try {
      await shiftsAPI.delete(shiftId);
      toast.success('Turno eliminado');
      loadShifts();
    } catch (error) {
      toast.error('Error al eliminar turno');
    }
  };

  const handleCopyWeek = async () => {
    const prevWeekStart = subWeeks(weekStart, 1);
    try {
      await shiftsAPI.copyWeek({
        locationId: selectedLocation,
        sourceStartDate: format(prevWeekStart, 'yyyy-MM-dd'),
        targetStartDate: format(weekStart, 'yyyy-MM-dd'),
      });
      toast.success('Semana copiada');
      loadShifts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al copiar semana');
    }
  };

  const handlePublish = async () => {
    try {
      await shiftsAPI.publish({
        locationId: selectedLocation,
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      });
      toast.success('Turnos publicados');
      loadShifts();
    } catch (error) {
      toast.error('Error al publicar turnos');
    }
  };

  // Helper para comparar fechas sin problemas de timezone
  // Las fechas del servidor vienen como "2026-02-01T00:00:00.000Z" o "2026-02-01T12:00:00.000Z"
  // Extraemos solo la parte YYYY-MM-DD del string ISO
  const isSameDateLocal = (dateStr, localDate) => {
    const serverDateStr = dateStr.substring(0, 10);
    const localDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    return serverDateStr === localDateStr;
  };

  const getUserShifts = (userId, date) => {
    return shifts.filter(
      (s) => s.userId === userId && isSameDateLocal(s.date, date)
    );
  };

  const getOpenShifts = (date) => {
    return shifts.filter(
      (s) => s.isOpenShift && isSameDateLocal(s.date, date)
    );
  };

  const formatTime = (timeStr) => {
    const date = new Date(timeStr);
    return format(date, 'HH:mm');
  };

  // Calcular horas planificadas de un usuario en la semana
  const getPlannedHours = (userId) => {
    const userShifts = shifts.filter(s => s.userId === userId && !s.isOpenShift && !s.isDayOff);
    let totalMinutes = 0;
    userShifts.forEach(shift => {
      if (shift.startTime && shift.endTime) {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        // Extraer solo horas y minutos para calcular duración correctamente
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        let endMinutes = end.getHours() * 60 + end.getMinutes();
        // Si endMinutes es menor, asumimos que cruza medianoche
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60;
        }
        const shiftMinutes = endMinutes - startMinutes - (shift.breakMinutes || 0);
        totalMinutes += shiftMinutes;
      }
    });
    return totalMinutes;
  };

  // Calcular horas trabajadas de un usuario en la semana (del timeclock)
  const getWorkedHours = (userId) => {
    const userTimesheets = timesheets.filter(t => t.user?.id === userId);
    let totalMinutes = 0;
    userTimesheets.forEach(ts => {
      if (ts.totalMinutes) {
        totalMinutes += ts.totalMinutes;
      } else if (ts.clockIn && !ts.clockOut) {
        // Turno activo - calcular tiempo transcurrido
        totalMinutes += differenceInMinutes(new Date(), new Date(ts.clockIn));
      }
    });
    return totalMinutes;
  };

  // Formatear minutos a horas
  const formatHours = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <p className="text-gray-600">Gestiona los turnos de trabajo</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLocation}
            onChange={handleLocationChange}
            className="input max-w-xs"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.isHeadquarters ? '(Central)' : ''}
              </option>
            ))}
          </select>

          <button onClick={handleCopyWeek} className="btn-secondary btn-sm">
            <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
            Copiar semana
          </button>

          <button onClick={handlePublish} className="btn-primary btn-sm">
            <PaperAirplaneIcon className="h-4 w-4 mr-1" />
            Publicar
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              Hoy
            </button>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekStart, "d 'de' MMMM", { locale: es })} -{' '}
            {format(weekEnd, "d 'de' MMMM, yyyy", { locale: es })}
          </h2>

          <div className="w-32" /> {/* Spacer */}
        </div>
      </div>

      {/* Schedule Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-64">
                    Empleado
                  </th>
                  {weekDays.map((day) => (
                    <th
                      key={day.toISOString()}
                      className={`px-2 py-3 text-center text-sm font-semibold min-w-[120px] ${
                        isSameDay(day, new Date())
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-900'
                      }`}
                    >
                      <div>{format(day, 'EEE', { locale: es })}</div>
                      <div className="text-lg">{format(day, 'd')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Open Shifts Row */}
                <tr className="bg-yellow-50">
                  <td className="px-4 py-2 font-medium text-yellow-700">
                    Turnos Abiertos
                  </td>
                  {weekDays.map((day) => {
                    const openShifts = getOpenShifts(day);
                    return (
                      <td
                        key={day.toISOString()}
                        className="px-2 py-2 align-top"
                      >
                        <div className="space-y-1">
                          {openShifts.map((shift) => (
                            <button
                              key={shift.id}
                              onClick={() => openEditShiftModal(shift)}
                              className="w-full text-left p-2 rounded text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800"
                            >
                              <div className="font-medium">
                                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                              </div>
                              <div>{shift.position?.name}</div>
                            </button>
                          ))}
                          <button
                            onClick={() => openNewShiftModal(day, null)}
                            className="w-full p-1 text-xs text-yellow-600 hover:bg-yellow-100 rounded flex items-center justify-center gap-1"
                          >
                            <PlusIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* User Rows */}
                {users.map((user) => {
                  const plannedMinutes = getPlannedHours(user.id);
                  const workedMinutes = getWorkedHours(user.id);
                  return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.userPositions?.[0]?.position?.name || 'Sin posicion'}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="flex items-center gap-1 text-blue-600" title="Horas planificadas">
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatHours(plannedMinutes)}</span>
                          </div>
                          <div className={`flex items-center gap-1 ${workedMinutes > 0 ? 'text-green-600' : 'text-gray-400'}`} title="Horas trabajadas">
                            <span className="text-[10px]">✓</span>
                            <span>{workedMinutes > 0 ? formatHours(workedMinutes) : '--'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const userShifts = getUserShifts(user.id, day);
                      return (
                        <td
                          key={day.toISOString()}
                          className={`px-2 py-2 align-top ${
                            isSameDay(day, new Date()) ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            {userShifts.map((shift) => (
                              <button
                                key={shift.id}
                                onClick={() => openEditShiftModal(shift)}
                                className={`w-full text-left p-2 rounded text-xs transition-colors ${
                                  shift.isDayOff
                                    ? 'bg-gray-100 border-l-3 border-gray-400'
                                    : ''
                                }`}
                                style={!shift.isDayOff ? {
                                  backgroundColor: `${shift.position?.color}20`,
                                  borderLeft: `3px solid ${shift.position?.color}`,
                                } : {
                                  borderLeft: '3px solid #9ca3af'
                                }}
                              >
                                {shift.isDayOff ? (
                                  <>
                                    <div className="font-medium text-gray-700">
                                      🗓️ Día Libre
                                    </div>
                                    <div className="text-gray-500">
                                      {shift.dayOffType === 'VACATION' ? 'Vacaciones' :
                                       shift.dayOffType === 'SICK' ? 'Enfermedad' :
                                       shift.dayOffType === 'PERSONAL' ? 'Personal' :
                                       shift.dayOffType === 'HOLIDAY' ? 'Feriado' :
                                       'Libre'}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="font-medium text-gray-900">
                                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                    </div>
                                    <div className="text-gray-600">
                                      {shift.position?.name}
                                    </div>
                                  </>
                                )}
                                {!shift.isPublished && (
                                  <span className="inline-block mt-1 px-1 py-0.5 text-[10px] bg-gray-200 text-gray-600 rounded">
                                    Borrador
                                  </span>
                                )}
                              </button>
                            ))}
                            <button
                              onClick={() => openNewShiftModal(day, user)}
                              className="w-full p-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded flex items-center justify-center gap-1"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      <ShiftModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        shift={selectedShift}
        date={selectedDate}
        user={selectedUser}
        users={users}
        positions={positions}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
      />
    </div>
  );
}
