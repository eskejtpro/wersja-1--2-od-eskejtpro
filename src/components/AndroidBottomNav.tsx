import React from 'react';
import { 
  Zap,
  Calendar, 
  TrendingUp, 
  Activity, 
  Scale, 
  Syringe, 
  Dumbbell, 
  Settings
} from 'lucide-react';
import { UserProfile, SyncServerConfig, AppSettings } from '../types';

interface AndroidBottomNavProps {
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenMoreSheet?: () => void;
  isDark?: boolean;
  profile?: UserProfile;
  syncConfig?: SyncServerConfig;
  settings?: AppSettings;
}

const PRESET_EMOJIS: Record<string, { emoji: string; bg: string }> = {
  'preset:muscle': { emoji: '💪', bg: 'from-amber-500 to-orange-600' },
  'preset:barbell': { emoji: '🏋️', bg: 'from-emerald-500 to-teal-600' },
  'preset:trophy': { emoji: '🏆', bg: 'from-yellow-400 to-amber-600' },
  'preset:flash': { emoji: '⚡', bg: 'from-cyan-500 to-blue-600' },
  'preset:shield': { emoji: '🛡️', bg: 'from-indigo-500 to-purple-600' },
  'preset:eagle': { emoji: '🦅', bg: 'from-rose-500 to-red-600' },
  'preset:target': { emoji: '🎯', bg: 'from-emerald-600 to-green-700' },
  'preset:crown': { emoji: '👑', bg: 'from-amber-400 to-yellow-600' },
};

const ALL_NAV_ITEMS = [
  { id: 'quick_access', label: 'Pulpit', icon: Zap, title: 'Pulpit Szybkiego Dostępu' },
  { id: 'plan', label: 'Trening', icon: Calendar, title: 'Plan Treningowy & Dni' },
  { id: 'stats', label: 'Progres', icon: TrendingUp, title: 'Analityka i Progres Siły' },
  { id: 'muscle', label: 'Partie', icon: Activity, title: 'Rozkład Partii Mięśniowych' },
  { id: 'weight', label: 'Pomiary', icon: Scale, title: 'Dziennik Masy Ciała & Obwodów' },
  { id: 'cycles', label: 'Kalendarz', icon: Syringe, title: 'Kalendarz Środków & Cykle' },
  { id: 'exercises', label: 'Ćwiczenia', icon: Dumbbell, title: 'Katalog & Baza Ćwiczeń' },
  { id: 'settings', label: 'Ustawienia', icon: Settings, title: 'Ustawienia & Auto-Backup' },
];

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeView,
  onSelectView,
  isDark = true,
  profile,
  syncConfig,
  settings
}) => {
  const isAmoled = settings?.amoledBlack === true;
  const navHeightMode = settings?.bottomNavHeight || 'standard';
  const navLabelsMode = settings?.bottomNavLabels || 'all';
  const navStyle = settings?.bottomNavStyle || 'floating_dock';

  const athleteName = profile?.name || 'Pasik';
  const avatarUrl = profile?.avatarUrl;
  const initials = (athleteName || 'PA').slice(0, 2).toUpperCase();
  const isProfileActive = activeView === 'profile';
  const isOnline = syncConfig?.lastSyncStatus === 'connected' || syncConfig?.autoSync !== false;

  // Custom ordering and visibility
  const orderList = settings?.bottomNavOrder || ['quick_access', 'plan', 'stats', 'muscle', 'weight', 'cycles', 'exercises', 'settings'];
  const visibleTabs = new Set(settings?.bottomNavVisibleTabs || orderList);

  const orderedItems = [...ALL_NAV_ITEMS]
    .filter(item => visibleTabs.has(item.id))
    .sort((a, b) => {
      const idxA = orderList.indexOf(a.id);
      const idxB = orderList.indexOf(b.id);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });

  const renderProfileAvatar = () => {
    if (avatarUrl?.startsWith('preset:')) {
      const preset = PRESET_EMOJIS[avatarUrl];
      return (
        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${preset?.bg || 'from-emerald-500 to-teal-700'} flex items-center justify-center text-xs shadow-xs font-bold border border-emerald-400/40`}>
          <span>{preset?.emoji || '💪'}</span>
        </div>
      );
    }

    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={athleteName}
          className="w-7 h-7 rounded-xl object-cover border border-emerald-500/40 shadow-xs"
        />
      );
    }

    return (
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black tracking-tight text-white shadow-xs border ${
        isProfileActive 
          ? 'bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-300 ring-2 ring-emerald-400/60' 
          : 'bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-400/40'
      }`}>
        {initials}
      </div>
    );
  };

  const getMinHeightClass = () => {
    if (navHeightMode === 'compact') return 'min-h-[42px] py-0.5';
    if (navHeightMode === 'large') return 'min-h-[56px] py-1.5';
    return 'min-h-[48px] py-1';
  };

  const getContainerStyle = () => {
    if (navStyle === 'floating_dock') {
      return `fixed bottom-[max(0.5rem,calc(0.25rem+env(safe-area-inset-bottom,0px)))] left-2 right-2 z-40 md:hidden border rounded-2xl dock-3d px-1.5 py-1 ${
        isAmoled
          ? 'bg-black/95 border-zinc-800/90 text-slate-200'
          : isDark 
            ? 'text-slate-200' 
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-xl'
      }`;
    }
    if (navStyle === 'minimal_capsule') {
      return `fixed bottom-[max(0.75rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))] left-4 right-4 z-40 md:hidden border rounded-full dock-3d px-3 py-1 ${
        isAmoled
          ? 'bg-black/90 border-zinc-800/90 text-slate-200'
          : isDark 
            ? 'text-slate-200' 
            : 'bg-white/90 border-slate-200 text-slate-800'
      }`;
    }
    // Classic docked full width bar
    return `fixed bottom-0 left-0 right-0 z-40 md:hidden border-t backdrop-blur-2xl select-none px-1 pt-1 pb-[max(0.5rem,calc(0.3rem+env(safe-area-inset-bottom)))] transition-colors shadow-2xl ${
      isAmoled
        ? 'bg-black border-zinc-800 text-slate-200'
        : isDark 
          ? 'bg-slate-950/95 border-slate-800/90 text-slate-200' 
          : 'bg-white/95 border-slate-200 text-slate-800 shadow-xl'
    }`;
  };

  return (
    <nav 
      className={getContainerStyle()}
      id="android-bottom-nav-bar"
      aria-label="Dolny pasek modułów (odpowiednik paska Windows)"
    >
      <div className="flex items-center justify-around w-full max-w-lg mx-auto gap-0.5 overflow-x-auto no-scrollbar">
        {orderedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id || (item.id === 'weight' && activeView.startsWith('weight'));
          const showLabel = navLabelsMode === 'all' || (navLabelsMode === 'active_only' && isActive);

          return (
            <button
              key={item.id}
              type="button"
              id={`android-tab-${item.id}`}
              onClick={() => onSelectView(item.id)}
              className={`flex-1 min-w-[36px] max-w-[54px] flex flex-col items-center justify-center px-0.5 rounded-xl transition-all cursor-pointer group active:translate-y-0.5 ${getMinHeightClass()} ${
                isActive
                  ? isDark
                    ? 'text-emerald-400 font-bold'
                    : 'text-emerald-700 font-bold'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
              title={item.title}
            >
              <div className={`w-8 h-7 rounded-xl transition-all flex items-center justify-center ${showLabel ? 'mb-0.5' : ''} ${
                isActive 
                  ? isDark 
                    ? 'bg-gradient-to-b from-emerald-500/30 to-emerald-600/10 text-emerald-400 border border-emerald-400/50 shadow-lg shadow-emerald-500/20 scale-105' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-md scale-105'
                  : 'bg-transparent'
              }`}>
                <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
              </div>
              {showLabel && (
                <span className="text-[8.5px] sm:text-[9px] font-bold tracking-tighter leading-none truncate w-full text-center">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}

        {/* Profile / Sync Avatar tab */}
        <button
          type="button"
          id="android-tab-profile"
          onClick={() => onSelectView('profile')}
          className={`flex-1 min-w-[36px] max-w-[54px] flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer min-h-[48px] group ${
            isProfileActive
              ? isDark
                ? 'text-emerald-400 font-bold'
                : 'text-emerald-700 font-bold'
              : isDark
                ? 'text-slate-400 hover:text-slate-200 active:scale-90'
                : 'text-slate-500 hover:text-slate-900 active:scale-90'
          }`}
          title="Centrum Synchronizacji & Profil Zawodnika"
        >
          <div className="relative flex items-center justify-center mb-0.5">
            {renderProfileAvatar()}
            {/* Live Sync Status Indicator Dot */}
            <span 
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-slate-950 ${
                isOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={isOnline ? 'Zsynchronizowano' : 'Tryb lokalny'}
            />
          </div>
          {navLabelsMode === 'all' && (
            <span className="text-[8.5px] font-semibold tracking-tight leading-none truncate max-w-full">
              Profil
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
