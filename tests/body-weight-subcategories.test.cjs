const { test } = require('node:test');
const assert = require('node:assert/strict');

// Subcategory definitions and router resolution logic
const WEIGHT_SUBCATEGORIES = ['all', 'register', 'combined', 'parts', 'circumferences'];

function resolveViewAndSubcategory(requestedView, currentSubcategory = 'all') {
  if (requestedView.startsWith('weight:')) {
    const sub = requestedView.slice(7);
    return {
      activeView: 'weight',
      weightSubcategory: WEIGHT_SUBCATEGORIES.includes(sub) ? sub : 'all',
      isWeightCategoryActive: true
    };
  }
  if (requestedView === 'weight') {
    return {
      activeView: 'weight',
      weightSubcategory: currentSubcategory,
      isWeightCategoryActive: true
    };
  }
  return {
    activeView: requestedView,
    weightSubcategory: currentSubcategory,
    isWeightCategoryActive: false
  };
}

// Calculations test for body weight KPI and trend stats
function calculateWeightMetrics(entries) {
  if (!entries || entries.length === 0) {
    return { currentWeight: 0, initialWeight: 0, totalChange: 0, averageWeight: 0, count: 0 };
  }
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sorted.map((e) => e.weight);
  const currentWeight = weights[weights.length - 1];
  const initialWeight = weights[0];
  const totalChange = Math.round((currentWeight - initialWeight) * 10) / 10;
  const averageWeight = Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10;
  return { currentWeight, initialWeight, totalChange, averageWeight, count: sorted.length };
}

test('resolveViewAndSubcategory correctly maps all subcategory routes to weight view', () => {
  // Test direct subcategory clicks from sidebar
  for (const sub of WEIGHT_SUBCATEGORIES) {
    const res = resolveViewAndSubcategory(`weight:${sub}`);
    assert.equal(res.activeView, 'weight', `Expected activeView to be 'weight' for 'weight:${sub}'`);
    assert.equal(res.weightSubcategory, sub, `Expected weightSubcategory to be '${sub}'`);
    assert.equal(res.isWeightCategoryActive, true);
  }

  // Test main weight category click
  const mainWeightRes = resolveViewAndSubcategory('weight');
  assert.equal(mainWeightRes.activeView, 'weight');
  assert.equal(mainWeightRes.isWeightCategoryActive, true);

  // Test other views
  const planRes = resolveViewAndSubcategory('plan');
  assert.equal(planRes.activeView, 'plan');
  assert.equal(planRes.isWeightCategoryActive, false);
});

test('calculateWeightMetrics calculates accurate current, initial, delta and average values', () => {
  const sampleData = [
    { id: '1', date: '2026-08-15', weight: 82.0, notes: '' },
    { id: '2', date: '2026-08-22', weight: 81.6, notes: '' },
    { id: '3', date: '2026-08-29', weight: 81.2, notes: '' },
    { id: '4', date: '2026-09-05', weight: 80.8, notes: '' },
    { id: '5', date: '2026-09-12', weight: 80.4, notes: '' }
  ];

  const metrics = calculateWeightMetrics(sampleData);
  assert.equal(metrics.currentWeight, 80.4);
  assert.equal(metrics.initialWeight, 82.0);
  assert.equal(metrics.totalChange, -1.6);
  assert.equal(metrics.averageWeight, 81.2);
  assert.equal(metrics.count, 5);
});

test('supports rendering sections based on activeSubcategory', () => {
  const shouldRenderSection = (activeSubcategory, targetSection) => {
    return activeSubcategory === 'all' || activeSubcategory === targetSection;
  };

  // When 'all' is active, all 4 sections must render
  assert.equal(shouldRenderSection('all', 'register'), true);
  assert.equal(shouldRenderSection('all', 'combined'), true);
  assert.equal(shouldRenderSection('all', 'parts'), true);
  assert.equal(shouldRenderSection('all', 'circumferences'), true);

  // When 'register' is active, only register renders
  assert.equal(shouldRenderSection('register', 'register'), true);
  assert.equal(shouldRenderSection('register', 'combined'), false);
  assert.equal(shouldRenderSection('register', 'parts'), false);
  assert.equal(shouldRenderSection('register', 'circumferences'), false);

  // When 'combined' is active, only combined chart renders
  assert.equal(shouldRenderSection('combined', 'combined'), true);
  assert.equal(shouldRenderSection('combined', 'register'), false);

  // When 'parts' is active, only parts panel renders
  assert.equal(shouldRenderSection('parts', 'parts'), true);
  assert.equal(shouldRenderSection('parts', 'combined'), false);

  // When 'circumferences' is active, only circumferences panel renders
  assert.equal(shouldRenderSection('circumferences', 'circumferences'), true);
  assert.equal(shouldRenderSection('circumferences', 'parts'), false);
});
