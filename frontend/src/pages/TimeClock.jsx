import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { timeclockAPI } from '../services/api';

// Estados del empleado
const STATUS = {
  NOT_CLOCKED_IN: 'NOT_CLOCKED_IN',
  CLOCKED_IN: 'CLOCKED_IN',
  ON_BREAK: 'ON_BREAK',
  CLOCKED_OUT: 'CLOCKED_OUT'
};

// Componente para mostrar iniciales del avatar
function Avatar({ firstName, lastName, size = 'md' }) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg`}>
      {initials}
    </div>
  );
}

// Componente de reloj digital
function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="text-center">
      <div className="text-6xl md:text-8xl font-mono font-bold text-gray-800 tracking-wider">
        {formatTime(time)}
      </div>
      <div className="text-xl md:text-2xl text-gray-500 mt-2 capitalize">
        {formatDate(time)}
      </div>
    </div>
  );
}

// Componente de tarjeta de empleado
function EmployeeCard({ employee, isSelected, onClick, status }) {
  const statusColors = {
    [STATUS.NOT_CLOCKED_IN]: 'border-gray-200 bg-white',
    [STATUS.CLOCKED_IN]: 'border-green-400 bg-green-50',
    [STATUS.ON_BREAK]: 'border-yellow-400 bg-yellow-50'
  };

  const statusBadges = {
    [STATUS.NOT_CLOCKED_IN]: null,
    [STATUS.CLOCKED_IN]: <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />,
    [STATUS.ON_BREAK]: <span className="absolute top-1 right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
  };

  return (
    <button
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${statusColors[status] || statusColors[STATUS.NOT_CLOCKED_IN]} ${isSelected ? 'ring-4 ring-blue-400 scale-105 shadow-xl' : 'hover:shadow-lg hover:scale-102'} flex flex-col items-center gap-2 min-w-[120px]`}
    >
      {statusBadges[status]}
      {/* Indicador de PIN */}
      {employee.hasPin && (
        <span className="absolute top-1 left-1 text-xs" title="Tiene PIN">🔒</span>
      )}
      <Avatar firstName={employee.firstName} lastName={employee.lastName} />
      <div className="text-center">
        <div className="font-semibold text-gray-800">{employee.firstName}</div>
        <div className="text-sm text-gray-500">{employee.lastName}</div>
      </div>
    </button>
  );
}

// Componente de teclado PIN
function PinPad({ employee, onSubmit, onCancel, loading }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (key) => {
    if (pin.length < 4) {
      setPin(prev => prev + key);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length === 0) {
      setError('Ingrese su PIN');
      return;
    }
    const result = await onSubmit(pin);
    if (!result.success) {
      setError(result.error || 'PIN incorrecto');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4 transform animate-scaleIn">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
            {`${employee?.firstName?.[0] || ''}${employee?.lastName?.[0] || ''}`.toUpperCase()}
          </div>
          <h3 className="text-xl font-bold text-gray-800">
            {employee?.firstName} {employee?.lastName}
          </h3>
          <p className="text-gray-500 mt-1">Ingrese su PIN</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all
                ${pin.length > i ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${error ? 'border-red-400 bg-red-50' : ''}`}
            >
              {pin.length > i ? '●' : ''}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-500 text-center mb-4 animate-pulse">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              disabled={loading}
              className="h-14 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={loading}
            className="h-14 text-lg font-medium rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Borrar
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={loading}
            className="h-14 text-2xl font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={loading}
            className="h-14 text-2xl rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
          >
            ⌫
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length === 0}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verificando...
              </>
            ) : (
              'Confirmar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de confirmacion
function ConfirmationOverlay({ type, employee, time, onClose }) {
  const configs = {
    'clock-in': {
      icon: '✅',
      title: 'Entrada Registrada',
      color: 'bg-green-500'
    },
    'clock-out': {
      icon: '🚪',
      title: 'Salida Registrada',
      color: 'bg-red-500'
    },
    'break-start': {
      icon: '☕',
      title: 'Descanso Iniciado',
      color: 'bg-yellow-500'
    },
    'break-end': {
      icon: '💪',
      title: 'Descanso Finalizado',
      color: 'bg-blue-500'
    }
  };

  const config = configs[type] || configs['clock-in'];

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className={`${config.color} text-white rounded-3xl p-12 text-center shadow-2xl transform animate-scaleIn max-w-lg mx-4`}>
        <div className="text-8xl mb-6">{config.icon}</div>
        <h2 className="text-4xl font-bold mb-4">{config.title}</h2>
        <p className="text-2xl mb-2">
          {employee.firstName} {employee.lastName}
        </p>
        <p className="text-5xl font-mono font-bold">
          {new Date(time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </p>
      </div>
    </div>
  );
}

// Componente de registro reciente
function RecentEntry({ entry }) {
  const formatTime = (date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <Avatar firstName={entry.employee.firstName} lastName={entry.employee.lastName} size="sm" />
      <div className="flex-1">
        <div className="font-medium text-gray-800">
          {entry.employee.firstName} {entry.employee.lastName}
        </div>
        <div className="text-sm text-gray-500 flex gap-3">
          <span>🟢 {formatTime(entry.clockIn)}</span>
          {entry.breakStart && <span>☕ {formatTime(entry.breakStart)}</span>}
          {entry.breakEnd && <span>💪 {formatTime(entry.breakEnd)}</span>}
          {entry.clockOut && <span>🔴 {formatTime(entry.clockOut)}</span>}
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function TimeClock() {
  const { token } = useParams();
  const [locationInfo, setLocationInfo] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeStatuses, setEmployeeStatuses] = useState({});
  const [recentEntries, setRecentEntries] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'clock-in' | 'clock-out' | 'break-start' | 'break-end' }
  const [pinVerified, setPinVerified] = useState(false);

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [infoRes, employeesRes, todayRes] = await Promise.all([
        timeclockAPI.getInfo(token),
        timeclockAPI.getEmployees(token),
        timeclockAPI.getToday(token)
      ]);

      setLocationInfo(infoRes.data);
      setEmployees(employeesRes.data);
      setRecentEntries(todayRes.data);

      // Cargar estado de cada empleado
      const statuses = {};
      for (const emp of employeesRes.data) {
        try {
          const statusRes = await timeclockAPI.getStatus(token, emp.id);
          statuses[emp.id] = statusRes.data.status;
        } catch {
          statuses[emp.id] = STATUS.NOT_CLOCKED_IN;
        }
      }
      setEmployeeStatuses(statuses);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.response?.data?.error || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    // Refrescar cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Actualizar estado de un empleado
  const refreshEmployeeStatus = async (employeeId) => {
    try {
      const statusRes = await timeclockAPI.getStatus(token, employeeId);
      setEmployeeStatuses(prev => ({ ...prev, [employeeId]: statusRes.data.status }));
    } catch {
      // Ignorar errores
    }
  };

  // Verificar PIN del empleado
  const verifyPin = async (pin) => {
    try {
      await timeclockAPI.verifyPin(token, selectedEmployee.id, pin);
      setPinVerified(true);
      setShowPinPad(false);
      // Ejecutar la acción pendiente
      if (pendingAction) {
        await executeAction(pendingAction);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'PIN incorrecto' };
    }
  };

  // Iniciar acción con verificación de PIN
  const startAction = (actionType) => {
    if (!selectedEmployee || processing) return;

    // Si el empleado tiene PIN, mostrar el teclado
    if (selectedEmployee.hasPin) {
      setPendingAction(actionType);
      setShowPinPad(true);
    } else {
      // Si no tiene PIN, ejecutar directamente
      executeAction(actionType);
    }
  };

  // Cancelar acción de PIN
  const cancelPinAction = () => {
    setShowPinPad(false);
    setPendingAction(null);
    setPinVerified(false);
  };

  // Ejecutar la acción después de verificar PIN
  const executeAction = async (actionType) => {
    setProcessing(true);
    try {
      let res;
      switch (actionType) {
        case 'clock-in':
          res = await timeclockAPI.clockIn(token, selectedEmployee.id);
          setConfirmation({
            type: 'clock-in',
            employee: res.data.employee,
            time: res.data.timesheet.clockIn
          });
          break;
        case 'clock-out':
          res = await timeclockAPI.clockOut(token, selectedEmployee.id);
          setConfirmation({
            type: 'clock-out',
            employee: res.data.employee,
            time: res.data.timesheet.clockOut
          });
          break;
        case 'break-start':
          res = await timeclockAPI.breakStart(token, selectedEmployee.id);
          setConfirmation({
            type: 'break-start',
            employee: res.data.employee,
            time: res.data.timesheet.breakStart
          });
          break;
        case 'break-end':
          res = await timeclockAPI.breakEnd(token, selectedEmployee.id);
          setConfirmation({
            type: 'break-end',
            employee: res.data.employee,
            time: res.data.timesheet.breakEnd
          });
          break;
      }
      await refreshEmployeeStatus(selectedEmployee.id);
      const todayRes = await timeclockAPI.getToday(token);
      setRecentEntries(todayRes.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al procesar la acción');
    } finally {
      setProcessing(false);
      setSelectedEmployee(null);
      setPendingAction(null);
      setPinVerified(false);
    }
  };

  // Manejar clock-in
  const handleClockIn = () => startAction('clock-in');

  // Manejar clock-out
  const handleClockOut = () => startAction('clock-out');

  // Manejar break start
  const handleBreakStart = () => startAction('break-start');

  // Manejar break end
  const handleBreakEnd = () => startAction('break-end');

  // Cerrar confirmacion
  const handleCloseConfirmation = () => {
    setConfirmation(null);
  };

  // Filtrar empleados
  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estado del empleado seleccionado
  const selectedStatus = selectedEmployee ? employeeStatuses[selectedEmployee.id] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      {/* PIN Pad overlay */}
      {showPinPad && selectedEmployee && (
        <PinPad
          employee={selectedEmployee}
          onSubmit={verifyPin}
          onCancel={cancelPinAction}
          loading={processing}
        />
      )}

      {/* Confirmacion overlay */}
      {confirmation && (
        <ConfirmationOverlay
          type={confirmation.type}
          employee={confirmation.employee}
          time={confirmation.time}
          onClose={handleCloseConfirmation}
        />
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md mb-4">
          <span className="text-2xl">📍</span>
          <span className="text-lg font-semibold text-gray-700">{locationInfo?.name}</span>
        </div>
        <DigitalClock />
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Panel de empleados */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-xl p-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-2">
            {filteredEmployees.map(employee => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                isSelected={selectedEmployee?.id === employee.id}
                onClick={() => setSelectedEmployee(selectedEmployee?.id === employee.id ? null : employee)}
                status={employeeStatuses[employee.id] || STATUS.NOT_CLOCKED_IN}
              />
            ))}
          </div>

          {/* Botones de accion */}
          {selectedEmployee && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="text-center mb-4">
                <span className="text-lg text-gray-600">Seleccionado: </span>
                <span className="text-xl font-bold text-gray-800">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {/* Boton de entrada - solo si no ha marcado */}
                {selectedStatus === STATUS.NOT_CLOCKED_IN && (
                  <button
                    onClick={handleClockIn}
                    disabled={processing}
                    className="flex-1 min-w-[150px] max-w-[200px] py-4 px-6 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✅ ENTRADA
                  </button>
                )}

                {/* Boton de break - solo si esta trabajando */}
                {selectedStatus === STATUS.CLOCKED_IN && (
                  <button
                    onClick={handleBreakStart}
                    disabled={processing}
                    className="flex-1 min-w-[150px] max-w-[200px] py-4 px-6 bg-yellow-500 hover:bg-yellow-600 text-white text-xl font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ☕ DESCANSO
                  </button>
                )}

                {/* Boton de terminar break - solo si esta en break */}
                {selectedStatus === STATUS.ON_BREAK && (
                  <button
                    onClick={handleBreakEnd}
                    disabled={processing}
                    className="flex-1 min-w-[150px] max-w-[200px] py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💪 FIN DESCANSO
                  </button>
                )}

                {/* Boton de salida - si esta trabajando o en break */}
                {(selectedStatus === STATUS.CLOCKED_IN || selectedStatus === STATUS.ON_BREAK) && (
                  <button
                    onClick={handleClockOut}
                    disabled={processing}
                    className="flex-1 min-w-[150px] max-w-[200px] py-4 px-6 bg-red-500 hover:bg-red-600 text-white text-xl font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🚪 SALIDA
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panel de registros recientes */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📋 Registros de Hoy
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {recentEntries.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay registros aun</p>
            ) : (
              recentEntries.map(entry => (
                <RecentEntry key={entry.id} entry={entry} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-gray-400 text-sm">
        {locationInfo?.companyName} - Sistema de Asistencia
      </div>

      {/* Estilos para animaciones */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
