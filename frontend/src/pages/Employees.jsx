import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, locationsAPI, positionsAPI } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import EmployeeModal from '../components/employees/EmployeeModal';

export default function Employees() {
  const { hasRole, canViewAllLocations } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    loadData();
  }, [filterLocation, filterRole]);

  const loadData = async () => {
    try {
      const [empRes, locRes, posRes] = await Promise.all([
        usersAPI.getAll({
          locationId: filterLocation || undefined,
          role: filterRole || undefined,
        }),
        locationsAPI.getAll(),
        positionsAPI.getAll(),
      ]);
      setEmployees(empRes.data);
      setLocations(locRes.data);
      setPositions(posRes.data);
    } catch (error) {
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());
  });

  const openNewModal = () => {
    setSelectedEmployee(null);
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedEmployee) {
        await usersAPI.update(selectedEmployee.id, data);
        toast.success('Empleado actualizado');
      } else {
        await usersAPI.create(data);
        toast.success('Empleado creado');
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este empleado?')) return;
    try {
      await usersAPI.delete(id);
      toast.success('Empleado desactivado');
      loadData();
    } catch (error) {
      toast.error('Error al desactivar empleado');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      SUPER_ADMIN: 'badge-danger',
      ADMIN: 'badge-danger',
      MANAGER: 'badge-warning',
      SUPERVISOR: 'badge-info',
      EMPLOYEE: 'badge-gray',
    };
    const labels = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Admin',
      MANAGER: 'Manager',
      SUPERVISOR: 'Supervisor',
      EMPLOYEE: 'Empleado',
    };
    return (
      <span className={badges[role] || 'badge-gray'}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600">Gestiona el personal de la empresa</p>
        </div>

        {hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER') && (
          <button onClick={openNewModal} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Empleado
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {canViewAllLocations() && (
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="input md:w-48"
            >
              <option value="">Todas las sucursales</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input md:w-40"
          >
            <option value="">Todos los roles</option>
            <option value="MANAGER">Manager</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="EMPLOYEE">Empleado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Empleado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Sucursal(es)
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Posicion
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getRoleBadge(emp.role)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {emp.userLocations?.slice(0, 2).map((ul) => (
                          <span
                            key={ul.id}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {ul.location.name}
                          </span>
                        ))}
                        {emp.userLocations?.length > 2 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                            +{emp.userLocations.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {emp.userPositions?.map((up) => (
                          <span
                            key={up.id}
                            className="px-2 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: `${up.position.color}20`,
                              color: up.position.color,
                            }}
                          >
                            {up.position.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.isActive ? (
                        <span className="badge-success">Activo</span>
                      ) : (
                        <span className="badge-gray">Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {hasRole('SUPER_ADMIN', 'ADMIN') && (
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No se encontraron empleados
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <EmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmployee}
        locations={locations}
        positions={positions}
        onSave={handleSave}
      />
    </div>
  );
}
