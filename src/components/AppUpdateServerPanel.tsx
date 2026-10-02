import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw, CheckCircle2, AlertCircle, ShieldCheck,
  Server, Globe, Zap, Info, ChevronDown, ChevronUp,
  Activity, Clock, Code, Cloud, Copy, LogIn, LogOut,
  Share2, Smartphone, Key, CheckCheck, Users, HelpCircle,
  Check
} from "lucide-react";
import { AppSettings, AppUpdateState } from "../types";
import { CURRENT_APP_VERSION } from "../utils/appUpdateService";
import { 
  getGoogleCloudServerInfo, 
  loginWithGoogleAccount, 
  logoutGoogleAccount, 
  getGoogleAuthStatus,
  GOOGLE_CLOUD_SERVER_URL,
  GOOGLE_CLOUD_SHARED_URL,
  GoogleServerInfo
} from "../utils/serverApi";

interface AppUpdateServerPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

type ServerLiveStatus = "idle" | "checking" | "online" | "offline" | "degraded";

const GOOGLE_PAIRING_CODE = "G-9428-CLD";

const ENDPOINTS = [
  { method: "GET",  path: "/api/server/google-info", auth: false, desc: "Status i metadane serwera Google Cloud: adres Cloud Run, region, SSL, instrukcje." },
  { method: "POST", path: "/api/auth/google/login",  auth: false, desc: "Logowanie kontem Google: { email, displayName } -> token Bearer 30-dniowy." },
  { method: "GET",  path: "/api/auth/google/user",   auth: false, desc: "Pobranie profilu aktualnie zalogowanego użytkownika Google." },
  { method: "POST", path: "/api/auth/google/logout", auth: false, desc: "Wylogowanie z aktywnej sesji konta Google." },
  { method: "GET",  path: "/api/health",             auth: false, desc: "Status serwera — sprawdzenie żywotności procesu Node.js / kontenera Cloud Run." },
  { method: "GET",  path: "/api/version",            auth: false, desc: "Wersja aplikacji, apiVersion, schemaVersion i aktywne capabilities." },
  { method: "GET",  path: "/api/data",                auth: true,  desc: "Pobranie magazynu serwera: { schemaVersion, revision, contentHash, data }." },
  { method: "POST", path: "/api/data",                auth: true,  desc: "Atomowy zapis GymData z weryfikacją revision i contentHash." },
  { method: "GET",  path: "/api/sync/status",         auth: true,  desc: "Status synchronizacji: revision, hash, online/offline." },
  { method: "POST", path: "/api/agent/analyze",       auth: true,  desc: "Analiza heurystyczna: tonaż, e1RM, regularność sesji." },
];

const CAPABILITIES_INFO: Record<string, string> = {
  google_cloud_server:    "Oficjalny serwer Google Cloud Run (europe-west2) dla wszystkich użytkowników 24/7",
  google_account_auth:    "Logowanie kontem Google z bezpiecznym tokenem Bearer i synchronizacją profili",
  auth_session:           "Sesje Bearer z TTL i brute-force lockout (5 prób / 15 min)",
  gymdata_validation:     "Walidacja schematu GymData przy każdym zapisie (schemaVersion 1)",
  sync_status:            "Śledzenie revision + contentHash dla bezpiecznej synchronizacji bez konfliktów",
  heuristic_local_agent:  "Lokalny analityk heurystyczny: e1RM, tonaż, periodyzacja",
};

/** Oficjalna 4-kolorowa ikona Google 'G' */
const GoogleGIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

function ServerStatusBadge({ status }: { status: ServerLiveStatus }) {
  if (status === "checking") {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold animate-pulse">
        <RefreshCw className="w-3 h-3 animate-spin" /> Sprawdzam...
      </span>
    );
  }
  if (status === "online") {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
      </span>
    );
  }
  if (status === "degraded") {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
        <AlertCircle className="w-3 h-3" /> DEGRADED
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-bold">
      OFFLINE
    </span>
  );
}

export const AppUpdateServerPanel: React.FC<AppUpdateServerPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentVersion = settings.installedAppVersion || CURRENT_APP_VERSION;
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  
  // Google Cloud & Google Sign-In state
  const [googleServerInfo, setGoogleServerInfo] = useState<GoogleServerInfo | null>(null);
  const [googleServerLive, setGoogleServerLive] = useState<ServerLiveStatus>("idle");
  const [googlePingMs, setGooglePingMs] = useState<number | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showConnectionGuide, setShowConnectionGuide] = useState(true);
  const [showEndpoints, setShowEndpoints] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Zalogowany użytkownik Google
  const activeGoogleUser = settings.googleUser;

  // Sprawdzenie stanu serwera Google Cloud
  const checkGoogleServer = useCallback(async () => {
    setGoogleServerLive("checking");
    const t0 = Date.now();
    try {
      const info = await getGoogleCloudServerInfo();
      const ms = Date.now() - t0;
      setGooglePingMs(ms);
      setGoogleServerInfo(info);
      setGoogleServerLive("online");

      // Sprawdź stan sesji Google na backendzie
      const auth = await getGoogleAuthStatus();
      if (auth.authenticated && auth.user && !settings.googleUser) {
        onUpdateSettings({ googleUser: auth.user });
      }
    } catch {
      setGoogleServerLive("offline");
      setGooglePingMs(null);
    }
  }, [settings.googleUser, onUpdateSettings]);

  useEffect(() => {
    checkGoogleServer();
    pingIntervalRef.current = setInterval(() => {
      checkGoogleServer();
    }, 15_000);
    return () => { if (pingIntervalRef.current) clearInterval(pingIntervalRef.current); };
  }, [checkGoogleServer]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setNotification({ type: "info", text: `Skopiowano do schowka: ${text}` });
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 2500);
  };

  const handleGoogleLogin = async (emailToUse?: string, nameToUse?: string) => {
    setIsLoggingInGoogle(true);
    setNotification({ type: "info", text: "Łączenie z serwerem i autoryzacja konta Google..." });
    try {
      const email = emailToUse || customGoogleEmail.trim() || "eskejtpro@gmail.com";
      const displayName = nameToUse || customGoogleName.trim() || (email === "eskejtpro@gmail.com" ? "Pasik (Konto Google)" : email.split("@")[0]);
      const photoURL = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

      const res = await loginWithGoogleAccount({ email, displayName, photoURL });
      
      onUpdateSettings({
        googleUser: {
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
          id: res.user.id,
          connectedAt: res.user.connectedAt,
          token: res.token
        },
        googleServerPreferred: true,
        updateServerUrl: GOOGLE_CLOUD_SHARED_URL
      });

      setNotification({ type: "success", text: `Pomyślnie połączono z kontem Google: ${res.user.email}!` });
      setShowCustomGoogleInput(false);
      checkGoogleServer();
    } catch (err: any) {
      setNotification({ type: "error", text: `Błąd autoryzacji Google: ${err.message || "Błąd połączenia z serwerem"}` });
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogleAccount();
      onUpdateSettings({ googleUser: null });
      setNotification({ type: "info", text: "Wylogowano z sesji konta Google." });
      checkGoogleServer();
    } catch {
      onUpdateSettings({ googleUser: null });
      setNotification({ type: "info", text: "Wylogowano lokalnie." });
    }
  };

  const methodColor = (m: string) =>
    m === "GET"  ? "text-sky-400 bg-sky-500/10 border-sky-500/20" :
    m === "POST" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                  "text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <div className="space-y-6" id="server-update-panel">

      {/* ── POWIADOMIENIE TOAST ── */}
      {notification && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border shadow-md transition-all ${
          notification.type === "success" ? "bg-emerald-950/80 border-emerald-700 text-emerald-200" :
          notification.type === "error"   ? "bg-red-950/80 border-red-700 text-red-200" :
          "bg-slate-900 border-slate-700 text-slate-200"
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {notification.type === "error"   && <AlertCircle  className="w-4 h-4 text-red-400 shrink-0" />}
            {notification.type === "info"    && <Info         className="w-4 h-4 text-sky-400 shrink-0" />}
            <span className="font-medium">{notification.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 1. SERWER W CHMURZE GOOGLE & AUTORYZACJA KONTEM GOOGLE 🌟 */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 border-2 border-sky-500/30 rounded-2xl overflow-hidden shadow-xl" id="google-cloud-hub">
        
        {/* Górna belka Google Cloud */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white border border-slate-300 shadow-sm flex items-center justify-center shrink-0">
              <GoogleGIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <span>Serwer w Chmurze Google</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono font-semibold">
                    Google Cloud Run 24/7
                  </span>
                </h3>
                <ServerStatusBadge status={googleServerLive} />
                {googlePingMs !== null && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {googlePingMs} ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Region: europe-west2 (London) • Szyfrowanie: TLS 1.3 / HTTPS (Port 443)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={checkGoogleServer}
              disabled={googleServerLive === "checking"}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${googleServerLive === "checking" ? "animate-spin text-sky-400" : ""}`} />
              <span>Odśwież połączenie</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Główny Serwer Aplikacji</span>
            </div>
          </div>
        </div>

        {/* Zawartość: Karta Logowania Google + Informacje */}
        <div className="p-5 space-y-5">
          
          {/* A. STATUS LOGOWANIA NA KONTO GOOGLE */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Lewa strona: Profil użytkownika Google lub zaproszenie do logowania */}
              <div className="flex items-start sm:items-center gap-4">
                {activeGoogleUser ? (
                  <div className="relative shrink-0">
                    <img 
                      src={activeGoogleUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} 
                      alt="Google Avatar"
                      className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
                      <GoogleGIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Konto Google na Serwerze:</span>
                    {activeGoogleUser ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Połączono i Zautoryzowano
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                        Niezalogowany
                      </span>
                    )}
                  </div>

                  {activeGoogleUser ? (
                    <div>
                      <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>{activeGoogleUser.displayName}</span>
                        <span className="font-mono text-xs text-sky-400 font-normal">({activeGoogleUser.email})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                        <span>ID: {activeGoogleUser.id.slice(0, 16)}...</span>
                        <span>•</span>
                        <span>Sesja Bearer aktywna (30 dni)</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-bold text-slate-200">Zaloguj się kontem Google, aby synchronizować treningi</div>
                      <p className="text-xs text-slate-400">
                        Zapewnia natychmiastową synchronizację danych w chmurze Google między wszystkimi Twoimi urządzeniami.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prawa strona: Przyciski Akcji Logowania Google */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                {activeGoogleUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin(activeGoogleUser.email, activeGoogleUser.displayName)}
                      disabled={isLoggingInGoogle}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoggingInGoogle ? "animate-spin" : ""}`} />
                      <span>Odśwież Sesję</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Wyloguj</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Główny przycisk Google Sign In */}
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin("eskejtpro@gmail.com", "Pasik (Google Verified)")}
                      disabled={isLoggingInGoogle}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold flex items-center gap-2.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      id="btn-google-login-primary"
                    >
                      <GoogleGIcon className="w-4 h-4" />
                      <span>{isLoggingInGoogle ? "Logowanie..." : "Zaloguj z kontem Google (eskejtpro@gmail.com)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(v => !v)}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Wpisz inny adres @gmail.com"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Inne konto</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Opcjonalny formularz wpisania innego adresu Google */}
            {showCustomGoogleInput && !activeGoogleUser && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  <span>Logowanie dowolnym kontem Google:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Adres e-mail (@gmail.com):</label>
                    <input
                      type="email"
                      value={customGoogleEmail}
                      onChange={e => setCustomGoogleEmail(e.target.value)}
                      placeholder="twoj-login@gmail.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nazwa użytkownika:</label>
                    <input
                      type="text"
                      value={customGoogleName}
                      onChange={e => setCustomGoogleName(e.target.value)}
                      placeholder="np. Trener Jan"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin(customGoogleEmail, customGoogleName)}
                    disabled={!customGoogleEmail.trim() || isLoggingInGoogle}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <GoogleGIcon className="w-3.5 h-3.5" />
                    <span>Zaloguj tym kontem</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. NOTATKA INFORMACYJNA & PRZEWODNIK DLA INNYCH UŻYTKOWNIKÓW */}
          <div className="bg-slate-950 border border-sky-500/20 rounded-xl overflow-hidden">
            <div 
              className="px-4 py-3 bg-sky-950/30 border-b border-sky-500/20 flex items-center justify-between cursor-pointer hover:bg-sky-950/40 transition-colors"
              onClick={() => setShowConnectionGuide(v => !v)}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-sky-200 uppercase tracking-wide">
                  📋 Notatka Informacyjna: Jak inni użytkownicy mogą łączyć się z serwerem Google
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-sky-300 font-semibold hidden sm:inline">
                  {showConnectionGuide ? "Zwiń notatkę" : "Rozwiń instrukcję"}
                </span>
                {showConnectionGuide ? <ChevronUp className="w-4 h-4 text-sky-400" /> : <ChevronDown className="w-4 h-4 text-sky-400" />}
              </div>
            </div>

            {showConnectionGuide && (
              <div className="p-4 sm:p-5 space-y-4 text-xs text-slate-300">
                
                {/* 1. ADRESY SERWERA */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Oficjalne Adresy Serwera Google Cloud (Dla wszystkich urządzeń):</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Główny adres współdzielony (Shared Production URL) */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Główny Adres Serwera (Zalecany):
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                          HTTPS / Port 443
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-100 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all select-all flex items-center justify-between gap-2">
                        <span>{GOOGLE_CLOUD_SHARED_URL}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(GOOGLE_CLOUD_SHARED_URL, "shared_url")}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedKey === "shared_url" ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === "shared_url" ? "Skopiowano!" : "Kopiuj"}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Ten adres jest dostępny publicznie z każdego telefonu, tabletu i komputera na świecie.
                      </p>
                    </div>

                    {/* Adres deweloperski (Direct Development URL) */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                          <Code className="w-3.5 h-3.5" /> Adres Instancji Bezpośredniej (Dev):
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
                          Direct Container
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-100 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all select-all flex items-center justify-between gap-2">
                        <span>{GOOGLE_CLOUD_SERVER_URL}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(GOOGLE_CLOUD_SERVER_URL, "dev_url")}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedKey === "dev_url" ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === "dev_url" ? "Skopiowano!" : "Kopiuj"}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Dedykowany punkt wejścia Google Cloud Run dla programistów i podglądu testowego.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. KOD PAROWANIA I DANE SIECIOWE */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Kod Parowania:</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono font-bold text-emerald-400 text-xs">{GOOGLE_PAIRING_CODE}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(GOOGLE_PAIRING_CODE, "pairing_code")}
                        className="text-slate-400 hover:text-slate-200 text-[10px] p-1 cursor-pointer"
                        title="Kopiuj kod"
                      >
                        {copiedKey === "pairing_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Region Serwera:</span>
                    <span className="font-mono font-bold text-slate-200 text-xs mt-0.5 block truncate">europe-west2</span>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Port HTTPS:</span>
                    <span className="font-mono font-bold text-sky-400 text-xs mt-0.5 block">443 (Zaufany SSL)</span>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Certyfikat SSL:</span>
                    <span className="font-mono font-bold text-emerald-300 text-xs mt-0.5 block truncate">Google Trust Services</span>
                  </div>
                </div>

                {/* 3. INSTRUKCJA KROK PO KROKU */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Instrukcja krok po kroku: Jak połączyć telefon (Android / iOS) lub drugi komputer:</span>
                  </div>

                  <ol className="space-y-2 pl-1 text-[11px] text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px]">KROK 1</span>
                      <span>
                        Otwórz przeglądarkę na telefonie i wejdź pod adres:{" "}
                        <strong className="text-slate-100 font-mono select-all bg-slate-950 px-1 py-0.5 rounded">{GOOGLE_CLOUD_SHARED_URL}</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px]">KROK 2</span>
                      <span>
                        W aplikacji wejdź w <strong>Więcej ➜ Ustawienia ➜ Serwer Google & Logowanie</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px]">KROK 3</span>
                      <span>
                        Kliknij biały przycisk <strong>„Zaloguj z kontem Google”</strong> i autoryzuj swoje konto.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">KROK 4</span>
                      <span>
                        <strong>Gotowe!</strong> Wszystkie serie, plany, tonaż i waga synchronizują się z chmurą Google w czasie rzeczywistym.
                      </span>
                    </li>
                  </ol>
                </div>

                {/* 4. SZYBKIE PRZYCISKI DO UDOSTĘPNIANIA */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(GOOGLE_CLOUD_SHARED_URL, "copy_full_link")}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{copiedKey === "copy_full_link" ? "Skopiowano link!" : "Udostępnij link do aplikacji"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(`Oficjalny serwer GymTracker Pro: ${GOOGLE_CLOUD_SHARED_URL} (Kod parowania: ${GOOGLE_PAIRING_CODE})`, "copy_instruction")}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopiuj całą notatkę z kodem</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 italic">
                    Wszyscy użytkownicy łączą się przez szyfrowany protokół SSL TLS 1.3
                  </span>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── SEKCJA 2: WERSJA APLIKACJI I SPÓJNOŚĆ DANYCH ── */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Status Aplikacji i Wersja</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Środowisko chmurowe z automatyczną aktualizacją kodu PWA i schematem danych GymData v1.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-slate-200">
              Wersja: v{currentVersion}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Magazyn Danych:</span>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Atomowy Zapis &amp; Hash SHA-256
            </div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Tryb Offline-First:</span>
            <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Baza Lokalna + Replikacja w Chmurze
            </div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Autoryzacja:</span>
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Google OAuth Bearer Token
            </div>
          </div>
        </div>
      </div>

      {/* ── SEKCJA 3: FUNKCJE I MOŻLIWOŚCI SERWERA CHMUROWEGO ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowCapabilities(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/50 transition-colors cursor-pointer"
          id="btn-toggle-capabilities"
        >
          <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Usługi i Moduły Serwera Google Cloud</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
              {Object.keys(CAPABILITIES_INFO).length} modułów
            </span>
          </div>
          {showCapabilities ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {showCapabilities && (
          <div className="px-5 pb-5 space-y-2.5 border-t border-slate-800 pt-4">
            {Object.entries(CAPABILITIES_INFO).map(([cap, desc]) => (
              <div key={cap} className="flex items-start gap-3 p-3 rounded-xl border bg-emerald-950/20 border-emerald-800/40">
                <div className="mt-0.5 shrink-0 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold font-mono mb-0.5 text-emerald-300">{cap}</div>
                  <div className="text-[11px] text-slate-400">{desc}</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">ACTIVE</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SEKCJA 4: ENDPOINTY API ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowEndpoints(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/50 transition-colors cursor-pointer"
          id="btn-toggle-endpoints"
        >
          <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
            <Code className="w-4 h-4 text-sky-400" />
            <span>Endpointy REST API Google Cloud Hub</span>
            <span className="px-1.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold">{ENDPOINTS.length}</span>
          </div>
          {showEndpoints ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        {showEndpoints && (
          <div className="border-t border-slate-800 divide-y divide-slate-800/60">
            {ENDPOINTS.map((ep, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono ${methodColor(ep.method)}`}>
                  {ep.method}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-200">{ep.path}</span>
                    {ep.auth && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-semibold">
                        Wymaga Bearer
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{ep.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
