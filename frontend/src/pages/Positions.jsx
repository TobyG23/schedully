import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { positionsAPI } from '../services/api';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import PositionModal from '../components/positions/PositionModal';

export default function Positions() {
  const { hasRole } = useAuth();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  useEffect(() => {
    loadPositions();
  }, []);

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

  const openNewModal = () => {
    setSelectedPosition(null);
    setModalOpen(true);
  };

  const openEditModal = (position) => {
    setSelectedPosition(position);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedPosition) {
        await positionsAPI.update(selectedPosition.id, data);
        toast.success('Posicion actualizada');
      } else {
        await positionsAPI.create(data);
        toast.success('Posicion creada');
      }
      setModalOpen(false);
      loadPositions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar esta posicion?')) return;
    try {
      await positionsAPI.delete(id);
      toast.success('Posicion desactivada');
      loadPositions();
    } catch (error) {
      toast.error('Error al desactivar posicion');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posiciones</h1>
          <p className="text-gray-600">Gestiona los cargos y puestos de trabajo</p>
        </div>

        {hasRole('SUPER_ADMIN', 'ADMIN') && (
          <button onClick={openNewModal} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nueva Posicion
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.map((position) => (
            <div key={position.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${position.color}20` }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: position.color }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{position.name}</h3>
                    {position.description && (
                      <p className="text-sm text-gray-500">{position.description}</p>
                    )}
                  </div>
                </div>

                {hasRole('SUPER_ADMIN', 'ADMIN') && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(position)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(position.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {position._count?.userPositions || 0} empleados
                  </span>
                  {position.hourlyRate && (
                    <span className="font-medium text-gray-900">
                      ${parseFloat(position.hourlyRate).toFixed(2)}/hora
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <PositionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        position={selectedPosition}
        onSave={handleSave}
      />
    </div>
  );
}
