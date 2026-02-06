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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LocationModal from '../components/locations/LocationModal';

export default function Locations() {
  const { hasRole } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

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

  const openNewModal = () => {
    setSelectedLocation(null);
    setModalOpen(true);
  };

  const openEditModal = (location) => {
    setSelectedLocation(location);
    setModalOpen(true);
  };

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
    if (!location.clockToken) {
      toast.error('Esta sucursal no tiene token de reloj');
      return;
    }
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/timeclock/${location.clockToken}`;
    navigator.clipboard.writeText(link)
      .then(() => toast.success('Link del reloj copiado al portapapeles'))
      .catch(() => toast.error('Error al copiar'));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
          <p className="text-gray-600">Gestiona las ubicaciones de tu negocio</p>
        </div>

        {hasRole('SUPER_ADMIN', 'ADMIN') && (
          <button onClick={openNewModal} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nueva Sucursal
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
          {locations.map((location) => (
            <div key={location.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {location.name}
                      {location.isHeadquarters && (
                        <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                          Central
                        </span>
                      )}
                    </h3>
                    {!location.isActive && (
                      <span className="text-xs text-red-600">Inactiva</span>
                    )}
                  </div>
                  {hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER') && (
                    <button
                      onClick={() => openEditModal(location)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {location.address && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <span>{location.address}</span>
                    </div>
                  )}
                  {location.phone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      <span>{location.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {location._count?.userLocations || 0} empleados
                    </span>
                    <Link
                      to={`/scheduler/${location.id}`}
                      className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                    >
                      <CalendarDaysIcon className="h-4 w-4" />
                      Ver horarios
                    </Link>
                  </div>

                  {/* Boton para copiar link del reloj */}
                  {hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER') && location.clockToken && (
                    <button
                      onClick={() => copyClockLink(location)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <ClockIcon className="h-4 w-4" />
                      <span>Copiar Link del Reloj</span>
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <LocationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        location={selectedLocation}
        onSave={handleSave}
      />
    </div>
  );
}
