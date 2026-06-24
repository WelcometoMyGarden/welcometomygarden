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
class OfflineGateViewController: CAPBridgeViewController {

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
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = .systemBackground

        let message = UILabel()
        message.text = OfflineGateViewController.localized(.message)
        message.numberOfLines = 0
        message.textAlignment = .center
        message.font = .systemFont(ofSize: 18, weight: .semibold)
        message.textColor = .label

        let spinner = UIActivityIndicatorView(style: .medium)
        spinner.startAnimating()

        let connecting = UILabel()
        connecting.text = OfflineGateViewController.localized(.connecting)
        connecting.textAlignment = .center
        connecting.font = .systemFont(ofSize: 14)
        connecting.textColor = .secondaryLabel

        let stack = UIStackView(arrangedSubviews: [message, spinner, connecting])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(stack)

        view.addSubview(container)
        NSLayoutConstraint.activate([
            container.topAnchor.constraint(equalTo: view.topAnchor),
            container.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: container.leadingAnchor, constant: 32),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: container.trailingAnchor, constant: -32)
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
        case connecting
    }

    /// The native UI is shown before any web/JS i18n is available, so the supported-language strings
    /// are embedded here and selected from the device language (falling back to English).
    private static func localized(_ key: StringKey) -> String {
        let messages: [String: String] = [
            "en": "Welcome To My Garden needs an internet connection",
            "nl": "Welcome To My Garden heeft een internetverbinding nodig",
            "fr": "Welcome To My Garden a besoin d’une connexion Internet",
            "de": "Welcome To My Garden benötigt eine Internetverbindung",
            "es": "Welcome To My Garden necesita una conexión a Internet"
        ]
        let connecting: [String: String] = [
            "en": "Trying to connect…",
            "nl": "Bezig met verbinden…",
            "fr": "Tentative de connexion…",
            "de": "Verbindung wird hergestellt…",
            "es": "Intentando conectar…"
        ]
        let table = key == .message ? messages : connecting
        let lang = deviceLanguage(supported: Array(table.keys))
        return table[lang] ?? table["en"] ?? ""
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
}
