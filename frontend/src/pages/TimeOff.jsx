import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timeOffAPI } from '../services/api';
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  CalendarDaysIcon,
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
  PENDING:  { label: 'Pendiente',  badge: 'badge-warning', border: 'border-l-amber-400' },
  APPROVED: { label: 'Aprobada',   badge: 'badge-success', border: 'border-l-emerald-400' },
  REJECTED: { label: 'Rechazada',  badge: 'badge-danger',  border: 'border-l-red-400' },
  CANCELLED:{ label: 'Cancelada',  badge: 'badge-gray',    border: 'border-l-gray-300' },
};

// ─── Segment-control filter tab ───────────────────────────────────────────
function FilterTab({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-sm rounded-full font-medium transition-all duration-150 whitespace-nowrap ${
        active
          ? 'bg-white text-navy-800 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
      {count != null && count > 0 && (
        <span
          className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
            active ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="card border-l-4 border-l-gray-200 p-4 animate-pulse">
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div>
          <div className="h-3 bg-gray-200 rounded w-28 mb-2" />
          <div className="h-2.5 bg-gray-200 rounded w-20" />
        </div>
      </div>
      <div className="flex-1">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-2.5 bg-gray-200 rounded w-36" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 bg-gray-200 rounded-full w-20" />
      </div>
    </div>
  </div>
);

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
    setLoading(true);
    try {
      const response = await timeOffAPI.getAll({ status: filter || undefined });
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

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Tiempo Libre</h1>
          <p className="text-sm text-gray-500 mt-0.5">Solicitudes de ausencia y vacaciones</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary self-start">
          <PlusIcon className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </button>
      </div>

      {/* ── Segment control filters ──────────────────────────── */}
      <div className="inline-flex bg-gray-100 rounded-full p-1 gap-0.5">
        <FilterTab active={filter === ''} onClick={() => setFilter('')}>
          Todas
        </FilterTab>
        <FilterTab
          active={filter === 'PENDING'}
          onClick={() => setFilter('PENDING')}
          count={filter !== 'PENDING' ? pendingCount : null}
        >
          Pendientes
        </FilterTab>
        <FilterTab active={filter === 'APPROVED'} onClick={() => setFilter('APPROVED')}>
          Aprobadas
        </FilterTab>
        <FilterTab active={filter === 'REJECTED'} onClick={() => setFilter('REJECTED')}>
          Rechazadas
        </FilterTab>
      </div>

      {/* ── List ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <CalendarDaysIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-navy-800 mb-1">Sin solicitudes</h3>
          <p className="text-sm text-gray-500 mb-4">
            {filter
              ? 'No hay solicitudes con este filtro'
              : 'Crea una nueva solicitud de tiempo libre'}
          </p>
          {!filter && (
            <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Nueva Solicitud
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.CANCELLED;
            return (
              <div
                key={request.id}
                className={`card border-l-4 ${statusCfg.border} p-4 transition-shadow hover:shadow-md`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Employee info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 flex-shrink-0">
                      {request.user.firstName[0]}{request.user.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-navy-800 text-sm">
                        {request.user.firstName} {request.user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.user.userLocations?.[0]?.location?.name || 'Sin sucursal'}
                      </div>
                    </div>
                  </div>

                  {/* Request details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy-800">
                      {TYPE_LABELS[request.type]}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(request.startDate), "d 'de' MMMM", { locale: es })}
                      {' — '}
                      {format(new Date(request.endDate), "d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                    {request.reason && (
                      <div className="text-xs text-gray-400 mt-1 italic">
                        "{request.reason}"
                      </div>
                    )}
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={statusCfg.badge}>{statusCfg.label}</span>

                    {request.status === 'PENDING' && (
                      <div className="flex items-center gap-1">
                        {canManage && request.userId !== user.id && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors"
                              title="Aprobar"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                              title="Rechazar"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {request.userId === user.id && (
                          <button
                            onClick={() => handleCancel(request.id)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer info */}
                {request.approvedBy && request.status === 'APPROVED' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    Aprobada por{' '}
                    <span className="font-medium text-navy-800">
                      {request.approvedBy.firstName} {request.approvedBy.lastName}
                    </span>
                    {request.approvedAt && (
                      <> el {format(new Date(request.approvedAt), "d 'de' MMMM", { locale: es })}</>
                    )}
                  </div>
                )}
                {request.rejectedReason && request.status === 'REJECTED' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-red-600">
                    <span className="font-medium">Motivo:</span> {request.rejectedReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────── */}
      <TimeOffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
}
