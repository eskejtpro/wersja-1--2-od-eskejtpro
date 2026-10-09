package com.gymtracker.pro;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.assertTrue;

/** Smoke test for the actual package and Android launcher activity. */
@RunWith(AndroidJUnit4.class)
public class PlanPasikaStartupTest {

    @Test
    public void launchesTheRealApplicationActivity() throws Exception {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.gymtracker.pro", appContext.getPackageName());
        assertTrue("Google sign-in activity must implement the plugin callback contract",
                ModifiedMainActivityForSocialLoginPlugin.class.isAssignableFrom(MainActivity.class));

        Intent launchIntent = appContext.getPackageManager()
                .getLaunchIntentForPackage(appContext.getPackageName());
        assertNotNull("The app must expose a launcher activity", launchIntent);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        Activity activity = InstrumentationRegistry.getInstrumentation()
                .startActivitySync(launchIntent);
        try {
            assertEquals("com.gymtracker.pro.MainActivity", activity.getComponentName().getClassName());
        } finally {
            activity.finish();
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        }
    }
}
