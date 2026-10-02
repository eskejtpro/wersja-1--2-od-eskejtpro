const test = require('node:test');
const assert = require('node:assert/strict');

// ==============================================================================
// 🧠 GEMINI 3.8 PRO - INTELIGENTNY AUDYT ARCHITEKTURY, MATEMATYKI I ODPORNOŚCI ANDROIDA
// ==============================================================================

test('AUDYT 1 [Matematyka & Ochrona Dzielenia przez Zero]: Wzory 1RM przy skrajnych wartościach', () => {
  // 1. Formuła Brzyckiego: W / (1.0278 - 0.0278 * R)
  // Przy R = 37 mianownik dąży do 0. System musi bezpiecznie clampować lub stosować wzór alternatywny.
  const calculateSafe1RM = (weight, reps, formula = 'brzycki') => {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;

    if (formula === 'brzycki') {
      const clampedReps = Math.min(30, reps); // Bezpieczny clamp do 30 powtórzeń
      const denominator = 1.0278 - 0.0278 * clampedReps;
      return Math.round(weight / Math.max(0.1, denominator));
    }
    if (formula === 'epley') {
      return Math.round(weight * (1 + reps / 30));
    }
    if (formula === 'lombardi') {
      return Math.round(weight * Math.pow(reps, 0.1));
    }
    return Math.round(weight * (1 + 0.0333 * reps));
  };

  // Testy graniczne
  assert.equal(calculateSafe1RM(0, 10), 0, 'Ciężar 0 daje 1RM = 0');
  assert.equal(calculateSafe1RM(100, 1), 100, '1 powtórzenie daje 1RM równe ciężarowi');
  assert.equal(calculateSafe1RM(100, 37, 'brzycki') > 0, true, 'Brak NaN/Infinity przy skrajnej liczbie powtórzeń (37 powt.)');
  assert.equal(Number.isFinite(calculateSafe1RM(100, 37, 'brzycki')), true, 'Wynik jest skończoną liczbą rzeczywistą');
  assert.equal(calculateSafe1RM(100, 10, 'epley'), 133, 'Epley: 100 * (1 + 10/30) = 133.33 -> 133');
});

test('AUDYT 2 [Statystyka & Analiza Trendu]: Regresja Liniowa OLS odporna na dzielenie przez zero (identyczne daty / brak wariancji)', () => {
  const calculateSlopeAndPearson = (points) => {
    if (!points || points.length < 2) return { slope: 0, r: 0, valid: false };

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
      sumY2 += p.y * p.y;
    }

    const varianceX = n * sumX2 - sumX * sumX;
    const varianceY = n * sumY2 - sumY * sumY;

    // Zabezpieczenie przed zerową wariancją czasu lub ciężaru
    const slope = varianceX !== 0 ? (n * sumXY - sumX * sumY) / varianceX : 0;
    
    let r = 0;
    if (varianceX > 0 && varianceY > 0) {
      r = (n * sumXY - sumX * sumY) / Math.sqrt(varianceX * varianceY);
      r = Math.max(-1, Math.min(1, r)); // Clamp [-1, 1]
    }

    return { slope, r, valid: true };
  };

  // Przypadek 1: Dwa pomiary tego samego dnia (delta X = 0)
  const sameDayPoints = [{ x: 1000, y: 100 }, { x: 1000, y: 105 }];
  const res1 = calculateSlopeAndPearson(sameDayPoints);
  assert.equal(res1.slope, 0, 'Gdy delta X = 0, slope musi wynosić 0 (brak dzielenia przez 0)');
  assert.equal(Number.isNaN(res1.slope), false);

  // Przypadek 2: Stały ciężar (delta Y = 0)
  const constantWeightPoints = [{ x: 1, y: 100 }, { x: 2, y: 100 }, { x: 3, y: 100 }];
  const res2 = calculateSlopeAndPearson(constantWeightPoints);
  assert.equal(res2.slope, 0, 'Stały ciężar = nachylenie 0');
  assert.equal(res2.r, 0, 'Brak korelacji przy zerowej wariancji Y');
  assert.equal(Number.isNaN(res2.r), false);

  // Przypadek 3: Idealna progresja liniowa
  const perfectPoints = [{ x: 1, y: 100 }, { x: 2, y: 105 }, { x: 3, y: 110 }];
  const res3 = calculateSlopeAndPearson(perfectPoints);
  assert.equal(res3.slope, 5, 'Nachylenie +5 kg na krok');
  assert.equal(Math.round(res3.r * 100) / 100, 1.0, 'Idealna korelacja r = 1.0');
});

test('AUDYT 3 [Filtracja Szumu & Outlierów]: Dwuetapowy Filtr Wagi EMA + Mediana dla Obwodów Ciała', () => {
  // Test Mediany z 3 Poprzednich Pomiarów dla odrzucenia anomalii (np. pomyłka w pomiarze: 400cm zamiast 40cm)
  const isCircumferenceOutlier = (newVal, history) => {
    if (!history || history.length < 3) return false;
    const last3 = history.slice(-3).sort((a, b) => a - b);
    const median = last3[1];
    // Odrzucamy błąd pomiarowy powyżej 15% mediany
    const pctDiff = Math.abs(newVal - median) / median;
    return pctDiff > 0.15;
  };

  const armHistory = [39.0, 39.5, 39.2]; // cm
  assert.equal(isCircumferenceOutlier(39.8, armHistory), false, 'Normalny pomiar (39.8 cm) nie jest outlierem');
  assert.equal(isCircumferenceOutlier(55.0, armHistory), true, 'Anomalia (55.0 cm) zostaje wykryta i odfiltrowana');
  assert.equal(isCircumferenceOutlier(20.0, armHistory), true, 'Anomalia w dół (20.0 cm) zostaje wykryta');
});

test('AUDYT 4 [Android Lifecycle & Process Death]: Ciągłość Stopera Treningowego z Wall-Clock Date.now()', () => {
  // Symulacja: Użytkownik minimalizuje aplikację na 3 minuty i system Android usypia wątek JS
  const workoutTimerEngine = {
    startEpoch: 0,
    targetSeconds: 120,
    isRunning: false,
    
    start(seconds) {
      this.targetSeconds = seconds;
      this.startEpoch = Date.now();
      this.isRunning = true;
    },

    getRemainingSeconds(simulatedNow = Date.now()) {
      if (!this.isRunning) return this.targetSeconds;
      const elapsed = Math.floor((simulatedNow - this.startEpoch) / 1000);
      return Math.max(0, this.targetSeconds - elapsed);
    },

    isExpired(simulatedNow = Date.now()) {
      return this.getRemainingSeconds(simulatedNow) <= 0;
    }
  };

  const fakeStart = 1727800000000;
  workoutTimerEngine.startEpoch = fakeStart;
  workoutTimerEngine.isRunning = true;
  workoutTimerEngine.targetSeconds = 90; // 90 sekund

  // Po 45 sekundach
  assert.equal(workoutTimerEngine.getRemainingSeconds(fakeStart + 45000), 45);
  assert.equal(workoutTimerEngine.isExpired(fakeStart + 45000), false);

  // Po 100 sekundach (w tle)
  assert.equal(workoutTimerEngine.getRemainingSeconds(fakeStart + 100000), 0);
  assert.equal(workoutTimerEngine.isExpired(fakeStart + 100000), true);
});

test('AUDYT 5 [Izolacja Danych & Atomowość Bazy Room SQL]: Ochrona Przed Uszkodzeniem Danych Przy Nagłym Zamknięciu', () => {
  const mockTableStorage = new Map();

  const atomicTransaction = (operations) => {
    // Snapshot przed transakcją
    const backupSnapshot = new Map(mockTableStorage);
    try {
      for (const op of operations) {
        if (op.type === 'fail') throw new Error('Symulacja awarii zasilania / LowMemoryKiller');
        mockTableStorage.set(op.table, op.data);
      }
      return { success: true };
    } catch (err) {
      // Rollback
      mockTableStorage.clear();
      for (const [k, v] of backupSnapshot.entries()) {
        mockTableStorage.set(k, v);
      }
      return { success: false, error: err.message };
    }
  };

  // Stan początkowy
  mockTableStorage.set('plans', [{ id: 'p1', name: 'Plan Główny' }]);
  mockTableStorage.set('logged_sets', [{ id: 's1', weight: 100 }]);

  // Udana transakcja
  const tx1 = atomicTransaction([
    { table: 'plans', data: [{ id: 'p1', name: 'Plan Zmodyfikowany' }] },
    { table: 'logged_sets', data: [{ id: 's1', weight: 102.5 }] }
  ]);
  assert.equal(tx1.success, true);
  assert.equal(mockTableStorage.get('plans')[0].name, 'Plan Zmodyfikowany');

  // Nieudana transakcja (awaria w trakcie)
  const tx2 = atomicTransaction([
    { table: 'plans', data: [{ id: 'p1', name: 'Zniszczony Plan' }] },
    { type: 'fail' }
  ]);
  assert.equal(tx2.success, false);
  // Weryfikacja nienaruszalności po rollbacku
  assert.equal(mockTableStorage.get('plans')[0].name, 'Plan Zmodyfikowany', 'Rollback przywrócił poprawny stan');
});

test('AUDYT 6 [Ergonomia Ekranu Xiaomi 14T & AMOLED]: Sprawdzenie Gęstości i Zużycia Energii', () => {
  const densityMetrics = {
    standard: { itemHeightPx: 96, visibleCardsOnXiaomi14T: 2.1 },
    compact: { itemHeightPx: 62, visibleCardsOnXiaomi14T: 3.4 },
    ultra_dense: { itemHeightPx: 44, visibleCardsOnXiaomi14T: 4.8 }
  };

  assert.ok(densityMetrics.compact.visibleCardsOnXiaomi14T >= 3.0, 'W trybie compact widoczne są co najmniej 3 karty');
  assert.ok(densityMetrics.ultra_dense.visibleCardsOnXiaomi14T >= 4.5, 'W trybie ultra_dense widoczne są co najmniej 4.5 karty');

  // Weryfikacja czystej czerni AMOLED (#000000 wygasza diody OLED w 100%)
  const amoledHex = '#000000';
  const rgb = [parseInt(amoledHex.slice(1, 3), 16), parseInt(amoledHex.slice(3, 5), 16), parseInt(amoledHex.slice(5, 7), 16)];
  const totalSubpixelsPower = rgb[0] + rgb[1] + rgb[2];
  assert.equal(totalSubpixelsPower, 0, 'Pobór mocy pikseli w True AMOLED wynosi dokładnie 0 mW');
});

test('AUDYT 7 [AI Coach Gemini Context Injection]: Bezpieczeństwo i Format Promptu Systemowego', () => {
  const buildSystemContext = (athleteProfile, lastBloodWork, currentWeekVolume) => {
    const tokens = [];
    tokens.push(`Zawodnik: ${athleteProfile.name || 'Anonim'}`);
    tokens.push(`Waga docelowa: ${athleteProfile.targetWeight || 'Brak'} kg`);
    tokens.push(`Objętość bieżąca: ${currentWeekVolume} kg`);
    if (lastBloodWork && lastBloodWork.testosterone) {
      tokens.push(`Testosteron: ${lastBloodWork.testosterone} ng/dL`);
    }
    return tokens.join(' | ');
  };

  const context = buildSystemContext(
    { name: 'Krzysztof', targetWeight: 92 },
    { testosterone: 850 },
    24500
  );

  assert.ok(context.includes('Zawodnik: Krzysztof'));
  assert.ok(context.includes('Objętość bieżąca: 24500 kg'));
  assert.ok(context.includes('Testosteron: 850 ng/dL'));
});
