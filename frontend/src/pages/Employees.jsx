import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, locationsAPI, positionsAPI } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import EmployeeModal from '../components/employees/EmployeeModal';

// ─── Avatar color palette — consistent per first letter ────────────────────
const AVATAR_PALETTE = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
];

const getAvatarColor = (name = '') => {
  const idx = (name.toUpperCase().charCodeAt(0) || 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
};

// ─── Skeleton row ──────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div>
          <div className="h-3 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-2.5 bg-gray-200 rounded w-44" />
        </div>
      </div>
    </td>
    <td className="px-4 py-3.5"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
    <td className="px-4 py-3.5"><div className="h-5 bg-gray-200 rounded w-24" /></td>
    <td className="px-4 py-3.5"><div className="h-5 bg-gray-200 rounded w-20" /></td>
    <td className="px-4 py-3.5"><div className="h-5 bg-gray-200 rounded-full w-14" /></td>
    <td className="px-4 py-3.5 text-right">
      <div className="h-7 bg-gray-200 rounded w-16 ml-auto" />
    </td>
  </tr>
);

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
    return <span className={badges[role] || 'badge-gray'}>{labels[role] || role}</span>;
  };

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Empleados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona el personal de la empresa</p>
        </div>
        {hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER') && (
          <button onClick={openNewModal} className="btn-primary self-start">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nuevo Empleado
          </button>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
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
                <option key={loc.id} value={loc.id}>{loc.name}</option>
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

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sucursal(es)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Posición
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : filteredEmployees.map((emp) => {
                    const avatarColor = getAvatarColor(emp.firstName);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarColor.bg} ${avatarColor.text}`}
                            >
                              {emp.firstName[0]}{emp.lastName[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-navy-800">
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">{getRoleBadge(emp.role)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {emp.userLocations?.slice(0, 2).map((ul) => (
                              <span
                                key={ul.id}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-md font-medium"
                              >
                                {ul.location.name}
                              </span>
                            ))}
                            {emp.userLocations?.length > 2 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-md">
                                +{emp.userLocations.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {emp.userPositions?.map((up) => (
                              <span
                                key={up.id}
                                className="px-2 py-0.5 text-xs rounded-md font-medium"
                                style={{
                                  backgroundColor: `${up.position.color}18`,
                                  color: up.position.color,
                                }}
                              >
                                {up.position.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {emp.isActive ? (
                            <span className="badge-success">Activo</span>
                          ) : (
                            <span className="badge-gray">Inactivo</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-navy-700 transition-colors"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            {hasRole('SUPER_ADMIN', 'ADMIN') && (
                              <button
                                onClick={() => handleDelete(emp.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                                title="Desactivar"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>

          {/* ── Empty state ─────────────────────────────────── */}
          {!loading && filteredEmployees.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-navy-800 mb-1">
                {search ? 'Sin resultados' : 'Sin empleados'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {search
                  ? `No se encontró ningún empleado para "${search}"`
                  : 'Agrega el primer empleado para comenzar'}
              </p>
              {!search && hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER') && (
                <button onClick={openNewModal} className="btn-primary btn-sm">
                  <PlusIcon className="h-4 w-4 mr-1.5" />
                  Nuevo Empleado
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────── */}
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
