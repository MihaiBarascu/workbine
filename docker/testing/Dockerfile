FROM node:24-bookworm-slim AS node
FROM php:8.3-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip python3 libicu-dev libpq-dev libzip-dev \
    && docker-php-ext-install -j2 bcmath intl pdo_pgsql zip \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && npm install --prefix /tmp/workbine-browser --no-save --package-lock=false playwright@1.56.1 \
    && node /tmp/workbine-browser/node_modules/playwright/cli.js install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*
RUN echo 'memory_limit=512M' > /usr/local/etc/php/conf.d/testing.ini
WORKDIR /app
