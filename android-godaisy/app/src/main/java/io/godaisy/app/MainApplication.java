package io.godaisy.app;

import android.app.Application;
import android.util.Log;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainApplication extends Application {
    private static final String TAG = "GoDaisy";

    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize Firebase explicitly
        FirebaseApp.initializeApp(this);
        Log.d(TAG, "Firebase initialized");

        // Subscribe to topic for broadcast notifications
        FirebaseMessaging.getInstance().subscribeToTopic("godaisy-all")
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    Log.d(TAG, "Subscribed to godaisy-all topic");
                } else {
                    Log.e(TAG, "Failed to subscribe to topic", task.getException());
                }
            });

        // Get FCM token for debugging
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    String token = task.getResult();
                    Log.d(TAG, "FCM Token: " + token);
                } else {
                    Log.e(TAG, "Failed to get FCM token", task.getException());
                }
            });
    }
}
