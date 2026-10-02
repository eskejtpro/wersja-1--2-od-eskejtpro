package pl.pasik92.gymtrackerpro.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

/**
 * Formal Android Room Database definition for GymTracker Pro / PlanPasika
 */

@Database(
    entities = [
        WorkoutPlanEntity::class,
        TrainingWeekEntity::class,
        TrainingDayEntity::class,
        ExerciseEntity::class,
        LoggedSetEntity::class,
        BodyWeightEntity::class,
        CircumferenceEntity::class,
        BodyPartMeasurementEntity::class,
        CatalogExerciseEntity::class,
        WorkoutSessionEntity::class
    ],
    version = 3,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun workoutPlanDao(): WorkoutPlanDao
    abstract fun trainingWeekDao(): TrainingWeekDao
    abstract fun trainingDayDao(): TrainingDayDao
    abstract fun exerciseDao(): ExerciseDao
    abstract fun loggedSetDao(): LoggedSetDao
    abstract fun bodyWeightDao(): BodyWeightDao
    abstract fun circumferenceDao(): CircumferenceDao
    abstract fun catalogDao(): CatalogDao
    abstract fun workoutSessionDao(): WorkoutSessionDao

    companion object {
        private const val DATABASE_NAME = "planpasika_room.db"

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
