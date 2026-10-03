import {
  GymData,
  WorkoutPlanEntity,
  TrainingWeekEntity,
  TrainingDayEntity,
  ExerciseEntity,
  LoggedSetEntity,
  TrainingWeek,
  TrainingDay,
  Exercise,
  LoggedSet
} from '../types';

export interface NormalizedDatabaseSchema {
  plans: WorkoutPlanEntity[];
  weeks: TrainingWeekEntity[];
  days: TrainingDayEntity[];
  exercises: ExerciseEntity[];
  loggedSets: LoggedSetEntity[];
}

/**
 * Konwertuje hierarchiczny obiekt GymData (format v2.24/2.25) do znormalizowanych relacyjnych tabel SQLite/Room
 */
export function normalizeGymDataToRelational(gymData: GymData, defaultPlanId = 'plan-main-1'): NormalizedDatabaseSchema {
  const plans: WorkoutPlanEntity[] = [
    {
      id: defaultPlanId,
      name: 'Główny Mezocykl',
      description: 'Zaimportowany plan treningowy',
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const weeks: TrainingWeekEntity[] = [];
  const days: TrainingDayEntity[] = [];
  const exercises: ExerciseEntity[] = [];
  const loggedSets: LoggedSetEntity[] = [];

  const rawWeeks = Array.isArray(gymData.weeks) ? gymData.weeks : [];

  rawWeeks.forEach((w: TrainingWeek, weekIdx: number) => {
    const weekId = w.id || `week-${weekIdx + 1}`;
    weeks.push({
      id: weekId,
      planId: defaultPlanId,
      number: w.number || (weekIdx + 1),
      name: w.name || `Tydzień ${weekIdx + 1}`,
      startDate: w.startDate,
      orderIndex: weekIdx
    });

    const rawDays = Array.isArray(w.days) ? w.days : [];
    rawDays.forEach((d: TrainingDay, dayIdx: number) => {
      const dayId = d.id || `${weekId}-d${dayIdx + 1}`;
      days.push({
        id: dayId,
        weekId: weekId,
        name: d.name || `Dzień ${dayIdx + 1}`,
        completed: Boolean(d.completed),
        notes: d.notes,
        orderIndex: dayIdx
      });

      const rawExercises = Array.isArray(d.exercises) ? d.exercises : [];
      rawExercises.forEach((ex: Exercise, exIdx: number) => {
        const exId = ex.id || `${dayId}-ex${exIdx + 1}`;
        exercises.push({
          id: exId,
          dayId: dayId,
          name: ex.name,
          category: ex.category || 'klatka',
          sets: Number.isFinite(ex.sets) ? ex.sets : 3,
          reps: Number.isFinite(ex.reps) ? ex.reps : 10,
          weight: Number.isFinite(ex.weight) ? ex.weight : 0,
          goalWeight: ex.goalWeight,
          rpe: Number.isFinite(ex.rpe) ? ex.rpe : 8,
          notes: ex.notes,
          history: Array.isArray(ex.history) ? JSON.parse(JSON.stringify(ex.history)) : [],
          orderIndex: exIdx
        });

        // Mapowanie wykonanych serii
        if (Array.isArray(ex.loggedSets)) {
          ex.loggedSets.forEach((ls: LoggedSet, setIdx: number) => {
            loggedSets.push({
              id: `${exId}-set-${setIdx + 1}-${Date.now()}`,
              exerciseId: exId,
              setNumber: ls.setNumber || (setIdx + 1),
              weight: ls.weight,
              reps: ls.reps,
              completed: Boolean(ls.completed),
              executedAt: new Date().toISOString()
            });
          });
        }
      });
    });
  });

  return {
    plans,
    weeks,
    days,
    exercises,
    loggedSets
  };
}

/**
 * Odtwarza hierarchiczny widok TrainingWeek[] ze znormalizowanych encji relacyjnych
 */
export function denormalizeRelationalToWeeks(schema: NormalizedDatabaseSchema, planId?: string): TrainingWeek[] {
  const targetPlanId = planId || schema.plans[0]?.id || 'plan-main-1';
  const targetWeeks = schema.weeks
    .filter(w => w.planId === targetPlanId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return targetWeeks.map(w => {
    const weekDays = schema.days
      .filter(d => d.weekId === w.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const mappedDays: TrainingDay[] = weekDays.map(d => {
      const dayExercises = schema.exercises
        .filter(ex => ex.dayId === d.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const mappedExercises: Exercise[] = dayExercises.map(ex => {
        const exerciseSets = schema.loggedSets
          .filter(ls => ls.exerciseId === ex.id)
          .sort((a, b) => a.setNumber - b.setNumber);

        const mappedSets: LoggedSet[] = exerciseSets.map(ls => ({
          setNumber: ls.setNumber,
          weight: ls.weight,
          reps: ls.reps,
          completed: ls.completed
        }));

        return {
          id: ex.id,
          name: ex.name,
          category: ex.category,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          goalWeight: ex.goalWeight,
          rpe: ex.rpe,
          notes: ex.notes || '',
          history: Array.isArray(ex.history) ? JSON.parse(JSON.stringify(ex.history)) : [],
          loggedSets: mappedSets
        };
      });

      return {
        id: d.id,
        name: d.name,
        completed: d.completed,
        notes: d.notes,
        exercises: mappedExercises
      };
    });

    return {
      id: w.id,
      number: w.number,
      name: w.name,
      startDate: w.startDate,
      days: mappedDays
    };
  });
}
