package com.slbible;

import android.net.Uri;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Maps short UUID tokens to SAF content URIs so we never pass a content:// URI
 *  through a URL (where percent-encoding gets mangled by the WebView stack). */
public class UsbVideoRegistry {
    private static final Map<String, Uri> registry = new HashMap<>();

    public static String register(Uri uri) {
        String token = UUID.randomUUID().toString();
        registry.put(token, uri);
        return token;
    }

    public static Uri get(String token) {
        return registry.get(token);
    }
}
