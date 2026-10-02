package pl.pasik92.gymtrackerpro.data.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Formal Android Room Entities for PlanPasika / GymTracker Pro
 */

@Entity(tableName = "workout_plans")
data class WorkoutPlanEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String? = null,
    @ColumnInfo(name = "is_default")
    val isDefault: Boolean = false,
    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,
    @ColumnInfo(name = "created_at")
    val createdAt: String,
    @ColumnInfo(name = "updated_at")
    val updatedAt: String
)

@Entity(
    tableName = "training_weeks",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutPlanEntity::class,
            parentColumns = ["id"],
            childColumns = ["plan_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["plan_id"])]
)
data class TrainingWeekEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "plan_id")
    val planId: String,
    val number: Int,
    val name: String,
    val completed: Boolean = false
)

@Entity(
    tableName = "training_days",
    foreignKeys = [
        ForeignKey(
            entity = TrainingWeekEntity::class,
            parentColumns = ["id"],
            childColumns = ["week_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["week_id"])]
)
data class TrainingDayEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "week_id")
    val weekId: String,
    @ColumnInfo(name = "day_index")
    val dayIndex: Int,
    val name: String,
    val completed: Boolean = false,
    val notes: String? = null
)

@Entity(
    tableName = "exercises",
    foreignKeys = [
        ForeignKey(
            entity = TrainingDayEntity::class,
            parentColumns = ["id"],
            childColumns = ["day_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["day_id"])]
)
data class ExerciseEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "day_id")
    val dayId: String,
    @ColumnInfo(name = "catalog_id")
    val catalogId: String? = null,
    @ColumnInfo(name = "order_index")
    val orderIndex: Int,
    val name: String,
    val category: String, // klatka, plecy, biceps, triceps, barki, nogi
    val sets: Int,
    val reps: Int,
    val weight: Double,
    val rpe: Double? = null,
    val notes: String? = null
)

@Entity(
    tableName = "logged_sets",
    foreignKeys = [
        ForeignKey(
            entity = ExerciseEntity::class,
            parentColumns = ["id"],
            childColumns = ["exercise_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["exercise_id"])]
)
data class LoggedSetEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "exercise_id")
    val exerciseId: String,
    @ColumnInfo(name = "session_id")
    val sessionId: String? = null,
    @ColumnInfo(name = "set_number")
    val setNumber: Int,
    val weight: Double,
    val reps: Int,
    val completed: Boolean,
    val rpe: Double? = null,
    @ColumnInfo(name = "executed_at")
    val executedAt: String
)

@Entity(tableName = "body_weights")
data class BodyWeightEntity(
    @PrimaryKey
    val id: String,
    val date: String,
    val weight: Double,
    val notes: String? = null
)

@Entity(tableName = "circumferences")
data class CircumferenceEntity(
    @PrimaryKey
    val id: String,
    val date: String,
    @ColumnInfo(name = "body_part")
    val bodyPart: String,
    val side: String? = null,
    val variant: String? = null,
    val millimeters: Int,
    val notes: String? = null
)

@Entity(tableName = "body_part_measurements")
data class BodyPartMeasurementEntity(
    @PrimaryKey
    val id: String,
    val date: String,
    @ColumnInfo(name = "body_part")
    val bodyPart: String,
    val side: String? = null,
    val millimeters: Int,
    val notes: String? = null
)

@Entity(tableName = "catalog_exercises")
data class CatalogExerciseEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val category: String,
    val equipment: String? = null,
    @ColumnInfo(name = "default_sets")
    val defaultSets: Int,
    @ColumnInfo(name = "default_reps")
    val defaultReps: Int,
    @ColumnInfo(name = "default_rpe")
    val defaultRpe: Double? = null,
    val notes: String? = null,
    @ColumnInfo(name = "is_custom")
    val isCustom: Boolean = false
)

@Entity(tableName = "workout_sessions")
data class WorkoutSessionEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "plan_id")
    val planId: String,
    @ColumnInfo(name = "week_id")
    val weekId: String,
    @ColumnInfo(name = "day_id")
    val dayId: String,
    @ColumnInfo(name = "day_name")
    val dayName: String,
    @ColumnInfo(name = "started_at")
    val startedAt: String,
    @ColumnInfo(name = "finished_at")
    val finishedAt: String,
    @ColumnInfo(name = "duration_minutes")
    val durationMinutes: Int,
    @ColumnInfo(name = "total_volume_kg")
    val totalVolumeKg: Double,
    @ColumnInfo(name = "total_sets")
    val totalSets: Int,
    @ColumnInfo(name = "total_reps")
    val totalReps: Int,
    val notes: String? = null,
    val rating: Int? = null
)
