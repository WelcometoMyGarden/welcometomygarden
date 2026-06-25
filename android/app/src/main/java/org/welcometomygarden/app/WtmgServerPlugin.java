package org.welcometomygarden.app;

import android.app.Activity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * App-local Capacitor plugin exposing the backend-channel switcher to the web layer
 * (see {@code src/lib/api/serverChannel.ts}). Registered in {@link MainActivity#onCreate}.
 *
 * <p>{@code setUrl}/{@code reset} persist the choice via {@link WtmgServerConfig} and then recreate
 * the activity, which rebuilds the bridge against the new {@code server.url}.
 */
@CapacitorPlugin(name = "WtmgServer")
public class WtmgServerPlugin extends Plugin {

  @PluginMethod
  public void getConfig(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("current", WtmgServerConfig.currentUrl(getContext()));
    ret.put("baseline", WtmgServerConfig.bakedDefaultUrl(getContext()));
    ret.put("isPersisted", WtmgServerConfig.isPersisted(getContext()));
    call.resolve(ret);
  }

  @PluginMethod
  public void setUrl(PluginCall call) {
    String url = call.getString("url");
    if (!WtmgServerConfig.isValid(url)) {
      call.reject("A valid http(s) URL is required");
      return;
    }
    WtmgServerConfig.setOverride(getContext(), url);
    rebuild();
    call.resolve();
  }

  @PluginMethod
  public void reset(PluginCall call) {
    WtmgServerConfig.setOverride(getContext(), null);
    rebuild();
    call.resolve();
  }

  /** Recreates the activity so the bridge is rebuilt against the resolved server URL. */
  private void rebuild() {
    final Activity activity = getActivity();
    if (activity != null) {
      activity.runOnUiThread(activity::recreate);
    }
  }
}
