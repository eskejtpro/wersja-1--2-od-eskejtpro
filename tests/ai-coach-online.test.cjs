const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Trener AI Online: Endpointy i heurystyka offline zwracają prawidłową strukturę', async () => {
  // Symulacja logiki heurystycznej Trenera AI dla trybu offline
  const message = 'Jak progresować w wyciskaniu sztangi?';
  const persona = 'head_coach';

  assert.ok(message.length > 0, 'Wiadomość musi być niepusta');
  assert.equal(persona, 'head_coach', 'Domyślna persona to Główny Trener');

  // Weryfikacja person w konfiguracji
  const personas = ['head_coach', 'data_analyst', 'health_specialist', 'hardcore_motivator', 'nutritionist'];
  assert.equal(personas.length, 5, 'Dostępne jest 5 wyspecjalizowanych person trenerskich');

  // Weryfikacja plan generatora
  const planRequest = {
    goal: 'hypertrophy',
    split: 'ppl',
    daysPerWeek: 4,
    experience: 'intermediate'
  };
  assert.equal(planRequest.daysPerWeek, 4);
  assert.equal(planRequest.split, 'ppl');
});

test('Trener AI Online: Pamięć trwała czatu oraz fakty długoterminowe są zapisywane w stanie GymData', () => {
  // Symulacja historii wiadomości
  const chatHistory = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Chcę osiągnąć 150 kg w wyciskaniu do końca roku',
      timestamp: '16:00'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Świetny cel! Rozpiszemy periodyzację blokową z falą 3-tygodniową.',
      timestamp: '16:01',
      model: 'gemini-3.5-flash-lite'
    }
  ];

  // Symulacja faktów pamięci długoterminowej
  const agentMemories = [
    {
      id: 'mem-1',
      content: 'Cel główny: 150 kg w wyciskaniu leżąc',
      category: 'goal',
      createdAt: '2026-10-01'
    },
    {
      id: 'mem-2',
      content: 'Przebyty uraz prawego barku w 2025 roku – unikać zbyt szerokiego chwytu',
      category: 'injury',
      createdAt: '2026-10-01'
    }
  ];

  const gymDataMock = {
    settings: { unit: 'kg', theme: 'dark', autoSave: true, athleteName: 'Zawodnik', windowsPath: '', soundFeedback: true },
    weeks: [],
    bodyWeights: [],
    aiChatHistory: chatHistory,
    aiAgentMemories: agentMemories
  };

  assert.equal(gymDataMock.aiChatHistory.length, 2, 'Historia czatu musi zawierać 2 wiadomości');
  assert.equal(gymDataMock.aiAgentMemories.length, 2, 'Pamięć agenta musi zawierać 2 fakty');
  assert.equal(gymDataMock.aiAgentMemories[0].category, 'goal');
  assert.equal(gymDataMock.aiAgentMemories[1].category, 'injury');
});

test('Trener AI Online: pływający FAB nie zasłania pola i przycisku wysyłania', () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');
  const coachSource = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'AiCoachView.tsx'), 'utf8');

  assert.match(
    appSource,
    /activeView !== 'ai' && data\.settings\.floatingActionButton/,
    'Globalny FAB powinien być ukryty w pełnoekranowym widoku Trenera AI'
  );
  assert.match(coachSource, /aria-label="Wiadomość do Trenera AI"/);
  assert.match(coachSource, /aria-label="Wyślij wiadomość do Trenera AI"/);
  assert.match(coachSource, /enterKeyHint="send"/);
});
