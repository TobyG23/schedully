import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';

// Helper para formatear fecha sin problemas de timezone
const formatLocalDate = (date, useUTC = false) => {
  if (useUTC) {
    // Para fechas que vienen del servidor (almacenadas en UTC)
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else {
    // Para fechas locales (seleccionadas en el calendario)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const DAY_OFF_TYPE_KEYS = [
  'DAY_OFF', 'SICK', 'VACATION', 'HOLIDAY', 'PERSONAL',
  'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'UNPAID_LEAVE', 'OTHER'
];

export default function ShiftModal({
  open,
  onClose,
  shift,
  date,
  user,
  users,
  positions,
  onSave,
  onDelete,
}) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    userId: '',
    positionId: '',
    date: '',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 60,
    notes: '',
    isOpenShift: false,
    isDayOff: false,
    dayOffType: 'DAY_OFF',
    isPaid: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (shift) {
      setFormData({
        userId: shift.userId || '',
        positionId: shift.positionId || '',
        date: formatLocalDate(new Date(shift.date), true), // useUTC=true para fechas del servidor
        startTime: shift.startTime ? format(new Date(shift.startTime), 'HH:mm') : '08:00',
        endTime: shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : '16:00',
        breakMinutes: shift.breakMinutes,
        notes: shift.notes || '',
        isOpenShift: shift.isOpenShift,
        isDayOff: shift.isDayOff || false,
        dayOffType: shift.dayOffType || 'DAY_OFF',
        isPaid: shift.isPaid !== undefined ? shift.isPaid : true,
      });
    } else {
      setFormData({
        userId: user?.id || '',
        positionId: positions[0]?.id || '',
        date: date ? formatLocalDate(date, false) : formatLocalDate(new Date(), false), // useUTC=false para fechas locales
        startTime: '08:00',
        endTime: '16:00',
        breakMinutes: 60,
        notes: '',
        isOpenShift: !user,
        isDayOff: false,
        dayOffType: 'DAY_OFF',
        isPaid: true,
      });
    }
  }, [shift, date, user, positions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSend = { ...formData };

    if (dataToSend.isDayOff) {
      dataToSend.positionId = null;
      dataToSend.startTime = null;
      dataToSend.endTime = null;
      dataToSend.breakMinutes = 0;
      dataToSend.isOpenShift = false;
    }

    await onSave(dataToSend);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (shift) {
      setLoading(true);
      await onDelete(shift.id);
      setLoading(false);
      onClose();
    }
  };

  const handleDayOffChange = (checked) => {
    setFormData({
      ...formData,
      isDayOff: checked,
      isOpenShift: false,
      dayOffType: 'DAY_OFF',
      isPaid: true,
    });
  };

  const getTitle = () => {
    if (shift) {
      return formData.isDayOff ? t('scheduler.editDayOff') : t('scheduler.editShift');
    }
    return formData.isDayOff ? t('scheduler.newDayOff') : t('scheduler.newShift');
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {getTitle()}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Tipo: Turno o Dia Libre */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleDayOffChange(false)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        !formData.isDayOff
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('scheduler.workShift')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDayOffChange(true)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        formData.isDayOff
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('scheduler.dayOff')}
                    </button>
                  </div>

                  {/* Empleado */}
                  {!formData.isOpenShift && (
                    <div>
                      <label className="label">{t('scheduler.employee')}</label>
                      <select
                        required
                        value={formData.userId}
                        onChange={(e) =>
                          setFormData({ ...formData, userId: e.target.value })
                        }
                        className="input"
                      >
                        <option value="">{t('scheduler.selectEmployee')}</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Fecha */}
                  <div>
                    <label className="label">{t('common.date')}</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  {/* Opciones de Dia Libre */}
                  {formData.isDayOff ? (
                    <>
                      <div>
                        <label className="label">{t('scheduler.dayOffType')}</label>
                        <select
                          value={formData.dayOffType}
                          onChange={(e) =>
                            setFormData({ ...formData, dayOffType: e.target.value })
                          }
                          className="input"
                        >
                          {DAY_OFF_TYPE_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {t(`scheduler.dayOffTypes.${key}`)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{t('scheduler.paidDay')}</p>
                          <p className="text-xs text-gray-500">
                            {formData.isPaid
                              ? t('scheduler.paidDayYes')
                              : t('scheduler.paidDayNo')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isPaid: !formData.isPaid })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.isPaid ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.isPaid ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Opciones de Turno */}
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.isOpenShift}
                            onChange={(e) =>
                              setFormData({ ...formData, isOpenShift: e.target.checked, userId: '' })
                            }
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">
                            {t('scheduler.openShift')} ({t('scheduler.openShiftDesc')})
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="label">{t('scheduler.position')}</label>
                        <select
                          required
                          value={formData.positionId}
                          onChange={(e) =>
                            setFormData({ ...formData, positionId: e.target.value })
                          }
                          className="input"
                        >
                          {positions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="label">{t('scheduler.startTime')}</label>
                          <input
                            type="time"
                            required
                            value={formData.startTime}
                            onChange={(e) =>
                              setFormData({ ...formData, startTime: e.target.value })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">{t('scheduler.endTime')}</label>
                          <input
                            type="time"
                            required
                            value={formData.endTime}
                            onChange={(e) =>
                              setFormData({ ...formData, endTime: e.target.value })
                            }
                            className="input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">{t('scheduler.breakMinutes')}</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.breakMinutes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              breakMinutes: parseInt(e.target.value) || 0,
                            })
                          }
                          className="input"
                        />
                      </div>
                    </>
                  )}

                  {/* Notas */}
                  <div>
                    <label className="label">{t('common.notes')}</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={2}
                      className="input"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    {shift && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="btn-danger btn-sm"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        {t('common.delete')}
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
