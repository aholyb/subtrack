import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { CancelRoute } from '../domain/cancelRoute';

/**
 * Доводит пользователя до нужного экрана отмены. Статус подписки здесь не
 * меняется: приложение не может знать, дошёл ли человек до конца формы.
 */
export async function openCancelRoute(route: CancelRoute): Promise<void> {
  try {
    if (route.kind === 'appstore') {
      await Linking.openURL(route.url);
      return;
    }
    if (route.kind === 'web') {
      await WebBrowser.openBrowserAsync(route.url);
      return;
    }
    await WebBrowser.openBrowserAsync(
      `https://duckduckgo.com/?q=${encodeURIComponent(route.searchQuery)}`,
    );
  } catch {
    // Открыть не удалось — пользователь остаётся на экране деталей,
    // где видит название сервиса и может отменить вручную.
  }
}
