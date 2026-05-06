package com.slbible;

import android.app.Activity;
import android.content.BroadcastReceiver;
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
                } else {
                    data.put("status", "removed");
                }
                notifyListeners("usbStateChange", data);
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_MEDIA_MOUNTED);
        filter.addAction(Intent.ACTION_MEDIA_REMOVED);
        filter.addAction(Intent.ACTION_MEDIA_EJECT);
        // Required: media broadcasts use file:// URIs
        filter.addDataScheme("file");

        // Android 13+ requires an explicit exported flag for runtime receivers
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(mediaReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(mediaReceiver, filter);
        }
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
                JSObject ret = new JSObject();
                ret.put("uri", treeUri.toString());
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

            DocumentFile bookDir = playlistDir.findFile(book);
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

            // Build a localhost URL the WebView can load, streamed via UsbWebViewClient
            // using our SAF permission (content:// URIs are not directly playable by <video>).
            String playableUrl = "https://localhost"
                    + UsbWebViewClient.USB_PATH_PREFIX
                    + Uri.encode(videoFile.getUri().toString());
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
                String bookName = bookDir.getName();
                if (bookName == null) continue;

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

    @Override
    protected void handleOnDestroy() {
        if (mediaReceiver != null) {
            getContext().unregisterReceiver(mediaReceiver);
            mediaReceiver = null;
        }
    }
}
