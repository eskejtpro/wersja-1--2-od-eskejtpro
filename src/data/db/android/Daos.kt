package pl.pasik92.gymtrackerpro.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

/**
 * Formal Android Room DAOs for Room Architecture
 */

@Dao
interface WorkoutPlanDao {
    @Query("SELECT * FROM workout_plans")
    fun getAllPlansFlow(): Flow<List<WorkoutPlanEntity>>

    @Query("SELECT * FROM workout_plans WHERE is_active = 1 LIMIT 1")
    suspend fun getActivePlan(): WorkoutPlanEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlan(plan: WorkoutPlanEntity)

    @Delete
    suspend fun deletePlan(plan: WorkoutPlanEntity)
}

@Dao
interface TrainingWeekDao {
    @Query("SELECT * FROM training_weeks WHERE plan_id = :planId ORDER BY number ASC")
    fun getWeeksForPlanFlow(planId: String): Flow<List<TrainingWeekEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWeeks(weeks: List<TrainingWeekEntity>)

    @Update
    suspend fun updateWeek(week: TrainingWeekEntity)
}

@Dao
interface TrainingDayDao {
    @Query("SELECT * FROM training_days WHERE week_id = :weekId ORDER BY day_index ASC")
    fun getDaysForWeekFlow(weekId: String): Flow<List<TrainingDayEntity>>

    @Query("UPDATE training_days SET completed = :completed WHERE id = :dayId")
    suspend fun setDayCompleted(dayId: String, completed: Boolean)

    @Query("UPDATE training_days SET notes = :notes WHERE id = :dayId")
    suspend fun updateDayNotes(dayId: String, notes: String)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDays(days: List<TrainingDayEntity>)
}

@Dao
interface ExerciseDao {
    @Query("SELECT * FROM exercises WHERE day_id = :dayId ORDER BY order_index ASC")
    fun getExercisesForDayFlow(dayId: String): Flow<List<ExerciseEntity>>

    @Query("UPDATE exercises SET weight = :weight WHERE id = :exerciseId")
    suspend fun updateExerciseWeight(exerciseId: String, weight: Double)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExercises(exercises: List<ExerciseEntity>)

    @Delete
    suspend fun deleteExercise(exercise: ExerciseEntity)
}

@Dao
interface LoggedSetDao {
    @Query("SELECT * FROM logged_sets WHERE exercise_id = :exerciseId ORDER BY set_number ASC")
    fun getLoggedSetsForExerciseFlow(exerciseId: String): Flow<List<LoggedSetEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLoggedSet(set: LoggedSetEntity)

    @Query("DELETE FROM logged_sets WHERE exercise_id = :exerciseId")
    suspend fun clearLoggedSetsForExercise(exerciseId: String)
}

@Dao
interface BodyWeightDao {
    @Query("SELECT * FROM body_weights ORDER BY date DESC")
    fun getAllBodyWeightsFlow(): Flow<List<BodyWeightEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBodyWeight(weight: BodyWeightEntity)

    @Query("DELETE FROM body_weights WHERE id = :id")
    suspend fun deleteBodyWeight(id: String)
}

@Dao
interface CircumferenceDao {
    @Query("SELECT * FROM circumferences ORDER BY date DESC")
    fun getAllCircumferencesFlow(): Flow<List<CircumferenceEntity>>

    @Query("SELECT * FROM circumferences WHERE body_part = :bodyPart ORDER BY date ASC")
    fun getCircumferencesForPartFlow(bodyPart: String): Flow<List<CircumferenceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCircumference(entry: CircumferenceEntity)

    @Query("DELETE FROM circumferences WHERE id = :id")
    suspend fun deleteCircumference(id: String)
}

@Dao
interface CatalogDao {
    @Query("SELECT * FROM catalog_exercises ORDER BY name ASC")
    fun getAllCatalogExercisesFlow(): Flow<List<CatalogExerciseEntity>>

    @Query("SELECT * FROM catalog_exercises WHERE category = :category ORDER BY name ASC")
    fun getCatalogByCategoryFlow(category: String): Flow<List<CatalogExerciseEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCatalogExercise(exercise: CatalogExerciseEntity)
}

@Dao
interface WorkoutSessionDao {
    @Query("SELECT * FROM workout_sessions ORDER BY started_at DESC")
    fun getAllSessionsFlow(): Flow<List<WorkoutSessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: WorkoutSessionEntity)
}
