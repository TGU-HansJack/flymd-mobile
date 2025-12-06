package com.flymd.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.flymd.mobile.plugins.saf.SafPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate so Bridge builds with them
        registerPlugin(SafPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
