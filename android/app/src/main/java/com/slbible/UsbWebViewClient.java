package com.slbible;

import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Extends Capacitor's WebViewClient to stream USB/SAF files at
 * https://localhost/_capacitor_usb_/{url-encoded-content-uri}
 *
 * This bypasses the _capacitor_file_ handler (which uses FileInputStream and
 * fails for scoped-storage paths) by using the ContentResolver instead, backed
 * by the SAF permission already granted by the user.
 */
public class UsbWebViewClient extends BridgeWebViewClient {

    static final String USB_PATH_PREFIX = "/_capacitor_usb_/";
    private final Bridge bridge;

    public UsbWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String path = request.getUrl().getPath();
        if (path != null && path.startsWith(USB_PATH_PREFIX)) {
            return streamUsbFile(request);
        }
        return super.shouldInterceptRequest(view, request);
    }

    private WebResourceResponse streamUsbFile(WebResourceRequest request) {
        String token = request.getUrl().getPath().substring(USB_PATH_PREFIX.length());
        Uri contentUri = UsbVideoRegistry.get(token);
        if (contentUri == null) {
            Log.e("UsbWebViewClient", "no URI registered for token: " + token);
            return errorResponse();
        }
        Log.d("UsbWebViewClient", "streaming: " + contentUri);

        ContentResolver cr = bridge.getContext().getContentResolver();

        // Resolve file size for range support
        long fileSize = -1;
        try (Cursor cursor = cr.query(contentUri, new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int col = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (col >= 0) fileSize = cursor.getLong(col);
            }
        } catch (Exception e) {
            Log.w("UsbWebViewClient", "could not query file size: " + e.getMessage());
        }

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "video/mp4");
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Accept-Ranges", "bytes");

        String rangeHeader = request.getRequestHeaders().get("Range");

        try {
            if (rangeHeader != null && fileSize > 0) {
                // Parse "bytes=start-end"
                String[] parts = rangeHeader.replace("bytes=", "").split("-");
                long start = Long.parseLong(parts[0].trim());
                long end = (parts.length > 1 && !parts[1].trim().isEmpty())
                        ? Long.parseLong(parts[1].trim())
                        : fileSize - 1;
                long length = end - start + 1;

                headers.put("Content-Range", "bytes " + start + "-" + end + "/" + fileSize);
                headers.put("Content-Length", String.valueOf(length));

                // Use ParcelFileDescriptor for efficient seeking
                ParcelFileDescriptor pfd = cr.openFileDescriptor(contentUri, "r");
                if (pfd == null) return errorResponse();
                FileInputStream fis = new FileInputStream(pfd.getFileDescriptor());
                fis.getChannel().position(start);

                Log.d("UsbWebViewClient", "206 range " + start + "-" + end + "/" + fileSize);
                return new WebResourceResponse("video/mp4", null, 206, "Partial Content", headers, fis);
            } else {
                InputStream is = cr.openInputStream(contentUri);
                if (is == null) return errorResponse();
                if (fileSize > 0) headers.put("Content-Length", String.valueOf(fileSize));

                Log.d("UsbWebViewClient", "200 full file, size=" + fileSize);
                return new WebResourceResponse("video/mp4", null, 200, "OK", headers, is);
            }
        } catch (IOException e) {
            Log.e("UsbWebViewClient", "stream error: " + e.getMessage());
            return errorResponse();
        }
    }

    private WebResourceResponse errorResponse() {
        return new WebResourceResponse("text/plain", "utf-8", 500, "Internal Server Error",
                new HashMap<>(), null);
    }
}
