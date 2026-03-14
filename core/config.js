'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Path to the CmdGPT user config file.
 */
const CONFIG_PATH = path.join(os.homedir(), '.cmdgpt.json');

/**
 * Valid AI provider identifiers.
 */
const PROVIDERS = ['openai', 'anthropic'];

/**
 * Default model for each provider when no model override is configured.
 */
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
};

/**
 * Reads the config file and returns the parsed object.
 * Returns an empty object if the file does not exist or is malformed.
 * @returns {Record<string, unknown>}
 */
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Writes `data` to the config file (pretty-printed JSON).
 * @param {Record<string, unknown>} data
 */
function writeConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Sets a single key in the config file.
 * @param {string} key
 * @param {unknown} value
 */
function setConfigValue(key, value) {
  const cfg = readConfig();
  cfg[key] = value;
  writeConfig(cfg);
}

/**
 * Gets a single key from the config file.
 * @param {string} key
 * @returns {unknown}
 */
function getConfigValue(key) {
  return readConfig()[key];
}

/**
 * Resolves the active AI provider.
 *
 * Priority order:
 * 1. `provider` field in config file
 * 2. Auto-detect from environment variables (OPENAI_API_KEY → openai, ANTHROPIC_API_KEY → anthropic)
 * 3. `null` (no AI provider available)
 *
 * @returns {'openai' | 'anthropic' | null}
 */
function resolveProvider() {
  const cfg = readConfig();
  if (cfg.provider && PROVIDERS.includes(cfg.provider)) {
    return cfg.provider;
  }
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

/**
 * Returns the model to use for a given provider.
 * Respects per-provider overrides in the config file.
 * @param {'openai' | 'anthropic'} provider
 * @returns {string}
 */
function resolveModel(provider) {
  const cfg = readConfig();
  const key = `${provider}Model`;
  return (cfg[key] && typeof cfg[key] === 'string') ? cfg[key] : DEFAULT_MODELS[provider];
}

/**
 * Returns the API key for a given provider.
 * Checks the environment variable first, then the config file.
 * @param {'openai' | 'anthropic'} provider
 * @returns {string | undefined}
 */
function resolveApiKey(provider) {
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY || getConfigValue('openaiApiKey');
  }
  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY || getConfigValue('anthropicApiKey');
  }
  return undefined;
}

module.exports = {
  CONFIG_PATH,
  PROVIDERS,
  DEFAULT_MODELS,
  readConfig,
  writeConfig,
  setConfigValue,
  getConfigValue,
  resolveProvider,
  resolveModel,
  resolveApiKey,
};
