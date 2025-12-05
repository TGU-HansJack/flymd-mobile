package com.flymd.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.flymd.mobile.plugins.saf.SafPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(SafPlugin.class);
    }
}
