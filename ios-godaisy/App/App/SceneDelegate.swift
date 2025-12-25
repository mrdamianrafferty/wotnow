import UIKit
import Capacitor

/// SceneDelegate - iOS 17+ optimized with modern Swift patterns
@MainActor
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    // MARK: - Scene Lifecycle

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // iOS 17+: Configure window scene traits
        configureWindowScene(windowScene)

        // Handle any URLs passed at launch
        if let urlContext = connectionOptions.urlContexts.first {
            handleIncomingURL(urlContext.url)
        }

        // Handle any user activities (Universal Links) passed at launch
        if let userActivity = connectionOptions.userActivities.first {
            handleUserActivity(userActivity)
        }
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // Release resources that can be recreated when scene reconnects
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Clear badge count when app becomes active (iOS 17+ optimized)
        Task { @MainActor in
            await clearBadgeCount()
        }
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Prepare for temporary interruption
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Undo background changes
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Save state for restoration
    }

    // MARK: - URL Handling (iOS 17+ enhanced)

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let urlContext = URLContexts.first else { return }
        handleIncomingURL(urlContext.url)
    }

    // MARK: - User Activity (Universal Links)

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        handleUserActivity(userActivity)
    }

    // MARK: - Private Helpers

    private func configureWindowScene(_ windowScene: UIWindowScene) {
        // iOS 17+: Configure scene-level preferences
        #if compiler(>=5.9)
        if #available(iOS 17.0, *) {
            // Enable iOS 17+ window behaviors
            windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: .all))
        }
        #endif
    }

    private func handleIncomingURL(_ url: URL) {
        // Forward to Capacitor for JavaScript handling
        ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            open: url,
            options: [:]
        )
    }

    private func handleUserActivity(_ userActivity: NSUserActivity) {
        // Forward Universal Links to Capacitor
        ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }

    /// Clear notification badge count (iOS 17+ async pattern)
    private func clearBadgeCount() async {
        if #available(iOS 16.0, *) {
            do {
                try await UNUserNotificationCenter.current().setBadgeCount(0)
            } catch {
                // Fallback for badge clearing failure
                await MainActor.run {
                    UIApplication.shared.applicationIconBadgeNumber = 0
                }
            }
        } else {
            UIApplication.shared.applicationIconBadgeNumber = 0
        }
    }
}
