import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timeOffAPI } from '../services/api';
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import TimeOffModal from '../components/timeoff/TimeOffModal';

const TYPE_LABELS = {
  VACATION: 'Vacaciones',
  SICK: 'Enfermedad',
  PERSONAL: 'Personal',
  MATERNITY: 'Maternidad',
  PATERNITY: 'Paternidad',
  BEREAVEMENT: 'Duelo',
  OTHER: 'Otro',
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', class: 'badge-warning' },
  APPROVED: { label: 'Aprobada', class: 'badge-success' },
  REJECTED: { label: 'Rechazada', class: 'badge-danger' },
  CANCELLED: { label: 'Cancelada', class: 'badge-gray' },
};

export default function TimeOff() {
  const { user, hasRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      const response = await timeOffAPI.getAll({
        status: filter || undefined,
      });
      setRequests(response.data);
    } catch (error) {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      await timeOffAPI.create(data);
      toast.success('Solicitud enviada');
      setModalOpen(false);
      loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al crear solicitud');
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('¿Aprobar esta solicitud?')) return;
    try {
      await timeOffAPI.approve(id);
      toast.success('Solicitud aprobada');
      loadRequests();
    } catch (error) {
      toast.error('Error al aprobar');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Motivo del rechazo (opcional):');
    try {
      await timeOffAPI.reject(id, reason);
      toast.success('Solicitud rechazada');
      loadRequests();
    } catch (error) {
      toast.error('Error al rechazar');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta solicitud?')) return;
    try {
      await timeOffAPI.cancel(id);
      toast.success('Solicitud cancelada');
      loadRequests();
    } catch (error) {
      toast.error('Error al cancelar');
    }
  };

  const canManage = hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tiempo Libre</h1>
          <p className="text-gray-600">Solicitudes de ausencia y vacaciones</p>
        </div>

        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Solicitud
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === '' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'PENDING' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'APPROVED' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'REJECTED' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
            }`}
          >
            Rechazadas
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay solicitudes</h3>
          <p className="text-gray-500 mt-1">
            {filter ? 'No se encontraron solicitudes con este filtro' : 'Crea una nueva solicitud de tiempo libre'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="card p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                    {request.user.firstName[0]}{request.user.lastName[0]}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {request.user.firstName} {request.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.user.userLocations?.[0]?.location?.name || 'Sin sucursal'}
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{TYPE_LABELS[request.type]}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(request.startDate), "d 'de' MMMM", { locale: es })}
                    {' - '}
                    {format(new Date(request.endDate), "d 'de' MMMM, yyyy", { locale: es })}
                  </div>
                  {request.reason && (
                    <div className="text-sm text-gray-500 mt-1">
                      "{request.reason}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className={STATUS_CONFIG[request.status]?.class}>
                    {STATUS_CONFIG[request.status]?.label}
                  </span>

                  {request.status === 'PENDING' && (
                    <div className="flex items-center gap-1">
                      {canManage && request.userId !== user.id && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600"
                            title="Aprobar"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                            title="Rechazar"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {request.userId === user.id && (
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {request.approvedBy && request.status === 'APPROVED' && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                  Aprobada por {request.approvedBy.firstName} {request.approvedBy.lastName}
                  {request.approvedAt && (
                    <> el {format(new Date(request.approvedAt), "d 'de' MMMM", { locale: es })}</>
                  )}
                </div>
              )}

              {request.rejectedReason && request.status === 'REJECTED' && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-red-600">
                  Motivo: {request.rejectedReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <TimeOffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
}
