import { IExerciseRepository } from '../../domain/repositories';
import { CatalogExercise } from '../../types';
import { appDatabase } from '../db/AppDatabase';
import { calculate1RM, calculateVolume } from '../../utils/calculations';

export class ExerciseRepositoryImpl implements IExerciseRepository {
  constructor() {
    appDatabase.initialize();
  }

  async getCatalogExercises(filterCategory?: string, searchQuery?: string): Promise<CatalogExercise[]> {
    let exercises = appDatabase.getCatalogExercises();

    if (filterCategory && filterCategory !== 'all') {
      exercises = exercises.filter(e => e.category === filterCategory);
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      exercises = exercises.filter(e => e.name.toLowerCase().includes(q));
    }

    return exercises;
  }

  async getCatalogExerciseById(id: string): Promise<CatalogExercise | null> {
    const exercises = appDatabase.getCatalogExercises();
    return exercises.find(e => e.id === id) || null;
  }

  async saveCustomExercise(exercise: CatalogExercise): Promise<void> {
    appDatabase.saveCatalogExercise({
      ...exercise,
      isCustom: true
    });
  }

  async deleteCustomExercise(id: string): Promise<void> {
    appDatabase.deleteCatalogExercise(id);
  }

  async getExerciseHistory(exerciseName: string): Promise<{
    date: string;
    weight: number;
    reps: number;
    sets: number;
    e1RM: number;
  }[]> {
    const gymData = appDatabase.toGymData();
    const history: {
      date: string;
      weight: number;
      reps: number;
      sets: number;
      e1RM: number;
    }[] = [];

    const lowerName = exerciseName.toLowerCase().trim();

    gymData.weeks.forEach(w => {
      w.days.forEach(d => {
        d.exercises.forEach(ex => {
          if (ex.name.toLowerCase().trim() === lowerName) {
            if (Array.isArray(ex.history)) {
              ex.history.forEach(h => {
                history.push({
                  date: h.date,
                  weight: h.weight,
                  reps: h.reps,
                  sets: h.sets,
                  e1RM: calculate1RM(h.weight, h.reps)
                });
              });
            }
          }
        });
      });
    });

    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getPersonalRecord(exerciseName: string): Promise<{
    maxWeight: number;
    maxE1RM: number;
    maxVolume: number;
    date: string;
  } | null> {
    const history = await this.getExerciseHistory(exerciseName);
    if (history.length === 0) return null;

    let maxWeight = 0;
    let maxE1RM = 0;
    let maxVolume = 0;
    let bestDate = history[0].date;

    history.forEach(h => {
      if (h.weight > maxWeight) {
        maxWeight = h.weight;
      }
      const e1 = calculate1RM(h.weight, h.reps);
      if (e1 > maxE1RM) {
        maxE1RM = e1;
        bestDate = h.date;
      }
      const vol = calculateVolume(h.sets, h.reps, h.weight);
      if (vol > maxVolume) {
        maxVolume = vol;
      }
    });

    return {
      maxWeight,
      maxE1RM,
      maxVolume,
      date: bestDate
    };
  }
}

export const exerciseRepository = new ExerciseRepositoryImpl();
