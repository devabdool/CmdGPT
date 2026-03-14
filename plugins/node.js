'use strict';

/**
 * Node.js / React / Next.js / Vue / Angular plugin.
 */
const commands = {
  start: ['npm start'],
  dev: ['npm run dev'],
  build: ['npm run build'],
  test: ['npm test'],
  install: ['npm install'],
  lint: ['npm run lint'],
  format: ['npm run format'],
  'install package': ['npm install'],
  'uninstall package': ['npm uninstall'],
  'update packages': ['npm update'],
  'audit fix': ['npm audit fix'],
  'clean install': ['rm -rf node_modules', 'npm install'],
  setup: ['npm init -y', 'npm install'],
};

/**
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
