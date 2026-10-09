package com.gymtracker.pro;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** Home-screen shortcuts for the most frequently used GymTracker areas. */
public class GymTrackerWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_OPEN = "com.gymtracker.pro.OPEN_WIDGET_DESTINATION";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, manager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        updateAllWidgets(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_OPEN.equals(intent.getAction())) {
            Intent launch = new Intent(context, MainActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            String destination = intent.getStringExtra("destination");
            if (destination != null) {
                launch.putExtra("widget_destination", destination);
            }
            context.startActivity(launch);
        }
    }

    private static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, GymTrackerWidgetProvider.class);
        for (int id : manager.getAppWidgetIds(provider)) {
            updateWidget(context, manager, id);
        }
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int id) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_gymtracker);
        views.setOnClickPendingIntent(R.id.widget_training, pendingIntent(context, "plan", 101));
        views.setOnClickPendingIntent(R.id.widget_hydration, pendingIntent(context, "hydration", 102));
        views.setOnClickPendingIntent(R.id.widget_calendar, pendingIntent(context, "calendar", 103));
        views.setOnClickPendingIntent(R.id.widget_open, pendingIntent(context, "home", 104));
        manager.updateAppWidget(id, views);
    }

    private static PendingIntent pendingIntent(Context context, String destination, int requestCode) {
        Intent intent = new Intent(context, GymTrackerWidgetProvider.class)
                .setAction(ACTION_OPEN)
                .putExtra("destination", destination);
        return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
