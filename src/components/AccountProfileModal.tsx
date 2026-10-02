import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Upload,
  Image as ImageIcon,
  Wifi,
  WifiOff,
  Check,
  X,
  RefreshCw,
  Sliders,
  Target,
  Trash2,
  Sparkles,
  Smartphone,
  Shield,
  Activity,
  Globe,
  Settings,
  Scale,
  Moon,
  Sun
} from 'lucide-react';
import { AppSettings, UserProfile, SyncServerConfig } from '../types';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  profile?: UserProfile;
  onUpdateProfile?: (updatedProfile: Partial<UserProfile>) => void;
  syncConfig?: SyncServerConfig;
  onUpdateSyncConfig?: (updatedSync: Partial<SyncServerConfig>) => void;
  onNavigateToFullProfile: () => void;
}

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

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  profile,
  onUpdateProfile,
  syncConfig,
  onUpdateSyncConfig,
  onNavigateToFullProfile,
}) => {
  if (!isOpen) return null;

  const isDark = settings.theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for editing
  const [activeTab, setActiveTab] = useState<'profile' | 'server' | 'preferences'>('profile');
  const [name, setName] = useState(profile?.name || settings.athleteName || 'Pasik92');
  const [athleteTag, setAthleteTag] = useState(profile?.athleteTag || 'Pasik92 #001');
  const [bio, setBio] = useState(profile?.bio || 'Trening siłowy & periodyzacja falowa. Budowanie gęstości mięśniowej.');
  const [primaryGoal, setPrimaryGoal] = useState(profile?.primaryGoal || 'masa');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [urlInput, setUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Server ping local test state
  const [isPinging, setIsPinging] = useState(false);
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  // File Upload Handlers (Base64)
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Proszę wybrać plik graficzny (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Rozmiar pliku nie może przekraczać 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAvatarUrl(base64);
      if (onUpdateProfile) {
        onUpdateProfile({ avatarUrl: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setAvatarUrl(urlInput.trim());
      if (onUpdateProfile) {
        onUpdateProfile({ avatarUrl: urlInput.trim() });
      }
      setUrlInput('');
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setAvatarUrl(presetId);
    if (onUpdateProfile) {
      onUpdateProfile({ avatarUrl: presetId });
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    if (onUpdateProfile) {
      onUpdateProfile({ avatarUrl: '' });
    }
  };

  // Ping Server Handler
  const handleTestPing = () => {
    setIsPinging(false);
    setPingMessage('Rzeczywisty test serwera dostępny jest w ustawieniach API; synchronizacja pozostaje wyłączona.');
  };

  // Save all profile changes
  const handleSaveAll = () => {
    const updated = {
      name: name.trim() || 'Pasik92',
      athleteTag: athleteTag.trim(),
      bio: bio.trim(),
      primaryGoal: primaryGoal as UserProfile['primaryGoal'],
      avatarUrl: avatarUrl,
    };

    if (onUpdateProfile) {
      onUpdateProfile(updated);
    }
    onUpdateSettings({ athleteName: name.trim() || 'Pasik92' });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  // Avatar renderer helper
  const renderAvatarPreview = () => {
    if (avatarUrl?.startsWith('preset:')) {
      const preset = PRESET_AVATARS.find((p) => p.id === avatarUrl);
      return (
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${preset?.bg || 'from-emerald-500 to-teal-700'} flex items-center justify-center text-3xl shadow-lg border-2 border-emerald-400/40`}>
          {preset?.emoji || '💪'}
        </div>
      );
    }
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-lg"
          onError={() => setAvatarUrl('')}
        />
      );
    }
    return (
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg border-2 border-emerald-500/30">
        {(name || 'P').slice(0, 2).toUpperCase()}
      </div>
    );
  };

  const isServerConnected = syncConfig?.lastSyncStatus === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Profil &amp; Ustawienia Konta</span>
                {savedSuccess && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> Zapisano
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Zarządzaj swoją tożsamością zawodnika, zdjęciem i statusem serwera.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-4 pt-3 border-b flex items-center gap-2 text-xs font-bold ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-100/60'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 font-bold ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Dane &amp; Zdjęcie</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('server')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 font-bold ${
              activeTab === 'server'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Status Serwera</span>
            <span className={`w-2 h-2 rounded-full ${isServerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`px-3.5 py-2 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 font-bold ${
              activeTab === 'preferences'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferencje</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* TAB 1: DANE & ZDJĘCIE PROFILOWE */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Avatar Section */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center gap-4 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="relative group shrink-0">
                  {renderAvatarPreview()}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md border border-emerald-400 transition-transform active:scale-95 cursor-pointer"
                    title="Wgraj nowe zdjęcie"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Zdjęcie Profilowe</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Wgraj własną grafikę z dysku lub wybierz gotowy preset zawodnika.</p>
                    </div>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium cursor-pointer"
                        title="Usuń zdjęcie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Usuń</span>
                      </button>
                    )}
                  </div>

                  {/* Drag & Drop or Upload Trigger */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3 rounded-lg border-2 border-dashed text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                        : isDark
                          ? 'border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-400'
                          : 'border-slate-300 hover:border-slate-400 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Kliknij lub upuść plik ze zdjęciem (PNG, JPG)</span>
                    </div>
                  </div>

                  {/* Preset Avatars Bar */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Szybkie presety ikon:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_AVATARS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                            avatarUrl === preset.id
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-xs'
                              : isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                          title={preset.label}
                        >
                          <span>{preset.emoji}</span>
                          <span className="text-[11px]">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Account Details Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nazwa zawodnika / Nick:</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Pasik92"
                    className={`w-full px-3.5 py-2 rounded-xl text-sm font-semibold border outline-hidden transition-colors ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tag / Identyfikator konta:</span>
                  </label>
                  <input
                    type="text"
                    value={athleteTag}
                    onChange={(e) => setAthleteTag(e.target.value)}
                    placeholder="np. Pasik92 #001"
                    className={`w-full px-3.5 py-2 rounded-xl text-sm font-semibold border outline-hidden transition-colors ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Główny cel sylwetkowy:</span>
                  </label>
                  <select
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value as any)}
                    className={`w-full px-3.5 py-2 rounded-xl text-sm font-semibold border outline-hidden transition-colors ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  >
                    <option value="masa">Budowanie Masy Mięśniowej (Hipertrofia)</option>
                    <option value="sila">Budowanie Siły Maksymalnej (1RM)</option>
                    <option value="redukcja">Redukcja Tkanki Tłuszczowej</option>
                    <option value="rekompozycja">Rekompozycja Sylwetki</option>
                    <option value="utrzymanie">Utrzymanie Formy &amp; Regeneracja</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lub wklej bezpośredni URL zdjęcia:</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-mono border outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      disabled={!urlInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs"
                    >
                      Ustaw
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Notatki / Bio zawodnika:</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="Krótka notatka o periodyzacji, celach..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border outline-hidden resize-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* TAB 2: STATUS SERWERA & SYNCHRONIZACJA */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${isServerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className="font-bold text-sm">
                      {isServerConnected ? 'Serwer Synchronizacji: Połączono' : 'Tryb Lokalny / Offline'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isPinging}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Badanie...' : 'Testuj łącze (Ping)'}</span>
                  </button>
                </div>

                {pingMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{pingMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Adres Serwera:</span>
                    <span className="text-slate-200 font-semibold">{syncConfig?.serverUrl || 'Nie skonfigurowano'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Czas odpowiedzi (Ping):</span>
                    <span className="text-emerald-400 font-semibold">{syncConfig?.lastPingMs ? `${syncConfig.lastPingMs} ms` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Węzeł Desktop:</span>
                    <span className="text-slate-300">{syncConfig?.deviceName || 'Urządzenie lokalne'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Kod parowania Android:</span>
                    <span className="text-emerald-300 font-bold">{syncConfig?.pairingCode || 'Nie skonfigurowano'}</span>
                  </div>
                </div>
              </div>

              {/* Karta Konta Google & Serwera Chmurowego */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${isDark ? 'bg-sky-950/20 border-sky-500/30' : 'bg-sky-50 border-sky-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span className="font-bold text-xs text-sky-200">Konto Google &amp; Serwer w Chmurze</span>
                  </div>
                  {settings.googleUser ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      Zalogowano
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                      Niezalogowany
                    </span>
                  )}
                </div>

                {settings.googleUser ? (
                  <div className="flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="font-bold text-slate-100">{settings.googleUser.displayName}</div>
                      <div className="text-[11px] text-sky-300 font-mono">{settings.googleUser.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ googleUser: null })}
                      className="px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-[11px] font-bold hover:bg-red-900/50 cursor-pointer"
                    >
                      Wyloguj
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[11px] text-slate-400">Zaloguj się przez Google w Ustawieniach → Serwer Google.</span>
                    <button
                      type="button"
                      onClick={() => { onUpdateSettings({}); onClose(); }}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Otwórz Ustawienia</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Pełny pulpit synchronizacji i badania krwi są dostępne w zakładce profilu.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToFullProfile();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Otwórz Pełny Widok
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCJE KONTA */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border space-y-4 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                {/* Unit Switcher */}
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Domyślna jednostka wagowa:</span>
                    </h5>
                    <p className="text-xs text-slate-400">Wpływa na kalkulację serii, 1RM oraz rejestr wagi.</p>
                  </div>
                  <div className="flex items-center rounded-lg p-0.5 bg-slate-950 border border-slate-800 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ unit: 'kg' })}
                      className={`px-3 py-1 rounded transition-colors ${
                        settings.unit === 'kg' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Kilogramy (KG)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ unit: 'lbs' })}
                      className={`px-3 py-1 rounded transition-colors ${
                        settings.unit === 'lbs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Funty (LBS)
                    </button>
                  </div>
                </div>

                {/* Theme Switcher */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <div>
                    <h5 className="font-bold text-xs flex items-center gap-1.5">
                      {isDark ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      <span>Motyw wizualny aplikacji:</span>
                    </h5>
                    <p className="text-xs text-slate-400">Ciemny motyw dla siłowni lub czytelny motyw jasny.</p>
                  </div>
                  <div className="flex items-center rounded-lg p-0.5 bg-slate-950 border border-slate-800 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                      className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                        isDark ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Moon className="w-3 h-3 text-amber-400" /> Ciemny
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                      className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                        !isDark ? 'bg-slate-200 text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sun className="w-3 h-3 text-amber-500" /> Jasny
                    </button>
                  </div>
                </div>

                {/* Auto Save */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <div>
                    <h5 className="font-bold text-xs">Automatyczny zapis zmian:</h5>
                    <p className="text-xs text-slate-400">Zapis do pamięci lokalnej przeglądarki i kopii zapasowej.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ autoSave: !settings.autoSave })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      settings.autoSave
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {settings.autoSave ? 'Włączony' : 'Wyłączony'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToFullProfile();
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Pełny Profil &amp; Synchronizacja</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Zapisz Zmiany</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
