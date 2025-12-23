package eu.fishfindr.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    /**
     * Create notification channels for Android 8.0+ (API 26+)
     * Channels must be created before any notifications are posted.
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // Default channel for general notifications
            NotificationChannel defaultChannel = new NotificationChannel(
                "default",
                "General Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            defaultChannel.setDescription("General app notifications");
            manager.createNotificationChannel(defaultChannel);

            // Fishing alerts channel (high priority)
            NotificationChannel alertsChannel = new NotificationChannel(
                "fishing_alerts",
                "Fishing Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            alertsChannel.setDescription("Important fishing condition alerts");
            manager.createNotificationChannel(alertsChannel);
        }
    }
}
