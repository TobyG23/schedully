import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { locationsAPI } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LocationModal from '../components/locations/LocationModal';

// ─── Skeleton card ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="card overflow-hidden animate-pulse">
    <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-4 bg-gray-200 rounded w-28 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-44" />
        </div>
        <div className="h-7 w-7 bg-gray-200 rounded-lg" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded w-36" />
        <div className="h-3 bg-gray-200 rounded w-28" />
      </div>
      <div className="pt-4 border-t border-gray-100">
        <div className="h-8 bg-gray-200 rounded-lg w-full" />
      </div>
    </div>
  </div>
);

export default function Locations() {
  const { hasRole } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => { loadLocations(); }, []);

  const loadLocations = async () => {
    try {
      const response = await locationsAPI.getAll();
      setLocations(response.data);
    } catch (error) {
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal  = () => { setSelectedLocation(null); setModalOpen(true); };
  const openEditModal = (location) => { setSelectedLocation(location); setModalOpen(true); };

  const handleSave = async (data) => {
    try {
      if (selectedLocation) {
        await locationsAPI.update(selectedLocation.id, data);
        toast.success('Sucursal actualizada');
      } else {
        await locationsAPI.create(data);
        toast.success('Sucursal creada');
      }
      setModalOpen(false);
      loadLocations();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    }
  };

  const copyClockLink = (location) => {
    if (!location.clockToken) { toast.error('Esta sucursal no tiene token de reloj'); return; }
    const link = `${window.location.origin}/timeclock/${location.clockToken}`;
    navigator.clipboard.writeText(link)
      .then(() => toast.success('Link del reloj copiado'))
      .catch(() => toast.error('Error al copiar'));
  };

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Sucursales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona las ubicaciones de tu negocio</p>
        </div>
        {hasRole('SUPER_ADMIN', 'ADMIN') && (
          <button onClick={openNewModal} className="btn-primary self-start">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nueva Sucursal
          </button>
        )}
      </div>

      {/* ── Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : locations.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-navy-800 mb-1">Sin sucursales</h3>
          <p className="text-sm text-gray-500 mb-4">Agrega la primera sucursal para comenzar</p>
          {hasRole('SUPER_ADMIN', 'ADMIN') && (
            <button onClick={openNewModal} className="btn-primary btn-sm">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Nueva Sucursal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <div key={location.id} className="card overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-navy-800 text-sm flex items-center gap-2 flex-wrap">
                      {location.name}
                      {location.isHeadquarters && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-100 text-primary-700 rounded-md">
                          Central
                        </span>
                      )}
                      {!location.isActive && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                          Inactiva
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {location._count?.userLocations ?? 0} empleado{location._count?.userLocations !== 1 && 's'}
                    </p>
                  </div>
                  {hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER') && (
                    <button
                      onClick={() => openEditModal(location)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-navy-700 transition-colors flex-shrink-0"
                      title="Editar"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                  {location.address && (
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{location.address}</span>
                    </div>
                  )}
                  {location.phone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span>{location.phone}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <Link
                    to={`/scheduler/${location.id}`}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <CalendarDaysIcon className="h-3.5 w-3.5" />
                    Ver horarios
                  </Link>

                  {hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER') && location.clockToken && (
                    <button
                      onClick={() => copyClockLink(location)}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-gray-600 hover:text-navy-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ClockIcon className="h-3.5 w-3.5" />
                      Copiar link del reloj
                      <ClipboardDocumentIcon className="h-3.5 w-3.5 ml-auto" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────── */}
      <LocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        location={selectedLocation}
        onSave={handleSave}
      />
    </div>
  );
}
