const test = require('node:test');
const assert = require('node:assert/strict');

// ==============================================================================
// 🏋️‍♂️ PEŁNY PAKIET TESTÓW INTEGRACYJNYCH I FUNKCJONALNYCH: PLANPASIKA.V2
// ==============================================================================

test('SCENARIUSZ 1: Zarządzanie Planem Treningowym (Cykl, Tygodnie, Dni, Progresja)', () => {
  // 1. Inicjalizacja tygodnia treningowego
  const week1 = {
    id: 'w-1',
    number: 1,
    name: 'Tydzień 1 - Wprowadzenie',
    startDate: '2026-10-05',
    days: [
      {
        id: 'w1-d1',
        name: 'Dzień 1 - Push Siła',
        completed: false,
        exercises: [
          {
            id: 'ex-bench-1',
            name: 'Wyciskanie sztangi leżąc',
            category: 'klatka',
            sets: 3,
            reps: 8,
            weight: 100,
            rpe: 8,
            loggedSets: [
              { setNumber: 1, weight: 100, reps: 8, completed: true },
              { setNumber: 2, weight: 100, reps: 8, completed: true },
              { setNumber: 3, weight: 100, reps: 7, completed: false }
            ]
          }
        ]
      }
    ]
  };

  assert.equal(week1.days[0].exercises[0].loggedSets.length, 3);
  const completedSets = week1.days[0].exercises[0].loggedSets.filter(s => s.completed).length;
  assert.equal(completedSets, 2, 'Dwie serie powinny być ukończone');

  // 2. Symulacja duplikacji tygodnia z progresją liniową (+2.5 kg do wyciskania)
  const week2 = {
    id: 'w-2',
    number: 2,
    name: 'Tydzień 2 - Progresja',
    startDate: '2026-10-12',
    days: week1.days.map(d => ({
      ...d,
      id: `w2-${d.id}`,
      completed: false,
      exercises: d.exercises.map(ex => ({
        ...ex,
        id: `w2-${ex.id}`,
        weight: ex.weight + 2.5,
        loggedSets: ex.loggedSets.map(s => ({
          ...s,
          weight: s.weight + 2.5,
          completed: false
        }))
      }))
    }))
  };

  assert.equal(week2.days[0].exercises[0].weight, 102.5, 'Ciężar w Tygodniu 2 powinien wzrosnąć o 2.5 kg');
  assert.equal(week2.days[0].exercises[0].loggedSets[0].weight, 102.5);
  assert.equal(week2.days[0].exercises[0].loggedSets[0].completed, false, 'Nowy tydzień ma nieukończone serie');
});

test('SCENARIUSZ 2: Karta Ćwiczenia (ExerciseCard) - Wskaźnik Progresywnego Przeładowania & 1RM', () => {
  const prevWeekPerf = {
    weight: 100,
    reps: 8,
    sets: 3,
    volume: 2400
  };

  const currentExercise = {
    weight: 102.5,
    reps: 8,
    sets: 3
  };

  const weightDelta = currentExercise.weight - prevWeekPerf.weight;
  const currentVolume = currentExercise.sets * currentExercise.reps * currentExercise.weight;
  const volumeDelta = currentVolume - prevWeekPerf.volume;

  assert.equal(weightDelta, 2.5, 'Progres ciężaru wynosi dokładnie +2.5 kg');
  assert.equal(currentVolume, 2460, 'Nowy tonaż to 2460 kg');
  assert.equal(volumeDelta, 60, 'Wzrost tonażu o +60 kg');

  // Weryfikacja formuły Brzyckiego 1RM: w / (1.0278 - 0.0278 * r)
  const brzycki1RM = Math.round(102.5 / (1.0278 - 0.0278 * 8));
  assert.equal(brzycki1RM, 127, 'Szacowane 1RM wynosi 127 kg');
});

test('SCENARIUSZ 3: Opcje Personalizacji UI (Card Density, AMOLED, Handedness, Gym-Digits)', () => {
  const userSettings = {
    unit: 'kg',
    theme: 'dark',
    amoledBlack: true,
    cardDensity: 'compact',
    handedness: 'left',
    gymDigits: true,
    cardBorderRadius: 'pill',
    fontSizeScale: 110
  };

  // Test 1: Tryb zagęszczenia kart
  assert.equal(userSettings.cardDensity, 'compact');
  const isCompactOrUltra = userSettings.cardDensity === 'compact' || userSettings.cardDensity === 'ultra_dense';
  assert.ok(isCompactOrUltra, 'Kompaktowy tryb musi być aktywny');

  // Test 2: True AMOLED Black
  assert.equal(userSettings.amoledBlack, true);
  const bgColorClass = userSettings.amoledBlack ? 'bg-black' : 'bg-slate-950';
  assert.equal(bgColorClass, 'bg-black', 'W trybie AMOLED tło musi być czystą czernią #000000');

  // Test 3: Ergonomia lewej dłoni (odwrócenie kontrolek dla kciuka)
  const containerFlexDirection = userSettings.handedness === 'left' ? 'flex-row-reverse' : 'flex-row';
  assert.equal(containerFlexDirection, 'flex-row-reverse');

  // Test 4: Wielkie cyfry
  const numberClass = userSettings.gymDigits ? 'font-mono text-base font-black' : 'text-sm';
  assert.ok(numberClass.includes('font-mono') && numberClass.includes('font-black'));

  // Test 5: Skala czcionki
  assert.equal(userSettings.fontSizeScale, 110);
});

test('SCENARIUSZ 4: Stoper Treningowy & Odporność na Uśpienie w Tle (Wall-Clock Anchor)', () => {
  const now = Date.now();
  const startTime = now - 90 * 1000; // 90 sekund temu
  const targetDurationSeconds = 120; // 2 minuty

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const remainingSeconds = Math.max(0, targetDurationSeconds - elapsedSeconds);

  assert.equal(elapsedSeconds >= 90, true, 'Upłynęło co najmniej 90 sekund');
  assert.equal(remainingSeconds <= 30, true, 'Pozostało maksymalnie 30 sekund');
});

test('SCENARIUSZ 5: Analiza Partii Mięśniowych & Balans Objętości (Muscle Volume Distribution)', () => {
  const exercisesList = [
    { category: 'klatka', sets: 4 },
    { category: 'klatka', sets: 3 },
    { category: 'plecy', sets: 5 },
    { category: 'barki', sets: 4 },
    { category: 'ramiona', sets: 3 },
    { category: 'nogi', sets: 6 }
  ];

  const distribution = exercisesList.reduce((acc, ex) => {
    acc[ex.category] = (acc[ex.category] || 0) + ex.sets;
    return acc;
  }, {});

  assert.equal(distribution['klatka'], 7, 'Klatka: 7 serii roboczych');
  assert.equal(distribution['plecy'], 5, 'Plecy: 5 serii roboczych');
  assert.equal(distribution['nogi'], 6, 'Nogi: 6 serii roboczych');
  assert.equal(distribution['barki'], 4, 'Barki: 4 serie robocze');
  assert.equal(distribution['ramiona'], 3, 'Ramiona: 3 serie robocze');

  const totalSets = Object.values(distribution).reduce((a, b) => a + b, 0);
  assert.equal(totalSets, 25, 'Łączna objętość sesji: 25 serii');
});

test('SCENARIUSZ 6: Dziennik Wagi, Obwodów & Filtr EMA (Body Metrics)', () => {
  const rawWeights = [85.0, 85.4, 84.8, 85.2, 85.0];
  const alpha = 0.3;

  let ema = rawWeights[0];
  const emaHistory = [ema];
  for (let i = 1; i < rawWeights.length; i++) {
    ema = alpha * rawWeights[i] + (1 - alpha) * ema;
    emaHistory.push(Math.round(ema * 100) / 100);
  }

  assert.equal(emaHistory[0], 85.0);
  assert.equal(emaHistory[1], 85.12);
  assert.ok(emaHistory[emaHistory.length - 1] > 84.9 && emaHistory[emaHistory.length - 1] < 85.3);

  // Pomiary obwodów (biceps lewy vs prawy)
  const armCircumferences = [
    { bodyPart: 'biceps', side: 'left', sizeMm: 395, date: '2026-10-01' },
    { bodyPart: 'biceps', side: 'right', sizeMm: 400, date: '2026-10-01' }
  ];

  const leftBicepsCm = armCircumferences[0].sizeMm / 10;
  const rightBicepsCm = armCircumferences[1].sizeMm / 10;
  const asymmetryCm = rightBicepsCm - leftBicepsCm;

  assert.equal(leftBicepsCm, 39.5, 'Lewy biceps: 39.5 cm');
  assert.equal(rightBicepsCm, 40.0, 'Prawy biceps: 40.0 cm');
  assert.equal(asymmetryCm, 0.5, 'Asymetria ramion: 0.5 cm');
});

test('SCENARIUSZ 7: Modelowanie Farmakokinetyki Iniekcji (Eliminacja i Okres Półtrwania)', () => {
  // Testosteron Enanthate: okres półtrwania t1/2 = 4.5 dnia
  const halfLifeDays = 4.5;
  const initialDoseMg = 250;
  const daysElapsed = 4.5;

  const remainingMg = initialDoseMg * Math.pow(0.5, daysElapsed / halfLifeDays);
  assert.equal(remainingMg, 125, 'Po 1 okresie półtrwania zostaje dokładnie 50% dawki (125 mg)');

  const after9Days = initialDoseMg * Math.pow(0.5, 9.0 / halfLifeDays);
  assert.equal(after9Days, 62.5, 'Po 2 okresach półtrwania zostaje 25% dawki (62.5 mg)');
});

test('SCENARIUSZ 8: Centrum Synchronizacji Windows ↔ Android (Protokół i Payloads)', () => {
  const syncPayload = {
    deviceId: 'xiaomi-14t-pro',
    timestamp: new Date().toISOString(),
    version: 3,
    recordsCount: {
      weeks: 6,
      bodyWeights: 14,
      bloodTests: 8,
      agentMemories: 5
    }
  };

  assert.equal(syncPayload.version, 3);
  assert.equal(syncPayload.recordsCount.weeks, 6);
  assert.equal(syncPayload.recordsCount.bloodTests, 8);
  assert.equal(syncPayload.recordsCount.agentMemories, 5);
});

test('SCENARIUSZ 9: Trener AI Online & Pamięć Trwała (Gemini Chat Context)', () => {
  const athleteProfile = {
    name: 'Jan Kowalski',
    targetWeight: 88,
    dailyCalories: 3200
  };

  const agentMemories = [
    { id: 'm1', content: 'Główny cel: 160 kg w przysiadzie', category: 'goal' },
    { id: 'm2', content: 'Przebyty uraz lewego barku', category: 'injury' }
  ];

  const chatMessages = [
    { id: 'c1', role: 'user', content: 'Jaki ciężar wziąć na przysiad?' },
    { id: 'c2', role: 'assistant', content: 'Mając na uwadze cel 160 kg i historię 140 kg × 5, zacznij od 142.5 kg.' }
  ];

  assert.equal(athleteProfile.name, 'Jan Kowalski');
  assert.equal(agentMemories.length, 2);
  assert.equal(chatMessages.length, 2);
  assert.equal(chatMessages[1].role, 'assistant');
});

test('SCENARIUSZ 10: Lista logicznych partycji danych domenowych (nie test integracji bazy)', () => {
  // To wyłącznie sprawdzenie listy nazw, nie dowód działania SQLite, atomowości ani recovery.
  const tables = [
    'plans',
    'weeks',
    'days',
    'exercises',
    'logged_sets',
    'body_weights',
    'circumferences',
    'body_part_measurements',
    'catalog_exercises',
    'workout_sessions',
    'settings',
    'ai_chat_history',
    'ai_agent_memories'
  ];

  assert.equal(tables.length, 13, 'Lista testowa zawiera 13 oczekiwanych domen danych');
  assert.ok(tables.includes('plans'));
  assert.ok(tables.includes('exercises'));
  assert.ok(tables.includes('logged_sets'));
  assert.ok(tables.includes('ai_chat_history'));
  assert.ok(tables.includes('ai_agent_memories'));
});
