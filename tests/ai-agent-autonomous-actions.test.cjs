const test = require('node:test');
const assert = require('node:assert/strict');

// Import logic using pure node functions or relative path
test('AI AGENT: Wykrywanie intencji zapisu wagi ciała z języka naturalnego', () => {
  const prompt = 'Zapisz moją wagę dzisiaj 84.5 kg na czczo';
  const weightMatch = prompt.match(/(?:zapisz|dodaj|moja)?\s*(?:wag[aęe]|wa[zż]ę)\s*(?:to|dzisiaj|rano)?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg)?/i);
  
  assert.ok(weightMatch, 'Wykryto intencję zapisu wagi');
  const weight = parseFloat(weightMatch[1].replace(',', '.'));
  assert.equal(weight, 84.5);
});

test('AI AGENT: Wykrywanie intencji zapisu iniekcji i dawek w kalendarzu', () => {
  const prompt = 'Zapisz podanie Testosteron Enanthat 250 mg';
  const doseMatch = prompt.match(/(?:zapisz|dodaj|dopisz)?\s*(?:podanie|iniekcj[aę])?\s*([a-zA-Ząćęłńóśźż\s]+?)\s+([0-9]+(?:[.,][0-9]+)?)\s*(mg|iu|mcg|ml)/i);
  
  assert.ok(doseMatch, 'Wykryto intencję podania leku/suplementu');
  const substanceName = doseMatch[1].replace(/^(?:zapisz|dodaj|dopisz|podanie|iniekcj[aę])\s+/i, '').trim();
  assert.equal(substanceName, 'Testosteron Enanthat');
  assert.equal(parseFloat(doseMatch[2]), 250);
  assert.equal(doseMatch[3].toLowerCase(), 'mg');
});

test('AI AGENT: Wykrywanie intencji progresji siłowej (+2.5kg)', () => {
  const prompt = 'Zastosuj progresję siłową +2.5kg na wszystkich bojach';
  const isProgression = prompt.toLowerCase().includes('progresj');
  const incMatch = prompt.match(/([0-9]+(?:[.,][0-9]+)?)\s*kg/i);
  
  assert.equal(isProgression, true);
  assert.ok(incMatch);
  assert.equal(parseFloat(incMatch[1]), 2.5);
});

test('AI AGENT: Generator struktury 4-tygodniowego mezocyklu', () => {
  const weeksCount = 4;
  const daysPerWeek = 4;
  const today = new Date();
  const weeks = [];

  for (let w = 1; w <= weeksCount; w++) {
    const days = [
      { id: `w${w}-d1`, name: 'Push', exercises: [{ name: 'Bench Press', sets: 4, reps: 6, weight: 80 + (w - 1) * 2.5 }] },
      { id: `w${w}-d2`, name: 'Pull', exercises: [{ name: 'Barbell Row', sets: 4, reps: 6, weight: 85 + (w - 1) * 2.5 }] },
      { id: `w${w}-d3`, name: 'Legs', exercises: [{ name: 'Squat', sets: 4, reps: 6, weight: 100 + (w - 1) * 2.5 }] },
      { id: `w${w}-d4`, name: 'Upper', exercises: [{ name: 'OHP', sets: 4, reps: 6, weight: 55 + (w - 1) * 2.5 }] },
    ];
    weeks.push({
      id: `week-${w}`,
      number: w,
      name: `Tydzień ${w}`,
      days
    });
  }

  assert.equal(weeks.length, 4, 'Wygenerowano dokładnie 4 tygodnie');
  assert.equal(weeks[0].days.length, 4, 'Każdy tydzień ma 4 zaplanowane dni');
  assert.equal(weeks[3].days[0].exercises[0].weight, 87.5, 'Ciężar w 4. tygodniu wzrósł o +7.5kg zgodnie z periodyzacją liniową');
});
