const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScriptModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  });
  const loaded = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(
    loaded.exports,
    require,
    loaded
  );
  return loaded.exports;
}

const { initializeLocalDatabaseFlow } = loadTypeScriptModule(
  path.join(__dirname, '../src/data/db/initializeLocalDatabase.ts')
);

function createRoomDatabase(structuredData = null) {
  return {
    initialized: false,
    migratedData: null,
    async initialize() {
      this.initialized = true;
    },
    hasStructuredData() {
      return Boolean(structuredData);
    },
    loadGymData() {
      return structuredData;
    },
    async migrateFromJson(data) {
      this.migratedData = data;
      structuredData = data;
    }
  };
}

test('startup preserves valid existing app data when structured tables are missing', async () => {
  const roomDatabase = createRoomDatabase();
  const savedData = {
    settings: { athleteName: 'Saved athlete' },
    weeks: [{ id: 'saved-week', name: 'PRESERVED USER WEEK', days: [] }]
  };

  const result = await initializeLocalDatabaseFlow(roomDatabase, savedData);

  assert.equal(roomDatabase.initialized, true);
  assert.strictEqual(roomDatabase.migratedData, savedData);
  assert.strictEqual(result.data, savedData);
  assert.equal(result.source, 'existing-data');
});

test('startup continues to prefer non-empty structured data over fallback data', async () => {
  const structuredData = {
    settings: { athleteName: 'Structured athlete' },
    weeks: [{ id: 'room-week', name: 'STRUCTURED WEEK', days: [] }]
  };
  const roomDatabase = createRoomDatabase(structuredData);
  const fallbackData = {
    settings: { athleteName: 'Saved athlete' },
    weeks: [{ id: 'saved-week', name: 'FALLBACK WEEK', days: [] }]
  };

  const result = await initializeLocalDatabaseFlow(roomDatabase, fallbackData);

  assert.strictEqual(result.data, structuredData);
  assert.equal(result.source, 'structured-data');
  assert.equal(roomDatabase.migratedData, null);
});

test('local data controls and guidance do not claim unimplemented SQL optimizations', () => {
  const settingsPanel = fs.readFileSync(
    path.join(__dirname, '../src/components/TurboPowerSettingsPanel.tsx'),
    'utf8'
  );
  const dataGuide = fs.readFileSync(
    path.join(__dirname, '../src/components/AppKnowledgeGuide.tsx'),
    'utf8'
  );

  assert.match(settingsPanel, /Podsumowanie danych lokalnych/);
  assert.match(settingsPanel, /nie zmienia danych/);
  assert.doesNotMatch(settingsPanel, /Zoptymalizowano .*Indeksy Room SQL odświeżone/);
  assert.match(dataGuide, /Kotlinowe pliki Room nie są obecnie podłączone do modułu Android/);
});
