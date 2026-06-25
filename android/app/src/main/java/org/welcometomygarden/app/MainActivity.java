package org.welcometomygarden.app;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

public class MainActivity extends BridgeActivity {
  private OfflineGate offlineGate;

  // Our web UI currently is not designed for wide screens with short height
  // like phones in landscape mode. Square-ish foldable inner screens are OK.
  private boolean canSupportLandscape() {
    return getResources().getConfiguration().screenWidthDp >= 600 &&
      getResources().getConfiguration().screenHeightDp >= 600;
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Inject the runtime-selected backend channel before the bridge is built. When no override is
    // persisted this resolves to the baked server.url, preserving the default behavior. See
    // WtmgServerConfig. Must run before super.onCreate(), which builds the bridge from this.config.
    CapConfig runtimeConfig = WtmgServerConfig.buildConfig(this);
    if (runtimeConfig != null) {
      this.config = runtimeConfig;
    }

    // Register the app-local backend-channel plugin before the bridge loads (it is not part of the
    // auto-registered packageClassList, which only covers npm plugin packages).
    registerPlugin(WtmgServerPlugin.class);

    super.onCreate(savedInstanceState);

    // Lock phones to portrait, allow tablets to rotate
    if (!canSupportLandscape()) {
      setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    } else {
      setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR);
    }

    // Enable edge-to-edge mode
    // see https://github.com/capacitor-community/safe-area
    EdgeToEdge.enable(this);

    // Show a native offline screen (and recover automatically) if the remote site can't load
    // because the device is offline at startup. See OfflineGate for details.
    offlineGate = OfflineGate.attach(this, getBridge());
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    if (offlineGate != null) {
      offlineGate.handleNewIntent(intent);
    }
  }

  @Override
  public void onDestroy() {
    if (offlineGate != null) {
      offlineGate.destroy();
      offlineGate = null;
    }
    super.onDestroy();
  }
}
