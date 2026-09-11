import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * HTML-оболочка веб-версии. Выполняется только при сборке, в Node.
 *
 * Мета-теги ниже — то, что превращает страницу в иконку на домашнем экране
 * iPhone: без apple-mobile-web-app-capable приложение открывается обычной
 * вкладкой Safari с адресной строкой.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>SubTrack</title>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SubTrack" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="color-scheme" content="dark" />

        <ScrollViewStyleReset />

        {/*
          Фон задаётся и на html, и на body: при перетягивании страницы за
          край iOS показывает именно его, и светлая полоса по краю сразу
          выдаёт «это сайт, а не приложение».
        */}
        <style dangerouslySetInnerHTML={{ __html: BACKGROUND_STYLE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Безопасная зона на вебе задаётся здесь, а не через useSafeAreaInsets:
 * библиотека измеряет её скрытым элементом уже после гидратации, поэтому при
 * статическом рендеринге страница успевает отрисоваться с нулями, и нижние
 * подписи уезжают под индикатор home. CSS-переменная env() доступна браузеру
 * сразу, до любого JavaScript.
 *
 * Отступ забирает корневой элемент, поэтому компоненты внутри про безопасную
 * зону на вебе не знают и не должны прибавлять её повторно.
 */
const BACKGROUND_STYLE = `
html, body, #root {
  background-color: #0A0A0A;
  color-scheme: dark;
}
body {
  overscroll-behavior-y: none;
}
#root {
  box-sizing: border-box;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
`;
