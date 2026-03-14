'use strict';

/**
 * Flutter plugin – maps common intents to Flutter / Dart commands.
 */
const commands = {
  start: ['flutter run'],
  run: ['flutter run'],
  build: ['flutter build apk'],
  'build ios': ['flutter build ios'],
  'build web': ['flutter build web'],
  test: ['flutter test'],
  install: ['flutter pub get'],
  'pub get': ['flutter pub get'],
  upgrade: ['flutter pub upgrade'],
  clean: ['flutter clean'],
  doctor: ['flutter doctor'],
  setup: [
    'flutter create .',
    'flutter pub get',
  ],
  devices: ['flutter devices'],
  analyze: ['flutter analyze'],
  format: ['dart format .'],
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
