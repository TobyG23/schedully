import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import {
  UserCircleIcon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  PhoneIcon,
  EnvelopeIcon,
  LockClosedIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      <span className="text-sm text-gray-500 flex-1">{label}</span>
      <span className="text-sm font-medium text-navy-800 text-right max-w-[200px] truncate">
        {value || <span className="text-gray-400 font-normal">No especificado</span>}
      </span>
    </div>
  );
}

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Empleado',
};

export default function Settings() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword(passwords.currentPassword, passwords.newPassword);
      toast.success('Contraseña actualizada correctamente');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Administra tu cuenta y preferencias</p>
      </div>

      {/* ── Profile card ───────────────────────────────────── */}
      <div className="card overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-navy-800 to-navy-700 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary-500/25 border-2 border-primary-400/40 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-extrabold text-primary-300">{initials}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-navy-300">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-500/20 text-primary-300">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
                {user?.canViewAll && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300">
                    Vista Central
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Información de cuenta
          </h3>
          <InfoRow
            label="Teléfono"
            value={user?.phone}
            icon={PhoneIcon}
          />
          <InfoRow
            label="Empresa"
            value={user?.company?.name}
            icon={BuildingStorefrontIcon}
          />
          <InfoRow
            label="Sucursal(es)"
            value={user?.userLocations?.map(ul => ul.location.name).join(', ')}
            icon={BuildingStorefrontIcon}
          />
          <InfoRow
            label="Posición(es)"
            value={user?.userPositions?.map(up => up.position.name).join(', ')}
            icon={BriefcaseIcon}
          />
        </div>
      </div>

      {/* ── Change password ─────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <LockClosedIcon className="h-4 w-4 text-gray-500" />
          <h2 className="text-base font-semibold text-navy-800">Cambiar Contraseña</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Contraseña Actual</label>
            <input
              type="password"
              required
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="label">Nueva Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="input"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="label">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              required
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>

      {/* ── App info ───────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <InformationCircleIcon className="h-4 w-4 text-gray-500" />
          <h2 className="text-base font-semibold text-navy-800">Acerca de</h2>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-extrabold text-base">S</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-800">Schedully</p>
            <p className="text-xs text-gray-500">Sistema de Horarios · v1.0.0</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Gestión de horarios para múltiples sucursales con control de asistencia, turnos y solicitudes de tiempo libre.
        </p>
      </div>
    </div>
  );
}
