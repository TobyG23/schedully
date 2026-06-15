import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSelector from '../ui/LanguageSelector';
import {
  HomeIcon,
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  CalendarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

function SchedulullyLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-md">
        <span className="text-white font-extrabold text-base leading-none">S</span>
      </div>
      <span className="text-white font-bold text-lg tracking-tight">Schedully</span>
    </div>
  );
}

function NavItem({ item, isActive, onClick }) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-primary-500 text-white shadow-sm shadow-primary-900/30'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
      {item.name}
    </Link>
  );
}

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/scheduler': 'Horarios',
  '/attendance': 'Asistencia',
  '/employees': 'Empleados',
  '/locations': 'Sucursales',
  '/positions': 'Posiciones',
  '/time-off': 'Tiempo Libre',
  '/settings': 'Configuración',
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, canViewAllLocations } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPageTitle =
    PAGE_TITLES[location.pathname] ??
    PAGE_TITLES[Object.keys(PAGE_TITLES).find(
      (k) => k !== '/' && location.pathname.startsWith(k)
    )] ??
    '';

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: HomeIcon },
    { name: t('nav.scheduler'), href: '/scheduler', icon: CalendarDaysIcon },
    { name: t('nav.attendance'), href: '/attendance', icon: ClockIcon },
    { name: t('nav.employees'), href: '/employees', icon: UsersIcon },
    { name: t('nav.locations'), href: '/locations', icon: BuildingStorefrontIcon },
    { name: t('nav.positions'), href: '/positions', icon: BriefcaseIcon },
    { name: t('nav.timeOff'), href: '/time-off', icon: CalendarIcon },
    { name: t('nav.settings'), href: '/settings', icon: Cog6ToothIcon },
  ];

  const isActive = (href) =>
    location.pathname === href || (href !== '/' && location.pathname.startsWith(href));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div
          className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 w-64 bg-navy-800 shadow-2xl flex flex-col">
          <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
            <SchedulullyLogo />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {canViewAllLocations() && (
            <div className="mx-4 mt-4 px-3 py-2 bg-primary-500/15 border border-primary-500/25 rounded-lg">
              <p className="text-xs font-semibold text-primary-400">{t('dashboard.centralView')}</p>
              <p className="text-xs text-primary-300/70">{t('scheduler.allLocations')}</p>
            </div>
          )}

          <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto mt-2">
            {navigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={isActive(item.href)}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="h-9 w-9 rounded-full bg-primary-500/25 border border-primary-500/40 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary-300">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-navy-800">
          {/* Logo */}
          <div className="flex h-16 items-center px-5 border-b border-white/10">
            <SchedulullyLogo />
          </div>

          {/* Central admin badge */}
          {canViewAllLocations() && (
            <div className="mx-4 mt-4 px-3 py-2 bg-primary-500/15 border border-primary-500/25 rounded-lg">
              <p className="text-xs font-semibold text-primary-400">{t('dashboard.centralView')}</p>
              <p className="text-xs text-primary-300/70">{t('scheduler.allLocations')}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto mt-2">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} isActive={isActive(item.href)} />
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="h-9 w-9 rounded-full bg-primary-500/25 border border-primary-500/40 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary-300">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 backdrop-blur-sm px-4 shadow-sm">
          <button
            className="lg:hidden p-1.5 rounded-lg text-navy-700 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          {/* Current page title — desktop only */}
          {currentPageTitle && (
            <span className="hidden lg:block text-sm font-semibold text-navy-800">
              {currentPageTitle}
            </span>
          )}

          <div className="flex-1" />

          <LanguageSelector />

          <button className="relative p-2 text-gray-400 hover:text-navy-700 hover:bg-gray-100 rounded-lg transition-colors">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />
          </button>

          {/* User avatar (desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 pl-1 border-l border-gray-100">
            <div className="h-8 w-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-600">{initials}</span>
            </div>
            <div className="hidden xl:block text-right">
              <p className="text-xs font-semibold text-navy-800 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>

          {/* Mobile user avatar */}
          <div className="lg:hidden">
            <div className="h-8 w-8 rounded-full bg-navy-800 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-300">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
