package org.welcometomygarden.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.core.content.res.ResourcesCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.WebViewListener;
import com.capacitorjs.plugins.splashscreen.SplashScreen;
import com.capacitorjs.plugins.splashscreen.SplashScreenSettings;

import java.lang.reflect.Field;

/**
 * Native "offline gate" for the Capacitor app.
 *
 * <p>In production the app uses Capacitor's {@code server.url} to load the remote website. The
 * splash screen is configured with {@code launchAutoHide: false} and is only hidden once the remote
 * site's JavaScript boots (see {@code src/routes/+layout.svelte}). When the device has no internet
 * connection at startup, the remote site never loads, the JS never runs, and the splash screen stays
 * on screen forever.
 *
 * <p>This class watches the initial WebView load. If the remote site cannot be reached because the
 * device is offline, it shows a native, localized "needs an internet connection" overlay with a
 * spinner, polls for connectivity, and reloads {@code server.url} as soon as the connection is
 * restored. Deep links that arrive while offline are stored and re-applied on the reload.
 *
 * <p>Only relevant when a remote {@code server.url} is configured; on local/dev builds (no server
 * url) the gate disables itself.
 */
public class OfflineGate {

  /** Grace period before showing the offline overlay, to avoid flashing it during fast reconnects. */
  private static final long SHOW_DELAY_MS = 2500;

  /** How often we re-attempt the load while the overlay is visible (acts as the connectivity poll). */
  private static final long POLL_INTERVAL_MS = 3000;

  private final Activity activity;
  private final Bridge bridge;
  private final WebView webView;
  private final String serverUrl;
  private final ConnectivityManager connectivityManager;
  private final Handler mainHandler = new Handler(Looper.getMainLooper());

  private FrameLayout overlay;
  private boolean loaded = false;
  private boolean overlayShowScheduled = false;
  private boolean polling = false;

  /** Path (+query) of a deep link received while offline, to be applied on the recovery load. */
  private String pendingPath = null;

  private ConnectivityManager.NetworkCallback networkCallback;

  private OfflineGate(Activity activity, Bridge bridge) {
    this.activity = activity;
    this.bridge = bridge;
    this.webView = bridge.getWebView();
    this.serverUrl = bridge.getConfig().getServerUrl();
    this.connectivityManager =
      (ConnectivityManager) activity.getSystemService(Context.CONNECTIVITY_SERVICE);
  }

  /**
   * Attaches an offline gate to the given activity. Safe to call unconditionally: it becomes a no-op
   * when no remote {@code server.url} is configured.
   */
  public static OfflineGate attach(Activity activity, Bridge bridge) {
    OfflineGate gate = new OfflineGate(activity, bridge);
    gate.start();
    return gate;
  }

  private void start() {
    if (serverUrl == null || serverUrl.isEmpty() || webView == null) {
      // No remote server URL (local build) — nothing to gate.
      return;
    }

    // Capture a deep link that launched the app cold while we may be offline.
    captureDeepLink(activity.getIntent());

    // React immediately when connectivity (re)appears.
    registerNetworkCallback();

    // Detect a failed initial load of the remote site.
    bridge.addWebViewListener(new WebViewListener() {
      @Override
      public void onPageLoaded(WebView webView) {
        // The remote site loaded successfully — tear everything down.
        markLoaded();
      }

      @Override
      public void onReceivedError(WebView webView) {
        // Main-frame load failed (typically offline). Show the overlay after a short grace period.
        if (!loaded && !isOnline()) {
          scheduleShowOverlay();
        }
      }
    });

    // If we already know we're offline at startup, schedule the overlay without waiting for an error.
    if (!isOnline()) {
      scheduleShowOverlay();
    }
  }

  private boolean isOnline() {
    if (connectivityManager == null) return false;
    Network network = connectivityManager.getActiveNetwork();
    if (network == null) return false;
    NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(network);
    return caps != null
      && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
  }

  private void registerNetworkCallback() {
    if (connectivityManager == null) return;
    NetworkRequest request = new NetworkRequest.Builder()
      .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
      .build();
    networkCallback = new ConnectivityManager.NetworkCallback() {
      @Override
      public void onAvailable(Network network) {
        // Validated connectivity is back — retry the load right away.
        mainHandler.post(() -> {
          if (!loaded) reloadRemote();
        });
      }
    };
    try {
      connectivityManager.registerNetworkCallback(request, networkCallback);
    } catch (RuntimeException e) {
      // Ignore: polling (below) still recovers the connection.
      networkCallback = null;
    }
  }

  private void scheduleShowOverlay() {
    if (overlayShowScheduled || overlay != null || loaded) return;
    overlayShowScheduled = true;
    mainHandler.postDelayed(() -> {
      overlayShowScheduled = false;
      if (!loaded && overlay == null) {
        // Add our overlay first (it sits on top), then release the Capacitor launch splash so it
        // stops being kept on screen. Without releasing it, the splash — kept alive on Android 12+
        // by the AndroidX keep-on-screen condition — would remain above everything.
        showOverlay();
        hideCapacitorSplash();
        startPolling();
      }
    }, SHOW_DELAY_MS);
  }

  private void showOverlay() {
    Context ctx = activity;

    final Typeface semibold = ResourcesCompat.getFont(ctx, R.font.montserrat_semibold);

    // Root: white background matching the splash, with the splash artwork (WTMG logo) filling it.
    overlay = new FrameLayout(ctx);
    overlay.setBackgroundColor(Color.WHITE);
    overlay.setClickable(true); // swallow touches to the WebView underneath

    ImageView logo = new ImageView(ctx);
    logo.setImageResource(R.drawable.splash);
    logo.setScaleType(ImageView.ScaleType.CENTER_CROP);
    // Nudge the logo up ~5% of screen height so it reads as centered relative to the band below it.
    logo.setTranslationY(-(activity.getResources().getDisplayMetrics().heightPixels * 0.05f));
    overlay.addView(logo, new FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    // Bottom block: warning band + spinner, anchored to the bottom (below the centered logo).
    LinearLayout bottom = new LinearLayout(ctx);
    bottom.setOrientation(LinearLayout.VERTICAL);
    bottom.setPadding(0, 0, 0, dp(40));

    // Screen-wide yellow warning band: [no-internet icon] + message.
    LinearLayout band = new LinearLayout(ctx);
    band.setOrientation(LinearLayout.HORIZONTAL);
    band.setGravity(Gravity.CENTER_VERTICAL);
    band.setBackgroundColor(Color.parseColor("#FCD34D"));
    band.setPadding(dp(20), dp(16), dp(20), dp(16));

    ImageView icon = new ImageView(ctx);
    icon.setImageResource(R.drawable.ic_wifi_slash);
    LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(24), dp(24));
    iconParams.rightMargin = dp(14);
    band.addView(icon, iconParams);

    TextView message = new TextView(ctx);
    message.setText(activity.getString(R.string.offline_message));
    message.setTextColor(Color.parseColor("#1C281C"));
    message.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
    message.setLineSpacing(0, 1.2f);
    if (semibold != null) message.setTypeface(semibold);
    LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
      0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    band.addView(message, messageParams);

    // Spinner (no caption), no background, centered below the band.
    LinearLayout spinnerBlock = new LinearLayout(ctx);
    spinnerBlock.setOrientation(LinearLayout.VERTICAL);
    spinnerBlock.setGravity(Gravity.CENTER);
    spinnerBlock.setPadding(dp(24), dp(20), dp(24), 0);

    ProgressBar spinner = new ProgressBar(ctx);
    spinner.setIndeterminateTintList(ColorStateList.valueOf(Color.parseColor("#495747")));

    spinnerBlock.addView(spinner);

    bottom.addView(band, new LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
    bottom.addView(spinnerBlock, new LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

    FrameLayout.LayoutParams bottomParams = new FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    bottomParams.gravity = Gravity.BOTTOM;
    overlay.addView(bottom, bottomParams);

    // hideCapacitorSplash() (called right after this) releases the kept splash, so no splash window
    // is left above the Activity's content view — attaching the overlay to the content view is
    // enough to cover the WebView.
    ViewGroup content = activity.findViewById(android.R.id.content);
    content.addView(overlay, new FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    overlay.bringToFront();
  }

  private void removeOverlay() {
    if (overlay == null) return;
    ViewGroup parent = (ViewGroup) overlay.getParent();
    if (parent != null) parent.removeView(overlay);
    overlay = null;
  }

  /**
   * Releases the Capacitor launch splash screen from native code.
   *
   * <p>With {@code launchAutoHide: false} the splash is normally only hidden once the remote site's
   * JS calls {@code SplashScreen.hide()}. Offline, that never happens. The splash plugin keeps the
   * splash on screen via the AndroidX {@code keepOnScreenCondition}, so simply drawing over it isn't
   * reliable (on Android 12+ it's a system-managed window). We therefore reach into the splash
   * plugin and invoke its helper's public {@code hide(SplashScreenSettings)} to drop the condition.
   *
   * <p>Reflection is only needed to read the plugin's private helper field; the build does not
   * minify ({@code minifyEnabled false}), so the field name is stable. Best-effort: if the internal
   * API ever changes, our overlay window still covers the splash on most devices.
   */
  private void hideCapacitorSplash() {
    try {
      PluginHandle handle = bridge.getPlugin("SplashScreen");
      if (handle == null) return;
      Plugin plugin = handle.getInstance();
      if (plugin == null) return;
      Field field = plugin.getClass().getDeclaredField("splashScreen");
      field.setAccessible(true);
      Object helper = field.get(plugin);
      if (helper instanceof SplashScreen) {
        ((SplashScreen) helper).hide(new SplashScreenSettings());
      }
    } catch (Throwable ignored) {
      // Best effort — the overlay window remains as a visual fallback.
    }
  }

  private void startPolling() {
    if (polling) return;
    polling = true;
    mainHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS);
  }

  private final Runnable pollRunnable = new Runnable() {
    @Override
    public void run() {
      if (loaded) return;
      reloadRemote();
      mainHandler.postDelayed(this, POLL_INTERVAL_MS);
    }
  };

  /** Reloads the remote site, applying any deep link captured while offline. */
  private void reloadRemote() {
    if (webView == null || loaded) return;
    final String url = buildLoadUrl();
    webView.post(() -> webView.loadUrl(url));
  }

  private String buildLoadUrl() {
    if (pendingPath == null || pendingPath.isEmpty()) {
      return serverUrl;
    }
    String base = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
    return base + pendingPath;
  }

  private void markLoaded() {
    if (loaded) return;
    loaded = true;
    pendingPath = null;
    mainHandler.removeCallbacks(pollRunnable);
    polling = false;
    removeOverlay();
    unregisterNetworkCallback();
  }

  private void unregisterNetworkCallback() {
    if (connectivityManager != null && networkCallback != null) {
      try {
        connectivityManager.unregisterNetworkCallback(networkCallback);
      } catch (RuntimeException ignored) {
        // Already unregistered.
      }
      networkCallback = null;
    }
  }

  /**
   * Should be called from {@code MainActivity.onNewIntent}. While the gate is still active (remote
   * site not yet loaded), it stores the deep link so it can be applied to the recovery load.
   */
  public void handleNewIntent(Intent intent) {
    if (!loaded) {
      captureDeepLink(intent);
    }
  }

  private void captureDeepLink(Intent intent) {
    if (intent == null) return;
    Uri data = intent.getData();
    if (data == null) return;
    String path = data.getPath();
    if (path == null) return;
    String query = data.getQuery();
    StringBuilder sb = new StringBuilder(path);
    if (query != null && !query.isEmpty()) {
      sb.append('?').append(query);
    }
    String fragment = data.getFragment();
    if (fragment != null && !fragment.isEmpty()) {
      sb.append('#').append(fragment);
    }
    pendingPath = sb.toString();
  }

  /** Should be called from {@code MainActivity.onDestroy}. */
  public void destroy() {
    mainHandler.removeCallbacks(pollRunnable);
    unregisterNetworkCallback();
    removeOverlay();
  }

  private int dp(int value) {
    float density = activity.getResources().getDisplayMetrics().density;
    return Math.round(value * density);
  }
}
