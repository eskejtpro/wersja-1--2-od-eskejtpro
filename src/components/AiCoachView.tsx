import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  Zap, 
  RefreshCw, 
  BrainCircuit, 
  CheckCircle2, 
  Dumbbell, 
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Flame,
  Stethoscope,
  Apple,
  Sliders,
  FileText,
  Volume2,
  Trash2,
  Layers,
  ChevronRight,
  Brain,
  Plus,
  Bookmark,
  History,
  Save
} from 'lucide-react';
import { 
  GymData, 
  TrainingWeek, 
  AppSettings, 
  UserProfile, 
  BodyWeightEntry, 
  CalendarDayNote,
  AiChatMessage,
  AiAgentMemory
} from '../types';
import { soundService } from '../utils/soundService';

interface AiCoachViewProps {
  gymData: GymData;
  settings: AppSettings;
  profile?: UserProfile;
  calendarNotes?: CalendarDayNote[];
  bodyWeights?: BodyWeightEntry[];
  bloodTests?: any[];
  chatHistory?: AiChatMessage[];
  onUpdateChatHistory?: (history: AiChatMessage[]) => void;
  agentMemories?: AiAgentMemory[];
  onUpdateAgentMemories?: (memories: AiAgentMemory[]) => void;
}

type AiPersona = 'head_coach' | 'data_analyst' | 'health_specialist' | 'hardcore_motivator' | 'nutritionist';

const AI_PERSONAS = [
  {
    id: 'head_coach' as AiPersona,
    label: 'Główny Trener',
    shortDesc: 'Siła 1RM & Periodyzacja',
    icon: Dumbbell,
    accent: 'emerald',
    badge: 'Pro Metodyk'
  },
  {
    id: 'data_analyst' as AiPersona,
    label: 'Analityk Danych',
    shortDesc: 'Tonaż, EMA & Statystyka',
    icon: Activity,
    accent: 'cyan',
    badge: 'Matematyka'
  },
  {
    id: 'health_specialist' as AiPersona,
    label: 'Medycyna & Zdrowie',
    shortDesc: 'Badania Krwi & Regeneracja',
    icon: Stethoscope,
    accent: 'purple',
    badge: 'Biomarkery'
  },
  {
    id: 'hardcore_motivator' as AiPersona,
    label: 'Motywator Siłowni',
    shortDesc: 'Zero Wymówek & Ogień',
    icon: Flame,
    accent: 'rose',
    badge: 'Mental'
  },
  {
    id: 'nutritionist' as AiPersona,
    label: 'Dietetyk Sportowy',
    shortDesc: 'Makro, Kalorie & Suple',
    icon: Apple,
    accent: 'amber',
    badge: 'Dieta'
  }
];

const QUICK_PROMPTS = [
  { label: '📈 Progresja Ciężaru', prompt: 'Przeanalizuj moje ostatnie ćwiczenia i zaproponuj konkretną progresję ciężaru na najbliższy trening.' },
  { label: '🛡️ Ocena Zmęczenia & Deload', prompt: 'Oceń mój tonaż i liczbę serii. Czy na podstawie wykonanych jednostek powinienem zaplanować tydzień deloadu?' },
  { label: '🎯 Balans Objętości Partii', prompt: 'Czy objętość (liczba serii) na poszczególne grupy mięśniowe jest w moim planie zbalansowana?' },
  { label: '🥗 Zapotrzebowanie Białkowe & Kalorie', prompt: 'Oceń moją wagę i trend EMA. Ile białka i kalorii powinienem spożywać na obecnym etapie cyklu?' },
  { label: '🩸 Interpretacja Badań Krwi', prompt: 'Przeanalizuj moje ostatnie badania krwi i wskaż kluczowe biomarkery wymagające uwagi.' },
];

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  gymData,
  settings,
  profile,
  calendarNotes = [],
  bodyWeights = [],
  bloodTests = [],
  chatHistory = [],
  onUpdateChatHistory,
  agentMemories = [],
  onUpdateAgentMemories
}) => {
  const isDark = settings.theme === 'dark';
  const isAmoled = settings.amoledBlack === true;
  
  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'chat' | 'memories' | 'plan_generator' | 'health_audit' | 'mesocycle_report'>('chat');
  
  // Selected Persona
  const [selectedPersona, setSelectedPersona] = useState<AiPersona>('head_coach');

  // Default welcome message
  const defaultWelcomeMessage: AiChatMessage = {
    id: 'welcome-msg',
    role: 'assistant',
    content: `Cześć **${profile?.name || 'Zawodniku'}**! 👋 Jestem Twoim zaawansowanym **Trenerem AI Online (Gemini 3.8 Flash)** w aplikacji PlanPasika.v2.\n\n💾 **Pamięć Agenta jest włączona**: Zapamiętuję wszystkie nasze rozmowy, Twoje cele, historię tonażu, wagi EMA oraz badania krwi w bezpiecznej bazie Room SQL.\n\nW czym mogę Ci dzisiaj pomóc?`,
    timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    model: 'gemini-3.8-flash',
    persona: 'head_coach'
  };

  // Chat State initialized from persistent chatHistory
  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    if (chatHistory && chatHistory.length > 0) {
      return chatHistory;
    }
    return [defaultWelcomeMessage];
  });

  // Sync internal state if chatHistory prop changes externally
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Memory Input State
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<'goal' | 'injury' | 'preference' | 'record' | 'general'>('goal');

  // Plan Generator State
  const [planGoal, setPlanGoal] = useState<'hypertrophy' | 'strength' | 'recomp' | 'deload'>('hypertrophy');
  const [planSplit, setPlanSplit] = useState<'ppl' | 'upper_lower' | 'full_body'>('ppl');
  const [planDays, setPlanDays] = useState<number>(4);
  const [planExperience, setPlanExperience] = useState<'intermediate' | 'advanced' | 'beginner'>('intermediate');
  const [generatedPlanText, setGeneratedPlanText] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Health Audit State
  const [healthAuditText, setHealthAuditText] = useState<string | null>(null);
  const [isAuditingHealth, setIsAuditingHealth] = useState(false);

  // Deep Analysis Report State
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  // Context builder from current gym data & long-term memories
  const buildAthleteContext = () => {
    const sortedWeeks = [...(gymData.weeks || [])].sort((a, b) => (a.number || 0) - (b.number || 0));
    const currentWeek = sortedWeeks[sortedWeeks.length - 1];

    const recentExercises: Array<{ name: string; weight: number; reps: number; sets: number; rpe?: number }> = [];
    if (currentWeek?.days) {
      currentWeek.days.forEach(d => {
        d.exercises?.forEach(ex => {
          if (ex.name && !recentExercises.some(r => r.name === ex.name)) {
            recentExercises.push({
              name: ex.name,
              weight: ex.weight || 0,
              reps: ex.reps || 0,
              sets: ex.sets || 0,
              rpe: ex.rpe
            });
          }
        });
      });
    }

    const latestWeight = bodyWeights.length > 0 ? bodyWeights[bodyWeights.length - 1]?.weight : undefined;
    const recentNotes = (calendarNotes || []).slice(-5).map(n => ({
      date: n.date,
      title: n.title,
      content: n.content,
      category: n.category
    }));

    return {
      athleteName: profile?.name || 'Zawodnik',
      currentWeekName: currentWeek?.name || `Tydzień ${currentWeek?.number || 1}`,
      latestWeight,
      weightTrendEMA: settings.emaAlpha ? latestWeight : undefined,
      recentExercises: recentExercises.slice(0, 10),
      recentNotes,
      recentBloodTests: (bloodTests || []).slice(0, 10),
      memories: agentMemories.map(m => `[${m.category}] ${m.content}`)
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputPrompt).trim();
    if (!messageText || isLoading) return;

    const userMessage: AiChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    };

    const newMessagesList = [...messages, userMessage];
    setMessages(newMessagesList);
    if (onUpdateChatHistory) {
      onUpdateChatHistory(newMessagesList);
    }

    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const context = buildAthleteContext();
      const response = await fetch('/api/ai/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          persona: selectedPersona,
          context,
          history: newMessagesList.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const botMessage: AiChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Otrzymano pustą odpowiedź.',
        timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        model: data.model || 'gemini-3.8-flash',
        persona: selectedPersona
      };

      const finalMessagesList = [...newMessagesList, botMessage];
      setMessages(finalMessagesList);
      if (onUpdateChatHistory) {
        onUpdateChatHistory(finalMessagesList);
      }
      soundService.triggerHaptic('light');
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: AiChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Błąd połączenia z modelem Gemini AI.**\n\nUpewnij się, że serwer jest uruchomiony. Wiadomość została zachowana w pamięci.`,
        timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessagesList = [...newMessagesList, errorMessage];
      setMessages(finalMessagesList);
      if (onUpdateChatHistory) {
        onUpdateChatHistory(finalMessagesList);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Czy na pewno chcesz wyczyścić całą zapisaną historię czatu z Trenerem AI?')) {
      const resetList = [defaultWelcomeMessage];
      setMessages(resetList);
      if (onUpdateChatHistory) {
        onUpdateChatHistory(resetList);
      }
      soundService.triggerHaptic('medium');
    }
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    const newEntry: AiAgentMemory = {
      id: `mem-${Date.now()}`,
      content: newMemoryContent.trim(),
      category: newMemoryCategory,
      createdAt: new Date().toLocaleDateString('pl-PL')
    };

    const updated = [newEntry, ...agentMemories];
    if (onUpdateAgentMemories) {
      onUpdateAgentMemories(updated);
    }
    setNewMemoryContent('');
    soundService.triggerHaptic('light');
  };

  const handleDeleteMemory = (id: string) => {
    const updated = agentMemories.filter(m => m.id !== id);
    if (onUpdateAgentMemories) {
      onUpdateAgentMemories(updated);
    }
    soundService.triggerHaptic('light');
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch('/api/ai/coach/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: planGoal,
          split: planSplit,
          daysPerWeek: planDays,
          experience: planExperience,
          focusMuscle: 'general'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setGeneratedPlanText(data.planText);
      soundService.triggerHaptic('medium');
    } catch (err: any) {
      console.error('Generate plan error:', err);
      setGeneratedPlanText('⚠️ Błąd generowania planu AI.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleRunHealthAudit = async () => {
    setIsAuditingHealth(true);
    try {
      const latestWeight = bodyWeights.length > 0 ? bodyWeights[bodyWeights.length - 1]?.weight : 85;
      const response = await fetch('/api/ai/coach/audit-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodTests,
          notes: calendarNotes,
          bodyWeight: latestWeight
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setHealthAuditText(data.auditText);
      soundService.triggerHaptic('medium');
    } catch (err: any) {
      console.error('Health audit error:', err);
      setHealthAuditText('⚠️ Błąd audytu zdrowotnego AI.');
    } finally {
      setIsAuditingHealth(false);
    }
  };

  const handleRunDeepAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/coach/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gymData })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAnalysisReport(data.analysis);
      soundService.triggerHaptic('medium');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisReport('⚠️ Błąd generowania raportu mezocyklu.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activePersonaDef = AI_PERSONAS.find(p => p.id === selectedPersona) || AI_PERSONAS[0];

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 p-3 sm:p-5 animate-fadeIn" id="ai-coach-root">
      
      {/* ======================================================== */}
      {/* 🚀 TOP HEADER: ONLINE STATUS, MEMORY BADGE & MODEL */}
      {/* ======================================================== */}
      <div className={`p-4 rounded-2xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isAmoled ? 'bg-black border-zinc-800' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg border border-purple-400/40 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-white">
                Trener AI &amp; Pamięć Długoterminowa
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Gemini 3.8 Flash Online</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30 flex items-center gap-1">
                <Brain className="w-3 h-3 text-cyan-400" />
                <span>Pamięć: {agentMemories.length} faktów</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automatyczny zapis historii rozmów i faktów w relacyjnej bazie Room SQL
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          {[
            { id: 'chat', label: '💬 Czat Live' },
            { id: 'memories', label: '🧠 Pamięć Agenta' },
            { id: 'plan_generator', label: '📋 Generator Planu' },
            { id: 'health_audit', label: '🩸 Audyt Badań' },
            { id: 'mesocycle_report', label: '📊 Raport Mezocyklu' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🎭 1. PERSONA SELECTOR BAR (5 SPECIALIZED COACHES) */}
      {/* ======================================================== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Wybierz Personę Asystenta AI:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">
              Aktywna: <strong className="text-white">{activePersonaDef.label}</strong>
            </span>
            {activeTab === 'chat' && messages.length > 1 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-900/50"
                title="Wyczyść historię czatu"
              >
                <Trash2 className="w-3 h-3" />
                <span>Wyczyść czat</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {AI_PERSONAS.map(persona => {
            const Icon = persona.icon;
            const isSelected = selectedPersona === persona.id;

            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => {
                  setSelectedPersona(persona.id);
                  soundService.triggerHaptic('light');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : ''}`}>
                    {persona.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {persona.shortDesc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 💬 TAB 1: CZAT NA ŻYWO (LIVE PERSISTENT AI CHAT) */}
      {/* ======================================================== */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col space-y-3 min-h-[480px]">
          
          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 hover:border-emerald-500/60 text-slate-300 hover:text-white text-xs font-medium whitespace-nowrap cursor-pointer transition-all shrink-0 active:scale-95 disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Container */}
          <div className={`flex-1 p-4 rounded-2xl border overflow-y-auto space-y-4 max-h-[58vh] no-scrollbar shadow-inner ${
            isAmoled ? 'bg-black border-zinc-800' : 'bg-slate-950/90 border-slate-800'
          }`}>
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {isBot && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md border border-emerald-400/30">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-1.5 shadow-md ${
                    isBot
                      ? 'bg-slate-900 border border-slate-800 text-slate-100'
                      : 'bg-emerald-600 text-white ml-auto'
                  }`}>
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-4 text-[10px] opacity-70 pb-1 border-b border-white/10 font-mono">
                      <span>{isBot ? `Trener AI (${msg.model || 'Gemini'})` : 'Ty (Zawodnik)'}</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Content */}
                    <div className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Actions for Bot Message */}
                    {isBot && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                        <span className="text-[9px] text-slate-500 font-mono">
                          💾 Zapisano w bazie Room
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.content, msg.id)}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Skopiowano</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Kopiuj</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-slate-400 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 w-fit animate-pulse">
                <BrainCircuit className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Trener AI analizuje tonaż, historię i generuje odpowiedź...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 p-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={`Zadaj pytanie jako: ${activePersonaDef.label}... (np. jak zwiększyć siłę w martwym ciągu?)`}
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Wyślij</span>
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🧠 TAB 2: PAMIĘĆ DŁUGOTERMINOWA AGENTA (MEMORIES) */}
      {/* ======================================================== */}
      {activeTab === 'memories' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Centrum Pamięci Długoterminowej Agenta AI</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                Pamięć Trwała Room SQL
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tutaj znajdują się kluczowe fakty, cele, preferencje sprzętowe i informacje o przebytych kontuzjach, które Trener AI bierze pod uwagę przy każdej kolejnej rozmowie i analizie.
            </p>

            {/* Form to add manual memory */}
            <form onSubmit={handleAddMemory} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dodaj Nowy Fakt do Pamięci Agenta:</span>
                </span>
                <select
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1"
                >
                  <option value="goal">🎯 Cel Treningowy</option>
                  <option value="injury">⚠️ Uraz / Kontuzja</option>
                  <option value="preference">⚙️ Preferencja / Sprzęt</option>
                  <option value="record">🏆 Rekord / Osiągnięcie</option>
                  <option value="general">📝 Notatka Ogólna</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="np. Cel: 160 kg w przysiadzie do końca roku; Przebyty uraz lewego kolana..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!newMemoryContent.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Zapamiętaj</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of active memories */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 px-1 font-mono uppercase">
              Zapamiętane Fakty ({agentMemories.length}):
            </span>

            {agentMemories.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <Brain className="w-8 h-8 text-slate-700 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">Brak zapisanych faktów pamięciowych</h4>
                <p className="text-xs text-slate-500">Dodaj swój cel lub przebyte kontuzje powyżej, a Trener AI uwzględni je w kolejnych sesjach.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {agentMemories.map(mem => (
                  <div key={mem.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase font-mono">
                          {mem.category || 'Fakt'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{mem.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {mem.content}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                      title="Usuń z pamięci"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📋 TAB 3: GENERATOR PLANU TRENINGOWEGO AI */}
      {/* ======================================================== */}
      {activeTab === 'plan_generator' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Generator Mikrocyklu Treningowego (AI Planner)</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                Wspomagany przez Gemini
              </span>
            </div>

            {/* Form Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Cel Treningowy:</label>
                <select
                  value={planGoal}
                  onChange={(e) => setPlanGoal(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                >
                  <option value="hypertrophy">Hipertrofia (Masa mięśniowa)</option>
                  <option value="strength">Siła Maksymalna (1RM / Trójbój)</option>
                  <option value="recomp">Rekompozycja Sylwetki</option>
                  <option value="deload">Tydzień Regeneracyjny (Deload)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Podział (Split):</label>
                <select
                  value={planSplit}
                  onChange={(e) => setPlanSplit(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                >
                  <option value="ppl">Push / Pull / Legs</option>
                  <option value="upper_lower">Upper / Lower (Góra / Dół)</option>
                  <option value="full_body">Full Body Workout (FBW)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Dni w Tygodniu:</label>
                <select
                  value={planDays}
                  onChange={(e) => setPlanDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                >
                  <option value={3}>3 dni w tygodniu</option>
                  <option value={4}>4 dni w tygodniu</option>
                  <option value={5}>5 dni w tygodniu</option>
                  <option value={6}>6 dni w tygodniu</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Zaawansowanie:</label>
                <select
                  value={planExperience}
                  onChange={(e) => setPlanExperience(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                >
                  <option value="intermediate">Średniozaawansowany</option>
                  <option value="advanced">Zaawansowany</option>
                  <option value="beginner">Początkujący</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingPlan ? 'Generowanie planu przez Gemini AI...' : 'Wygeneruj Kompletny Plan Treningowy'}</span>
            </button>
          </div>

          {/* Generated Plan Output */}
          {generatedPlanText && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  Gotowy Plan Treningowy (Propozycja AI):
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(generatedPlanText, 'generated-plan')}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'generated-plan' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'generated-plan' ? 'Skopiowano' : 'Kopiuj Plan'}</span>
                </button>
              </div>
              <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                {generatedPlanText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 🩸 TAB 4: AUDYTOR ZDROWIA & BADAŃ KRWI AI */}
      {/* ======================================================== */}
      {activeTab === 'health_audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Audytor Laboratoryjny &amp; Zdrowia Zawodnika</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                Medycyna Sportowa
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Agent analizuje Twoje wyniki badań krwi z Centrum Badań (lipidogram, próby wątrobowe, morfologię, hormony) pod kątem bezpieczeństwa narządowego i regeneracji.
            </p>

            <button
              type="button"
              onClick={handleRunHealthAudit}
              disabled={isAuditingHealth}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              <Stethoscope className="w-4 h-4" />
              <span>{isAuditingHealth ? 'Trwa analiza biomarkerów przez AI...' : 'Uruchom Pełny Audyt Zdrowotny'}</span>
            </button>
          </div>

          {healthAuditText && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-purple-400 font-mono">
                  Raport Zdrowotny &amp; Profilaktyczny AI:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(healthAuditText, 'health-audit')}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'health-audit' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'health-audit' ? 'Skopiowano' : 'Kopiuj Raport'}</span>
                </button>
              </div>
              <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                {healthAuditText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 📊 TAB 5: RAPORT MEZOCYKLU & TONAŻU */}
      {/* ======================================================== */}
      {activeTab === 'mesocycle_report' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Głęboka Analiza Mezocyklu &amp; Tonażu Treningowego</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                Periodyzacja &amp; Plateau
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Generuje całościowy raport periodyzacji, krzywej objętości, wykrywa potencjalne plateau siłowe i sugeruje zmiany na kolejny blok treningowy.
            </p>

            <button
              type="button"
              onClick={handleRunDeepAnalysis}
              disabled={isAnalyzing}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{isAnalyzing ? 'Generowanie raportu tonażu...' : 'Wygeneruj Raport Mezocyklu'}</span>
            </button>
          </div>

          {analysisReport && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 font-mono">
                  Raport Analityczny Mezocyklu:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(analysisReport, 'analysis-report')}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'analysis-report' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'analysis-report' ? 'Skopiowano' : 'Kopiuj Raport'}</span>
                </button>
              </div>
              <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                {analysisReport}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
