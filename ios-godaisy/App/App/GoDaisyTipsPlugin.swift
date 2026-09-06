import UIKit
import WebKit
import Capacitor
import StoreKit

/// Custom CAPBridgeViewController subclass that adds a direct WKScriptMessageHandler
/// for the tip jar, bypassing both RevenueCat and Capacitor's plugin system entirely.
/// Uses StoreKit 2 for consumable in-app purchases.
class GoDaisyViewController: CAPBridgeViewController {
    private let tipHandler = TipJarHandler()

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        tipHandler.webView = webView
        webView?.configuration.userContentController.add(tipHandler, name: "GoDaisyTips")

        // Swipe from the left edge to go back.
        //
        // There is no browser chrome in the app, so every secondary screen —
        // /account, /weather, the legal pages — depended entirely on the
        // wordmark in PageHeader to get out of. This restores the gesture iOS
        // users already expect, and costs no screen space to do it.
        //
        // Set here rather than in capacitor.config: Capacitor's iOS config
        // exposes `scrollEnabled` and `allowsLinkPreview` but has no option for
        // this, so the WKWebView property is the only route. `capacitorDidLoad`
        // is the first point at which `webView` is non-nil.
        webView?.allowsBackForwardNavigationGestures = true
    }
}

// MARK: - TipJarHandler

/// Handles JS ↔ Swift communication for the tip jar via WKScriptMessageHandler.
/// Uses StoreKit 2 directly — no RevenueCat dependency.
///
/// JS sends: window.webkit.messageHandlers.GoDaisyTips.postMessage({ action, callbackId, ... })
/// Swift replies: window._GoDaisyTipsResolve(callbackId, data) or _GoDaisyTipsReject(callbackId, error)
class TipJarHandler: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String,
              let callbackId = body["callbackId"] as? String else { return }

        switch action {
        case "getProducts":
            Task { await getProducts(callbackId: callbackId) }
        case "purchase":
            guard let productId = body["productId"] as? String else {
                sendError(callbackId: callbackId, error: "productId required")
                return
            }
            Task { await purchase(productId: productId, callbackId: callbackId) }
        default:
            sendError(callbackId: callbackId, error: "Unknown action: \(action)")
        }
    }

    // MARK: - StoreKit 2

    private func getProducts(callbackId: String) async {
        do {
            let products = try await Product.products(for: [
                "godaisy_tip_coffee",
                "godaisy_tip_pint",
                "godaisy_tip_boost",
            ])
            let json: [[String: Any]] = products.map { product in
                [
                    "identifier": product.id,
                    "title": product.displayName,
                    "priceString": product.displayPrice,
                    "price": (product.price as NSDecimalNumber).doubleValue,
                ]
            }
            sendSuccess(callbackId: callbackId, data: json)
        } catch {
            sendError(callbackId: callbackId, error: error.localizedDescription)
        }
    }

    private func purchase(productId: String, callbackId: String) async {
        do {
            let products = try await Product.products(for: [productId])
            guard let product = products.first else {
                sendError(callbackId: callbackId, error: "Product not found: \(productId)")
                return
            }

            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    await transaction.finish()
                    sendSuccess(callbackId: callbackId, data: [
                        "cancelled": false,
                        "productIdentifier": productId,
                    ])
                case .unverified:
                    sendError(callbackId: callbackId, error: "Transaction verification failed")
                }
            case .userCancelled:
                sendSuccess(callbackId: callbackId, data: ["cancelled": true])
            case .pending:
                sendSuccess(callbackId: callbackId, data: ["cancelled": false, "pending": true])
            @unknown default:
                sendError(callbackId: callbackId, error: "Unknown purchase result")
            }
        } catch {
            sendError(callbackId: callbackId, error: error.localizedDescription)
        }
    }

    // MARK: - JS Bridge Helpers

    private func sendSuccess(callbackId: String, data: Any) {
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data)
            guard let jsonString = String(data: jsonData, encoding: .utf8) else { return }
            let js = "window._GoDaisyTipsResolve&&window._GoDaisyTipsResolve('\(callbackId)',\(jsonString))"
            DispatchQueue.main.async { [weak self] in
                self?.webView?.evaluateJavaScript(js)
            }
        } catch {
            sendError(callbackId: callbackId, error: "JSON serialization failed")
        }
    }

    private func sendError(callbackId: String, error: String) {
        let escaped = error
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let js = "window._GoDaisyTipsReject&&window._GoDaisyTipsReject('\(callbackId)','\(escaped)')"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js)
        }
    }
}
