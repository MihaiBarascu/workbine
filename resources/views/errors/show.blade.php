<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-appearance="{{ request()->cookie('appearance', 'system') }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex">
        <title>{{ $title }} - Workbine</title>
        <link rel="icon" href="/favicon.svg?v=workbine-light" type="image/svg+xml">
        <style>
            :root { color-scheme: light; --canvas: #f8f9fb; --text: #242730; --muted: #626b7c; --rule: #e3e7ee; --accent: #315ed7; --action-text: #ffffff; }
            :root[data-appearance="dark"] { color-scheme: dark; --canvas: #16181d; --text: #edf0f6; --muted: #a9b2c2; --rule: #373d49; --accent: #adc3ff; --action-text: #16181d; }
            @media (prefers-color-scheme: dark) {
                :root:not([data-appearance="light"]):not([data-appearance="dark"]) { color-scheme: dark; --canvas: #16181d; --text: #edf0f6; --muted: #a9b2c2; --rule: #373d49; --accent: #adc3ff; --action-text: #16181d; }
            }
            * { box-sizing: border-box; }
            body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: var(--canvas); color: var(--text); font-family: "Instrument Sans", ui-sans-serif, system-ui, sans-serif; }
            header { width: 100%; max-width: 1600px; margin-inline: auto; padding: 24px; }
            .brand { display: inline-flex; align-items: center; gap: 8px; color: var(--text); text-decoration: none; font-size: 23px; font-weight: 700; letter-spacing: -.8px; }
            .brand svg { width: 32px; height: 32px; color: var(--accent); }
            .brand-dot { color: var(--accent); }
            main { width: 100%; max-width: 672px; margin-inline: auto; padding: 40px 24px 96px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .status { margin: 0 0 16px; color: var(--muted); font-size: 14px; font-weight: 500; }
            h1 { margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -.8px; line-height: 1.2; }
            .description { max-width: 512px; margin: 16px 0 0; color: var(--muted); font-size: 16px; line-height: 1.65; }
            .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
            .action { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 12px 20px; border: 1px solid var(--rule); border-radius: 8px; background: transparent; color: var(--text); font: inherit; font-size: 14px; font-weight: 500; text-decoration: none; cursor: pointer; }
            .primary { border-color: var(--accent); background: var(--accent); color: var(--action-text); }
            a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
            [hidden] { display: none; }
            @media (min-width: 640px) { header { padding-inline: 40px; } main { padding-inline: 40px; } h1 { font-size: 36px; } }
        </style>
    </head>
    <body>
        <header>
            <a href="/" class="brand" aria-label="Workbine home">
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <path d="M3 7L9 25L16 9L23 25L29 7M5 16H27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>workbine<span class="brand-dot">.</span></span>
            </a>
        </header>
        <main>
            <p class="status">Error {{ $status }}</p>
            <h1>{{ $title }}</h1>
            <p class="description">{{ $description }}</p>
            <div class="actions">
                <a href="/topics" class="action primary">Browse topics</a>
                <button type="button" id="go-back" class="action" hidden>Go back</button>
            </div>
        </main>
        <script>
            const goBack = document.getElementById('go-back');
            if (window.history.length > 1) {
                goBack.hidden = false;
                goBack.addEventListener('click', () => window.history.back());
            }
        </script>
    </body>
</html>
