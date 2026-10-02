import React, { useState } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  Dumbbell, 
  Activity, 
  Scale, 
  Settings, 
  Code2, 
  ShieldCheck, 
  User, 
  Smartphone,
  Moon, 
  Sun,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Zap,
  HardDrive,
  Syringe,
  Ruler,
  Layers,
  Edit2,
  Wifi,
  Bot,
  WifiOff,
  UserCheck,
  Flame,
  Trophy,
  Shield,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { AppSettings, UserProfile, SyncServerConfig, TrainingWeek, TrainingDay } from '../types';
import { AccountProfileModal } from './AccountProfileModal';

interface ModernSidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  weightSubcategory?: string;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  autoSaveStatus: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  weeksCount: number;
  position?: 'left' | 'right';
  profile?: UserProfile;
  onUpdateProfile?: (updatedProfile: Partial<UserProfile>) => void;
  syncConfig?: SyncServerConfig;
  onUpdateSyncConfig?: (updatedSync: Partial<SyncServerConfig>) => void;
  currentWeek?: TrainingWeek;
  selectedDayId?: string;
  onSelectDay?: (dayId: string) => void;
}

const WEEKDAY_DEFS = [
  { key: 'pn', full: 'Poniedziałek', short: 'Pn', aliases: ['poniedziałek', 'poniedzialek', 'pn', 'plan a'] },
  { key: 'wt', full: 'Wtorek', short: 'Wt', aliases: ['wtorek', 'wt', 'plan b'] },
  { key: 'sr', full: 'Środa', short: 'Śr', aliases: ['środa', 'sroda', 'sr', 'plan c'] },
  { key: 'cz', full: 'Czwartek', short: 'Cz', aliases: ['czwartek', 'cz', 'plan d'] },
  { key: 'pt', full: 'Piątek', short: 'Pt', aliases: ['piątek', 'piatek', 'pt', 'plan e'] },
  { key: 'sb', full: 'Sobota', short: 'Sb', aliases: ['sobota', 'sb', 'plan f'] },
  { key: 'nd', full: 'Niedziela', short: 'Nd', aliases: ['niedziela', 'nd', 'plan g'] },
];

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

export const ModernSidebar: React.FC<ModernSidebarProps> = ({
  activeView,
  onSelectView,
  weightSubcategory = 'all',
  settings,
  onUpdateSettings,
  autoSaveStatus,
  isCollapsed,
  onToggleCollapse,
  weeksCount,
  position = 'left',
  profile,
  onUpdateProfile,
  syncConfig,
  onUpdateSyncConfig,
  currentWeek,
  selectedDayId,
  onSelectDay
}) => {
  const isDark = settings.theme === 'dark';
  const isRight = position === 'right';
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPlanDaysOpen, setIsPlanDaysOpen] = useState(true);
  const [isWeightSubcategoriesOpen, setIsWeightSubcategoriesOpen] = useState(true);

  const athleteName = profile?.name || settings.athleteName || 'Pasik92';
  const isServerConnected = (syncConfig?.lastSyncStatus || 'connected') === 'connected';
  const serverPing = syncConfig?.lastPingMs || 14;

  const appTitle = settings.customAppName || 'GYMTRACKER';
  const appSubtitle = settings.customAppSubtitle || 'Workspace Treningowy';

  const planDaysList = (() => {
    const days = currentWeek?.days || [];
    const assignedDayIds = new Set<string>();

    return WEEKDAY_DEFS.map((def, index) => {
      // 1. Try finding by matching weekday in day name
      let matched = days.find((d) => {
        if (assignedDayIds.has(d.id)) return false;
        const lower = d.name.toLowerCase();
        return (
          lower.includes(def.full.toLowerCase()) ||
          lower.startsWith(def.short.toLowerCase() + ' ') ||
          lower.startsWith(def.short.toLowerCase() + ' -') ||
          lower.startsWith(def.short.toLowerCase() + ':') ||
          lower.startsWith(def.short.toLowerCase() + '–')
        );
      });

      // 2. Match aliases
      if (!matched) {
        matched = days.find(
          (d) => !assignedDayIds.has(d.id) && def.aliases.some((alias) => d.name.toLowerCase().includes(alias))
        );
      }

      // 3. Fallback by index
      if (!matched && days[index] && !assignedDayIds.has(days[index].id)) {
        matched = days[index];
      }

      if (matched) {
        assignedDayIds.add(matched.id);
      }

      return {
        key: def.key,
        weekdayName: def.full,
        shortName: def.short,
        day: matched || null,
        isEmpty: !matched,
      };
    });
  })();

  const renderAppIcon = () => {
    switch (settings.customAppIcon) {
      case 'flame': return <Flame className="w-5 h-5" />;
      case 'trophy': return <Trophy className="w-5 h-5" />;
      case 'zap': return <Zap className="w-5 h-5" />;
      case 'activity': return <Activity className="w-5 h-5" />;
      case 'shield': return <Shield className="w-5 h-5" />;
      default: return <Dumbbell className="w-5 h-5" />;
    }
  };

  const renderSidebarAvatar = (size = 'small') => {
    const avatarUrl = profile?.avatarUrl;
    const isSmall = size === 'small';
    const dimClasses = isSmall ? 'w-8 h-8 rounded-xl text-sm' : 'w-9 h-9 rounded-xl text-base';

    if (avatarUrl?.startsWith('preset:')) {
      const preset = PRESET_EMOJIS[avatarUrl];
      return (
        <div className={`${dimClasses} bg-gradient-to-br ${preset?.bg || 'from-emerald-500 to-teal-700'} flex items-center justify-center shadow-xs shrink-0 border border-emerald-400/30 font-bold`}>
          <span>{preset?.emoji || '💪'}</span>
        </div>
      );
    }

    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={athleteName}
          className={`${dimClasses} object-cover shrink-0 border border-emerald-500/40 shadow-xs`}
        />
      );
    }

    return (
      <div className={`${dimClasses} bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black flex items-center justify-center shadow-xs shrink-0 border border-emerald-400/30 text-xs tracking-tight`}>
        {athleteName.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  const allAvailableNavItems = [
    {
      id: 'quick_access',
      label: 'Szybki Dostęp',
      icon: Zap,
      badge: 'Pulpit',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      description: 'Główny pulpit modułowy i szybkie funkcje',
      category: 'core'
    },
    {
      id: 'plan',
      label: 'Plan Treningowy',
      badge: `${weeksCount} tyg.`,
      icon: Calendar,
      description: 'Ćwiczenia, serie i progres ciężarów',
      category: 'core'
    },
    {
      id: 'stats',
      label: 'Progres & Wykresy',
      icon: TrendingUp,
      description: '1RM, objętość i wykresy siły',
      category: 'core'
    },
    {
      id: 'muscle',
      label: 'Analiza Partii',
      icon: Activity,
      description: 'Rozkład serii na grupy mięśniowe',
      category: 'core'
    },
    {
      id: 'weight',
      label: 'Waga Ciała',
      icon: Scale,
      description: 'Ważenie, trendy i bilans',
      category: 'core'
    },
    {
      id: 'cycles',
      label: 'Kalendarz',
      icon: Syringe,
      badge: 'Cykl',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description: 'Rejestr iniekcji, historia tygodni i kalkulator stężeń',
      category: 'system'
    },
    {
      id: 'exercises',
      label: 'Katalog & Edycja Ćwiczeń',
      icon: Dumbbell,
      badge: 'Baza',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description: 'Zarządzanie, dodawanie i edycja ćwiczeń',
      category: 'system'
    },
    {
      id: 'ai',
      label: 'Trener AI',
      icon: Bot,
      badge: 'Gemini',
      badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      description: 'Inteligentny asystent treningu, progresji i periodyzacji',
      category: 'core'
    },
    {
      id: 'settings',
      label: 'Ustawienia',
      icon: Settings,
      description: 'Auto-Backup JSON, kody Windows i konfiguracja',
      category: 'system'
    }
  ];

  const hiddenNavSet = new Set(settings.hiddenNavItems || []);
  const navOrderList = settings.navOrder || allAvailableNavItems.map(i => i.id);

  // Filter and order navigation items
  const sortedNavItems = [...allAvailableNavItems]
    .filter(item => !hiddenNavSet.has(item.id) || activeView === item.id)
    .sort((a, b) => {
      const idxA = navOrderList.indexOf(a.id);
      const idxB = navOrderList.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

  const navItems = sortedNavItems.filter(item => item.category === 'core');
  const systemItems = sortedNavItems.filter(item => item.category === 'system');

  return (
    <aside
      className={`relative flex flex-col transition-all duration-300 ease-in-out ${isRight ? 'border-l' : 'border-r'} z-20 select-none ${
        isDark 
          ? 'bg-slate-950/95 border-slate-800/80 text-slate-200' 
          : 'bg-white border-slate-200 text-slate-800 shadow-xs'
      } ${isCollapsed ? 'w-20' : 'w-[290px]'}`}
      id="modern-app-sidebar"
    >
      {/* Brand Header */}
      <div className={`p-4 sm:p-4.5 border-b flex items-center ${isDark ? 'border-slate-800/80' : 'border-slate-100'} ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 shrink-0">
            {renderAppIcon()}
          </div>
          {!isCollapsed && (
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className={`font-black text-base tracking-tight font-sans truncate max-w-[170px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {appTitle}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  PRO
                </span>
              </div>
              <p className={`text-xs truncate max-w-[180px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {appSubtitle}
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle on desktop */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg border transition-colors hidden md:flex items-center justify-center ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800' 
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title={isCollapsed ? 'Rozwiń panel boczny' : 'Zwiń panel boczny'}
          id="btn-toggle-sidebar-collapse"
        >
          {isRight ? (
            isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Navigation Section */}
      <div className="flex-1 overflow-y-auto py-4 px-3.5 space-y-6">
        {/* Core Training Views */}
        <div>
          {!isCollapsed && (
            <h5 className={`px-3 mb-2.5 text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Trening & Analityka
            </h5>
          )}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id || (item.id === 'weight' && activeView.startsWith('weight'));
              const isPlan = item.id === 'plan';
              const isWeight = item.id === 'weight';
              const showPlanSubcategories = isPlan && !isCollapsed && isPlanDaysOpen;
              const showWeightSubcategories = isWeight && !isCollapsed && isWeightSubcategoriesOpen;

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    id={`sidebar-nav-${item.id}`}
                    data-view={item.id}
                    data-annotation-title={item.label}
                    data-annotation-desc={item.description}
                    data-annotation-category="Trening & Analityka"
                    onClick={() => {
                      onSelectView(item.id);
                      if (isPlan) {
                        setIsPlanDaysOpen(!isPlanDaysOpen);
                      }
                      if (isWeight) {
                        setIsWeightSubcategoriesOpen(!isWeightSubcategoriesOpen);
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group relative cursor-pointer ${
                      isActive
                        ? isDark
                          ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/5 text-emerald-300 border border-emerald-500/30 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs font-bold'
                        : isDark
                          ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <div className={`p-2 rounded-lg transition-colors shrink-0 ${
                      isActive 
                        ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-600 text-white' 
                        : isDark ? 'bg-slate-900 text-slate-400 group-hover:text-slate-200' : 'bg-slate-100 text-slate-600 group-hover:text-slate-900'
                    }`}>
                      <Icon className="w-4.5 h-4.5 shrink-0" />
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 text-left flex items-center justify-between min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                            isActive 
                              ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-200 text-emerald-800'
                              : isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {isActive && (
                      <span className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-500 ${isRight ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'}`} />
                    )}
                  </button>

                  {/* Podkategorie pod kategorią PLAN TRENINGOWY - zwijane / rozwijane 7 dni tygodnia */}
                  {showPlanSubcategories && (
                    <div className="ml-5 pl-3 border-l border-slate-800/80 space-y-1 my-1.5 animate-fadeIn">
                      {planDaysList.map((slot) => {
                        const isSelected = activeView === 'plan' && slot.day && selectedDayId === slot.day.id;

                        if (!slot.isEmpty && slot.day) {
                          const day = slot.day;
                          const cleanPlanName = day.name.replace(new RegExp(`^${slot.weekdayName}\\s*[-–:]?\\s*`, 'i'), '').trim();

                          return (
                            <button
                              key={slot.key}
                              type="button"
                              id={`sidebar-subnav-plan-day-${slot.key}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectView('plan');
                                onSelectDay?.(day.id);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-xs'
                                    : 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200'
                                  : isDark
                                    ? 'text-slate-300 hover:text-white hover:bg-slate-900/70'
                                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                              title={`${day.name} (${day.exercises.length} ćwiczeń)`}
                            >
                              <div className="flex items-center gap-2 min-w-0 truncate">
                                <span className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-500 text-slate-950'
                                    : isDark ? 'bg-slate-900 text-slate-400 border border-slate-800' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {slot.shortName}
                                </span>
                                <span className="truncate">{cleanPlanName ? `${slot.weekdayName}: ${cleanPlanName}` : slot.weekdayName}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {day.completed ? (
                                  <span className="text-xs text-emerald-400 font-bold" title="Trening ukończony">✓</span>
                                ) : (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                    isDark ? 'bg-slate-900/90 text-slate-400' : 'bg-slate-200/80 text-slate-600'
                                  }`}>
                                    {day.exercises.length} ćw.
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        }

                        // Pusty dzień
                        return (
                          <button
                            key={slot.key}
                            type="button"
                            id={`sidebar-subnav-plan-day-${slot.key}-empty`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectView('plan');
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                              isDark 
                                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/60'
                            }`}
                            title={`${slot.weekdayName} - Brak zapisanego treningu w bieżącym tygodniu`}
                          >
                            <div className="flex items-center gap-2 min-w-0 truncate">
                              <span className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-medium shrink-0 opacity-60 ${
                                isDark ? 'bg-slate-900/60 text-slate-500 border border-slate-800/40' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {slot.shortName}
                              </span>
                              <span className="truncate">{slot.weekdayName}</span>
                            </div>
                            <span className="text-[10px] font-mono italic opacity-60">(pusty)</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Podkategorie pod kategorią WAGA CIAŁA */}
                  {showWeightSubcategories && (
                    <div className="ml-5 pl-3 border-l border-slate-800/80 space-y-1 my-1.5 animate-fadeIn">
                      {[
                        { id: 'all', label: 'Wszystkie sekcje', icon: Layers },
                        { id: 'register', label: 'Rejestr & Trendy', icon: Scale },
                        { id: 'combined', label: 'Wspólny Wykres', icon: Sparkles },
                        { id: 'parts', label: 'Pomiary Partii', icon: Ruler },
                        { id: 'circumferences', label: 'Obwody & 1RM', icon: Activity },
                      ].map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = (activeView === 'weight' || activeView.startsWith('weight')) && weightSubcategory === sub.id;

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            id={`sidebar-subnav-weight-${sub.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectView(`weight:${sub.id}`);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isSubActive
                                ? isDark
                                  ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-xs'
                                  : 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200'
                                : isDark
                                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* System */}
        <div>
          {!isCollapsed && (
            <h5 className={`px-3 mb-2.5 text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              System & Narzędzia
            </h5>
          )}
          <nav className="space-y-1.5">
            {systemItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`sidebar-nav-${item.id}`}
                  data-view={item.id}
                  data-annotation-title={item.label}
                  data-annotation-desc={item.description}
                  data-annotation-category="System"
                  onClick={() => onSelectView(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group relative ${
                    isActive
                      ? isDark
                        ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/5 text-emerald-300 border border-emerald-500/30 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs font-bold'
                      : isDark
                        ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-900/80'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive 
                      ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-600 text-white' 
                      : isDark ? 'bg-slate-900 text-slate-400 group-hover:text-slate-200' : 'bg-slate-100 text-slate-600 group-hover:text-slate-900'
                  }`}>
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex-1 text-left flex items-center justify-between">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-md font-mono border ${
                          item.badgeColor || (isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-200 text-slate-600 border-slate-300')
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {isActive && (
                    <span className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-500 ${isRight ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'}`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Athlete & Status Panel */}
      <div className={`p-3.5 border-t space-y-3 ${isDark ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'}`}>
        {!isCollapsed ? (
          <>
            {/* Athlete Profile Badge */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between transition-all group ${
              activeView === 'profile'
                ? isDark 
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30' 
                  : 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200 shadow-xs'
                : isDark 
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}>
              <button 
                type="button"
                id="sidebar-sync-bloodwork-button"
                onClick={() => onSelectView('profile')}
                className="flex items-center gap-3 overflow-hidden cursor-pointer text-left flex-1 min-w-0 mr-2 py-0.5"
                title="Kliknij, aby otworzyć pełny Profil Zawodnika, edycję danych, awatar oraz Centrum Synchronizacji"
              >
                <div className="relative shrink-0">
                  {renderSidebarAvatar('medium')}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                      isDark ? 'border-slate-900' : 'border-white'
                    } ${isServerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    title={isServerConnected ? `Serwer połączony (${serverPing} ms)` : 'Tryb lokalny / offline'}
                  />
                </div>
                <div className="truncate min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold block truncate transition-colors ${
                      activeView === 'profile'
                        ? 'text-emerald-400 font-extrabold'
                        : isDark 
                          ? 'text-slate-100 group-hover:text-emerald-400' 
                          : 'text-slate-900 group-hover:text-emerald-600'
                    }`}>
                      {athleteName}
                    </span>
                    <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1 font-mono mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isServerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="truncate">{isServerConnected ? `Serwer ${serverPing}ms` : 'Tryb Lokalny'}</span>
                  </span>
                </div>
              </button>

              {/* Quick Profile Action */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectView('profile')}
                  className={`p-2 rounded-lg border transition-colors ${
                    activeView === 'profile'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : isDark 
                        ? 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-slate-700' 
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-emerald-600'
                  }`}
                  title="Otwórz pełny Profil Zawodnika i ustawienia konta"
                  id="btn-sidebar-account-settings"
                >
                  <UserCheck className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sync status & theme toggle */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span 
                className={`flex items-center gap-1.5 truncate max-w-[150px] font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`} 
                title={isServerConnected ? `Połączono z serwerem (${serverPing}ms) • Trwa synchronizacja w czasie rzeczywistym` : 'Synchronizacja lokalna'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-spin" style={{ animationDuration: '3.5s' }} />
                <span className="truncate font-semibold text-emerald-400/90">{isServerConnected ? 'Synchronizacja...' : 'Tryb Lokalny'}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectView('profile')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeView === 'profile'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                  }`}
                  title="Otwórz pełny widok Profilu i Synchronizacji"
                  id="btn-sidebar-goto-profile-view"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Centrum</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: isDark ? 'light' : 'dark' })}
                  className={`p-2 rounded-lg border flex items-center gap-1 transition-colors ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' 
                      : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                  }`}
                  title={isDark ? 'Przełącz na motyw jasny' : 'Przełącz na motyw ciemny'}
                  id="btn-sidebar-theme-toggle"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              id="sidebar-sync-collapsed-btn"
              onClick={() => onSelectView('profile')}
              className={`p-1 rounded-xl border relative flex items-center justify-center transition-all cursor-pointer ${
                activeView === 'profile'
                  ? isDark
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200'
                  : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-emerald-600 shadow-xs'
              }`}
              title={`Konto: ${athleteName} • ${isServerConnected ? 'Połączono z serwerem' : 'Tryb lokalny'}`}
            >
              {renderSidebarAvatar('small')}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border ${
                  isDark ? 'border-slate-900' : 'border-white'
                } ${isServerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: isDark ? 'light' : 'dark' })}
              className={`p-2 rounded-xl border flex items-center justify-center transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}
              title={isDark ? 'Przełącz na jasny' : 'Przełącz na ciemny'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Account Profile Modal */}
      <AccountProfileModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        profile={profile}
        onUpdateProfile={onUpdateProfile}
        syncConfig={syncConfig}
        onUpdateSyncConfig={onUpdateSyncConfig}
        onNavigateToFullProfile={() => onSelectView('profile')}
      />
    </aside>
  );
};
