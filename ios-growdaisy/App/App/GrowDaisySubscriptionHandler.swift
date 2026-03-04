import UIKit
import WebKit
import Capacitor
import RevenueCat

/// Custom CAPBridgeViewController subclass that adds a direct WKScriptMessageHandler
/// for subscription purchases, bypassing Capacitor's plugin system entirely.
/// Uses RevenueCat SDK for subscription lifecycle management.
class GrowDaisyViewController: CAPBridgeViewController {
    private let subsHandler = SubscriptionHandler()

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        subsHandler.webView = webView
        webView?.configuration.userContentController.add(subsHandler, name: "GrowDaisySubs")
        print("🌱 GrowDaisySubs handler registered")
    }
}

// MARK: - SubscriptionHandler

/// Handles JS <-> Swift communication for subscriptions via WKScriptMessageHandler.
/// Uses RevenueCat SDK for offering/purchase/restore operations.
///
/// JS sends: window.webkit.messageHandlers.GrowDaisySubs.postMessage({ action, callbackId, ... })
/// Swift replies: window._GrowDaisySubsResolve(callbackId, data) or _GrowDaisySubsReject(callbackId, error)
class SubscriptionHandler: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String,
              let callbackId = body["callbackId"] as? String else {
            print("🌱 GrowDaisySubs: invalid message body")
            return
        }

        print("🌱 GrowDaisySubs action: \(action) callbackId: \(callbackId)")

        switch action {
        case "getOfferings":
            Task { await getOfferings(callbackId: callbackId) }
        case "purchase":
            guard let productId = body["productId"] as? String else {
                sendError(callbackId: callbackId, error: "productId required")
                return
            }
            Task { await purchase(productId: productId, callbackId: callbackId) }
        case "restore":
            Task { await restore(callbackId: callbackId) }
        case "getCustomerInfo":
            Task { await getCustomerInfo(callbackId: callbackId) }
        case "identify":
            guard let userId = body["userId"] as? String else {
                sendError(callbackId: callbackId, error: "userId required")
                return
            }
            Task { await identify(userId: userId, callbackId: callbackId) }
        default:
            sendError(callbackId: callbackId, error: "Unknown action: \(action)")
        }
    }

    // MARK: - RevenueCat Operations

    private func getOfferings(callbackId: String) async {
        do {
            let offerings = try await Purchases.shared.offerings()
            print("🌱 getOfferings: current=\(offerings.current?.identifier ?? "nil"), all=\(offerings.all.keys)")
            guard let current = offerings.current else {
                print("🌱 getOfferings: no current offering, returning empty")
                sendSuccess(callbackId: callbackId, data: [
                    "packages": [] as [[String: Any]],
                ])
                return
            }

            print("🌱 getOfferings: \(current.availablePackages.count) packages")
            let packages: [[String: Any]] = current.availablePackages.map { pkg in
                [
                    "identifier": pkg.identifier,
                    "productIdentifier": pkg.storeProduct.productIdentifier,
                    "priceString": pkg.localizedPriceString,
                    "price": (pkg.storeProduct.price as NSDecimalNumber).doubleValue,
                ]
            }

            sendSuccess(callbackId: callbackId, data: [
                "packages": packages,
            ])
        } catch {
            sendError(callbackId: callbackId, error: error.localizedDescription)
        }
    }

    private func purchase(productId: String, callbackId: String) async {
        do {
            let offerings = try await Purchases.shared.offerings()
            guard let current = offerings.current else {
                sendError(callbackId: callbackId, error: "No offerings available")
                return
            }

            // Find the package matching the requested product ID
            guard let package = current.availablePackages.first(where: {
                $0.storeProduct.productIdentifier == productId
            }) else {
                sendError(callbackId: callbackId, error: "Product not found: \(productId)")
                return
            }

            let (_, customerInfo, userCancelled) = try await Purchases.shared.purchase(package: package)

            if userCancelled {
                sendSuccess(callbackId: callbackId, data: ["cancelled": true])
            } else {
                // Build active entitlements info
                let entitlements: [String] = customerInfo.entitlements.active.map { $0.key }
                sendSuccess(callbackId: callbackId, data: [
                    "cancelled": false,
                    "productIdentifier": productId,
                    "activeEntitlements": entitlements,
                ])
            }
        } catch let error as RevenueCat.ErrorCode {
            if error == .purchaseCancelledError {
                sendSuccess(callbackId: callbackId, data: ["cancelled": true])
            } else {
                sendError(callbackId: callbackId, error: error.localizedDescription)
            }
        } catch {
            sendError(callbackId: callbackId, error: error.localizedDescription)
        }
    }

    private func restore(callbackId: String) async {
        do {
            let customerInfo = try await Purchases.shared.restorePurchases()
            let entitlements: [String] = customerInfo.entitlements.active.map { $0.key }
            sendSuccess(callbackId: callbackId, data: [
                "activeEntitlements": entitlements,
            ])
        } catch {
            sendError(callbackId: callbackId, error: error.localizedDescription)
        }
    }

    private func getCustomerInfo(callbackId: String) async {
        do {
            let customerInfo = try await Purchases.shared.customerInfo()
            let entitlements: [String] = customerInfo.entitlements.active.map { $0.key }
            sendSuccess(callbackId: callbackId, data: [
                "activeEntitlements": entitlements,
                "originalAppUserId": customerInfo.originalAppUserId,
            ])
        } catch {
            sendError(callbackId: callbackId, error: error.localizedDescription)
        }
    }

    private func identify(userId: String, callbackId: String) async {
        do {
            let (customerInfo, _) = try await Purchases.shared.logIn(userId)
            let entitlements: [String] = customerInfo.entitlements.active.map { $0.key }
            sendSuccess(callbackId: callbackId, data: [
                "activeEntitlements": entitlements,
            ])
        } catch {
            sendError(callbackId: callbackId, error: error.localizedDescription)
        }
    }

    // MARK: - JS Bridge Helpers

    private func sendSuccess(callbackId: String, data: Any) {
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data)
            guard let jsonString = String(data: jsonData, encoding: .utf8) else { return }
            let js = "window._GrowDaisySubsResolve&&window._GrowDaisySubsResolve('\(callbackId)',\(jsonString))"
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
        let js = "window._GrowDaisySubsReject&&window._GrowDaisySubsReject('\(callbackId)','\(escaped)')"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js)
        }
    }
}
