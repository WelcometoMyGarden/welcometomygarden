package org.welcometomygarden.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;

import com.getcapacitor.CapConfig;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Persistence + resolution for the runtime backend-channel override (Android).
 *
 * <p>The active server URL is {@code override ?? bakedDefaultUrl()}, where the baked default is the
 * {@code server.url} written into {@code assets/capacitor.config.json} at {@code cap sync} time.
 * Used by {@link MainActivity} to point the webview at startup, and by {@link WtmgServerPlugin} for
 * the JS API. See {@code src/lib/api/serverChannel.ts}.
 */
public final class WtmgServerConfig {

  private static final String PREFS = "wtmg_server";
  private static final String KEY_URL = "server_url";
  private static final String ASSET_CONFIG = "capacitor.config.json";

  private WtmgServerConfig() {}

  private static SharedPreferences prefs(Context context) {
    return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  /** The user-selected override URL, or null when none is persisted (use the baked default). */
  public static String getOverride(Context context) {
    String value = prefs(context).getString(KEY_URL, null);
    return (value != null && !value.isEmpty()) ? value : null;
  }

  public static void setOverride(Context context, String url) {
    SharedPreferences.Editor editor = prefs(context).edit();
    if (url == null || url.isEmpty()) {
      editor.remove(KEY_URL);
    } else {
      editor.putString(KEY_URL, url);
    }
    editor.apply();
  }

  public static boolean isPersisted(Context context) {
    return getOverride(context) != null;
  }

  /** The baked {@code capacitor.config.json} from assets, or null if it can't be read/parsed. */
  private static JSONObject loadBakedConfigJson(Context context) {
    try (InputStream is = context.getAssets().open(ASSET_CONFIG)) {
      BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      String line;
      while ((line = reader.readLine()) != null) {
        sb.append(line);
      }
      return new JSONObject(sb.toString());
    } catch (Exception e) {
      return null;
    }
  }

  /** The {@code server.url} baked into the bundled config (default when no override is set). */
  public static String bakedDefaultUrl(Context context) {
    JSONObject json = loadBakedConfigJson(context);
    if (json == null) return "";
    JSONObject server = json.optJSONObject("server");
    return server != null ? server.optString("url", "") : "";
  }

  /** The server URL the app should currently load. */
  public static String currentUrl(Context context) {
    String override = getOverride(context);
    return override != null ? override : bakedDefaultUrl(context);
  }

  public static boolean isValid(String url) {
    return url != null && (url.startsWith("http://") || url.startsWith("https://"));
  }

  /**
   * Builds a {@link CapConfig} from the baked assets config with {@code server.url} replaced by the
   * resolved (override or baked) URL, preserving all other settings (plugins, etc.). Returns null if
   * the baked config can't be read, in which case the caller should leave Capacitor's default
   * config loading in place.
   */
  public static CapConfig buildConfig(Context context) {
    JSONObject json = loadBakedConfigJson(context);
    if (json == null) return null;
    try {
      JSONObject server = json.optJSONObject("server");
      if (server == null) {
        server = new JSONObject();
        json.put("server", server);
      }
      server.put("url", currentUrl(context));

      // The deprecated JSONObject constructor below deserializes with a null Context, which would
      // otherwise disable WebView remote debugging on debuggable builds. Preserve that behavior
      // explicitly based on the app's debuggable flag.
      JSONObject android = json.optJSONObject("android");
      if (android == null) {
        android = new JSONObject();
        json.put("android", android);
      }
      if (!android.has("webContentsDebuggingEnabled")) {
        boolean isDebug = (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        android.put("webContentsDebuggingEnabled", isDebug);
      }
    } catch (Exception e) {
      return null;
    }
    return new CapConfig(context.getAssets(), json);
  }
}
