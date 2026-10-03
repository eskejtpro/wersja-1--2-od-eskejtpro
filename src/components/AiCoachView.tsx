import React, { useState, useRef, useEffect } from 'react';
import { requestAi, assertAiResponseCurrent } from '../utils/aiRemoteClient';
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
  Save,
  Wand2,
  CheckSquare,
  ArrowRight,
  Utensils,
  Repeat,
  Square,
  Shield,
  HeartPulse,
  Ruler,
  Clock,
  Play,
  VolumeX,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { 
  GymData, 
  TrainingWeek, 
  AppSettings, 
  UserProfile, 
  BodyWeightEntry, 
  CalendarDayNote,
  AiChatMessage,
  AiAgentMemory,
  AiAgentAction,
  Exercise,
  ProtocolEntry,
  CircumferenceEntry,
  BodyPartMeasurement
} from '../types';
import { soundService } from '../utils/soundService';
import { 
  parseAiResponseAction, 
  generateStructuredMesocycle, 
  applyProgressionOverload,
  createDeloadWeek
} from '../utils/aiActionExecutor';

interface AiCoachViewProps {
  gymData: GymData;
  settings: AppSettings;
  profile?: UserProfile;
  calendarNotes?: CalendarDayNote[];
  bodyWeights?: BodyWeightEntry[];
  circumferences?: CircumferenceEntry[];
  bodyPartMeasurements?: BodyPartMeasurement[];
  bloodTests?: any[];
  chatHistory?: AiChatMessage[];
  onUpdateChatHistory?: (history: AiChatMessage[]) => void;
  agentMemories?: AiAgentMemory[];
  onUpdateAgentMemories?: (memories: AiAgentMemory[]) => void;
  // Execution callbacks for autonomous AI actions
  onAddExercise?: (weekId: string, dayId: string, exerciseData: Omit<Exercise, 'id'>) => void;
  onAddBodyWeight?: (entry: Omit<BodyWeightEntry, 'id'>) => void;
  onAddCircumference?: (entry: Omit<CircumferenceEntry, 'id'>) => void;
  onAddBodyMeasurement?: (entry: Omit<BodyPartMeasurement, 'id'>) => void;
  onAddProtocolEntry?: (entry: Omit<ProtocolEntry, 'id'>) => void;
  onAddCalendarNote?: (note: Omit<CalendarDayNote, 'id' | 'createdAt'>) => void;
  onUpdateProfile?: (profile: Partial<UserProfile>) => void;
  onUpdateSettings?: (settings: Partial<AppSettings>) => void;
  onUpdateWeeks?: (weeks: TrainingWeek[]) => void;
  onCreateBackup?: (reason?: string) => void;
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

const QUICK_COMMAND_PRESETS = [
  { label: '⚡ Auto-Progresja +2.5kg', prompt: 'Zastosuj progresję przeciążenia +2.5kg do wszystkich głównych ćwiczeń wielostawowych.' },
  { label: '🛡️ Zaplanuj Deload', prompt: 'Zaplanuj tydzień deloadu: zmniejsz objętość serii o 40% i obciążenie o 10%.' },
  { label: '⚖️ Zapisz Wagę Poranną', prompt: 'Zapisz moją poranną wagę ciała na czczo: 84.5 kg.' },
  { label: '🥗 Wylicz Makro na Masę', prompt: 'Oblicz moje zapotrzebowanie kaloryczne i rozkład makroskładników na masę jakościową (lean bulk).' },
  { label: '📋 Stwórz Plan PPL 4-Dni', prompt: 'Stwórz dla mnie kompletny 4-dniowy profesjonalny plan treningowy Push Pull Legs z priorytetem góry ciała.' },
  { label: '🩸 Audyt Badań Laboratoryjnych', prompt: 'Przeanalizuj moje ostatnie wyniki badań krwi i oceń profil lipidowy oraz próby wątrobowe.' },
  { label: '📏 Zapisz Obwód Bicepsa', prompt: 'Zapisz pomiar obwodu bicepsa: 42.5 cm.' },
  { label: '💾 Utwórz Kopię Zapasową', prompt: 'Wykonaj natychmiastową kopię zapasową bazy danych aplikacji.' },
];

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  gymData,
  settings,
  profile,
  calendarNotes = [],
  bodyWeights = [],
  circumferences = [],
  bodyPartMeasurements = [],
  bloodTests = [],
  chatHistory = [],
  onUpdateChatHistory,
  agentMemories = [],
  onUpdateAgentMemories,
  onAddExercise,
  onAddBodyWeight,
  onAddCircumference,
  onAddBodyMeasurement,
  onAddProtocolEntry,
  onAddCalendarNote,
  onUpdateProfile,
  onUpdateSettings,
  onUpdateWeeks,
  onCreateBackup
}) => {
  const isDark = settings.theme === 'dark';
  const isAmoled = settings.amoledBlack === true;
  
  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'chat' | 'automation' | 'plan_generator' | 'nutrition_plan' | 'exercise_swapper' | 'health_audit' | 'memories'>('chat');
  
  // Selected Persona
  const [selectedPersona, setSelectedPersona] = useState<AiPersona>('head_coach');

  // Default welcome message
  const defaultWelcomeMessage: AiChatMessage = {
    id: 'welcome-msg',
    role: 'assistant',
    content: `Cześć **${profile?.name || 'Zawodniku'}**! 👋 Jestem Twoim autonomicznym **Trenerem AI & Agentem Wykonawczym (Gemini 3.8 Flash)** w aplikacji PlanPasika.v2.

⚡ **Pełna kontrola nad aplikacją (Wszystkie Funkcje Zintegrowane)**:
Mogę bezpośrednio w bazie aplikacji:
- 🏋️ **Tworzyć, edytować i instalować plany treningowe** (PPL, Upper/Lower, FBW, Arnold Split)
- 📈 **Stosować progresję liniową i skokową (+2.5kg / +5kg)** lub planować deload
- ⚖️ **Rejestrować wagę ciała i pomiary obwodów sylwetki** (biceps, klatka, pas, udo)
- 💉 **Dodawać iniekcje i suplementy do kalendarza cyklu**
- 🩸 **Wprowadzać wyniki badań laboratoryjnych krwi i przeprowadzać audyty**
- 🥗 **Generować i zapisywać cele makroskładników w profilu** (Kcal, Białko, Węgle, Tłuszcze)
- 🔄 **Dobierać biomechaniczne zamienniki ćwiczeń**
- ⚙️ **Konfigurować ustawienia aplikacji** (motywy, stoper, haptykę) oraz tworzyć kopie zapasowe

Napisz mi dowolne polecenie w języku naturalnym lub wybierz szybką akcję z menu poniżej!`,
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
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Audio player ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Nutrition Plan Generator State
  const [nutritionGoal, setNutritionGoal] = useState<'masa' | 'redukcja' | 'rekompozycja'>('masa');
  const [nutritionActivity, setNutritionActivity] = useState<string>('aktywny');
  const [generatedNutritionText, setGeneratedNutritionText] = useState<string | null>(null);
  const [generatedMacros, setGeneratedMacros] = useState<{ dailyCalories: number; proteinGrams: number; carbsGrams: number; fatsGrams: number } | null>(null);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);

  // Exercise Swapper State
  const [swapExerciseName, setSwapExerciseName] = useState('Wyciskanie sztangi na ławce poziomej');
  const [swapCategory, setSwapCategory] = useState<'klatka' | 'plecy' | 'biceps' | 'triceps' | 'barki' | 'nogi'>('klatka');
  const [swapReason, setSwapReason] = useState('Brak wolnej sztangi / zajęty sprzęt');
  const [swapResultText, setSwapResultText] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // Health Audit State
  const [healthAuditText, setHealthAuditText] = useState<string | null>(null);
  const [isAuditingHealth, setIsAuditingHealth] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  // Minimal training-only context; sensitive health, calendar, profile and AI-memory data stays out of routine chat requests.
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

    return {
      currentWeekName: currentWeek?.name || `Tydzień ${currentWeek?.number || 1}`,
      recentExercises: recentExercises.slice(0, 12),
    };
  };

  // Autonomous Single Action Executor
  const executeSingleAction = (action: AiAgentAction) => {
    try {
      switch (action.type) {
        case 'LOG_BODY_WEIGHT': {
          if (onAddBodyWeight && action.payload?.weight) {
            onAddBodyWeight({
              date: action.payload.date || new Date().toISOString().split('T')[0],
              weight: Number(action.payload.weight),
              notes: action.payload.notes || 'Wpis przez Trenera AI'
            });
          }
          break;
        }
        case 'LOG_CIRCUMFERENCE': {
          if (onAddCircumference && action.payload?.value) {
            const rawPart = (action.payload.part || action.payload.bodyPart || 'ramię') as any;
            const validPart = ['klatka', 'talia', 'biodra', 'udo', 'łydka', 'ramię'].includes(rawPart) ? rawPart : 'ramię';
            onAddCircumference({
              date: action.payload.date || new Date().toISOString().split('T')[0],
              bodyPart: validPart,
              side: action.payload.side || null,
              variant: action.payload.variant || 'standard',
              millimeters: Math.round(Number(action.payload.value) * 10),
              notes: action.payload.notes || 'Pomiar przez Trenera AI'
            });
          }
          break;
        }
        case 'LOG_BODY_MEASUREMENT': {
          if (onAddBodyMeasurement && action.payload?.value) {
            const rawPart = (action.payload.part || 'biceps') as any;
            const validPart = ['biceps', 'triceps', 'klata', 'barki', 'nogi'].includes(rawPart) ? rawPart : 'biceps';
            onAddBodyMeasurement({
              date: action.payload.date || new Date().toISOString().split('T')[0],
              part: validPart,
              value: Number(action.payload.value),
              notes: action.payload.notes || 'Wpis AI'
            });
          }
          break;
        }
        case 'ADD_PROTOCOL_DOSE': {
          if (onAddProtocolEntry && action.payload?.substance) {
            onAddProtocolEntry({
              date: action.payload.date || new Date().toISOString().split('T')[0],
              substance: action.payload.substance,
              dosage: Number(action.payload.dosage) || 100,
              unit: action.payload.unit || 'mg',
              route: action.payload.route || 'IM',
              notes: action.payload.notes,
              color: action.payload.color || 'emerald'
            });
          }
          break;
        }
        case 'ADD_CALENDAR_NOTE': {
          if (onAddCalendarNote && action.payload?.content) {
            onAddCalendarNote({
              date: action.payload.date || new Date().toISOString().split('T')[0],
              title: action.payload.title,
              content: action.payload.content,
              category: action.payload.category || 'general',
              color: action.payload.color || 'amber',
              isImportant: !!action.payload.isImportant
            });
          }
          break;
        }
        case 'ADD_BLOOD_TEST': {
          if (onAddCalendarNote && action.payload?.testName) {
            onAddCalendarNote({
              date: action.payload.date || new Date().toISOString().split('T')[0],
              title: `Badanie: ${action.payload.testName}`,
              content: `Wynik: ${action.payload.value} ${action.payload.unit || ''} (Norma: ${action.payload.minNormal || '-'}-${action.payload.maxNormal || '-'}). ${action.payload.notes || ''}`,
              category: 'bloodwork',
              color: 'purple',
              isImportant: true
            });
          }
          break;
        }
        case 'ADD_EXERCISE': {
          if (onAddExercise && gymData.weeks && gymData.weeks.length > 0) {
            const currentWeek = gymData.weeks[gymData.weeks.length - 1];
            const currentDay = currentWeek?.days?.[0];
            if (currentWeek && currentDay) {
              onAddExercise(currentWeek.id, currentDay.id, {
                name: action.payload.name || 'Nowe Ćwiczenie AI',
                category: action.payload.category || 'klatka',
                sets: Number(action.payload.sets) || 3,
                reps: Number(action.payload.reps) || 8,
                weight: Number(action.payload.weight) || 50,
                rpe: Number(action.payload.rpe) || 8,
                notes: action.payload.notes || 'Dodano przez Trenera AI',
                history: []
              });
            }
          }
          break;
        }
        case 'MODIFY_EXERCISE': {
          if (onUpdateWeeks && gymData.weeks && action.payload?.exerciseName) {
            const targetName = String(action.payload.exerciseName).toLowerCase();
            const updated = gymData.weeks.map(week => ({
              ...week,
              days: week.days.map(day => ({
                ...day,
                exercises: day.exercises.map(ex => {
                  if (ex.name.toLowerCase().includes(targetName) || targetName.includes(ex.name.toLowerCase())) {
                    return {
                      ...ex,
                      weight: action.payload.newWeight ? Number(action.payload.newWeight) : ex.weight,
                      sets: action.payload.newSets ? Number(action.payload.newSets) : ex.sets,
                      reps: action.payload.newReps ? Number(action.payload.newReps) : ex.reps,
                      rpe: action.payload.newRpe ? Number(action.payload.newRpe) : ex.rpe,
                      notes: action.payload.notes ? `${ex.notes || ''} [${action.payload.notes}]` : ex.notes
                    };
                  }
                  return ex;
                })
              }))
            }));
            onUpdateWeeks(updated);
          }
          break;
        }
        case 'DELETE_EXERCISE': {
          if (onUpdateWeeks && gymData.weeks && action.payload?.exerciseName) {
            const targetName = String(action.payload.exerciseName).toLowerCase();
            const updated = gymData.weeks.map(week => ({
              ...week,
              days: week.days.map(day => ({
                ...day,
                exercises: day.exercises.filter(ex => !ex.name.toLowerCase().includes(targetName) && !targetName.includes(ex.name.toLowerCase()))
              }))
            }));
            onUpdateWeeks(updated);
          }
          break;
        }
        case 'APPLY_PROGRESSION': {
          if (onUpdateWeeks && gymData.weeks && gymData.weeks.length > 0) {
            const inc = Number(action.payload?.incrementKg) || 2.5;
            const category = action.payload?.category;
            const updated = applyProgressionOverload(gymData.weeks, inc, category);
            onUpdateWeeks(updated);
          }
          break;
        }
        case 'CREATE_DELOAD_WEEK': {
          if (onUpdateWeeks && gymData.weeks && gymData.weeks.length > 0) {
            const lastWeek = gymData.weeks[gymData.weeks.length - 1];
            const deload = createDeloadWeek(
              lastWeek, 
              gymData.weeks.length + 1, 
              Number(action.payload?.volumeReductionPct) || 40,
              Number(action.payload?.intensityReductionPct) || 10
            );
            onUpdateWeeks([...gymData.weeks, deload]);
          }
          break;
        }
        case 'INSTALL_MESOCYCLE_PLAN': {
          if (onUpdateWeeks) {
            const newWeeks = generateStructuredMesocycle(
              action.payload?.goal || 'hypertrophy',
              action.payload?.split || 'ppl',
              action.payload?.days || 4,
              4
            );
            onUpdateWeeks(newWeeks);
          }
          break;
        }
        case 'UPDATE_NUTRITION_MACROS': {
          if (onUpdateProfile && action.payload) {
            onUpdateProfile({
              dailyCalories: action.payload.dailyCalories,
              proteinGrams: action.payload.proteinGrams,
              carbsGrams: action.payload.carbsGrams,
              fatsGrams: action.payload.fatsGrams,
              dietaryMacros: {
                calories: action.payload.dailyCalories,
                protein: action.payload.proteinGrams,
                carbs: action.payload.carbsGrams,
                fats: action.payload.fatsGrams
              }
            });
          }
          break;
        }
        case 'SAVE_AI_MEMORY': {
          if (onUpdateAgentMemories && action.payload?.content) {
            const newMemory: AiAgentMemory = {
              id: `mem-${Date.now()}`,
              content: action.payload.content,
              category: action.payload.category || 'general',
              createdAt: new Date().toLocaleDateString('pl-PL')
            };
            onUpdateAgentMemories([newMemory, ...agentMemories]);
          }
          break;
        }
        case 'CREATE_BACKUP': {
          if (onCreateBackup) {
            onCreateBackup('ai_agent_action');
          }
          break;
        }
        case 'UPDATE_PROFILE': {
          if (onUpdateProfile && action.payload) {
            onUpdateProfile(action.payload);
          }
          break;
        }
        case 'UPDATE_SETTINGS': {
          if (onUpdateSettings && action.payload) {
            onUpdateSettings(action.payload);
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error executing single action:', e);
    }
  };

  // Execute All Actions in Message
  const handleExecuteActions = (messageId: string, actionsToExecute: AiAgentAction[]) => {
    try {
      actionsToExecute.forEach(act => executeSingleAction(act));

      // Update message status to 'executed'
      const updatedMessages = messages.map(m => {
        if (m.id === messageId) {
          const updatedAction = m.action ? { ...m.action, status: 'executed' as const } : undefined;
          const updatedActionsList = m.actions ? m.actions.map(a => ({ ...a, status: 'executed' as const })) : undefined;
          return {
            ...m,
            action: updatedAction,
            actions: updatedActionsList
          };
        }
        return m;
      });

      setMessages(updatedMessages);
      if (onUpdateChatHistory) {
        onUpdateChatHistory(updatedMessages);
      }
      soundService.playSuccess();
      soundService.triggerHaptic('strong');
    } catch (e) {
      console.error('Action execution error:', e);
    }
  };

  // Play Speech Audio (TTS via Gemini or Web Speech)
  const handlePlayVoice = async (messageId: string, textToSpeak: string) => {
    if (playingAudioId === messageId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis?.cancel();
      setPlayingAudioId(null);
      return;
    }

    setPlayingAudioId(messageId);

    try {
      const response = await requestAi('/api/ai/coach/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voice: selectedPersona === 'hardcore_motivator' ? 'Fenrir' : selectedPersona === 'nutritionist' ? 'Kore' : 'Puck'
        })
      });

      if (response.ok) {
        const data = await response.json();
        assertAiResponseCurrent(response);
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audioRef.current = audio;
          audio.onended = () => setPlayingAudioId(null);
          audio.onerror = () => {
            playBrowserSpeech(textToSpeak, () => setPlayingAudioId(null));
          };
          await audio.play();
          return;
        }
      }
      // Fallback to Web Speech API
      playBrowserSpeech(textToSpeak, () => setPlayingAudioId(null));
    } catch {
      playBrowserSpeech(textToSpeak, () => setPlayingAudioId(null));
    }
  };

  const playBrowserSpeech = (text: string, onEnd: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`[\]()]/g, '').slice(0, 300);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'pl-PL';
      utterance.rate = 1.05;
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
      window.speechSynthesis.speak(utterance);
    } else {
      onEnd();
    }
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
      const response = await requestAi('/api/ai/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          persona: selectedPersona,
          context,
          history: newMessagesList.slice(-9, -1).map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      assertAiResponseCurrent(response);
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Brak odpowiedzi AI.');
      const { cleanContent, action, actions } = parseAiResponseAction(data.reply, messageText);
      const botMessage: AiChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        content: cleanContent || data.reply || 'Otrzymano odpowiedź.',
        timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        model: data.model || 'gemini-3.8-flash',
        persona: selectedPersona,
        action,
        actions
      };

      const finalMessagesList = [...newMessagesList, botMessage];
      setMessages(finalMessagesList);
      if (onUpdateChatHistory) {
        onUpdateChatHistory(finalMessagesList);
      }
      soundService.triggerHaptic('light');
    } catch (err: any) {
      console.error('Chat service unavailable:', err);
      
      const botMessage: AiChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        content: 'Usługa AI jest niedostępna. Nie otrzymano odpowiedzi i nie wygenerowano lokalnej analizy. Spróbuj ponownie po przywróceniu połączenia.',
        timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        model: 'unavailable',
        persona: selectedPersona
      };

      const finalMessagesList = [...newMessagesList, botMessage];
      setMessages(finalMessagesList);
      if (onUpdateChatHistory) {
        onUpdateChatHistory(finalMessagesList);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generator Planu Treningowego Tab
  const handleGeneratePlanTab = async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await requestAi('/api/ai/coach/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: planGoal,
          split: planSplit,
          daysPerWeek: planDays,
          experience: planExperience
        })
      });
      const data = await response.json();
      assertAiResponseCurrent(response);
      if (!response.ok || typeof data.planText !== 'string' || !data.planText.trim()) throw new Error('Brak planu AI.');
      setGeneratedPlanText(data.planText);
      soundService.playSuccess();
    } catch (e) {
      console.error(e);
      setGeneratedPlanText('## AI niedostępne\nNie wygenerowano planu. Sprawdź logowanie, połączenie i konfigurację AI na serwerze.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Generator Makro Tab
  const handleGenerateNutritionTab = async () => {
    setIsGeneratingNutrition(true);
    setGeneratedMacros(null);
    try {
      const currentWeight = bodyWeights.length > 0 ? bodyWeights[bodyWeights.length - 1].weight : (profile?.targetWeight || 84);
      const response = await requestAi('/api/ai/coach/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodyWeight: currentWeight,
          goal: nutritionGoal,
          height: profile?.heightCm || profile?.height || 180,
          age: profile?.age || 28,
          activity: nutritionActivity
        })
      });
      const data = await response.json();
      assertAiResponseCurrent(response);
      if (!response.ok || typeof data.planText !== 'string' || !data.planText.trim()) throw new Error('Brak planu żywieniowego AI.');
      setGeneratedNutritionText(data.planText);
      if (data.macros) {
        setGeneratedMacros(data.macros);
      }
      soundService.playSuccess();
    } catch (e) {
      console.error(e);
      setGeneratedNutritionText('## AI niedostępne\nNie wygenerowano planu żywieniowego. Sprawdź logowanie i konfigurację serwera.');
    } finally {
      setIsGeneratingNutrition(false);
    }
  };

  // Exercise Swapper Tab
  const handleSwapExerciseTab = async () => {
    setIsSwapping(true);
    try {
      const response = await requestAi('/api/ai/coach/swap-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseName: swapExerciseName,
          category: swapCategory,
          reason: swapReason
        })
      });
      const data = await response.json();
      assertAiResponseCurrent(response);
      if (!response.ok || typeof data.explanation !== 'string' || !data.explanation.trim()) throw new Error('Brak wyniku AI.');
      setSwapResultText(data.explanation);
      soundService.playSuccess();
    } catch (e) {
      console.error(e);
      setSwapResultText('## AI niedostępne\nNie dobrano zamienników. Sprawdź logowanie, połączenie i konfigurację AI na serwerze.');
    } finally {
      setIsSwapping(false);
    }
  };

  // Health Audit Tab
  const handleRunHealthAudit = async () => {
    setIsAuditingHealth(true);
    try {
      const currentWeight = bodyWeights.length > 0 ? bodyWeights[bodyWeights.length - 1].weight : 85;
      const response = await requestAi('/api/ai/coach/audit-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodTests,
          bodyWeight: currentWeight
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      assertAiResponseCurrent(response);
      if (typeof data.auditText !== 'string' || !data.auditText.trim()) {
        throw new Error('Brak wyniku analizy zdrowotnej.');
      }
      setHealthAuditText(data.auditText);
      soundService.playSuccess();
    } catch (e) {
      console.error(e);
      setHealthAuditText('## Analiza zdrowotna niedostępna\nNie oceniono wyników. Sprawdź połączenie lub konfigurację AI i spróbuj ponownie. W razie wątpliwości omów wyniki z lekarzem.');
    } finally {
      setIsAuditingHealth(false);
    }
  };

  const handleSaveNewMemory = () => {
    if (!newMemoryContent.trim()) return;
    const newMem: AiAgentMemory = {
      id: `mem-${Date.now()}`,
      content: newMemoryContent.trim(),
      category: newMemoryCategory,
      createdAt: new Date().toLocaleDateString('pl-PL')
    };
    const updated = [newMem, ...agentMemories];
    if (onUpdateAgentMemories) {
      onUpdateAgentMemories(updated);
    }
    setNewMemoryContent('');
    soundService.playSuccess();
  };

  const handleDeleteMemory = (memId: string) => {
    const updated = agentMemories.filter(m => m.id !== memId);
    if (onUpdateAgentMemories) {
      onUpdateAgentMemories(updated);
    }
  };

  const handleClearHistory = () => {
    setMessages([defaultWelcomeMessage]);
    if (onUpdateChatHistory) {
      onUpdateChatHistory([defaultWelcomeMessage]);
    }
    soundService.triggerHaptic('light');
  };

  const currentPersonaObj = AI_PERSONAS.find(p => p.id === selectedPersona) || AI_PERSONAS[0];

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isAmoled ? 'bg-black' : isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Top Header & Persona Bar */}
      <div className={`px-4 py-3 border-b shrink-0 ${isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} backdrop-blur-md`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold">
                <BrainCircuit className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-100 flex items-center gap-1.5">
                  Autonomiczny Trener AI <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Gemini 3.8 Flash</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Pełne uprawnienia zapisu & egzekucji w aplikacji
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Czat & Akcje
            </button>

            <button
              onClick={() => setActiveTab('automation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'automation'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Super-Moce
            </button>

            <button
              onClick={() => setActiveTab('plan_generator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'plan_generator'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Generator Planu
            </button>

            <button
              onClick={() => setActiveTab('nutrition_plan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'nutrition_plan'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Makro Diety
            </button>

            <button
              onClick={() => setActiveTab('exercise_swapper')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'exercise_swapper'
                  ? 'bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Zamienniki
            </button>

            <button
              onClick={() => setActiveTab('health_audit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'health_audit'
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Audyt Zdrowia
            </button>

            <button
              onClick={() => setActiveTab('memories')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'memories'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Pamięć ({agentMemories.length})
            </button>

            {activeTab === 'chat' && (
              <button
                onClick={handleClearHistory}
                title="Wyczyść historię czatu"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Persona Select Chips */}
        {activeTab === 'chat' && (
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Rola:</span>
            {AI_PERSONAS.map(p => {
              const Icon = p.icon;
              const isSelected = selectedPersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                    isSelected
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-xs'
                      : 'bg-slate-900/60 text-slate-400 border border-slate-800/60 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CZAT & AUTONOMICZNE AKCJE                          */}
      {/* ========================================================= */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const actionsList = msg.actions || (msg.action ? [msg.action] : []);
              const hasPendingActions = actionsList.some(a => a.status === 'pending');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full animate-fadeIn`}
                >
                  <div
                    className={`rounded-2xl p-4 max-w-[92%] md:max-w-[80%] shadow-md ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-tr-xs'
                        : isAmoled
                        ? 'bg-zinc-900 border border-zinc-800 text-slate-200 rounded-tl-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {/* Message Header */}
                    {!isUser && (
                      <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold text-slate-300">
                            {currentPersonaObj.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400">
                            {msg.model || 'gemini-3.8-flash'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePlayVoice(msg.id, msg.content)}
                            title={playingAudioId === msg.id ? 'Zatrzymaj mowę' : 'Odsłuchaj głos trenera'}
                            className={`p-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                              playingAudioId === msg.id
                                ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            {playingAudioId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setCopiedId(msg.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            title="Kopiuj treść"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          >
                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans">
                      {msg.content}
                    </div>

                    {/* AUTONOMOUS EXECUTABLE ACTION CARDS */}
                    {actionsList.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <Zap className="w-3.5 h-3.5" />
                            {actionsList.length > 1 ? `Proponowane Akcje w Aplikacji (${actionsList.length})` : 'Proponowana Akcja w Aplikacji'}
                          </span>
                          {actionsList.length > 1 && hasPendingActions && (
                            <button
                              onClick={() => handleExecuteActions(msg.id, actionsList)}
                              className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all flex items-center gap-1"
                            >
                              <CheckSquare className="w-3 h-3" />
                              Zastosuj Wszystkie
                            </button>
                          )}
                        </div>

                        {actionsList.map((action, idx) => {
                          const isExecuted = action.status === 'executed';
                          return (
                            <div
                              key={action.id || idx}
                              className={`p-3 rounded-xl border transition-all ${
                                isExecuted
                                  ? 'bg-emerald-950/20 border-emerald-800/50'
                                  : 'bg-slate-950/60 border-emerald-500/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    {action.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {action.description}
                                  </p>
                                </div>

                                <button
                                  disabled={isExecuted}
                                  onClick={() => handleExecuteActions(msg.id, [action])}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                                    isExecuted
                                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 cursor-default'
                                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black hover:opacity-95 shadow-md shadow-emerald-500/20'
                                  }`}
                                >
                                  {isExecuted ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      Zastosowano
                                    </>
                                  ) : (
                                    <>
                                      <Wand2 className="w-3.5 h-3.5" />
                                      Zastosuj
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-[10px] text-slate-400 text-right mt-2">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2.5 animate-fadeIn">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Trener AI analizuje dane treningowe i przygotowuje odpowiedź...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className={`px-4 py-2 border-t ${isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'} shrink-0`}>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Szybkie akcje:
              </span>
              {QUICK_COMMAND_PRESETS.map((cmd, idx) => (
                <button
                  key={idx}
                  disabled={isLoading}
                  onClick={() => handleSendMessage(cmd.prompt)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0 transition-all hover:border-emerald-500/50"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className={`p-4 border-t ${isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shrink-0`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Wydaj polecenie (np. 'Zapisz wagę 84.5kg', 'Zwiększ wyciskanie o 5kg', 'Stwórz plan')..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Wyślij</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CENTRUM AUTOMATYZACJI & SUPER-MOCE                 */}
      {/* ========================================================= */}
      {activeTab === 'automation' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
          <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/30 rounded-2xl p-4">
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Autonomiczne Centrum Dowodzenia & Super-Moce
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Wybierz akcję, sprawdź jej podgląd i zatwierdź zmianę; dane są zapisywane przez lokalną warstwę aplikacji.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Super Action 1: Auto-progression */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-100">Progresywne Przeładowanie (+2.5 kg)</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Zwiększ obciążenie we wszystkich zarejestrowanych ćwiczeniach bieżącego mezocyklu o +2.5 kg.
                </p>
              </div>
              <button
                onClick={() => {
                  if (onUpdateWeeks && gymData.weeks) {
                    const updated = applyProgressionOverload(gymData.weeks, 2.5);
                    onUpdateWeeks(updated);
                    soundService.playSuccess();
                  }
                }}
                className="mt-3 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                Zastosuj +2.5 kg do Całego Planu
              </button>
            </div>

            {/* Super Action 2: Deload Week */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-500/50 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-100">Zaplanuj Tydzień Deloadu</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Utwórz nowy tydzień regeneracyjny: redukcja serii o 40% oraz obniżenie intensywności o 10% dla odciążenia OUN.
                </p>
              </div>
              <button
                onClick={() => {
                  if (onUpdateWeeks && gymData.weeks && gymData.weeks.length > 0) {
                    const lastWeek = gymData.weeks[gymData.weeks.length - 1];
                    const deload = createDeloadWeek(lastWeek, gymData.weeks.length + 1, 40, 10);
                    onUpdateWeeks([...gymData.weeks, deload]);
                    soundService.playSuccess();
                  }
                }}
                className="mt-3 w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <Shield className="w-3.5 h-3.5" />
                Utwórz Tydzień Deloadu
              </button>
            </div>

            {/* Super Action 3: Generate 4-Week Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-500/50 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-100">Szybka Instalacja Mezocyklu PPL</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Zainstaluj zbalansowany 4-tygodniowy mezocykl Push / Pull / Legs (4 jednostki w tygodniu z wbudowaną progresją tonażu).
                </p>
              </div>
              <button
                onClick={() => {
                  if (onUpdateWeeks) {
                    const newPlan = generateStructuredMesocycle('hypertrophy', 'ppl', 4, 4);
                    onUpdateWeeks(newPlan);
                    soundService.playSuccess();
                  }
                }}
                className="mt-3 w-full py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Zainstaluj Plan 4-Tygodniowy
              </button>
            </div>

            {/* Super Action 4: Manual Instant Backup */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Save className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-100">Natychmiastowy Backup Bazy</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Wykonaj zrzut wszystkich planów, historii, wagi i kalendarza do pamięci trwałej urządzenia.
                </p>
              </div>
              <button
                onClick={() => {
                  if (onCreateBackup) {
                    onCreateBackup('manual_ai_button');
                  }
                  soundService.playSuccess();
                }}
                className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                Zapisz Kopię Bezpieczeństwa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GENERATOR PLANU TRENINGOWEGO                        */}
      {/* ========================================================= */}
      {activeTab === 'plan_generator' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              Generator Nowego Mezocyklu Treningowego
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Główny Cel:</label>
                <select
                  value={planGoal}
                  onChange={(e) => setPlanGoal(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="hypertrophy">Hipertrofia (Masa)</option>
                  <option value="strength">Siła Maksymalna (1RM)</option>
                  <option value="recomp">Rekompozycja Sylwetki</option>
                  <option value="deload">Deload & Regeneracja</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Podział (Split):</label>
                <select
                  value={planSplit}
                  onChange={(e) => setPlanSplit(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="ppl">Push / Pull / Legs</option>
                  <option value="upper_lower">Góra / Dół (Upper / Lower)</option>
                  <option value="full_body">Full Body Workout (FBW)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Dni w Tygodniu:</label>
                <select
                  value={planDays}
                  onChange={(e) => setPlanDays(Number(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value={3}>3 Dni w tygodniu</option>
                  <option value={4}>4 Dni w tygodniu</option>
                  <option value={5}>5 Dni w tygodniu</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Zaawansowanie:</label>
                <select
                  value={planExperience}
                  onChange={(e) => setPlanExperience(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="beginner">Początkujący</option>
                  <option value="intermediate">Średniozaawansowany</option>
                  <option value="advanced">Zaawansowany Zawodnik</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                disabled={isGeneratingPlan}
                onClick={handleGeneratePlanTab}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isGeneratingPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generuj Plan przez Gemini 3.8 Flash
              </button>

              <button
                onClick={() => {
                  if (onUpdateWeeks) {
                    const newPlan = generateStructuredMesocycle(planGoal, planSplit, planDays, 4);
                    onUpdateWeeks(newPlan);
                    soundService.playSuccess();
                  }
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Zainstaluj Bezpośrednio
              </button>
            </div>
          </div>

          {generatedPlanText && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Wygenerowana Rozpiska Treningowa
                </h3>
                <button
                  onClick={() => {
                    if (onUpdateWeeks) {
                      const newPlan = generateStructuredMesocycle(planGoal, planSplit, planDays, 4);
                      onUpdateWeeks(newPlan);
                      soundService.playSuccess();
                    }
                  }}
                  className="px-3 py-1 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs hover:bg-emerald-400 flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Zastosuj w Bazie Aplikacji
                </button>
              </div>
              <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {generatedPlanText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PLAN DIETY & MAKROSKŁADNIKI                         */}
      {/* ========================================================= */}
      {activeTab === 'nutrition_plan' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2 mb-3">
              <Utensils className="w-4 h-4 text-amber-400" />
              Kalkulator Makroskładników & Diety Sportowej
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Cel Sylwetkowy:</label>
                <select
                  value={nutritionGoal}
                  onChange={(e) => setNutritionGoal(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="masa">Masa Mięśniowa (+350 kcal)</option>
                  <option value="redukcja">Redukcja Tkanki Tłuszczowej (-450 kcal)</option>
                  <option value="rekompozycja">Rekompozycja (Zero kaloryczne)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Aktywność Fizyczna:</label>
                <select
                  value={nutritionActivity}
                  onChange={(e) => setNutritionActivity(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="umiarkowany">Umiarkowana (3 treningi siłowe)</option>
                  <option value="aktywny">Wysoka (4-5 treningów siłowych + kardio)</option>
                  <option value="bardzo_aktywny">Bardzo wysoka (Codzienny trening)</option>
                </select>
              </div>
            </div>

            <button
              disabled={isGeneratingNutrition}
              onClick={handleGenerateNutritionTab}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isGeneratingNutrition ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Wylicz Precyzyjne Makro i Diety
            </button>
          </div>

          {generatedNutritionText && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Apple className="w-4 h-4" />
                  Rekomendacja Żywieniowa Trenera
                </h3>
                {generatedMacros && (
                  <button
                    onClick={() => {
                      if (onUpdateProfile && generatedMacros) {
                        onUpdateProfile({
                          dailyCalories: generatedMacros.dailyCalories,
                          proteinGrams: generatedMacros.proteinGrams,
                          carbsGrams: generatedMacros.carbsGrams,
                          fatsGrams: generatedMacros.fatsGrams
                        });
                        soundService.playSuccess();
                      }
                    }}
                    className="px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-xs hover:bg-amber-400 flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Zapisz w Profilu
                  </button>
                )}
              </div>
              <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {generatedNutritionText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: ZAMIENNIKI ĆWICZEŃ (EXERCISE SWAPPER)               */}
      {/* ========================================================= */}
      {activeTab === 'exercise_swapper' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2 mb-3">
              <Repeat className="w-4 h-4 text-indigo-400" />
              Biomechaniczny Dobór Zamienników Ćwiczeń
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Nazwa Ćwiczenia:</label>
                <input
                  type="text"
                  value={swapExerciseName}
                  onChange={(e) => setSwapExerciseName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  placeholder="np. Wyciskanie sztangi..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Partia Mięśniowa:</label>
                <select
                  value={swapCategory}
                  onChange={(e) => setSwapCategory(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="klatka">Klatka Piersiowa</option>
                  <option value="plecy">Plecy</option>
                  <option value="barki">Barki</option>
                  <option value="nogi">Nogi</option>
                  <option value="biceps">Biceps</option>
                  <option value="triceps">Triceps</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Powód Zmiany:</label>
                <input
                  type="text"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  placeholder="np. Ból w stawie / brak sprzętu..."
                />
              </div>
            </div>

            <button
              disabled={isSwapping}
              onClick={handleSwapExerciseTab}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {isSwapping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
              Znajdź 3 Równorzędne Zamienniki Biomechaniczne
            </button>
          </div>

          {swapResultText && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-fadeIn">
              <h3 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 pb-2 border-b border-slate-800 mb-3">
                <Sparkles className="w-4 h-4" />
                Analiza Biomechaniczna & Zamienniki
              </h3>
              <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {swapResultText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: AUDYT ZDROWIA & KRWI                               */}
      {/* ========================================================= */}
      {activeTab === 'health_audit' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-purple-400" />
                Audytor Zdrowia, Biomarkerów Krwi & Regeneracji
              </h2>
              <span className="text-xs text-slate-400">
                Baza wyników: {bloodTests.length} wpisów
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              AI analizuje zarejestrowane badania laboratoryjne, parametry morfologiczne, enzymy wątrobowe ALT/AST, profil lipidowy oraz notatki kalendarza pod kątem bezpieczeństwa metabolicznego.
            </p>

            <button
              disabled={isAuditingHealth}
              onClick={handleRunHealthAudit}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 disabled:opacity-50"
            >
              {isAuditingHealth ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HeartPulse className="w-4 h-4" />}
              Uruchom Audyt Zdrowia Zawodnika
            </button>
          </div>

          {healthAuditText && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-fadeIn">
              <h3 className="text-xs font-bold text-purple-400 flex items-center gap-1.5 pb-2 border-b border-slate-800 mb-3">
                <Stethoscope className="w-4 h-4" />
                Kompleksowa Ocena Medyczno-Sportowa
              </h3>
              <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {healthAuditText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: PAMIĘĆ DŁUGOTERMINOWA AGENTA                       */}
      {/* ========================================================= */}
      {activeTab === 'memories' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              Pamięć Długoterminowa Agenta (Fakty, Cele, Kontuzje)
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Trener AI automatycznie pamięta te informacje we wszystkich kolejnych rozmowach i dopasowuje do nich obciążenia oraz zalecenia.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                placeholder="Dodaj fakt (np. 'Dyskomfort w lewym barku przy wyciskaniu powyżej 100kg')..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
              <select
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="goal">🎯 Cel Treningowy</option>
                <option value="injury">🩹 Przebyta Kontuzja</option>
                <option value="preference">⭐ Preferencja</option>
                <option value="record">🏆 Rekord Życiowy</option>
                <option value="general">📌 Ogólne</option>
              </select>
              <button
                onClick={handleSaveNewMemory}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Dodaj
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {agentMemories.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Brak zapisanych faktów pamięciowych. Dodaj pierwszy wpis powyżej.
              </div>
            ) : (
              agentMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs shrink-0 mt-0.5">
                      <Bookmark className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{mem.content}</p>
                      <span className="text-[10px] text-slate-400 uppercase font-bold mt-0.5 inline-block">
                        {mem.category} • {mem.createdAt}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
