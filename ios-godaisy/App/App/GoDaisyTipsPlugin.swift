import Capacitor
import RevenueCat

/// Custom Capacitor plugin that calls RevenueCat SDK directly.
/// The official @revenuecat/purchases-capacitor plugin's bridge is broken
/// (all methods hang — configure, getOfferings, purchase, etc.).
/// This plugin lives in the App target so it's guaranteed to load.
@objc(GoDaisyTipsPlugin)
class GoDaisyTipsPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "GoDaisyTipsPlugin"
    let jsName = "GoDaisyTips"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getOfferings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
    ]

    @objc func getOfferings(_ call: CAPPluginCall) {
        Purchases.shared.getOfferings { offerings, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            guard let current = offerings?.current else {
                call.resolve(["packages": []])
                return
            }
            var packages: [[String: Any]] = []
            for pkg in current.availablePackages {
                packages.append([
                    "identifier": pkg.storeProduct.productIdentifier,
                    "title": pkg.storeProduct.localizedTitle,
                    "priceString": pkg.storeProduct.localizedPriceString,
                    "price": pkg.storeProduct.price as NSNumber,
                ])
            }
            call.resolve([
                "currentIdentifier": current.identifier,
                "packages": packages,
            ])
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }

        Purchases.shared.getOfferings { [weak self] offerings, error in
            _ = self // prevent unused warning
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }

            guard let current = offerings?.current else {
                call.reject("No current offering")
                return
            }

            guard let pkg = current.availablePackages.first(where: {
                $0.storeProduct.productIdentifier == productId
            }) else {
                call.reject("Product not found: \(productId)")
                return
            }

            Purchases.shared.purchase(package: pkg) { _, _, error, userCancelled in
                if userCancelled {
                    call.resolve(["cancelled": true])
                    return
                }
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                call.resolve([
                    "cancelled": false,
                    "productIdentifier": productId,
                ])
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Purchases.shared.restorePurchases { _, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["restored": true])
        }
    }
}
