import UIKit
import Capacitor
import GoogleSignIn
import UserNotifications
import BackgroundTasks
import FirebaseCore
import FirebaseMessaging

/// AppDelegate - iOS 17+ optimized with modern Swift patterns
/// Uses @main instead of deprecated @UIApplicationMain
@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    // MARK: - App Lifecycle

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()

        // Configure push notifications delegate
        UNUserNotificationCenter.current().delegate = self

        // Configure Firebase Messaging delegate
        Messaging.messaging().delegate = self

        // Request notification permissions and register for remote notifications
        requestNotificationPermissions(application)

        // Register background tasks (iOS 17+ enhanced)
        registerBackgroundTasks()

        return true
    }

    // MARK: - Push Notification Setup

    private func requestNotificationPermissions(_ application: UIApplication) {
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
            print("🔔 Notification permission granted: \(granted)")
            if let error = error {
                print("❌ Notification permission error: \(error.localizedDescription)")
            }

            DispatchQueue.main.async {
                // Register for remote notifications
                application.registerForRemoteNotifications()
                print("📲 Registered for remote notifications")
            }
        }
    }

    private func showDebugAlert(title: String, message: String) {
        DispatchQueue.main.async {
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootViewController = windowScene.windows.first?.rootViewController else {
                return
            }
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            rootViewController.present(alert, animated: true)
        }
    }

    // MARK: - Background Tasks (iOS 17+)

    private func registerBackgroundTasks() {
        // Register for background app refresh
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "io.growdaisy.app.refresh",
            using: nil
        ) { task in
            self.handleAppRefresh(task: task as! BGAppRefreshTask)
        }
    }

    private func handleAppRefresh(task: BGAppRefreshTask) {
        // Schedule next refresh
        scheduleAppRefresh()

        // Create a task that will be cancelled if we run out of time
        let refreshTask = Task {
            // Notify JavaScript layer about background refresh
            NotificationCenter.default.post(
                name: NSNotification.Name("capacitorBackgroundRefresh"),
                object: nil
            )
        }

        task.expirationHandler = {
            refreshTask.cancel()
        }

        Task {
            await refreshTask.value
            task.setTaskCompleted(success: true)
        }
    }

    func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: "io.growdaisy.app.refresh")
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes

        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("⚠️ Could not schedule app refresh: \(error)")
        }
    }

    // MARK: - Push Notification Registration

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Forward APNs token to Firebase Messaging
        Messaging.messaging().apnsToken = deviceToken

        // Explicitly fetch FCM token to ensure registration completes
        Messaging.messaging().token { token, error in
            if let error = error {
                print("❌ FCM Token fetch error: \(error.localizedDescription)")
            } else if let token = token {
                print("🔥 FCM Token fetched: \(token.prefix(30))...")
                // Subscribe to topic immediately after getting token
                Messaging.messaging().subscribe(toTopic: "growdaisy-all") { subError in
                    if let subError = subError {
                        print("❌ Topic subscription error: \(subError.localizedDescription)")
                    } else {
                        print("✅ Subscribed to growdaisy-all topic!")
                    }
                }
            }
        }

        // Forward token to Capacitor's push notification plugin
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )

        // Log token for debugging (iOS 17+ hex encoding)
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("📱 APNs Device Token: \(tokenString)")
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        // Forward error to Capacitor's push notification plugin
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
        print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - Background Notification Handling

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // Forward to Capacitor for JavaScript handling
        NotificationCenter.default.post(
            name: NSNotification.Name("capacitorDidReceiveRemoteNotification"),
            object: userInfo
        )
        completionHandler(.newData)
    }

    // MARK: - Scene Session Lifecycle

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(
        _ application: UIApplication,
        didDiscardSceneSessions sceneSessions: Set<UISceneSession>
    ) {
        // Clean up resources for discarded scenes
    }

    // MARK: - URL Handling (OAuth & Deep Links)

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        // Handle Google Sign-In callback first
        if GIDSignIn.sharedInstance.handle(url) {
            return true
        }

        // Forward to Capacitor for other URL handling
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // MARK: - Universal Links

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {

    /// Handle notifications when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        // iOS 17+: Use async version of delegate method
        // Show notification even when app is in foreground
        return [.banner, .sound, .badge]
    }

    /// Handle notification tap
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        // iOS 17+: Use async version of delegate method
        // Forward to Capacitor for handling in JavaScript
        NotificationCenter.default.post(
            name: NSNotification.Name("capacitorDidReceiveRemoteNotification"),
            object: response.notification.request.content.userInfo
        )
    }
}

// MARK: - MessagingDelegate (Firebase Cloud Messaging)

extension AppDelegate: MessagingDelegate {

    /// Called when FCM registration token is available
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }

        print("🔥 FCM Token: \(fcmToken.prefix(30))...")

        // Subscribe to app-specific topic for broadcast notifications
        Messaging.messaging().subscribe(toTopic: "growdaisy-all") { error in
            if let error = error {
                print("❌ Failed to subscribe to growdaisy-all topic: \(error.localizedDescription)")
            } else {
                print("✅ Subscribed to growdaisy-all topic")
            }
        }
    }
}
