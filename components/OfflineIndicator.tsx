import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Offline Indicator Component
 *
 * Features:
 * - Shows banner when user goes offline
 * - Shows "reconnecting" banner when back online
 * - Smooth animations
 * - Non-intrusive (auto-hides when online)
 *
 * Usage:
 * ```tsx
 * // In _app.tsx or main layout
 * <OfflineIndicator />
 * ```
 */
export const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-error text-error-content shadow-lg safe-top"
        >
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <WifiOff className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 text-center">
                <p className="font-semibold text-sm">No Internet Connection</p>
                <p className="text-xs opacity-90">
                  You can still view cached predictions
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-success text-success-content shadow-lg safe-top"
        >
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <Wifi className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 text-center">
                <p className="font-semibold text-sm flex items-center justify-center gap-2">
                  Back Online
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </p>
                <p className="text-xs opacity-90">
                  Syncing your data...
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
