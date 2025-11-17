import { define } from "../utils.ts";
import ThemeSwitcher from "../islands/ThemeSwitcher.tsx";

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <title>Shift Management Planner</title>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b132b" />
        <link rel="apple-touch-icon" href="/logo.svg" />
      </head>
      <body>
        <ThemeSwitcher />
        <Component />
      </body>
    </html>
  );
});
