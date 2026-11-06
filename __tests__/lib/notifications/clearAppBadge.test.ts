const mockPlatform = jest.fn();
const mockRemoveAll = jest.fn();

jest.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => mockPlatform() } }));
jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: { removeAllDeliveredNotifications: () => mockRemoveAll() },
}));

import { clearAppBadge } from '@/lib/notifications/clearAppBadge';

describe('clearAppBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveAll.mockResolvedValue(undefined);
  });

  it('clears delivered notifications (and the icon badge) on iOS', async () => {
    mockPlatform.mockReturnValue('ios');
    await clearAppBadge();
    expect(mockRemoveAll).toHaveBeenCalledTimes(1);
  });

  it('does nothing on the web or Android', async () => {
    for (const platform of ['web', 'android']) {
      mockPlatform.mockReturnValue(platform);
      await clearAppBadge();
    }
    expect(mockRemoveAll).not.toHaveBeenCalled();
  });

  it('swallows a plugin failure', async () => {
    mockPlatform.mockReturnValue('ios');
    mockRemoveAll.mockRejectedValue(new Error('not implemented'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(clearAppBadge()).resolves.toBeUndefined();
  });
});
