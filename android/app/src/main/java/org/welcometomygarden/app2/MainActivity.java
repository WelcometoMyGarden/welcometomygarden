package org.welcometomygarden.app2;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
      // Enable edge-to-edge mode
      // See https://github.com/capacitor-community/safe-area?tab=readme-ov-file#usage
      EdgeToEdge.enable(this);
    }
}
