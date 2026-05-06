package com.slbible;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UsbStoragePlugin.class);
        super.onCreate(savedInstanceState);
        // Replace the default WebViewClient with one that can stream SAF files
        bridge.getWebView().setWebViewClient(new UsbWebViewClient(bridge));
    }
}
