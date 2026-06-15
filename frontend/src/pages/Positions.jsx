import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { positionsAPI } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import PositionModal from '../components/positions/PositionModal';

// ─── Skeleton card ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="card overflow-hidden animate-pulse">
    <div className="h-1.5 bg-gray-200" />
    <div className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200" />
          <div>
            <div className="h-3.5 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-2.5 bg-gray-200 rounded w-36" />
          </div>
        </div>
      </div>
      <div className="pt-3 border-t border-gray-100 flex justify-between">
        <div className="h-2.5 bg-gray-200 rounded w-20" />
        <div className="h-2.5 bg-gray-200 rounded w-24" />
      </div>
    </div>
  </div>
);

export default function Positions() {
  const { hasRole } = useAuth();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  useEffect(() => { loadPositions(); }, []);

  const loadPositions = async () => {
    try {
      const response = await positionsAPI.getAll();
      setPositions(response.data);
    } catch (error) {
      toast.error('Error al cargar posiciones');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal  = () => { setSelectedPosition(null); setModalOpen(true); };
  const openEditModal = (position) => { setSelectedPosition(position); setModalOpen(true); };

  const handleSave = async (data) => {
    try {
      if (selectedPosition) {
        await positionsAPI.update(selectedPosition.id, data);
        toast.success('Posición actualizada');
      } else {
        await positionsAPI.create(data);
        toast.success('Posición creada');
      }
      setModalOpen(false);
      loadPositions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar esta posición?')) return;
    try {
      await positionsAPI.delete(id);
      toast.success('Posición desactivada');
      loadPositions();
    } catch (error) {
      toast.error('Error al desactivar posición');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Posiciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los cargos y puestos de trabajo</p>
        </div>
        {hasRole('SUPER_ADMIN', 'ADMIN') && (
          <button onClick={openNewModal} className="btn-primary self-start">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Posición
          </button>
        )}
      </div>

      {/* ── Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : positions.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <BriefcaseIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-navy-800 mb-1">Sin posiciones</h3>
          <p className="text-sm text-gray-500 mb-4">Crea la primera posición para empezar</p>
          {hasRole('SUPER_ADMIN', 'ADMIN') && (
            <button onClick={openNewModal} className="btn-primary btn-sm">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Nueva Posición
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.map((position) => (
            <div key={position.id} className="card overflow-hidden group hover:shadow-md transition-shadow duration-200">
              {/* Color stripe on top */}
              <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: position.color }} />

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${position.color}18` }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: position.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-800 text-sm">{position.name}</h3>
                      {position.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{position.description}</p>
                      )}
                    </div>
                  </div>

                  {hasRole('SUPER_ADMIN', 'ADMIN') && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(position)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-navy-700 transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(position.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                        title="Desactivar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    <span className="font-semibold text-navy-800">
                      {position._count?.userPositions ?? 0}
                    </span>{' '}
                    empleado{position._count?.userPositions !== 1 && 's'}
                  </span>
                  {position.hourlyRate && (
                    <span className="font-semibold text-navy-800 tabular-nums">
                      ${parseFloat(position.hourlyRate).toFixed(2)}/hr
                    </span>
                  )}
                  {!position.isActive && (
                    <span className="badge-gray">Inactiva</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────── */}
      <PositionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        position={selectedPosition}
        onSave={handleSave}
      />
    </div>
  );
}
