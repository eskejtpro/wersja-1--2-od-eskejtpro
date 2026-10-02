import { 
  TrainingWeek, 
  TrainingDay, 
  Exercise, 
  BodyWeightEntry, 
  ProtocolEntry, 
  CalendarDayNote, 
  UserProfile, 
  AppSettings,
  AiAgentAction,
  CircumferenceEntry,
  BodyPartMeasurement,
  CatalogExercise
} from '../types';

export interface AiActionCallbacks {
  onAddExercise?: (weekId: string, dayId: string, exerciseData: Omit<Exercise, 'id'>) => void;
  onModifyExercise?: (exerciseName: string, updates: Partial<Exercise>) => void;
  onDeleteExercise?: (exerciseIdOrName: string) => void;
  onAddTrainingDay?: (weekId: string, dayName: string, exercises?: Exercise[]) => void;
  onAddTrainingWeek?: (weekName?: string) => void;
  onAddBodyWeight?: (entry: Omit<BodyWeightEntry, 'id'>) => void;
  onAddCircumference?: (entry: Omit<CircumferenceEntry, 'id'>) => void;
  onAddBodyMeasurement?: (entry: Omit<BodyPartMeasurement, 'id'>) => void;
  onAddProtocolEntry?: (entry: Omit<ProtocolEntry, 'id'>) => void;
  onAddCalendarNote?: (note: Omit<CalendarDayNote, 'id' | 'createdAt'>) => void;
  onAddBloodTest?: (test: { testName: string; value: number | string; unit?: string; minNormal?: number; maxNormal?: number; date?: string; notes?: string }) => void;
  onUpdateProfile?: (profile: Partial<UserProfile>) => void;
  onUpdateNutritionMacros?: (macros: { dailyCalories?: number; proteinGrams?: number; carbsGrams?: number; fatsGrams?: number }) => void;
  onUpdateSettings?: (settings: Partial<AppSettings>) => void;
  onUpdateWeeks?: (weeks: TrainingWeek[]) => void;
  onCreateBackup?: (reason?: string) => void;
  onSaveAgentMemory?: (memory: { content: string; category?: 'goal' | 'injury' | 'preference' | 'record' | 'general' }) => void;
  onAddCatalogExercise?: (exercise: Omit<CatalogExercise, 'id'>) => void;
}

/**
 * Extracts explicit JSON action blocks (single or multiple) or heuristically detects intents from AI/User conversation
 */
export function parseAiResponseAction(rawContent: string, userPrompt: string = ''): { 
  cleanContent: string; 
  action?: AiAgentAction;
  actions?: AiAgentAction[];
} {
  // 1. Check for explicit JSON blocks ```json:actions or ```json:action or ```action
  const multiActionBlockRegex = /```(?:json:actions|actions)\s*([\s\S]*?)\s*```/i;
  const singleActionBlockRegex = /```(?:json:action|action)\s*([\s\S]*?)\s*```/i;

  const multiMatch = rawContent.match(multiActionBlockRegex);
  if (multiMatch) {
    try {
      const parsedList = JSON.parse(multiMatch[1]);
      if (Array.isArray(parsedList) && parsedList.length > 0) {
        const cleanContent = rawContent.replace(multiActionBlockRegex, '').trim();
        const actions: AiAgentAction[] = parsedList.map((item, idx) => ({
          id: `act-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          type: item.type,
          title: item.title || getActionDefaultTitle(item.type),
          description: item.description || 'Autonomiczna akcja Trenera AI',
          payload: item.payload || {},
          status: 'pending'
        }));
        return { cleanContent, actions, action: actions[0] };
      }
    } catch (e) {
      console.warn('Failed to parse AI multi-actions JSON block:', e);
    }
  }

  const singleMatch = rawContent.match(singleActionBlockRegex);
  if (singleMatch) {
    try {
      const parsed = JSON.parse(singleMatch[1]);
      if (parsed && parsed.type) {
        const cleanContent = rawContent.replace(singleActionBlockRegex, '').trim();
        const action: AiAgentAction = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: parsed.type,
          title: parsed.title || getActionDefaultTitle(parsed.type),
          description: parsed.description || 'Akcja wygenerowana przez Trenera AI',
          payload: parsed.payload || {},
          status: 'pending'
        };
        return { cleanContent, action, actions: [action] };
      }
    } catch (e) {
      console.warn('Failed to parse AI single-action JSON block:', e);
    }
  }

  // 2. Heuristic Intent Detection based on user prompt & response
  const promptLower = userPrompt.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];
  const detectedActions: AiAgentAction[] = [];

  // A. Intent: Log Body Weight (np. "zapisz wagę 84.5", "moja waga to 82kg")
  const weightMatch = promptLower.match(/(?:zapisz|dodaj|moja)?\s*(?:wag[aęe]|wa[zż]ę)\s*(?:to|dzisiaj|rano)?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg)?/i) ||
                      promptLower.match(/([0-9]{2,3}(?:[.,][0-9]+)?)\s*kg\s*(?:na czczo|dzisiaj|rano)?/i);
  if (weightMatch && !promptLower.includes('wyciskan') && !promptLower.includes('przysiad') && !promptLower.includes('martwy') && !promptLower.includes('wiosłowan')) {
    const numWeight = parseFloat(weightMatch[1].replace(',', '.'));
    if (numWeight >= 30 && numWeight <= 300) {
      detectedActions.push({
        id: `act-weight-${Date.now()}`,
        type: 'LOG_BODY_WEIGHT',
        title: 'Zapisz Wagę Ciała',
        description: `Zapisz ${numWeight} kg w rejestrze wagi ciała na dzień ${todayStr}`,
        payload: {
          weight: numWeight,
          date: todayStr,
          notes: promptLower.includes('czczo') ? 'Pomiary poranne na czczo' : 'Wpis z czatu AI',
          timeOfDay: promptLower.includes('czczo') ? 'morning_fasted' : 'evening'
        },
        status: 'pending'
      });
    }
  }

  // B. Intent: Log Circumference (np. "biceps 42cm", "obwód pasa 84.5cm", "udo 63cm", "klatka 115cm")
  const circMatch = promptLower.match(/(?:obw[oó]d|zapisz)?\s*(biceps|ramię|ramie|klatka|pas|talia|biodra|udo|łydka|lydka|przedramię|przedramie)\s*(?:to|:)?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:cm)?/i);
  if (circMatch) {
    const rawPart = circMatch[1].toLowerCase();
    const value = parseFloat(circMatch[2].replace(',', '.'));
    const partMap: Record<string, string> = {
      'biceps': 'biceps',
      'ramię': 'biceps',
      'ramie': 'biceps',
      'klatka': 'klatka',
      'pas': 'pas',
      'talia': 'pas',
      'biodra': 'biodra',
      'udo': 'udo',
      'łydka': 'lydka',
      'lydka': 'lydka',
      'przedramię': 'przedramie',
      'przedramie': 'przedramie'
    };
    const partKey = partMap[rawPart] || 'biceps';
    detectedActions.push({
      id: `act-circ-${Date.now()}`,
      type: 'LOG_CIRCUMFERENCE',
      title: `Zapisz Obwód (${rawPart})`,
      description: `Zarejestruj pomiar obwodu: ${rawPart} = ${value} cm na dzień ${todayStr}`,
      payload: {
        part: partKey,
        partName: rawPart.toUpperCase(),
        value,
        date: todayStr,
        notes: 'Pomiar zarejestrowany przez Asystenta AI'
      },
      status: 'pending'
    });
  }

  // C. Intent: Add Protocol Dose (np. "zapisz testosteron 250mg", "dopisz iniekcję HCG 500iu")
  const doseMatch = promptLower.match(/(?:zapisz|dodaj|dopisz)?\s*(?:podanie|iniekcj[aę])?\s*([a-zA-Ząćęłńóśźż\s]+?)\s+([0-9]+(?:[.,][0-9]+)?)\s*(mg|iu|mcg|ml)/i);
  if (doseMatch) {
    const substanceName = doseMatch[1].replace(/^(?:zapisz|dodaj|dopisz|podanie|iniekcj[aę])\s+/i, '').trim();
    const dosage = parseFloat(doseMatch[2].replace(',', '.'));
    const unit = doseMatch[3].toLowerCase() === 'iu' ? 'IU' : (doseMatch[3].toLowerCase() as any);
    detectedActions.push({
      id: `act-dose-${Date.now()}`,
      type: 'ADD_PROTOCOL_DOSE',
      title: 'Zapisz Dawkę w Kalendarzu',
      description: `Zarejestruj podanie: ${substanceName} ${dosage}${unit} w kalendarzu na dzień ${todayStr}`,
      payload: {
        substance: substanceName,
        dosage,
        unit,
        date: todayStr,
        route: 'IM',
        color: 'emerald'
      },
      status: 'pending'
    });
  }

  // D. Intent: Add Note to Calendar (np. "dodaj notatkę: badania krwi w piątek", "zapisz przypomnienie...")
  if (promptLower.startsWith('dodaj notatk') || promptLower.startsWith('zapisz notatk') || promptLower.startsWith('przypomnienie')) {
    const content = userPrompt.replace(/^(?:dodaj|zapisz)\s+notatk[ęe]\s*(?::|-)?\s*/i, '').trim();
    if (content.length > 3) {
      detectedActions.push({
        id: `act-note-${Date.now()}`,
        type: 'ADD_CALENDAR_NOTE',
        title: 'Dodaj Notatkę do Kalendarza',
        description: `Zapisz notatkę: "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}" na dzień ${todayStr}`,
        payload: {
          title: content.slice(0, 30),
          content,
          date: todayStr,
          category: content.toLowerCase().includes('krew') || content.toLowerCase().includes('badan') ? 'bloodwork' : 'general',
          color: 'amber'
        },
        status: 'pending'
      });
    }
  }

  // E. Intent: Apply Progressive Overload (np. "zastosuj progresję", "zwiększ ciężary o 2.5kg")
  if (promptLower.includes('progresj') || (promptLower.includes('zwiększ') && promptLower.includes('ciężar'))) {
    const incMatch = promptLower.match(/([0-9]+(?:[.,][0-9]+)?)\s*kg/i);
    const inc = incMatch ? parseFloat(incMatch[1].replace(',', '.')) : 2.5;
    detectedActions.push({
      id: `act-prog-${Date.now()}`,
      type: 'APPLY_PROGRESSION',
      title: `Zastosuj Progresję Siłową (+${inc} kg)`,
      description: `Automatycznie zwiększ ciężar roboczy we wszystkich zaplanowanych ćwiczeniach o +${inc} kg`,
      payload: {
        incrementKg: inc
      },
      status: 'pending'
    });
  }

  // F. Intent: Create Deload Week (np. "zaplanuj deload", "zrób tydzień deloadu", "lżejszy tydzień")
  if (promptLower.includes('deload') || promptLower.includes('roztrenowanie') || promptLower.includes('lżejszy tydzień')) {
    detectedActions.push({
      id: `act-deload-${Date.now()}`,
      type: 'CREATE_DELOAD_WEEK',
      title: 'Zaplanuj Tydzień Deloadu',
      description: 'Zredukuj objętość serii o 40% i obciążenie o 10% dla pełnej resensytyzacji OUN',
      payload: {
        volumeReductionPct: 40,
        intensityReductionPct: 10
      },
      status: 'pending'
    });
  }

  // G. Intent: Macro & Nutrition Update (np. "ustaw dietę 3000 kcal 200g białka", "makro 3200 kcal")
  const kcalMatch = promptLower.match(/([0-9]{3,4})\s*(?:kcal|kalorii)/i);
  const proteinMatch = promptLower.match(/([0-9]{2,3})\s*(?:g|gram[oó]w)?\s*bia[łl]ka/i);
  if (kcalMatch || proteinMatch) {
    const kcal = kcalMatch ? parseInt(kcalMatch[1], 10) : 3000;
    const protein = proteinMatch ? parseInt(proteinMatch[1], 10) : 180;
    const fats = Math.round((kcal * 0.25) / 9);
    const carbs = Math.max(100, Math.round((kcal - (protein * 4 + fats * 9)) / 4));
    detectedActions.push({
      id: `act-macro-${Date.now()}`,
      type: 'UPDATE_NUTRITION_MACROS',
      title: `Ustaw Makroskładniki (${kcal} kcal)`,
      description: `Zaktualizuj cele żywieniowe w profilu: ${kcal} kcal | B: ${protein}g | W: ${carbs}g | T: ${fats}g`,
      payload: {
        dailyCalories: kcal,
        proteinGrams: protein,
        carbsGrams: carbs,
        fatsGrams: fats
      },
      status: 'pending'
    });
  }

  // H. Intent: Quick Backup
  if (promptLower.includes('kopia') || promptLower.includes('backup') || promptLower.includes('zapisz kopię')) {
    detectedActions.push({
      id: `act-backup-${Date.now()}`,
      type: 'CREATE_BACKUP',
      title: 'Wykonaj Kopię Bezpieczeństwa',
      description: 'Utwórz natychmiastowy bezpieczny zrzut bazy danych aplikacji w pamięci trwałej',
      payload: {
        triggerReason: 'ai_assistant_command'
      },
      status: 'pending'
    });
  }

  // I. Intent: Add Exercise (np. "dodaj ćwiczenie wyciskanie sztangi 4x8 90kg")
  const exerciseAddMatch = promptLower.match(/(?:dodaj|dopisz|wstaw)\s+ćwiczenie\s+([a-zA-Ząćęłńóśźż\s]+?)\s+([0-9]+)\s*[xX*]\s*([0-9]+)\s*(?:([0-9]+(?:[.,][0-9]+)?)\s*kg)?/i);
  if (exerciseAddMatch) {
    const name = exerciseAddMatch[1].trim();
    const sets = parseInt(exerciseAddMatch[2], 10);
    const reps = parseInt(exerciseAddMatch[3], 10);
    const weight = exerciseAddMatch[4] ? parseFloat(exerciseAddMatch[4].replace(',', '.')) : 50;
    detectedActions.push({
      id: `act-ex-add-${Date.now()}`,
      type: 'ADD_EXERCISE',
      title: `Dodaj Ćwiczenie: ${name}`,
      description: `Wstaw ${name} (${sets} serie x ${reps} powtórzeń, ${weight} kg) do bieżącego treningu`,
      payload: {
        name,
        sets,
        reps,
        weight,
        rpe: 8,
        category: deduceCategoryFromName(name)
      },
      status: 'pending'
    });
  }

  if (detectedActions.length > 0) {
    return {
      cleanContent: rawContent,
      actions: detectedActions,
      action: detectedActions[0]
    };
  }

  return { cleanContent: rawContent };
}

function deduceCategoryFromName(name: string): 'klatka' | 'plecy' | 'biceps' | 'triceps' | 'barki' | 'nogi' {
  const n = name.toLowerCase();
  if (n.includes('wycisk') || n.includes('klat') || n.includes('rozpięt') || n.includes('bench') || n.includes('dip') || n.includes('chest')) return 'klatka';
  if (n.includes('wiosł') || n.includes('drążk') || n.includes('ściąg') || n.includes('plec') || n.includes('martwy') || n.includes('pull') || n.includes('row')) return 'plecy';
  if (n.includes('bic') || n.includes('uginan') || n.includes('modlitew') || n.includes('curl')) return 'biceps';
  if (n.includes('tric') || n.includes('francusk') || n.includes('prostowan') || n.includes('czach') || n.includes('pushdown')) return 'triceps';
  if (n.includes('bark') || n.includes('żołniers') || n.includes('wznos') || n.includes('ohp') || n.includes('face pull') || n.includes('shoulder')) return 'barki';
  return 'nogi';
}

function getActionDefaultTitle(type: AiAgentAction['type']): string {
  switch (type) {
    case 'ADD_EXERCISE': return 'Dodaj Ćwiczenie do Planu';
    case 'MODIFY_EXERCISE': return 'Zaktualizuj Parametry Ćwiczenia';
    case 'DELETE_EXERCISE': return 'Usuń Ćwiczenie z Planu';
    case 'ADD_TRAINING_DAY': return 'Dodaj Dzień Treningowy';
    case 'ADD_TRAINING_WEEK': return 'Dodaj Nowy Tydzień Cyklu';
    case 'LOG_BODY_WEIGHT': return 'Zapisz Wagę Ciała';
    case 'LOG_CIRCUMFERENCE': return 'Zapisz Pomiar Obwodu';
    case 'LOG_BODY_MEASUREMENT': return 'Zapisz Wymiary Sylwetki';
    case 'ADD_PROTOCOL_DOSE': return 'Zarejestruj Podanie w Cyklu';
    case 'ADD_CALENDAR_NOTE': return 'Zapisz Notatkę Kalendarza';
    case 'ADD_BLOOD_TEST': return 'Zarejestruj Wynik Badania Krwi';
    case 'APPLY_PROGRESSION': return 'Zastosuj Progresję Przeciążenia';
    case 'CREATE_DELOAD_WEEK': return 'Zaplanuj Tydzień Deloadu';
    case 'UPDATE_PROFILE': return 'Zaktualizuj Profil Zawodnika';
    case 'UPDATE_NUTRITION_MACROS': return 'Ustaw Makroskładniki Diety';
    case 'ADD_PERSONAL_RECORD': return 'Zapisz Rekord Życiowy (PR)';
    case 'SAVE_AI_MEMORY': return 'Zapisz Fakt w Pamięci Agenta';
    case 'INSTALL_MESOCYCLE_PLAN': return 'Zainstaluj Nowy Plan Treningowy';
    case 'CREATE_BACKUP': return 'Wykonaj Kopię Bezpieczeństwa';
    case 'UPDATE_SETTINGS': return 'Zaktualizuj Ustawienia Aplikacji';
    case 'BATCH_ACTIONS': return 'Wykonaj Pakiet Akcji Trenera AI';
    default: return 'Wykonaj Akcję w Aplikacji';
  }
}

/**
 * Generates a full structured multi-week training mesocycle (PPL, Upper/Lower, FBW, Arnold Split)
 */
export function generateStructuredMesocycle(
  goal: 'hypertrophy' | 'strength' | 'recomp' | 'deload' = 'hypertrophy',
  split: 'ppl' | 'upper_lower' | 'full_body' = 'ppl',
  daysPerWeek: number = 4,
  weeksCount: number = 4
): TrainingWeek[] {
  const weeks: TrainingWeek[] = [];

  const pplTemplates = [
    {
      name: 'Dzień 1: Push (Klatka, Barki, Triceps)',
      exercises: [
        { name: 'Wyciskanie sztangi na ławce poziomej', category: 'klatka' as const, sets: 4, reps: 6, weight: 80, rpe: 8 },
        { name: 'Wyciskanie hantli na skosie dodatnim 30°', category: 'klatka' as const, sets: 3, reps: 8, weight: 28, rpe: 8 },
        { name: 'Wznosy hantli bokiem (boczny akton barku)', category: 'barki' as const, sets: 4, reps: 12, weight: 12, rpe: 9 },
        { name: 'Wyciskanie francuskie ze sztangą łamaną', category: 'triceps' as const, sets: 3, reps: 10, weight: 35, rpe: 8 },
        { name: 'Prostowanie ramion na wyciągu (sznur)', category: 'triceps' as const, sets: 3, reps: 12, weight: 25, rpe: 9 },
      ]
    },
    {
      name: 'Dzień 2: Pull (Plecy, Tył Barku, Biceps)',
      exercises: [
        { name: 'Wiosłowanie sztangą w opadzie tułowia', category: 'plecy' as const, sets: 4, reps: 6, weight: 85, rpe: 8 },
        { name: 'Ściąganie drążka wyciągu pionowego', category: 'plecy' as const, sets: 3, reps: 8, weight: 70, rpe: 8 },
        { name: 'Face Pulls na bramie z linką', category: 'barki' as const, sets: 4, reps: 15, weight: 20, rpe: 8 },
        { name: 'Uginanie przedramion ze sztangą prostą', category: 'biceps' as const, sets: 3, reps: 8, weight: 35, rpe: 8 },
        { name: 'Uginanie przedramion z hantlami z supinacją', category: 'biceps' as const, sets: 3, reps: 10, weight: 14, rpe: 9 },
      ]
    },
    {
      name: 'Dzień 3: Legs (Nogi & Łydki)',
      exercises: [
        { name: 'Przysiad ze sztangą na plecach (Back Squat)', category: 'nogi' as const, sets: 4, reps: 6, weight: 110, rpe: 8 },
        { name: 'Rumuński Martwy Ciąg z hantlami (RDL)', category: 'nogi' as const, sets: 3, reps: 8, weight: 36, rpe: 8 },
        { name: 'Wypychanie nóg na suwnicy skośnej', category: 'nogi' as const, sets: 3, reps: 10, weight: 180, rpe: 8 },
        { name: 'Uginanie nóg leżąc na maszynie', category: 'nogi' as const, sets: 3, reps: 12, weight: 50, rpe: 9 },
        { name: 'Wspięcia na palce stojąc', category: 'nogi' as const, sets: 4, reps: 15, weight: 70, rpe: 9 },
      ]
    },
    {
      name: 'Dzień 4: Upper Power (Góra Hipertrofia)',
      exercises: [
        { name: 'Wyciskanie żołnierskie nad głowę (OHP)', category: 'barki' as const, sets: 4, reps: 6, weight: 55, rpe: 8 },
        { name: 'Podciąganie na drążku z ciężarem', category: 'plecy' as const, sets: 3, reps: 6, weight: 10, rpe: 8 },
        { name: 'Dipsy na poręczach z obciążeniem', category: 'klatka' as const, sets: 3, reps: 8, weight: 15, rpe: 8 },
        { name: 'Wznosy hantli w opadzie tułowia', category: 'barki' as const, sets: 3, reps: 12, weight: 10, rpe: 9 },
        { name: 'Uginanie przedramion na modlitewniku', category: 'biceps' as const, sets: 3, reps: 10, weight: 30, rpe: 9 },
      ]
    },
    {
      name: 'Dzień 5: Lower Quad Focus (Nogi Czworogłowe & Pośladki)',
      exercises: [
        { name: 'Przysiad przedni (Front Squat)', category: 'nogi' as const, sets: 4, reps: 8, weight: 80, rpe: 8 },
        { name: 'Hack Przysiad na maszynie', category: 'nogi' as const, sets: 3, reps: 10, weight: 100, rpe: 8 },
        { name: 'Wykroki chodzone z hantlami', category: 'nogi' as const, sets: 3, reps: 12, weight: 20, rpe: 9 },
        { name: 'Wyprosty nóg na maszynie siedząc', category: 'nogi' as const, sets: 4, reps: 15, weight: 55, rpe: 9 },
      ]
    }
  ];

  const today = new Date();

  for (let w = 1; w <= weeksCount; w++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + (w - 1) * 7);
    const startDateStr = weekStart.toISOString().split('T')[0];

    // Weight progression per week: +2.5kg on compounds
    const weekOverload = goal === 'deload' ? -10 : (w - 1) * 2.5;

    const days: TrainingDay[] = pplTemplates.slice(0, Math.min(daysPerWeek, pplTemplates.length)).map((tpl, dIdx) => {
      const exercises: Exercise[] = tpl.exercises.map((ex, exIdx) => {
        const calculatedWeight = Math.max(10, Math.round((ex.weight + weekOverload) * 10) / 10);
        const calculatedSets = goal === 'deload' ? Math.max(2, ex.sets - 1) : ex.sets;
        return {
          id: `ex-w${w}-d${dIdx + 1}-${exIdx + 1}`,
          name: ex.name,
          category: ex.category,
          sets: calculatedSets,
          reps: ex.reps,
          weight: calculatedWeight,
          goalWeight: Math.round((ex.weight + (weeksCount * 2.5)) * 10) / 10,
          rpe: goal === 'deload' ? Math.max(6, ex.rpe - 2) : ex.rpe,
          notes: goal === 'deload' ? `Tydzień ${w} (Deload): RIR 3-4, regeneracja` : `Tydzień ${w}: Tempo 2-0-1-0, RIR 1-2`,
          history: []
        };
      });

      return {
        id: `w${w}-d${dIdx + 1}`,
        name: tpl.name,
        completed: false,
        exercises
      };
    });

    weeks.push({
      id: `week-${w}`,
      number: w,
      name: `Tydzień ${w} (${goal === 'deload' ? 'Deload & Regeneracja' : w === weeksCount ? 'Finał / Peak' : 'Akumulacja'})`,
      startDate: startDateStr,
      days
    });
  }

  return weeks;
}

/**
 * Applies progressive overload increment to all exercises in current weeks
 */
export function applyProgressionOverload(
  weeks: TrainingWeek[], 
  incrementKg: number = 2.5,
  targetCategory?: string
): TrainingWeek[] {
  return weeks.map(week => ({
    ...week,
    days: week.days.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => {
        const matchesCategory = !targetCategory || targetCategory === 'all' || ex.category === targetCategory;
        if (!matchesCategory) return ex;

        const newWeight = Math.round((ex.weight + incrementKg) * 10) / 10;
        return {
          ...ex,
          weight: newWeight,
          goalWeight: ex.goalWeight ? Math.round((ex.goalWeight + incrementKg) * 10) / 10 : undefined,
          notes: ex.notes ? `${ex.notes} [Progresja +${incrementKg}kg]` : `Progresja +${incrementKg}kg`
        };
      })
    }))
  }));
}

/**
 * Creates a Deload Week from an existing week by reducing volume by 40% and intensity by 10%
 */
export function createDeloadWeek(
  baseWeek: TrainingWeek, 
  newWeekNumber: number,
  volumeReductionPct: number = 40,
  intensityReductionPct: number = 10
): TrainingWeek {
  const newWeekId = `week-${Date.now()}`;
  return {
    id: newWeekId,
    number: newWeekNumber,
    name: `Tydzień ${newWeekNumber} - Planowany Deload & Regeneracja OUN`,
    startDate: new Date().toISOString().split('T')[0],
    days: baseWeek.days.map((day, dIdx) => ({
      id: `${newWeekId}-d${dIdx + 1}`,
      name: `${day.name} (Deload)`,
      completed: false,
      exercises: day.exercises.map((ex, exIdx) => {
        const reducedSets = Math.max(2, Math.round(ex.sets * (1 - volumeReductionPct / 100)));
        const reducedWeight = Math.max(10, Math.round(ex.weight * (1 - intensityReductionPct / 100) * 2) / 2);
        return {
          ...ex,
          id: `ex-${newWeekId}-d${dIdx + 1}-${exIdx + 1}`,
          sets: reducedSets,
          weight: reducedWeight,
          rpe: Math.max(5, (ex.rpe || 8) - 2),
          notes: `Deload: Objętość -${volumeReductionPct}%, Ciężar -${intensityReductionPct}%, RIR 3-4`
        };
      })
    }))
  };
}
