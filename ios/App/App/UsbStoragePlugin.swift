import Capacitor
import UIKit
import UniformTypeIdentifiers

// MARK: - Plugin

@objc(UsbStoragePlugin)
public class UsbStoragePlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {

    // MARK: CAPBridgedPlugin

    public let identifier = "UsbStoragePlugin"
    public let jsName = "UsbStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkUsbConnected",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestDirectoryAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanAvailableVideos",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlayableUri",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copyUsbPlaylist",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copyUsbChapters",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLocalCopyUrl",       returnType: CAPPluginReturnPromise),
    ]

    // MARK: State

    /// Pending call waiting for UIDocumentPickerViewController to return.
    private var pendingDirectoryCall: CAPPluginCall?

    /// The currently-active security-scoped root URL (kept open between calls so
    /// scanning / copying / playback all work without requiring the user to
    /// re-pick the folder).
    private var activeScopeUrl: URL?

    // MARK: - checkUsbConnected

    /// iOS has no USB mount/unmount broadcast events.  Always return false so
    /// the automatic dialog is skipped; the user opens USB storage manually.
    @objc func checkUsbConnected(_ call: CAPPluginCall) {
        call.resolve(["connected": false])
    }

    // MARK: - requestDirectoryAccess

    @objc func requestDirectoryAccess(_ call: CAPPluginCall) {
        pendingDirectoryCall = call

        DispatchQueue.main.async {
            guard let rootVC = self.bridge?.viewController else {
                call.reject("No root view controller available")
                return
            }
            // Walk to the topmost presented VC so the picker is never blocked.
            var topVC = rootVC
            while let presented = topVC.presentedViewController {
                topVC = presented
            }

            let picker: UIDocumentPickerViewController
            if #available(iOS 14.0, *) {
                picker = UIDocumentPickerViewController(
                    forOpeningContentTypes: [UTType.folder])
            } else {
                picker = UIDocumentPickerViewController(
                    documentTypes: ["public.folder"], in: .open)
            }
            picker.delegate = self
            picker.allowsMultipleSelection = false
            topVC.present(picker, animated: true)
        }
    }

    // MARK: UIDocumentPickerDelegate

    public func documentPicker(
        _ controller: UIDocumentPickerViewController,
        didPickDocumentsAt urls: [URL]
    ) {
        guard let call = pendingDirectoryCall, let url = urls.first else { return }
        pendingDirectoryCall = nil

        guard url.startAccessingSecurityScopedResource() else {
            call.reject("Could not access the selected folder")
            return
        }

        // Replace any previous active scope.
        activeScopeUrl?.stopAccessingSecurityScopedResource()
        activeScopeUrl = url

        let fm = FileManager.default
        let contents = (try? fm.contentsOfDirectory(
            at: url,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: .skipsHiddenFiles)) ?? []

        let folders: [String] = contents.compactMap { child in
            let isDir = (try? child.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory
            return isDir == true ? child.lastPathComponent : nil
        }

        call.resolve(["uri": url.absoluteString, "folders": folders])
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingDirectoryCall?.reject("User cancelled")
        pendingDirectoryCall = nil
    }

    // MARK: - scanAvailableVideos

    @objc func scanAvailableVideos(_ call: CAPPluginCall) {
        guard
            let treeUriString = call.getString("treeUri"),
            let treeUrl = URL(string: treeUriString),
            let playlist = call.getString("playlist")
        else {
            call.reject("Missing parameters")
            return
        }

        let playlistUrl = treeUrl.appendingPathComponent(playlist)
        let fm = FileManager.default
        var videos: [[String: String]] = []

        guard let books = try? fm.contentsOfDirectory(
            at: playlistUrl,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: .skipsHiddenFiles
        ) else {
            call.resolve(["videos": videos])
            return
        }

        for bookUrl in books {
            let isDir = (try? bookUrl.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory
            guard isDir == true else { continue }
            // Normalise to uppercase so book names match vid.book in the app.
            let book = bookUrl.lastPathComponent.uppercased()

            guard let chapters = try? fm.contentsOfDirectory(
                at: bookUrl,
                includingPropertiesForKeys: nil,
                options: .skipsHiddenFiles
            ) else { continue }

            for chapterUrl in chapters {
                guard chapterUrl.pathExtension.lowercased() == "mp4" else { continue }
                let chapter = chapterUrl.deletingPathExtension().lastPathComponent
                videos.append(["book": book, "chapter": chapter])
            }
        }

        call.resolve(["videos": videos])
    }

    // MARK: - getPlayableUri

    /// Copies the video to the app's temp directory (if not already cached there)
    /// and returns a capacitor:// URL the WKWebView can play.
    @objc func getPlayableUri(_ call: CAPPluginCall) {
        guard
            let treeUriString = call.getString("treeUri"),
            let treeUrl = URL(string: treeUriString),
            let playlist = call.getString("playlist"),
            let book = call.getString("book"),
            let chapter = call.getString("chapter")
        else {
            call.reject("Missing parameters")
            return
        }

        let playlistUrl = treeUrl.appendingPathComponent(playlist)
        guard let bookUrl = findSubdir(in: playlistUrl, named: book) else {
            call.reject("Book folder not found: \(book)")
            return
        }
        let srcUrl = bookUrl.appendingPathComponent("\(chapter).mp4")

        guard FileManager.default.fileExists(atPath: srcUrl.path) else {
            call.reject("Video file not found on USB drive")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            let tmpUrl = FileManager.default.temporaryDirectory
                .appendingPathComponent("usb_\(playlist)_\(book)_\(chapter).mp4")

            if !FileManager.default.fileExists(atPath: tmpUrl.path) {
                do {
                    try FileManager.default.copyItem(at: srcUrl, to: tmpUrl)
                } catch {
                    call.reject("Failed to prepare video for playback: \(error.localizedDescription)")
                    return
                }
            }

            let playableUrl = "capacitor://localhost/_capacitor_file_\(tmpUrl.path)"
            call.resolve(["uri": srcUrl.absoluteString, "playableUrl": playableUrl])
        }
    }

    // MARK: - copyUsbPlaylist

    @objc func copyUsbPlaylist(_ call: CAPPluginCall) {
        guard
            let treeUriString = call.getString("treeUri"),
            let treeUrl = URL(string: treeUriString),
            let playlist = call.getString("playlist")
        else {
            call.reject("Missing parameters")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            var filesCopied = 0
            let fm = FileManager.default
            let playlistUrl = treeUrl.appendingPathComponent(playlist)

            guard let books = try? fm.contentsOfDirectory(
                at: playlistUrl,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: .skipsHiddenFiles
            ) else {
                call.resolve(["ok": true, "filesCopied": 0])
                return
            }

            for bookUrl in books {
                let isDir = (try? bookUrl.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory
                guard isDir == true else { continue }
                let book = bookUrl.lastPathComponent

                guard let chapters = try? fm.contentsOfDirectory(
                    at: bookUrl,
                    includingPropertiesForKeys: nil,
                    options: .skipsHiddenFiles
                ) else { continue }

                for chapterUrl in chapters {
                    guard chapterUrl.pathExtension.lowercased() == "mp4" else { continue }
                    let chapter = chapterUrl.deletingPathExtension().lastPathComponent

                    if self.copyVideoFile(
                        src: chapterUrl,
                        playlist: playlist,
                        book: book,
                        chapter: chapter,
                        fm: fm
                    ) { filesCopied += 1 }
                }
            }

            call.resolve(["ok": true, "filesCopied": filesCopied])
        }
    }

    // MARK: - copyUsbChapters

    @objc func copyUsbChapters(_ call: CAPPluginCall) {
        guard
            let treeUriString = call.getString("treeUri"),
            let treeUrl = URL(string: treeUriString),
            let playlist = call.getString("playlist"),
            let rawItems = call.getArray("items") as? [[String: Any]]
        else {
            call.reject("Missing parameters")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            var filesCopied = 0
            let fm = FileManager.default

            for item in rawItems {
                guard
                    let book = item["book"] as? String,
                    let chapter = item["chapter"] as? String
                else { continue }

                let playlistUrl = treeUrl.appendingPathComponent(playlist)
                guard let bookUrl = self.findSubdir(in: playlistUrl, named: book) else { continue }
                let srcUrl = bookUrl.appendingPathComponent("\(chapter).mp4")

                if self.copyVideoFile(
                    src: srcUrl,
                    playlist: playlist,
                    book: book,
                    chapter: chapter,
                    fm: fm
                ) { filesCopied += 1 }
            }

            call.resolve(["filesCopied": filesCopied])
        }
    }

    // MARK: - getLocalCopyUrl

    @objc func getLocalCopyUrl(_ call: CAPPluginCall) {
        guard
            let playlist = call.getString("playlist"),
            let book = call.getString("book"),
            let chapter = call.getString("chapter")
        else {
            call.reject("Missing parameters")
            return
        }

        let playlistLocalUrl = localDir().appendingPathComponent(playlist)
        guard let bookLocalUrl = findSubdir(in: playlistLocalUrl, named: book) else {
            call.reject("Local copy not found")
            return
        }
        let videoFile = bookLocalUrl.appendingPathComponent("\(chapter).mp4")

        guard FileManager.default.fileExists(atPath: videoFile.path) else {
            call.reject("Local copy not found")
            return
        }

        let playableUrl = "capacitor://localhost/_capacitor_file_\(videoFile.path)"
        call.resolve(["playableUrl": playableUrl])
    }

    // MARK: - Helpers

    private func localDir() -> URL {
        FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)
            .first!
    }

    /// Returns the first subdirectory of `parent` whose name matches `name`
    /// case-insensitively, or nil if none exists.
    private func findSubdir(in parent: URL, named name: String) -> URL? {
        let fm = FileManager.default
        guard let contents = try? fm.contentsOfDirectory(
            at: parent,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: .skipsHiddenFiles
        ) else { return nil }
        return contents.first {
            $0.lastPathComponent.caseInsensitiveCompare(name) == .orderedSame &&
            ((try? $0.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true)
        }
    }

    /// Copies a single .mp4 file to the app's Documents directory.
    /// Returns true on success.
    @discardableResult
    private func copyVideoFile(
        src: URL,
        playlist: String,
        book: String,
        chapter: String,
        fm: FileManager
    ) -> Bool {
        let destDir = localDir()
            .appendingPathComponent(playlist)
            .appendingPathComponent(book)
        let destFile = destDir.appendingPathComponent("\(chapter).mp4")

        do {
            try fm.createDirectory(at: destDir, withIntermediateDirectories: true)
            if fm.fileExists(atPath: destFile.path) {
                try fm.removeItem(at: destFile)
            }
            try fm.copyItem(at: src, to: destFile)
            return true
        } catch {
            return false
        }
    }
}
