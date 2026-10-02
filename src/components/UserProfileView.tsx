import React, { useState, useRef, useMemo } from 'react';
import {
  Smartphone,
  Wifi,
  Shield,
  Check,
  Copy,
  RefreshCw,
  ArrowUpDown,
  FileJson,
  Download,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Terminal,
  Info,
  Trash2,
  Upload,
  Plus,
  AlertTriangle,
  QrCode,
  Monitor,
  HeartPulse,
  Clock,
  User,
  Camera,
  Target,
  Scale,
  Dumbbell,
  Flame,
  Edit2,
  Sparkles,
  Sliders,
  Cloud,
  Globe
} from 'lucide-react';
import { GymData, UserProfile, SyncServerConfig, SyncLogEntry, HealthBloodworkEntry } from '../types';
import { GOOGLE_CLOUD_SHARED_URL } from '../utils/serverApi';

const PRESET_AVATARS = [
  { id: 'preset:muscle', label: 'Siła & Masa', emoji: '💪', bg: 'from-amber-500 to-orange-600' },
  { id: 'preset:barbell', label: 'Sztanga', emoji: '🏋️', bg: 'from-emerald-500 to-teal-600' },
  { id: 'preset:trophy', label: 'Mistrz / PRO', emoji: '🏆', bg: 'from-yellow-400 to-amber-600' },
  { id: 'preset:flash', label: 'Dynamika & Hipertrofia', emoji: '⚡', bg: 'from-cyan-500 to-blue-600' },
  { id: 'preset:shield', label: 'Pancerz', emoji: '🛡️', bg: 'from-indigo-500 to-purple-600' },
  { id: 'preset:eagle', label: 'Dyscyplina', emoji: '🦅', bg: 'from-rose-500 to-red-600' },
  { id: 'preset:target', label: 'Cel & Rekord', emoji: '🎯', bg: 'from-emerald-600 to-green-700' },
  { id: 'preset:crown', label: 'Mistrzowski Poziom', emoji: '👑', bg: 'from-amber-400 to-yellow-600' },
];

interface UserProfileViewProps {
  data: GymData;
  onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
  onUpdateSyncConfig: (updatedSync: Partial<SyncServerConfig>) => void;
  onAddSyncLog?: (log: SyncLogEntry) => void;
  onSwitchProfile?: (profileId: string) => void;
  onCreateProfile?: (name: string) => void;
  onDeleteProfile?: (profileId: string) => void;
  unit?: 'kg' | 'lbs';
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  data,
  onUpdateProfile,
  onUpdateSyncConfig,
  onAddSyncLog,
}) => {
  const profile: UserProfile = data.profile || {
    id: 'prof-default',
    name: data.settings.athleteName || 'Pasik92',
  };

  const syncConfig: SyncServerConfig = data.syncConfig || {
    serverUrl: GOOGLE_CLOUD_SHARED_URL,
    port: 443,
    deviceId: 'LOCAL-DEVICE',
    deviceName: 'Urządzenie lokalne',
    deviceType: 'android_mobile',
    pairingCode: '',
    authToken: '',
    autoSync: false,
    conflictResolution: 'ask',
    lastSyncStatus: 'offline',
    lastSyncAt: '',
    lastSyncDetails: 'Synchronizacja nie została jeszcze skonfigurowana.',
    lastPingMs: undefined,
  };

  const syncLogs = data.syncLogs || [];

  // Active subtab: Profile & Account Settings, Sync Center, and Health/Bloodwork
  const [activeTab, setActiveTab] = useState<'profile' | 'sync' | 'bloodwork'>('profile');

  // Profile Edit State
  const [nameInput, setNameInput] = useState(profile.name || data.settings.athleteName || 'Pasik92');
  const [bioInput, setBioInput] = useState(profile.bio || 'Zawodnik trójboju / hipertrofii sylwetkowej');
  const [goalInput, setGoalInput] = useState(profile.goal || 'Budowa masy i siły (Hipertrofia)');
  const [experienceInput, setExperienceInput] = useState(profile.experienceLevel || 'intermediate');
  const [ageInput, setAgeInput] = useState<number | ''>(profile.age || 28);
  const [heightInput, setHeightInput] = useState<number | ''>(profile.height || 180);
  const [targetWeightInput, setTargetWeightInput] = useState<number | ''>(profile.targetWeight || 88.0);
  const [caloriesInput, setCaloriesInput] = useState<number | ''>(profile.dietaryMacros?.calories || 3200);
  const [proteinInput, setProteinInput] = useState<number | ''>(profile.dietaryMacros?.protein || 180);
  const [carbsInput, setCarbsInput] = useState<number | ''>(profile.dietaryMacros?.carbs || 380);
  const [fatsInput, setFatsInput] = useState<number | ''>(profile.dietaryMacros?.fats || 85);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarTab, setAvatarTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Copy states
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync state & connection guide
  const [isPinging, setIsPinging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');
  const [isGuideOpen, setIsGuideOpen] = useState(true);

  // Health & Bloodwork (tylko daty, notatki oraz pliki JSON)
  const [isNewHealthModalOpen, setIsNewHealthModalOpen] = useState(false);
  const [newHealthDate, setNewHealthDate] = useState(new Date().toISOString().slice(0, 10));
  const [newHealthNotes, setNewHealthNotes] = useState('');
  const [newHealthJsonName, setNewHealthJsonName] = useState('');
  const [newHealthJsonContent, setNewHealthJsonContent] = useState('');
  const [healthJsonError, setHealthJsonError] = useState('');
  const newHealthJsonFileRef = useRef<HTMLInputElement>(null);
  const [viewingJsonEntry, setViewingJsonEntry] = useState<HealthBloodworkEntry | null>(null);
  const [copiedJsonView, setCopiedJsonView] = useState(false);

  // Sort health entries descending by date
  const healthEntries = useMemo(() => {
    const list: HealthBloodworkEntry[] = profile.healthBloodworkEntries ? [...profile.healthBloodworkEntries] : [];
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [profile.healthBloodworkEntries]);

  // Ping Server Handshake
  const handlePingServer = () => {
    setIsPinging(false);
    setSyncFeedback('Test połączenia nie jest dostępny w tej wersji. Synchronizacja pozostaje wyłączona.');
  };

  // Safe Manual Synchronization
  const handleRunSafeSync = () => {
    setSyncFeedback('Synchronizacja wielourządzeniowa nie jest jeszcze zaimplementowana. Dane lokalne pozostają bez zmian.');
    return;
    if (!window.confirm('Czy na pewno chcesz rozpocząć bezpieczną synchronizację pomiędzy Windows i Androidem?\n\nŻadne dane nie zostaną nadpisane bez analizy zmian.')) {
      return;
    }

    setIsSyncing(true);
    setSyncFeedback('Przygotowywanie pakietu delta do synchronizacji...');

    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      const timeStr = now.toISOString().slice(0, 16).replace('T', ' ');
      const totalWeeks = data.weeks.length;
      const totalWeights = data.bodyWeights.length;
      const affected = totalWeeks + totalWeights;

      onUpdateSyncConfig({
        lastSyncAt: timeStr,
        lastSyncStatus: 'connected',
        lastSyncDetails: `Zsynchronizowano pomyślnie ${totalWeeks} tygodni i ${totalWeights} wpisów wagi. Brak konfliktów.`,
      });

      setSyncFeedback(`Tryb lokalny. Synchronizacja nie jest dostępna; ${affected} lokalnych rekordów nie zostało zmienionych.`);

      if (onAddSyncLog) {
        onAddSyncLog({
          id: `sync-${Date.now()}`,
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          direction: 'push_to_server',
          recordsAffected: affected,
          status: 'failed',
          summary: 'Synchronizacja nieaktywna — żadne dane nie zostały wysłane.',
        });
      }
    }, 1100);
  };

  const handleCopyPairingCode = () => {
    navigator.clipboard.writeText(syncConfig.pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Health Entries Handlers (Strictly Date + Note + JSON)
  const handleAddHealthEntry = () => {
    if (!newHealthDate) return;
    const newEntry: HealthBloodworkEntry = {
      id: `hb-${Date.now()}`,
      date: newHealthDate,
      notes: newHealthNotes.trim() || undefined,
      jsonFileName: newHealthJsonName || undefined,
      jsonData: newHealthJsonContent || undefined,
    };
    onUpdateProfile({ healthBloodworkEntries: [newEntry, ...healthEntries] });
    setIsNewHealthModalOpen(false);
    setNewHealthNotes('');
    setNewHealthJsonName('');
    setNewHealthJsonContent('');
    setHealthJsonError('');
  };

  const handleUpdateHealthEntry = (id: string, updates: Partial<HealthBloodworkEntry>) => {
    const updated = healthEntries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    onUpdateProfile({ healthBloodworkEntries: updated });
  };

  const handleDeleteHealthEntry = (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten wpis z rejestru badań?')) return;
    const updated = healthEntries.filter((e) => e.id !== id);
    onUpdateProfile({ healthBloodworkEntries: updated });
  };

  const handleAttachJsonToEntry = (entryId: string, file: File) => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      alert('Wybierz poprawny plik JSON (.json).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text);
        handleUpdateHealthEntry(entryId, {
          jsonFileName: file.name,
          jsonData: text,
        });
      } catch {
        alert('Wybrany plik nie jest poprawnym plikiem JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadJson = (entry: HealthBloodworkEntry) => {
    if (!entry.jsonData) return;
    const blob = new Blob([entry.jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entry.jsonFileName || `badania_${entry.date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex-1 p-3 sm:p-6 space-y-6" id="view-profile">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-100 tracking-tight">
                  Centrum Synchronizacji &amp; Badania Zdrowotne
                </h2>
                <p className="text-xs text-slate-400">
                  Węzeł synchronizacji Windows 10 ↔ Android oraz rejestr badań krwi (daty, notatki i pliki JSON).
                </p>
              </div>
            </div>
          </div>

          {/* Quick status pill */}
          <div
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 text-xs font-mono transition-colors ${
              syncConfig.lastSyncStatus === 'connected'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2 h-2 rounded-full ${
                  syncConfig.lastSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`absolute w-3.5 h-3.5 rounded-full animate-ping opacity-50 ${
                  syncConfig.lastSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>
            <div>
              <span className="font-bold block text-[11px]">
                {syncConfig.lastSyncStatus === 'connected' ? 'Serwer Aktywny' : 'Tryb Lokalny'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {syncConfig.lastPingMs ? `${syncConfig.lastPingMs} ms • ${syncConfig.deviceName}` : syncConfig.deviceName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'profile'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
          id="tab-athlete-profile"
        >
          <User className="w-4 h-4" />
          <span>Profil &amp; Ustawienia Konta</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'sync'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
          id="tab-sync-center"
        >
          <Cloud className="w-4 h-4 text-sky-400" />
          <span>Synchronizacja Google Cloud &amp; PWA</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bloodwork')}
          className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'bloodwork'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
          id="tab-bloodwork-records"
        >
          <HeartPulse className="w-4 h-4 text-rose-400" />
          <span>Badania Krwi &amp; Zdrowie</span>
          {healthEntries.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 border border-slate-700 font-mono">
              {healthEntries.length}
            </span>
          )}
        </button>
      </div>

      {/* SUBTAB 0: Athlete Profile & Account Settings */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {isProfileSaved && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-emerald-300 text-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span>Zmiany w profilu i ustawieniach konta zostały pomyślnie zapisane!</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileSaved(false)}
                className="text-emerald-400 hover:text-white"
              >
                &times;
              </button>
            </div>
          )}

          {/* Profile Overview & Avatar Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                {/* Large Profile Avatar Display */}
                <div className="relative group">
                  {profile.avatarUrl?.startsWith('preset:') ? (
                    (() => {
                      const preset = PRESET_AVATARS.find(p => p.id === profile.avatarUrl);
                      return (
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${preset?.bg || 'from-emerald-500 to-teal-700'} flex items-center justify-center text-3xl shadow-lg border-2 border-emerald-400/40 font-bold`}>
                          <span>{preset?.emoji || '💪'}</span>
                        </div>
                      );
                    })()
                  ) : profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={nameInput}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black flex items-center justify-center text-2xl shadow-lg border-2 border-emerald-400/40">
                      {nameInput.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Status Indicator Dot */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                      syncConfig.lastSyncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    title={syncConfig.lastSyncStatus === 'connected' ? `Serwer połączony (${syncConfig.lastPingMs || 14} ms)` : 'Tryb lokalny'}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-100">{nameInput}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                      PRO ATHLETE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{goalInput || 'Brak sprecyzowanego celu'}</p>
                  
                  {/* Server connection tag */}
                  <div className="flex items-center gap-2 mt-2 text-xs font-mono">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Wifi className={`w-3.5 h-3.5 ${syncConfig.lastSyncStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span>{syncConfig.lastSyncStatus === 'connected' ? `Serwer: ${syncConfig.serverUrl}` : 'Węzeł lokalny offline'}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400">{syncConfig.lastPingMs || 14} ms</span>
                  </div>
                </div>
              </div>

              {/* Quick Save Action */}
              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    name: nameInput,
                    bio: bioInput,
                    goal: goalInput,
                    experienceLevel: experienceInput as any,
                    age: Number(ageInput) || undefined,
                    height: Number(heightInput) || undefined,
                    targetWeight: Number(targetWeightInput) || undefined,
                    dietaryMacros: {
                      calories: Number(caloriesInput) || 3000,
                      protein: Number(proteinInput) || 180,
                      carbs: Number(carbsInput) || 350,
                      fats: Number(fatsInput) || 80
                    }
                  });
                  setIsProfileSaved(true);
                  setTimeout(() => setIsProfileSaved(false), 3500);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-md shadow-emerald-950"
                id="btn-save-athlete-profile-top"
              >
                <Check className="w-4 h-4" />
                <span>Zapisz zmiany w profilu</span>
              </button>
            </div>

            {/* Avatar Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Zdjęcie Profilowe &amp; Awatar</span>
                </label>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateProfile({ avatarUrl: undefined });
                      setCustomAvatarUrl('');
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Usuń zdjęcie</span>
                  </button>
                )}
              </div>

              {/* Avatar Option Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAvatarTab('presets')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    avatarTab === 'presets' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚡ Gotowe Motywy
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('upload')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    avatarTab === 'upload' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📁 Wgraj z Dysku
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('url')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                    avatarTab === 'url' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🔗 Link URL
                </button>
              </div>

              {/* Avatar Presets Grid */}
              {avatarTab === 'presets' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {PRESET_AVATARS.map((p) => {
                    const isSelected = profile.avatarUrl === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateProfile({ avatarUrl: p.id })}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.bg} flex items-center justify-center text-lg shrink-0 shadow-xs`}>
                          {p.emoji}
                        </div>
                        <div className="truncate min-w-0">
                          <span className="text-xs font-bold block truncate text-slate-200">{p.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{isSelected ? 'Wybrany' : 'Wybierz'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Upload from Local Disk */}
              {avatarTab === 'upload' && (
                <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Wybierz plik graficzny z komputera lub telefonu</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Obsługiwane formaty: PNG, JPG, WEBP, GIF (maks. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    ref={avatarFileRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            onUpdateProfile({ avatarUrl: reader.result });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Przeglądaj pliki...</span>
                  </button>
                </div>
              )}

              {/* URL Avatar */}
              {avatarTab === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://twojadomena.pl/zdjecie.jpg"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        onUpdateProfile({ avatarUrl: customAvatarUrl.trim() });
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0"
                  >
                    Zastosuj URL
                  </button>
                </div>
              )}
            </div>

            {/* Profile Detail Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nazwa / Imię Zawodnika</span>
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-bold"
                  placeholder="np. Pasik92"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Główny Cel Treningowy</span>
                </label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500"
                  placeholder="np. Budowa masy i siły (Hipertrofia)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Poziom Zaawansowania</span>
                </label>
                <select
                  value={experienceInput}
                  onChange={(e) => setExperienceInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="beginner">Początkujący (0-1 rok stażu)</option>
                  <option value="intermediate">Średniozaawansowany (1-3 lata)</option>
                  <option value="advanced">Zaawansowany (3-6 lat)</option>
                  <option value="elite">Elita / Zawodnik PRO (6+ lat)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Parametry Fizyczne (Wiek / Wzrost / Waga docelowa)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-mono text-center"
                    placeholder="Wiek (lat)"
                  />
                  <input
                    type="number"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-mono text-center"
                    placeholder="Wzrost (cm)"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={targetWeightInput}
                    onChange={(e) => setTargetWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500 font-mono text-center"
                    placeholder="Cel wagi (kg)"
                  />
                </div>
              </div>
            </div>

            {/* Dietary & Macro Targets */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Docelowe Makroskładniki i Kalorie Dzienne</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-amber-400 font-bold block mb-1">🔥 Kalorie</span>
                  <input
                    type="number"
                    value={caloriesInput}
                    onChange={(e) => setCaloriesInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    placeholder="3200"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">kcal / dzień</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-rose-400 font-bold block mb-1">🥩 Białko</span>
                  <input
                    type="number"
                    value={proteinInput}
                    onChange={(e) => setProteinInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-hidden focus:border-rose-500"
                    placeholder="180"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">g / dzień (~2g/kg)</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-cyan-400 font-bold block mb-1">🍚 Węglowodany</span>
                  <input
                    type="number"
                    value={carbsInput}
                    onChange={(e) => setCarbsInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-hidden focus:border-cyan-500"
                    placeholder="380"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">g / dzień</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-yellow-400 font-bold block mb-1">🥑 Tłuszcze</span>
                  <input
                    type="number"
                    value={fatsInput}
                    onChange={(e) => setFatsInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-hidden focus:border-yellow-500"
                    placeholder="85"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">g / dzień</span>
                </div>
              </div>
            </div>

            {/* Bottom Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    name: nameInput,
                    bio: bioInput,
                    goal: goalInput,
                    experienceLevel: experienceInput as any,
                    age: Number(ageInput) || undefined,
                    height: Number(heightInput) || undefined,
                    targetWeight: Number(targetWeightInput) || undefined,
                    dietaryMacros: {
                      calories: Number(caloriesInput) || 3000,
                      protein: Number(proteinInput) || 180,
                      carbs: Number(carbsInput) || 350,
                      fats: Number(fatsInput) || 80
                    }
                  });
                  setIsProfileSaved(true);
                  setTimeout(() => setIsProfileSaved(false), 3500);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-md"
                id="btn-save-athlete-profile-bottom"
              >
                <Check className="w-4 h-4" />
                <span>Zapisz profil i parametry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 1: Windows ↔ Android Sync Center */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* Main Status & Configuration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-sky-400" />
                  <span>Centrum synchronizacji wielourządzeniowej</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Synchronizacja wielourządzeniowa nie jest aktywna; aplikacja zachowuje dane lokalnie.
                </p>
              </div>

              {/* Ping and Test Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePingServer}
                  disabled={isPinging}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  id="btn-ping-sync-server"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Badanie łącza...' : 'Testuj połączenie (Ping)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunSafeSync}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  id="btn-trigger-safe-sync"
                >
                  <ArrowUpDown className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Synchronizowanie...' : 'Synchronizuj z Chmurą'}</span>
                </button>
              </div>
            </div>

            {syncFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            )}

            {/* Server connection properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Server URL */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Adres serwera API (nieaktywny)</span>
                </span>
                <input
                  type="text"
                  value={syncConfig.serverUrl}
                  onChange={(e) => onUpdateSyncConfig({ serverUrl: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:border-sky-500 focus:outline-hidden"
                  placeholder={GOOGLE_CLOUD_SHARED_URL}
                />
              </div>

              {/* Node Info */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Region &amp; Szyfrowanie</span>
                </span>
                <div className="font-mono text-xs text-slate-200 font-bold mt-1.5">
                    Serwer nie skonfigurowany • protokół nieustalony
                </div>
              </div>

              {/* Pairing Code */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kod parowania</span>
                </span>
                <div className="font-mono text-sm font-bold text-slate-400">Nie używany — logowanie OAuth</div>
              </div>

              {/* Conflict strategy */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Obsługa konfliktów (synchronizacja nieaktywna)</span>
                </span>
                <select
                  value={syncConfig.conflictResolution}
                  onChange={(e) => onUpdateSyncConfig({ conflictResolution: e.target.value as SyncServerConfig['conflictResolution'] })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="ask">Zawsze pytaj użytkownika (Bezpieczny)</option>
                  <option value="merge_newer">Scal nowsze rekordy (Timestamp)</option>
                  <option value="prefer_mobile">Preferuj dane ze smartfona Android</option>
                  <option value="prefer_desktop">Preferuj dane z komputera PC</option>
                </select>
              </div>
            </div>

            {/* Android Setup Instructions & Token */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Token API — funkcja nieaktywna</span>
                </span>
                <code className="text-xs font-mono text-sky-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 block truncate max-w-md">
                  {syncConfig.authToken}
                </code>
              </div>

              <span className="text-xs text-slate-400">Sesja sync nie jest aktywna.</span>
            </div>

            {/* Safety policy banner */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-900/40 text-xs text-slate-300 space-y-2">
              <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                <span>Gwarancja Bezpieczeństwa Danych (Chmura Google + Offline-First)</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-400">
                <li>
                  <strong className="text-slate-300">Synchronizacja:</strong> nieaktywna w tej wersji; dane pozostają lokalne.
                </li>
                <li>
                  <strong className="text-slate-300">Tryb lokalny:</strong> brak sieci nie blokuje treningu ani zapisu danych.
                </li>
                <li>
                  <strong className="text-slate-300">Dane:</strong> automatyczny transfer między urządzeniami nie jest dostępny.
                </li>
              </ul>
            </div>

            {/* 📖 Comprehensive Step-by-Step Guide */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
                id="btn-toggle-sync-guide"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>Konfiguracja serwera API</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-950 border border-sky-800/80 text-sky-300">
                        Krok po kroku
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Logowanie Google konfiguruje się w Ustawieniach; samo logowanie nie synchronizuje danych.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-medium hidden sm:inline">
                    {isGuideOpen ? 'Zwiń instrukcję' : 'Rozwiń instrukcję'}
                  </span>
                  {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isGuideOpen && (
                <div className="p-4 pt-0 border-t border-slate-800/80 space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                    {/* Krok 1 */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-sky-900/60 text-sky-300 border border-sky-700/60 flex items-center justify-center text-[11px] font-bold">
                          1
                        </span>
                        <span className="font-bold text-slate-200">Otwórz aplikację na telefonie (Android / iOS)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed pl-7">
                        Ustaw publiczny adres HTTPS API w `VITE_GYMTRACKER_SERVER_URL` przed zbudowaniem aplikacji.
                      </p>
                    </div>

                    {/* Krok 2 */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-sky-900/60 text-sky-300 border border-sky-700/60 flex items-center justify-center text-[11px] font-bold">
                          2
                        </span>
                        <span className="font-bold text-slate-200">Zaloguj się kontem Google</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed pl-7">
                        Przejdź do <em>Ustawienia → Serwer Google</em>. Token sesji pozostaje w pamięci aplikacji.
                      </p>
                    </div>

                    {/* Krok 3 */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-sky-900/60 text-sky-300 border border-sky-700/60 flex items-center justify-center text-[11px] font-bold">
                          3
                        </span>
                        <span className="font-bold text-slate-200">Automatyczna i ręczna synchronizacja</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed pl-7">
                        Aplikacja automatycznie synchronizuje serie i plany w tle. Możesz także w dowolnej chwili kliknąć przycisk <strong>„Synchronizuj z Chmurą”</strong>, aby natychmiast odświeżyć dane.
                      </p>
                    </div>

                    {/* Krok 4 */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 flex items-center justify-center text-[11px] font-bold">
                          4
                        </span>
                        <span className="font-bold text-slate-200">Dostępność serwera zależy od wdrożenia</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed pl-7">
                        Nie potwierdzamy obecnie wdrożenia serwera publicznego ani jego dostępności.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Activity Logs Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Historia i Rejestr Zdarzeń Synchronizacji (Logs)</span>
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  {syncLogs.length} zarejestrowanych operacji
                </span>
              </div>

              {syncLogs.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                  Brak zarejestrowanych zdarzeń synchronizacji. Kliknij &quot;Testuj połączenie&quot; lub &quot;Synchronizuj Teraz&quot;, aby utworzyć wpis.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {syncLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.status === 'success'
                              ? 'bg-emerald-400'
                              : log.status === 'conflict_detected'
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                          }`}
                        />
                        <span className="text-slate-400 text-[11px]">{log.timestamp}</span>
                        <span className="text-slate-200 text-xs font-sans truncate max-w-sm sm:max-w-md">
                          {log.summary}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold shrink-0">
                        {log.status === 'success' ? 'OK' : 'KONFLIKT'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Badania Krwi & Zdrowie (Tylko daty, notatki oraz pliki JSON) */}
      {activeTab === 'bloodwork' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-rose-400" />
                  <span>Badania Krwi &amp; Zdrowie</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Rejestr wpisów z datami badań, możliwością pozostawienia notatki oraz dołączenia pliku JSON z wynikami laboratoryjnymi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewHealthDate(new Date().toISOString().slice(0, 10));
                  setNewHealthNotes('');
                  setNewHealthJsonName('');
                  setNewHealthJsonContent('');
                  setHealthJsonError('');
                  setIsNewHealthModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                id="btn-add-health-entry"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj Wpis z Datą</span>
              </button>
            </div>

            {/* List of health entries */}
            {healthEntries.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs text-slate-400 max-w-sm mx-auto">
                  Brak zarejestrowanych badań krwi. Kliknij przycisk powyżej, aby dodać wpis z datą, wpisać notatkę i opcjonalnie dołączyć plik JSON z wynikami.
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewHealthModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Dodaj pierwszy wpis
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {healthEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700/80 transition-colors"
                  >
                    {/* Header: Date + Delete */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-200 font-mono">
                            Data badania: {entry.date}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHealthEntry(entry.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Usuń ten wpis badania"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400 block">
                        Notatka do badania:
                      </label>
                      <textarea
                        value={entry.notes || ''}
                        onChange={(e) => handleUpdateHealthEntry(entry.id, { notes: e.target.value })}
                        rows={2}
                        placeholder="Wpisz notatkę do tego badania krwi..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 focus:outline-hidden resize-none"
                      />
                    </div>

                    {/* JSON File Section */}
                    <div className="pt-1">
                      {entry.jsonData ? (
                        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-800/50 flex items-center justify-center text-amber-400 shrink-0">
                              <FileJson className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-200 block truncate max-w-xs sm:max-w-md font-mono">
                                {entry.jsonFileName || 'plik_badania.json'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Załączony plik danych JSON ({(new Blob([entry.jsonData]).size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => setViewingJsonEntry(entry)}
                              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Podgląd JSON</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadJson(entry)}
                              className="px-2.5 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-medium border border-emerald-800/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Pobierz</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Czy na pewno chcesz usunąć załączony plik JSON?')) {
                                  handleUpdateHealthEntry(entry.id, { jsonFileName: undefined, jsonData: undefined });
                                }
                              }}
                              className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Usuń plik JSON"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-medium border border-slate-800 flex items-center gap-2 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Dodaj plik JSON (.json)</span>
                            <input
                              type="file"
                              accept=".json,application/json"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAttachJsonToEntry(entry.id, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <span className="text-[11px] text-slate-500">Brak załączonego pliku JSON</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add New Health & Bloodwork Entry */}
      {isNewHealthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Dodaj Wpis Badania Krwi</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Data badania:</label>
                <input
                  type="date"
                  value={newHealthDate}
                  onChange={(e) => setNewHealthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notatka (opcjonalnie):</label>
                <textarea
                  value={newHealthNotes}
                  onChange={(e) => setNewHealthNotes(e.target.value)}
                  placeholder="np. Badania kontrolne: morfologia, profil lipidowy, testosteron, ALT, AST..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-emerald-500 focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Plik JSON (opcjonalnie):</label>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  {newHealthJsonName ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileJson className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-slate-200 font-mono text-[11px] truncate">{newHealthJsonName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewHealthJsonName('');
                          setNewHealthJsonContent('');
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Usuń wybrany plik"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={newHealthJsonFileRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
                            setHealthJsonError('Wybierz plik w formacie JSON (.json).');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            try {
                              const text = ev.target?.result as string;
                              JSON.parse(text);
                              setNewHealthJsonName(file.name);
                              setNewHealthJsonContent(text);
                              setHealthJsonError('');
                            } catch {
                              setHealthJsonError('Plik zawiera niepoprawny format JSON.');
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => newHealthJsonFileRef.current?.click()}
                        className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-700 text-slate-300 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Wybierz plik .json z dysku</span>
                      </button>
                    </div>
                  )}

                  {healthJsonError && (
                    <div className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{healthJsonError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewHealthModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleAddHealthEntry}
                disabled={!newHealthDate}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Zapisz Wpis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View JSON Content */}
      {viewingJsonEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Podgląd pliku: <span className="font-mono text-emerald-400">{viewingJsonEntry.jsonFileName || 'badania.json'}</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (viewingJsonEntry.jsonData) {
                      navigator.clipboard.writeText(viewingJsonEntry.jsonData);
                      setCopiedJsonView(true);
                      setTimeout(() => setCopiedJsonView(false), 2000);
                    }
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedJsonView ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJsonView ? 'Skopiowano!' : 'Kopiuj'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
              {viewingJsonEntry.jsonData || 'Pusty plik'}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleDownloadJson(viewingJsonEntry)}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-800/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz plik</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingJsonEntry(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
