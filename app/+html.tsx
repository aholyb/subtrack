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

const BACKGROUND_STYLE = `
html, body, #root {
  background-color: #0A0A0A;
  color-scheme: dark;
}
body {
  overscroll-behavior-y: none;
}
`;
