const mockPlatform = jest.fn();
const mockRemoveAll = jest.fn();
const mockCheck = jest.fn();
const mockRegister = jest.fn();
const mockAddListener = jest.fn();

jest.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => mockPlatform() } }));
jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    removeAllDeliveredNotifications: () => mockRemoveAll(),
    checkPermissions: () => mockCheck(),
    register: () => mockRegister(),
    addListener: (event: string, cb: () => void) => mockAddListener(event, cb),
  },
}));

import { clearAppBadge } from '@/lib/notifications/clearAppBadge';

describe('clearAppBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatform.mockReturnValue('ios');
    mockRemoveAll.mockResolvedValue(undefined);
    mockCheck.mockResolvedValue({ receive: 'granted' });
    mockRegister.mockResolvedValue(undefined);
    // APNs answers as soon as a listener is attached.
    mockAddListener.mockImplementation(async (event: string, cb: () => void) => {
      if (event === 'registration') queueMicrotask(cb);
      return { remove: jest.fn().mockResolvedValue(undefined) };
    });
  });

  it('clears delivered notifications (and the icon badge) on iOS', async () => {
    await clearAppBadge();
    expect(mockRemoveAll).toHaveBeenCalledTimes(1);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('does nothing on the web or Android', async () => {
    for (const platform of ['web', 'android']) {
      mockPlatform.mockReturnValue(platform);
      await clearAppBadge();
    }
    expect(mockRemoveAll).not.toHaveBeenCalled();
  });

  it('registers with APNs then clears when the plugin rejects before registration', async () => {
    mockRemoveAll.mockRejectedValueOnce(new Error('capacitorDidRegisterForRemoteNotifications not called'));
    await clearAppBadge();
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRemoveAll).toHaveBeenCalledTimes(2);
  });

  it('does not register when notification permission is not granted', async () => {
    mockRemoveAll.mockRejectedValueOnce(new Error('not registered'));
    mockCheck.mockResolvedValue({ receive: 'denied' });
    await clearAppBadge();
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockRemoveAll).toHaveBeenCalledTimes(1);
  });

  it('swallows a failure', async () => {
    mockRemoveAll.mockRejectedValue(new Error('still not registered'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(clearAppBadge()).resolves.toBeUndefined();
  });
});
