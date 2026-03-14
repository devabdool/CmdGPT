'use strict';

/**
 * Laravel plugin – maps common intents to artisan / composer commands.
 */
const commands = {
  start: ['php artisan serve'],
  migrate: ['php artisan migrate'],
  'migrate:fresh': ['php artisan migrate:fresh --seed'],
  seed: ['php artisan db:seed'],
  install: ['composer install'],
  update: ['composer update'],
  cache: ['php artisan config:cache', 'php artisan route:cache', 'php artisan view:cache'],
  'clear cache': ['php artisan cache:clear', 'php artisan config:clear', 'php artisan route:clear', 'php artisan view:clear'],
  test: ['php artisan test'],
  build: ['npm run build'],
  dev: ['npm run dev'],
  'make controller': ['php artisan make:controller'],
  'make model': ['php artisan make:model'],
  'make migration': ['php artisan make:migration'],
  'make seeder': ['php artisan make:seeder'],
  'make middleware': ['php artisan make:middleware'],
  'make request': ['php artisan make:request'],
  'route list': ['php artisan route:list'],
  queue: ['php artisan queue:work'],
  setup: [
    'composer create-project laravel/laravel .',
    'cp .env.example .env',
    'php artisan key:generate',
    'php artisan migrate',
  ],
};

/**
 * Resolves the best matching commands for a given intent.
 * @param {string} intent
 * @returns {string[] | null}
 */
function resolve(intent) {
  const lower = intent.toLowerCase();
  for (const [key, cmds] of Object.entries(commands)) {
    if (lower.includes(key)) return cmds;
  }
  return null;
}

module.exports = { resolve, commands };
