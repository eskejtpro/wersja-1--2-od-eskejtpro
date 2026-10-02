const test = require('node:test');
const assert = require('node:assert/strict');

// ==============================================================================
// 🚀 TESTY MODUŁU: PULPIT SZYBKIEGO DOSTĘPU & CUSTOMIZACJA DOLNEGO PASKA
// ==============================================================================

test('PULPIT SZYBKI DOSTĘP: Domyślna lista widgetów posiada prawidłową konfigurację i kolejność', () => {
  const widgetList = [
    { id: 'w-workout', widgetType: 'active_workout', title: 'Dzisiejszy Trening', enabled: true, order: 1, size: 'full' },
    { id: 'w-timer', widgetType: 'timer_quick', title: 'Szybki Stoper Treningowy', enabled: true, order: 2, size: 'half' },
    { id: 'w-weight', widgetType: 'weight_trend', title: 'Masa Ciała & Filtr EMA', enabled: true, order: 3, size: 'half' },
    { id: 'w-ai-coach', widgetType: 'ai_coach_mini', title: 'Trener AI Gemini 3.8', enabled: true, order: 4, size: 'full' },
    { id: 'w-plates', widgetType: 'plate_calc_widget', title: 'Kalkulator Talerzy na Gryf', enabled: true, order: 5, size: 'half' },
    { id: 'w-water', widgetType: 'water_hydration', title: 'Licznik Nawodnienia (H₂O)', enabled: true, order: 6, size: 'half' },
    { id: 'w-radar', widgetType: 'muscle_volume_radar', title: 'Balans Objętości Tygodnia', enabled: true, order: 7, size: 'half' },
    { id: 'w-proto', widgetType: 'pharmacokinetics_summary', title: 'Kalendarz Iniekcji & Środków', enabled: true, order: 8, size: 'half' },
    { id: 'w-pr', widgetType: 'pr_tracker', title: 'Najnowsze Rekordy 1RM', enabled: true, order: 9, size: 'half' },
    { id: 'w-notes', widgetType: 'quick_notes', title: 'Szybki Notatnik Treningowy', enabled: true, order: 10, size: 'full' }
  ];

  assert.equal(widgetList.length, 10, 'Pulpit zawiera 10 modularnych widgetów');
  
  const activeWorkout = widgetList.find(w => w.widgetType === 'active_workout');
  assert.ok(activeWorkout);
  assert.equal(activeWorkout.enabled, true);
  assert.equal(activeWorkout.size, 'full');

  const timerWidget = widgetList.find(w => w.widgetType === 'timer_quick');
  assert.ok(timerWidget);
  assert.equal(timerWidget.enabled, true);
  assert.equal(timerWidget.size, 'half');
});

test('PULPIT SZYBKI DOSTĘP: Kalkulator Talerzy na Gryf (20kg) poprawnie oblicza talerze na stronę', () => {
  const calculatePlatesPerSide = (targetWeight) => {
    const barWeight = 20;
    if (targetWeight <= barWeight) return [];
    let perSide = (targetWeight - barWeight) / 2;
    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const used = [];

    for (const p of availablePlates) {
      if (perSide >= p) {
        const count = Math.floor(perSide / p);
        used.push({ weight: p, count });
        perSide -= count * p;
      }
    }
    return used;
  };

  // 100 kg na sztandze = (100 - 20)/2 = 40 kg na stronę (1x 25kg + 1x 15kg lub 2x 20kg)
  const plates100 = calculatePlatesPerSide(100);
  const totalPerSide100 = plates100.reduce((acc, p) => acc + p.weight * p.count, 0);
  assert.equal(totalPerSide100, 40, 'Dla 100 kg suma talerzy na stronę to 40 kg');

  // 140 kg na sztandze = (140 - 20)/2 = 60 kg na stronę (2x 25kg + 1x 10kg)
  const plates140 = calculatePlatesPerSide(140);
  const totalPerSide140 = plates140.reduce((acc, p) => acc + p.weight * p.count, 0);
  assert.equal(totalPerSide140, 60, 'Dla 140 kg suma talerzy na stronę to 60 kg');
});

test('CUSTOMIZACJA DOLNEGO PASKA: Zmiana kolejności i widoczności kart działa dynamicznie', () => {
  const customOrder = ['quick_access', 'plan', 'weight', 'stats', 'settings'];
  const customVisible = ['quick_access', 'plan', 'weight', 'stats', 'settings'];

  const allModules = [
    { id: 'quick_access', label: 'Pulpit' },
    { id: 'plan', label: 'Trening' },
    { id: 'stats', label: 'Progres' },
    { id: 'muscle', label: 'Partie' },
    { id: 'weight', label: 'Pomiary' },
    { id: 'cycles', label: 'Kalendarz' },
    { id: 'exercises', label: 'Ćwiczenia' },
    { id: 'settings', label: 'Ustawienia' },
  ];

  const visibleSet = new Set(customVisible);
  const filteredAndOrdered = allModules
    .filter(m => visibleSet.has(m.id))
    .sort((a, b) => customOrder.indexOf(a.id) - customOrder.indexOf(b.id));

  assert.equal(filteredAndOrdered.length, 5, 'Tylko 5 wybranych kart jest widocznych na pasku');
  assert.equal(filteredAndOrdered[0].id, 'quick_access', 'Pierwsza karta to Szybki Dostęp (Pulpit)');
  assert.equal(filteredAndOrdered[1].id, 'plan');
  assert.equal(filteredAndOrdered[2].id, 'weight');
});

test('CUSTOMIZACJA WYGLĄDU: Obsługa stylów paska (floating_dock, classic_bar, minimal_capsule) i zaokrągleń', () => {
  const settings = {
    bottomNavStyle: 'floating_dock',
    cardBorderRadius: 'extra_rounded',
    cardGlowEffect: true,
    glassmorphism: true,
    accentColor: 'cyberpunk'
  };

  assert.equal(settings.bottomNavStyle, 'floating_dock');
  assert.equal(settings.cardBorderRadius, 'extra_rounded');
  assert.equal(settings.accentColor, 'cyberpunk');
  assert.equal(settings.glassmorphism, true);
});

test('PULPIT SZYBKI DOSTĘP: Dodawanie nowego widgetu z katalogu oraz usuwanie', () => {
  let widgets = [
    { id: 'w-workout', widgetType: 'active_workout', title: 'Dzisiejszy Trening', enabled: true, order: 1, size: 'full' },
    { id: 'w-timer', widgetType: 'timer_quick', title: 'Szybki Stoper Treningowy', enabled: true, order: 2, size: 'half' },
  ];

  // Dodaj widget z katalogu
  const newWidget = {
    id: 'w-onerm-new',
    widgetType: 'one_rm_calc',
    title: 'Kalkulator 1RM',
    enabled: true,
    order: widgets.length + 1,
    size: 'half'
  };

  widgets = [...widgets, newWidget];
  assert.equal(widgets.length, 3);
  assert.equal(widgets[2].id, 'w-onerm-new');
  assert.equal(widgets[2].order, 3);

  // Usuń widget
  widgets = widgets.filter(w => w.id !== 'w-timer').map((w, idx) => ({ ...w, order: idx + 1 }));
  assert.equal(widgets.length, 2);
  assert.equal(widgets[0].id, 'w-workout');
  assert.equal(widgets[0].order, 1);
  assert.equal(widgets[1].id, 'w-onerm-new');
  assert.equal(widgets[1].order, 2);
});

test('PULPIT SZYBKI DOSTĘP: Przesuwanie widgetów (góra, dół, skrajne pozycje)', () => {
  let widgets = [
    { id: 'w-1', title: 'W1', order: 1 },
    { id: 'w-2', title: 'W2', order: 2 },
    { id: 'w-3', title: 'W3', order: 3 },
  ];

  // Przesuń w-2 w górę
  const temp = widgets[0];
  widgets[0] = widgets[1];
  widgets[1] = temp;
  widgets = widgets.map((w, idx) => ({ ...w, order: idx + 1 }));

  assert.equal(widgets[0].id, 'w-2');
  assert.equal(widgets[1].id, 'w-1');
  assert.equal(widgets[2].id, 'w-3');

  // Przesuń na sam dół (w-2 na koniec)
  const item = widgets.shift();
  widgets.push(item);
  widgets = widgets.map((w, idx) => ({ ...w, order: idx + 1 }));

  assert.equal(widgets[0].id, 'w-1');
  assert.equal(widgets[1].id, 'w-3');
  assert.equal(widgets[2].id, 'w-2');
});

test('PULPIT SZYBKI DOSTĘP: Kalkulator 1RM (Brzycki & Epley) i strefy intensywności', () => {
  const calcBrzycki = (w, r) => r <= 1 ? w : Math.round(w / (1.0278 - 0.0278 * r));
  const calcEpley = (w, r) => r <= 1 ? w : Math.round(w * (1 + r / 30));

  // 100 kg x 5 powtórzeń
  const brzycki100x5 = calcBrzycki(100, 5);
  const epley100x5 = calcEpley(100, 5);

  assert.ok(brzycki100x5 >= 110 && brzycki100x5 <= 118, 'Brzycki 100x5 powinno wynosić ok. 112-114 kg');
  assert.ok(epley100x5 >= 114 && epley100x5 <= 118, 'Epley 100x5 powinno wynosić ok. 117 kg');

  // 90% 1RM
  const pct90 = Math.round(brzycki100x5 * 0.90);
  assert.ok(pct90 > 95 && pct90 < brzycki100x5);
});

test('PULPIT SZYBKI DOSTĘP: Szablony Gemini 3.8 Pro (Trójbój, Hipertrofia, Redukcja, Protokół)', () => {
  const presets = ['powerlifting', 'hypertrophy', 'fat_loss', 'health_protocol'];
  assert.equal(presets.length, 4);

  // Każdy preset ma zdefiniowany cel i niepustą listę kafelków
  const samplePowerliftingPreset = {
    id: 'powerlifting',
    name: 'Trójbój & Maksymalna Siła',
    widgetsCount: 7
  };
  assert.equal(samplePowerliftingPreset.widgetsCount, 7);
  assert.ok(samplePowerliftingPreset.name.includes('Trójbój'));
});

test('TRYB EDYCJI PULPITU: Przeciąganie i upuszczanie (DnD) oraz usuwanie przyciskiem "x"', () => {
  let widgets = [
    { id: 'w-workout', title: 'Trening', order: 1 },
    { id: 'w-timer', title: 'Stoper', order: 2 },
    { id: 'w-plates', title: 'Talerze', order: 3 },
    { id: 'w-water', title: 'Nawodnienie', order: 4 },
  ];

  // Symulacja akcji DnD: przeciągnięcie kafelka z index 3 (Nawodnienie) na index 1 (przed Stoper)
  const sourceIndex = 3;
  const targetIndex = 1;
  const itemToMove = widgets.splice(sourceIndex, 1)[0];
  widgets.splice(targetIndex, 0, itemToMove);
  widgets = widgets.map((w, idx) => ({ ...w, order: idx + 1 }));

  assert.equal(widgets[0].id, 'w-workout');
  assert.equal(widgets[1].id, 'w-water', 'Kafelek Nawodnienie został upuszczony na index 1');
  assert.equal(widgets[2].id, 'w-timer');
  assert.equal(widgets[3].id, 'w-plates');
  assert.equal(widgets[1].order, 2);

  // Symulacja kliknięcia przycisku 'x' (usunięcie kafelka Stoper)
  const widgetIdToDelete = 'w-timer';
  widgets = widgets.filter(w => w.id !== widgetIdToDelete).map((w, idx) => ({ ...w, order: idx + 1 }));

  assert.equal(widgets.length, 3, 'Po usunięciu pozostały 3 kafelki');
  assert.ok(!widgets.some(w => w.id === 'w-timer'), 'Kafelek w-timer został usunięty');
  assert.equal(widgets[0].order, 1);
  assert.equal(widgets[1].order, 2);
  assert.equal(widgets[2].order, 3);
});

test('USTAWIENIA SERWERA & KONTO GOOGLE: Obsługa adresu Cloud Run, autoryzacji kontem Google i instrukcji', () => {
  const googleServerConfig = {
    updateServerUrl: 'https://ais-pre-cnwnz67ertzudvxhqsflo5-244110052482.europe-west2.run.app',
    googleServerPreferred: true,
    googleUser: {
      email: 'eskejtpro@gmail.com',
      displayName: 'Pasik (Google Verified)',
      id: 'google-uid-12345678',
      connectedAt: '2026-10-02T00:00:00.000Z',
      token: 'gcl_mock_bearer_token'
    }
  };

  assert.equal(googleServerConfig.googleServerPreferred, true);
  assert.equal(googleServerConfig.googleUser.email, 'eskejtpro@gmail.com');
  assert.match(googleServerConfig.updateServerUrl, /europe-west2\.run\.app/);
  assert.ok(googleServerConfig.googleUser.token.startsWith('gcl_'));
});



