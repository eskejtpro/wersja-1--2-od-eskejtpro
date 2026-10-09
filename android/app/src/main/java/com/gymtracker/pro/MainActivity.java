package com.gymtracker.pro;

import android.content.Intent;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

/** Bridges Google authorization results back to the Capgo Social Login plugin. */
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    private static final String WIDGET_DESTINATION_EXTRA = "widget_destination";

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        dispatchWidgetDestination(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        dispatchWidgetDestination(getIntent());
    }

    private void dispatchWidgetDestination(Intent intent) {
        if (intent == null || !intent.hasExtra(WIDGET_DESTINATION_EXTRA) || getBridge() == null
                || getBridge().getWebView() == null) {
            return;
        }

        String destination = intent.getStringExtra(WIDGET_DESTINATION_EXTRA);
        intent.removeExtra(WIDGET_DESTINATION_EXTRA);
        if (!"plan".equals(destination) && !"hydration".equals(destination)
                && !"calendar".equals(destination) && !"home".equals(destination)) {
            return;
        }

        String script = "window.dispatchEvent(new CustomEvent('gymtracker-widget-navigation', {detail: {destination: '"
                + destination + "'}}));";
        getBridge().getWebView().postDelayed(() ->
                getBridge().getWebView().evaluateJavascript(script, null), 600);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN
                || requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            return;
        }

        PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
        if (pluginHandle == null) {
            Log.w("Google Activity Result", "SocialLogin plugin handle is null");
            return;
        }

        Plugin plugin = pluginHandle.getInstance();
        if (!(plugin instanceof SocialLoginPlugin)) {
            Log.w("Google Activity Result", "SocialLogin plugin instance is unavailable");
            return;
        }

        ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required by capacitor-social-login when custom scopes are requested.
    }
}
