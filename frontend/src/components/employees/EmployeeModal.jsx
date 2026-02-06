import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeModal({
  open,
  onClose,
  employee,
  locations,
  positions,
  onSave,
}) {
  const { hasRole } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    pin: '',
    role: 'EMPLOYEE',
    locationIds: [],
    positionIds: [],
    canViewAll: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        email: employee.email,
        password: '',
        firstName: employee.firstName,
        lastName: employee.lastName,
        phone: employee.phone || '',
        pin: employee.pin || '',
        role: employee.role,
        locationIds: employee.userLocations?.map((ul) => ul.locationId) || [],
        positionIds: employee.userPositions?.map((up) => up.positionId) || [],
        canViewAll: employee.canViewAll || false,
      });
    } else {
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        pin: '',
        role: 'EMPLOYEE',
        locationIds: [],
        positionIds: [],
        canViewAll: false,
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = { ...formData };
    if (employee && !data.password) {
      delete data.password;
    }

    await onSave(data);
    setLoading(false);
  };

  const toggleLocation = (locationId) => {
    setFormData((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter((id) => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
  };

  const togglePosition = (positionId) => {
    setFormData((prev) => ({
      ...prev,
      positionIds: prev.positionIds.includes(positionId)
        ? prev.positionIds.filter((id) => id !== positionId)
        : [...prev.positionIds, positionId],
    }));
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nombre</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Apellido</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="input"
                      disabled={!!employee}
                    />
                  </div>

                  <div>
                    <label className="label">
                      {employee ? 'Nueva Contrasena (dejar vacio para no cambiar)' : 'Contrasena'}
                    </label>
                    <input
                      type="password"
                      required={!employee}
                      minLength={6}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="input"
                      placeholder={employee ? '********' : ''}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Telefono</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">PIN (1-4 dígitos)</label>
                      <input
                        type="text"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        value={formData.pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setFormData({ ...formData, pin: value });
                        }}
                        className="input"
                        placeholder="1234"
                      />
                      <p className="text-xs text-gray-500 mt-1">Para marcar asistencia</p>
                    </div>
                  </div>

                  {hasRole('SUPER_ADMIN', 'ADMIN') && (
                    <div>
                      <label className="label">Rol</label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="input"
                      >
                        <option value="EMPLOYEE">Empleado</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="MANAGER">Manager</option>
                        {hasRole('SUPER_ADMIN') && (
                          <option value="ADMIN">Admin</option>
                        )}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="label">Sucursales</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                      {locations.map((loc) => (
                        <label
                          key={loc.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.locationIds.includes(loc.id)}
                            onChange={() => toggleLocation(loc.id)}
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          {loc.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Posiciones</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                      {positions.map((pos) => (
                        <label
                          key={pos.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.positionIds.includes(pos.id)}
                            onChange={() => togglePosition(pos.id)}
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: pos.color }}
                          />
                          {pos.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  {hasRole('SUPER_ADMIN') && (
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.canViewAll}
                          onChange={(e) =>
                            setFormData({ ...formData, canViewAll: e.target.checked })
                          }
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          Puede ver todas las sucursales (Vista Central)
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || formData.locationIds.length === 0}
                      className="btn-primary"
                    >
                      {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
