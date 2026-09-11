import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { openCancelRoute } from '../cancel';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'dismiss' });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

describe('openCancelRoute', () => {
  it('открывает системный экран подписок через Linking, а не в браузере', async () => {
    await openCancelRoute({
      kind: 'appstore',
      url: 'itms-apps://apps.apple.com/account/subscriptions',
    });
    expect(Linking.openURL).toHaveBeenCalledWith('itms-apps://apps.apple.com/account/subscriptions');
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('открывает страницу сервиса во встроенном браузере', async () => {
    await openCancelRoute({ kind: 'web', url: 'https://www.netflix.com/cancelplan' });
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://www.netflix.com/cancelplan');
  });

  it('для ручного режима открывает поиск с экранированным запросом', async () => {
    await openCancelRoute({ kind: 'manual', searchQuery: 'как отменить подписку Спортзал' });
    const url = (WebBrowser.openBrowserAsync as jest.Mock).mock.calls[0][0] as string;
    expect(url.startsWith('https://duckduckgo.com/?q=')).toBe(true);
    expect(url).toContain(encodeURIComponent('как отменить подписку Спортзал'));
  });

  it('не бросает исключение, если открыть ссылку не удалось', async () => {
    (WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValueOnce(new Error('no browser'));
    await expect(
      openCancelRoute({ kind: 'web', url: 'https://x.test/cancel' }),
    ).resolves.toBeUndefined();
  });
});
