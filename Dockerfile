FROM node:22-bookworm-slim AS node

FROM php:8.3-apache-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libicu-dev \
        libpq-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" bcmath intl opcache pdo_pgsql zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /var/www/html
COPY . .

RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader \
    && php artisan wayfinder:generate --with-form --no-interaction \
    && npm install \
    && npm run build \
    && rm -rf node_modules /usr/local/lib/node_modules /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/workbine-entrypoint
RUN chmod +x /usr/local/bin/workbine-entrypoint

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD php -r '$$c=@file_get_contents("http://127.0.0.1/up"); exit($$c===false ? 1 : 0);'

ENTRYPOINT ["workbine-entrypoint"]
CMD ["apache2-foreground"]
