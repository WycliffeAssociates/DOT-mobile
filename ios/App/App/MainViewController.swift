import Capacitor

/// Subclass of CAPBridgeViewController used to register app-target plugins
/// that are not part of any CocoaPod and therefore not picked up by cap sync.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(UsbStoragePlugin())
    }
}
