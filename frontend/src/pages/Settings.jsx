import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

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
      toast.error('Las contrasenas no coinciden');
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error('La nueva contrasena debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(passwords.currentPassword, passwords.newPassword);
      toast.success('Contrasena actualizada');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al cambiar contrasena');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-gray-600">Administra tu cuenta y preferencias</p>
      </div>

      {/* Profile Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mi Perfil</h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-xl font-semibold text-primary-700">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <div className="text-lg font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-gray-500">{user?.email}</div>
            <div className="mt-1">
              <span className="badge-info">{user?.role}</span>
              {user?.canViewAll && (
                <span className="badge-success ml-2">Vista Central</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Telefono</span>
            <span className="text-gray-900">{user?.phone || 'No especificado'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Empresa</span>
            <span className="text-gray-900">{user?.company?.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Sucursal(es)</span>
            <span className="text-gray-900">
              {user?.userLocations?.map(ul => ul.location.name).join(', ') || 'Ninguna'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Posicion(es)</span>
            <span className="text-gray-900">
              {user?.userPositions?.map(up => up.position.name).join(', ') || 'Ninguna'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Contrasena</h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Contrasena Actual</label>
            <input
              type="password"
              required
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, currentPassword: e.target.value })
              }
              className="input"
            />
          </div>

          <div>
            <label className="label">Nueva Contrasena</label>
            <input
              type="password"
              required
              minLength={6}
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
              className="input"
            />
          </div>

          <div>
            <label className="label">Confirmar Nueva Contrasena</label>
            <input
              type="password"
              required
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, confirmPassword: e.target.value })
              }
              className="input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Actualizando...' : 'Cambiar Contrasena'}
          </button>
        </form>
      </div>

      {/* App Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acerca de</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Schedully</strong> - Sistema de Horarios</p>
          <p>Version: 1.0.0</p>
          <p>Desarrollado para gestionar horarios de multiples sucursales con vista centralizada.</p>
        </div>
      </div>
    </div>
  );
}
