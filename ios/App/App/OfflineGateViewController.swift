import UIKit
import WebKit
import Network
import Capacitor

/// Shared store for deep links that arrive while the app is offline, so they can be re-applied once
/// connectivity is restored and the remote site loads. Populated from `AppDelegate` (custom URL
/// schemes and Universal Links) and consumed by `OfflineGateViewController`.
final class OfflinePendingLink {
    static let shared = OfflinePendingLink()
    private init() {}

    var path: String?

    func capture(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }
        var result = components.path
        if let query = components.query, !query.isEmpty {
            result += "?" + query
        }
        if let fragment = components.fragment, !fragment.isEmpty {
            result += "#" + fragment
        }
        if !result.isEmpty {
            path = result
        }
    }
}

/// Native "offline gate" for the Capacitor app.
///
/// In production the app loads the remote website via Capacitor's `server.url`. The splash screen is
/// configured with `launchAutoHide: false` and is only hidden once the remote site's JavaScript boots
/// (see `src/routes/+layout.svelte`). When the device has no internet connection at startup, the
/// remote site never loads, the JS never runs, and the splash screen stays on screen forever.
///
/// This controller watches connectivity (via `NWPathMonitor`) and the WebView's load progress. If the
/// remote site can't be reached because the device is offline, it shows a native, localized overlay
/// with a spinner, polls for connectivity, and reloads `server.url` as soon as the connection is
/// restored. Deep links received while offline are re-applied on the recovery load.
class OfflineGateViewController: CAPBridgeViewController, WKScriptMessageHandler {

    /// Name of the JS->native bridge message used to request a cache-ignoring reload.
    /// Posted from the web layer via `window.webkit.messageHandlers.wtmgHardReload.postMessage(...)`
    /// (see `hardReload()` in `src/routes/+layout.svelte`).
    private static let hardReloadMessageName = "wtmgHardReload"

    /// Grace period before showing the overlay, to avoid flashing it during fast reconnects.
    private let showDelay: TimeInterval = 2.5
    /// How often we re-attempt the load while the overlay is visible (the connectivity poll).
    private let pollInterval: TimeInterval = 3.0

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "org.welcometomygarden.app.offlinegate")

    private var overlay: UIView?
    private var loaded = false
    private var overlayShowScheduled = false
    private var pollTimer: Timer?
    private var progressObservation: NSKeyValueObservation?

    private var serverURL: URL? {
        return bridge?.config.serverURL
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Let the web layer trigger a cache-ignoring reload (see `userContentController(_:didReceive:)`).
        // Registered regardless of `serverURL`; harmless for local-bundle builds.
        // Note: the user content controller retains the handler strongly, but this view controller
        // is the app's root bridge controller and lives for the whole app lifetime, so the resulting
        // reference cycle is intentional and not a leak.
        webView?.configuration.userContentController.add(self, name: OfflineGateViewController.hardReloadMessageName)

        // Only gate when a remote server URL is configured (production/staging builds).
        guard serverURL != nil else { return }

        observeLoadProgress()

        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self = self, !self.loaded else { return }
                if path.status == .satisfied {
                    // Connectivity is available — (re)try the remote load.
                    self.reloadRemote()
                } else {
                    // Offline — show the overlay after a short grace period.
                    self.scheduleShowOverlay()
                }
            }
        }
        monitor.start(queue: monitorQueue)
    }

    // MARK: - Runtime backend channel

    /// Points the bridge at the runtime-selected server URL (if any) before it is built.
    ///
    /// Called by `CAPBridgeViewController.loadView()` before the bridge/config are created, so setting
    /// `descriptor.serverURL` here makes the chosen channel the canonical app host (correct cookies,
    /// `getServerUrl()`, and navigation handling). When no override is persisted, the baked
    /// `server.url` from `capacitor.config.json` (already on the descriptor) is kept.
    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        if let override = WtmgServerConfig.override {
            descriptor.serverURL = override
        }
        // Keep the preset channels navigable in-webview (rather than punted to the system browser)
        // while/after switching between them.
        let presetHosts = ["welcometomygarden.org", "beta.welcometomygarden.org", "staging.welcometomygarden.org"]
        var hostnames = descriptor.allowedNavigationHostnames
        for host in presetHosts where !hostnames.contains(host) {
            hostnames.append(host)
        }
        descriptor.allowedNavigationHostnames = hostnames
        return descriptor
    }

    /// Registers the app-local `WtmgServer` plugin. Done here (rather than via the auto-registered
    /// `packageClassList`, which only covers npm plugin packages) so the JS layer can switch channels.
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WtmgServerPlugin())
    }

    // MARK: - Load progress

    private func observeLoadProgress() {
        guard let webView = webView else { return }
        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
            guard let self = self, !self.loaded else { return }
            // A committed navigation that reaches full progress on the configured host means the
            // remote site loaded successfully.
            if webView.estimatedProgress >= 1.0,
               let host = webView.url?.host,
               host == self.serverURL?.host {
                DispatchQueue.main.async { self.markLoaded() }
            }
        }
    }

    // MARK: - Hard reload bridge

    /// Handles the `wtmgHardReload` message posted by the web layer when connectivity is restored.
    ///
    /// A plain JS `window.location.reload()` in WKWebView does not reliably re-fetch resources that
    /// failed to load while offline (dynamically imported JS chunks, CSS modules): the webview keeps
    /// serving the failed responses from its cache, so the page crashes again on the same missing
    /// module. `reloadFromOrigin()` performs an end-to-end revalidation that ignores the cache, which
    /// re-fetches those resources cleanly.
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == OfflineGateViewController.hardReloadMessageName else { return }
        webView?.reloadFromOrigin()
    }

    // MARK: - Overlay

    private func scheduleShowOverlay() {
        if overlayShowScheduled || overlay != nil || loaded { return }
        overlayShowScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + showDelay) { [weak self] in
            guard let self = self else { return }
            self.overlayShowScheduled = false
            if !self.loaded && self.overlay == nil {
                self.showOverlay()
                self.startPolling()
            }
        }
    }

    private func showOverlay() {
        // Brand colors (WTMG).
        let darkGreen = UIColor(red: 0x1C / 255.0, green: 0x28 / 255.0, blue: 0x1C / 255.0, alpha: 1)
        let bandYellow = UIColor(red: 0xFC / 255.0, green: 0xD3 / 255.0, blue: 0x4D / 255.0, alpha: 1)

        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = .white

        // Splash artwork (WTMG logo), filling the screen like the launch screen.
        let logoOffset = view.bounds.height * 0.05
        let logo = UIImageView(image: UIImage(named: "Splash"))
        logo.contentMode = .scaleAspectFill
        logo.clipsToBounds = true
        logo.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(logo)

        // Screen-wide yellow warning band: [no-internet icon] + message.
        let band = UIView()
        band.backgroundColor = bandYellow
        band.translatesAutoresizingMaskIntoConstraints = false

        let iconConfig = UIImage.SymbolConfiguration(pointSize: 22, weight: .regular)
        let icon = UIImageView(image: UIImage(systemName: "wifi.slash", withConfiguration: iconConfig))
        icon.tintColor = darkGreen
        icon.contentMode = .scaleAspectFit
        icon.setContentHuggingPriority(.required, for: .horizontal)
        icon.translatesAutoresizingMaskIntoConstraints = false

        let message = UILabel()
        message.text = OfflineGateViewController.localized(.message)
        message.numberOfLines = 0
        message.font = OfflineGateViewController.montserrat(.semibold, size: 15)
        message.textColor = darkGreen
        message.translatesAutoresizingMaskIntoConstraints = false

        let bandStack = UIStackView(arrangedSubviews: [icon, message])
        bandStack.axis = .horizontal
        bandStack.alignment = .center
        bandStack.spacing = 14
        bandStack.translatesAutoresizingMaskIntoConstraints = false
        band.addSubview(bandStack)

        let bottom = UIStackView(arrangedSubviews: [band])
        bottom.axis = .vertical
        bottom.alignment = .fill
        bottom.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(bottom)

        view.addSubview(container)
        NSLayoutConstraint.activate([
            container.topAnchor.constraint(equalTo: view.topAnchor),
            container.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            // Full-screen splash artwork, nudged up ~5% of screen height so the logo reads as
            // centered relative to the warning band below it.
            logo.widthAnchor.constraint(equalTo: container.widthAnchor),
            logo.heightAnchor.constraint(equalTo: container.heightAnchor),
            logo.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            logo.centerYAnchor.constraint(equalTo: container.centerYAnchor, constant: -logoOffset),

            // The band spans the full width, anchored above the safe-area bottom.
            bottom.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            bottom.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            bottom.bottomAnchor.constraint(equalTo: container.safeAreaLayoutGuide.bottomAnchor, constant: -32),

            bandStack.topAnchor.constraint(equalTo: band.topAnchor, constant: 16),
            bandStack.bottomAnchor.constraint(equalTo: band.bottomAnchor, constant: -16),
            bandStack.leadingAnchor.constraint(equalTo: band.leadingAnchor, constant: 20),
            bandStack.trailingAnchor.constraint(equalTo: band.trailingAnchor, constant: -20)
        ])

        view.bringSubviewToFront(container)
        overlay = container
    }

    private func removeOverlay() {
        overlay?.removeFromSuperview()
        overlay = nil
    }

    // MARK: - Polling & reload

    private func startPolling() {
        guard pollTimer == nil else { return }
        pollTimer = Timer.scheduledTimer(withTimeInterval: pollInterval, repeats: true) { [weak self] _ in
            guard let self = self, !self.loaded else { return }
            self.reloadRemote()
        }
    }

    /// Reloads the remote site, applying any deep link captured while offline.
    private func reloadRemote() {
        guard !loaded, let webView = webView, var url = serverURL else { return }
        if let path = OfflinePendingLink.shared.path, !path.isEmpty,
           let combined = URL(string: path, relativeTo: url) {
            url = combined
        }
        webView.load(URLRequest(url: url))
    }

    private func markLoaded() {
        if loaded { return }
        loaded = true
        OfflinePendingLink.shared.path = nil
        pollTimer?.invalidate()
        pollTimer = nil
        monitor.cancel()
        progressObservation?.invalidate()
        progressObservation = nil
        removeOverlay()
    }

    deinit {
        pollTimer?.invalidate()
        monitor.cancel()
        progressObservation?.invalidate()
    }

    // MARK: - Localization

    private enum StringKey {
        case message
    }

    /// The native UI is shown before any web/JS i18n is available, so the supported-language strings
    /// are embedded here and selected from the device language (falling back to English).
    private static func localized(_ key: StringKey) -> String {
        let messages: [String: String] = [
            "en": "No internet connection. Check your connection and try again.",
            "nl": "Geen internetverbinding. Controleer je verbinding en probeer opnieuw.",
            "fr": "Pas de connexion internet. Vérifiez votre connexion et réessayez.",
            "de": "Keine Internetverbindung. Überprüfe deine Verbindung und versuche es erneut.",
            "es": "No hay conexión a internet. Comprueba tu conexión e inténtalo de nuevo."
        ]
        let lang = deviceLanguage(supported: Array(messages.keys))
        return messages[lang] ?? messages["en"] ?? ""
    }

    private static func deviceLanguage(supported: [String]) -> String {
        for preferred in Locale.preferredLanguages {
            let code = String(preferred.prefix(2)).lowercased()
            if supported.contains(code) {
                return code
            }
        }
        return "en"
    }

    // MARK: - Fonts

    private enum MontserratWeight {
        case semibold

        var postScriptName: String {
            switch self {
            case .semibold: return "Montserrat-SemiBold"
            }
        }

        var systemWeight: UIFont.Weight {
            switch self {
            case .semibold: return .semibold
            }
        }
    }

    /// Montserrat is bundled with the app (registered via UIAppFonts in Info.plist). Falls back to
    /// the system font at the matching weight if the font fails to load for any reason.
    private static func montserrat(_ weight: MontserratWeight, size: CGFloat) -> UIFont {
        return UIFont(name: weight.postScriptName, size: size)
            ?? .systemFont(ofSize: size, weight: weight.systemWeight)
    }
}

// MARK: - Runtime backend channel

/// Persistence + resolution for the runtime backend-channel override.
///
/// The active server URL is `override ?? bakedDefaultURL()`, where the baked default is the
/// `server.url` written into `capacitor.config.json` at `cap sync` time. Read by
/// `OfflineGateViewController.instanceDescriptor()` to point the webview, and by `WtmgServerPlugin`
/// for the JS API. Defined here (rather than in its own file) so it is part of an existing target
/// source file and needs no Xcode project changes.
enum WtmgServerConfig {
    static let overrideKey = "wtmg_server_url"

    /// The user-selected override URL, or nil when none is persisted (use the baked default).
    static var override: String? {
        get {
            let value = UserDefaults.standard.string(forKey: overrideKey)
            return (value?.isEmpty == false) ? value : nil
        }
        set {
            if let value = newValue, !value.isEmpty {
                UserDefaults.standard.set(value, forKey: overrideKey)
            } else {
                UserDefaults.standard.removeObject(forKey: overrideKey)
            }
        }
    }

    /// The `server.url` baked into the bundled `capacitor.config.json` (default when no override).
    static func bakedDefaultURL() -> String {
        guard let url = Bundle.main.url(forResource: "capacitor.config", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let server = json["server"] as? [String: Any],
              let serverURL = server["url"] as? String else {
            return ""
        }
        return serverURL
    }

    /// The server URL the app should currently load.
    static func currentURL() -> String {
        return override ?? bakedDefaultURL()
    }

    static func isValid(_ urlString: String) -> Bool {
        guard let url = URL(string: urlString), let scheme = url.scheme?.lowercased() else {
            return false
        }
        return scheme == "http" || scheme == "https"
    }
}

/// App-local Capacitor plugin exposing the backend-channel switcher to the web layer
/// (`src/lib/api/serverChannel.ts`). Registered in `OfflineGateViewController.capacitorDidLoad()`.
@objc(WtmgServerPlugin)
public class WtmgServerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WtmgServerPlugin"
    public let jsName = "WtmgServer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getConfig", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUrl", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reset", returnType: CAPPluginReturnPromise)
    ]

    @objc func getConfig(_ call: CAPPluginCall) {
        call.resolve([
            "current": WtmgServerConfig.currentURL(),
            "baseline": WtmgServerConfig.bakedDefaultURL(),
            "isPersisted": WtmgServerConfig.override != nil
        ])
    }

    @objc func setUrl(_ call: CAPPluginCall) {
        guard let url = call.getString("url"), WtmgServerConfig.isValid(url) else {
            call.reject("A valid http(s) URL is required")
            return
        }
        WtmgServerConfig.override = url
        rebuildWebView()
        call.resolve()
    }

    @objc func reset(_ call: CAPPluginCall) {
        WtmgServerConfig.override = nil
        rebuildWebView()
        call.resolve()
    }

    /// Re-points the app at the resolved server URL by replacing the root view controller with a
    /// fresh bridge controller, which re-runs `instanceDescriptor()` and loads the new URL.
    private func rebuildWebView() {
        DispatchQueue.main.async { [weak self] in
            let window = self?.bridge?.viewController?.view.window
                ?? (UIApplication.shared.delegate as? AppDelegate)?.window
            window?.rootViewController = OfflineGateViewController()
            window?.makeKeyAndVisible()
        }
    }
}
