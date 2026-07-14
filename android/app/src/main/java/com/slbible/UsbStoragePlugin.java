package com.slbible;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.util.Log;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import org.json.JSONObject;

@CapacitorPlugin(name = "UsbStorage")
public class UsbStoragePlugin extends Plugin {

    private BroadcastReceiver mediaReceiver;

    @Override
    public void load() {
        mediaReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                JSObject data = new JSObject();
                if (Intent.ACTION_MEDIA_MOUNTED.equals(action)) {
                    data.put("status", "mounted");
                    data.put("path", intent.getData() != null ? intent.getData().getPath() : "");
                } else if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (device != null) {
                        data.put("status", "mounted");
                        data.put("path", device.getDeviceName());
                    }
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (device != null) {
                        data.put("status", "removed");
                        data.put("path", device.getDeviceName());
                    }
                } else if (Intent.ACTION_MEDIA_EJECT.equals(action)) {
                    data.put("status", "removed");
                }
                notifyListeners("usbStateChange", data);
            }
        };

        // Media broadcasts (ACTION_MEDIA_*) require a file:// data scheme filter.
        IntentFilter mediaFilter = new IntentFilter();
        mediaFilter.addAction(Intent.ACTION_MEDIA_MOUNTED);
        mediaFilter.addAction(Intent.ACTION_MEDIA_REMOVED);
        mediaFilter.addAction(Intent.ACTION_MEDIA_EJECT);
        mediaFilter.addDataScheme("file"); // Required for media broadcasts

        // USB device broadcasts must NOT have a data scheme filter — they carry no URI.
        IntentFilter usbFilter = new IntentFilter();
        usbFilter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        usbFilter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);

        // Android 13+ requires an explicit exported flag for runtime receivers
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(mediaReceiver, mediaFilter, Context.RECEIVER_EXPORTED);
            getContext().registerReceiver(mediaReceiver, usbFilter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(mediaReceiver, mediaFilter);
            getContext().registerReceiver(mediaReceiver, usbFilter);
        }
    }

    @PluginMethod
    public void checkUsbConnected(PluginCall call) {
        android.hardware.usb.UsbManager usbManager =
            (android.hardware.usb.UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        boolean connected = usbManager != null && !usbManager.getDeviceList().isEmpty();
        JSObject ret = new JSObject();
        ret.put("connected", connected);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestDirectoryAccess(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        startActivityForResult(call, intent, "handleDirectoryResult");
    }

    @ActivityCallback
    private void handleDirectoryResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri treeUri = result.getData().getData();
            if (treeUri != null) {
                getContext().getContentResolver().takePersistableUriPermission(
                    treeUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                );

                // Scan root-level folders so the JS side can validate without
                // a second round-trip plugin call.
                JSArray folders = new JSArray();
                try {
                    DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
                    if (root != null && root.exists()) {
                        for (DocumentFile child : root.listFiles()) {
                            if (child.isDirectory()) {
                                String name = child.getName();
                                if (name != null) folders.put(name);
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.w("UsbStorage", "Could not list root folders: " + e.getMessage());
                }

                JSObject ret = new JSObject();
                ret.put("uri", treeUri.toString());
                ret.put("folders", folders);
                call.resolve(ret);
            } else {
                call.reject("No URI returned");
            }
        } else {
            call.reject("Cancelled");
        }
    }

    /**
     * Resolves the content:// URI for a specific video file on the USB drive.
     * Expects: treeUri, playlist, book, chapter (without .mp4)
     * Returns: { uri: string }
     */
    @PluginMethod
    public void getPlayableUri(PluginCall call) {
        String treeUriStr = call.getString("treeUri");
        String playlist = call.getString("playlist");
        String book = call.getString("book");
        String chapter = call.getString("chapter");

        if (treeUriStr == null || playlist == null || book == null || chapter == null) {
            call.reject("Missing required parameters");
            return;
        }

        Log.d("UsbStorage", "getPlayableUri: treeUri=" + treeUriStr + " playlist=" + playlist + " book=" + book + " chapter=" + chapter);

        try {
            Uri treeUri = Uri.parse(treeUriStr);
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
            if (root == null || !root.exists()) {
                Log.d("UsbStorage", "root not accessible");
                call.reject("USB directory is not accessible");
                return;
            }
            Log.d("UsbStorage", "root ok, name=" + root.getName());

            DocumentFile playlistDir = root.findFile(playlist);
            if (playlistDir == null || !playlistDir.isDirectory()) {
                // Log what IS in root so we can see the name mismatch
                StringBuilder children = new StringBuilder();
                for (DocumentFile f : root.listFiles()) children.append(f.getName()).append(", ");
                Log.d("UsbStorage", "playlist dir '" + playlist + "' not found. root contains: " + children);
                call.reject("Playlist folder not found: " + playlist);
                return;
            }

            DocumentFile bookDir = findFileIgnoreCase(playlistDir, book);
            if (bookDir == null || !bookDir.isDirectory()) {
                StringBuilder children = new StringBuilder();
                for (DocumentFile f : playlistDir.listFiles()) children.append(f.getName()).append(", ");
                Log.d("UsbStorage", "book dir '" + book + "' not found. playlist contains: " + children);
                call.reject("Book folder not found: " + book);
                return;
            }

            DocumentFile videoFile = bookDir.findFile(chapter + ".mp4");
            if (videoFile == null || !videoFile.exists()) {
                StringBuilder children = new StringBuilder();
                for (DocumentFile f : bookDir.listFiles()) children.append(f.getName()).append(", ");
                Log.d("UsbStorage", "file '" + chapter + ".mp4' not found. book contains: " + children);
                call.reject("Video file not found: " + chapter + ".mp4");
                return;
            }

            Log.d("UsbStorage", "found: " + videoFile.getUri());

            // Store the Uri in the registry and expose only a token in the URL —
            // passing a content:// URI through a URL causes the WebView to mangle
            // percent-encoding, breaking the SAF permission check.
            String token = UsbVideoRegistry.register(videoFile.getUri());
            String playableUrl = "https://localhost" + UsbWebViewClient.USB_PATH_PREFIX + token;
            Log.d("UsbStorage", "playable URL: " + playableUrl);

            JSObject ret = new JSObject();
            ret.put("uri", videoFile.getUri().toString());
            ret.put("playableUrl", playableUrl);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e("UsbStorage", "error: " + e.getMessage());
            call.reject("Error finding video: " + e.getMessage());
        }
    }

    /**
     * Lists all video files available on the USB drive for a given playlist.
     * Expects: treeUri, playlist
     * Returns: { videos: [{ book, chapter }] }
     */
    @PluginMethod
    public void scanAvailableVideos(PluginCall call) {
        String treeUriStr = call.getString("treeUri");
        String playlist = call.getString("playlist");

        if (treeUriStr == null || playlist == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            Uri treeUri = Uri.parse(treeUriStr);
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
            if (root == null || !root.exists()) {
                call.reject("USB directory is not accessible");
                return;
            }

            DocumentFile playlistDir = root.findFile(playlist);
            if (playlistDir == null || !playlistDir.isDirectory()) {
                call.reject("Playlist folder not found: " + playlist);
                return;
            }

            JSArray videos = new JSArray();
            DocumentFile[] bookDirs = playlistDir.listFiles();
            for (DocumentFile bookDir : bookDirs) {
                if (!bookDir.isDirectory()) continue;
                String rawBookName = bookDir.getName();
                if (rawBookName == null) continue;
                // Normalise to uppercase so book names match vid.book in the app.
                String bookName = rawBookName.toUpperCase();

                for (DocumentFile file : bookDir.listFiles()) {
                    String name = file.getName();
                    if (name != null && name.endsWith(".mp4")) {
                        JSObject entry = new JSObject();
                        entry.put("book", bookName);
                        entry.put("chapter", name.substring(0, name.length() - 4));
                        videos.put(entry);
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("videos", videos);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error scanning videos: " + e.getMessage());
        }
    }

    /**
     * Copies specific {book, chapter} pairs from a playlist on the USB drive into
     * app-private external storage, mirroring the same path as copyUsbPlaylist.
     * Expects: treeUri, playlist, items: [{book, chapter}]
     * Returns: { filesCopied: N }
     */
    @PluginMethod
    public void copyUsbChapters(PluginCall call) {
        String treeUriStr = call.getString("treeUri");
        String playlist = call.getString("playlist");
        JSArray items = call.getArray("items");

        if (treeUriStr == null || playlist == null || items == null) {
            call.reject("Missing required parameters");
            return;
        }

        new Thread(() -> {
            try {
                Uri treeUri = Uri.parse(treeUriStr);
                DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
                if (root == null || !root.exists()) {
                    call.reject("USB directory is not accessible");
                    return;
                }
                DocumentFile playlistDir = root.findFile(playlist);
                if (playlistDir == null || !playlistDir.isDirectory()) {
                    call.reject("Playlist folder not found: " + playlist);
                    return;
                }

                File destPlaylist = new File(getContext().getExternalFilesDir(null), playlist);
                int filesCopied = 0;

                for (int i = 0; i < items.length(); i++) {
                    try {
                        JSONObject item = items.getJSONObject(i);
                        if (item == null) continue;
                        String book = item.getString("book");
                        String chapter = item.getString("chapter");
                        if (book == null || chapter == null) continue;

                        DocumentFile bookDir = findFileIgnoreCase(playlistDir, book);
                        if (bookDir == null || !bookDir.isDirectory()) continue;

                        DocumentFile videoFile = bookDir.findFile(chapter + ".mp4");
                        if (videoFile == null || !videoFile.exists()) continue;

                        File destBook = new File(destPlaylist, book);
                        if (!destBook.exists()) destBook.mkdirs();
                        File destFile = new File(destBook, chapter + ".mp4");

                        InputStream in = null;
                        OutputStream out = null;
                        try {
                            in = getContext().getContentResolver().openInputStream(videoFile.getUri());
                            if (in == null) continue;
                            out = new FileOutputStream(destFile);
                            byte[] buf = new byte[65536];
                            int len;
                            while ((len = in.read(buf)) != -1) out.write(buf, 0, len);
                            filesCopied++;
                        } catch (Exception e) {
                            Log.w("UsbStorage", "Failed chapter " + book + "/" + chapter + ": " + e.getMessage());
                            if (destFile.exists()) destFile.delete();
                        } finally {
                            if (in != null) try { in.close(); } catch (Exception ignored) {}
                            if (out != null) try { out.close(); } catch (Exception ignored) {}
                        }
                    } catch (Exception e) {
                        Log.w("UsbStorage", "Error at item " + i + ": " + e.getMessage());
                    }
                }

                JSObject ret = new JSObject();
                ret.put("filesCopied", filesCopied);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e("UsbStorage", "copyUsbChapters error: " + e.getMessage());
                call.reject("Error copying chapters: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Checks whether a file was previously copied from USB via copyUsbPlaylist and,
     * if so, registers it in UsbVideoRegistry and returns a _capacitor_usb_ URL so
     * UsbWebViewClient can stream it with Range/206 support.
     * Expects: playlist, book, chapter (without .mp4)
     * Returns: { playableUrl: string }
     */
    @PluginMethod
    public void getLocalCopyUrl(PluginCall call) {
        String playlist = call.getString("playlist");
        String book = call.getString("book");
        String chapter = call.getString("chapter");

        if (playlist == null || book == null || chapter == null) {
            call.reject("Missing required parameters");
            return;
        }

        // Must match the base used in copyUsbPlaylist: getExternalFilesDir(null).
        File destPlaylist = new File(getContext().getExternalFilesDir(null), playlist);
        File bookDir = findDirIgnoreCase(destPlaylist, book);
        if (bookDir == null) {
            Log.d("UsbStorage", "getLocalCopyUrl: book dir not found for '" + book + "' in " + destPlaylist.getAbsolutePath());
            call.reject("Local copy not found");
            return;
        }
        File videoFile = new File(bookDir, chapter + ".mp4");

        Log.d("UsbStorage", "getLocalCopyUrl: path=" + videoFile.getAbsolutePath() + " exists=" + videoFile.exists());

        if (!videoFile.exists()) {
            call.reject("Local copy not found: " + videoFile.getAbsolutePath());
            return;
        }

        // Register a file:// URI in the same registry used for USB content so
        // UsbWebViewClient handles streaming with full Range / 206 support.
        Uri fileUri = Uri.fromFile(videoFile);
        String token = UsbVideoRegistry.register(fileUri);
        String playableUrl = "https://localhost" + UsbWebViewClient.USB_PATH_PREFIX + token;
        Log.d("UsbStorage", "getLocalCopyUrl: " + playableUrl);

        JSObject ret = new JSObject();
        ret.put("playableUrl", playableUrl);
        call.resolve(ret);
    }

    /**
     * Copies all .mp4 files for a playlist from the USB drive into the app's
     * private internal storage (getFilesDir), mirroring the USB folder structure:
     *   getFilesDir()/{playlist}/{book}/{chapter}.mp4
     *
     * Private internal storage needs no external-storage permission and is
     * unaffected by Android scoped-storage rules.
     * Runs on a background thread so it won't block the UI.
     * Expects: treeUri, playlist
     * Returns: { ok: true, filesCopied: N }
     */
    @PluginMethod
    public void copyUsbPlaylist(PluginCall call) {
        String treeUriStr = call.getString("treeUri");
        String playlist = call.getString("playlist");

        if (treeUriStr == null || playlist == null) {
            call.reject("Missing required parameters");
            return;
        }

        new Thread(() -> {
            try {
                Uri treeUri = Uri.parse(treeUriStr);
                DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
                if (root == null || !root.exists()) {
                    call.reject("USB directory is not accessible");
                    return;
                }

                DocumentFile playlistDir = root.findFile(playlist);
                if (playlistDir == null || !playlistDir.isDirectory()) {
                    call.reject("Playlist folder not found: " + playlist);
                    return;
                }

                // App-private external storage — no permission needed on any Android version.
                // getLocalCopyUrl uses the same base, so paths are guaranteed to match.
                File destBase = new File(getContext().getExternalFilesDir(null), playlist);
                int filesCopied = 0;

                for (DocumentFile bookDir : playlistDir.listFiles()) {
                    if (!bookDir.isDirectory()) continue;
                    String bookName = bookDir.getName();
                    if (bookName == null) continue;

                    File destBook = new File(destBase, bookName);
                    if (!destBook.exists()) destBook.mkdirs();

                    for (DocumentFile videoFile : bookDir.listFiles()) {
                        String name = videoFile.getName();
                        if (name == null || !name.endsWith(".mp4")) continue;

                        File destFile = new File(destBook, name);
                        InputStream in = null;
                        OutputStream out = null;
                        try {
                            in = getContext().getContentResolver()
                                    .openInputStream(videoFile.getUri());
                            if (in == null) continue;
                            out = new FileOutputStream(destFile);
                            byte[] buffer = new byte[65536]; // 64 KB chunks
                            int len;
                            while ((len = in.read(buffer)) != -1) {
                                out.write(buffer, 0, len);
                            }
                            filesCopied++;
                            Log.d("UsbStorage", "Copied: " + playlist + "/" + bookName + "/" + name);
                        } catch (Exception e) {
                            Log.w("UsbStorage", "Failed to copy " + name + ": " + e.getMessage());
                            // Partial file — clean up so it won't be treated as complete.
                            if (destFile.exists()) destFile.delete();
                        } finally {
                            if (in != null) try { in.close(); } catch (Exception ignored) {}
                            if (out != null) try { out.close(); } catch (Exception ignored) {}
                        }
                    }
                }

                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("filesCopied", filesCopied);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e("UsbStorage", "copyUsbPlaylist error: " + e.getMessage());
                call.reject("Error copying playlist: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Returns the first child of {@code dir} whose name matches {@code name}
     * case-insensitively, or null if none is found.
     */
    private DocumentFile findFileIgnoreCase(DocumentFile dir, String name) {
        if (dir == null) return null;
        for (DocumentFile child : dir.listFiles()) {
            String childName = child.getName();
            if (childName != null && childName.equalsIgnoreCase(name)) return child;
        }
        return null;
    }

    /**
     * Returns the first subdirectory of {@code parent} whose name matches
     * {@code name} case-insensitively, or null if none is found.
     */
    private File findDirIgnoreCase(File parent, String name) {
        if (parent == null || !parent.isDirectory()) return null;
        File[] children = parent.listFiles();
        if (children == null) return null;
        for (File child : children) {
            if (child.isDirectory() && child.getName().equalsIgnoreCase(name)) return child;
        }
        return null;
    }

    @Override
    protected void handleOnDestroy() {
        if (mediaReceiver != null) {
            getContext().unregisterReceiver(mediaReceiver);
            mediaReceiver = null;
        }
    }
}
