'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('../utils/logger');
const { analyzeWithAI } = require('./aiProvider');
const { resolveProvider } = require('./config');

/**
 * Default path where CmdGPT stores the last terminal error.
 */
const ERROR_LOG_PATH = path.join(os.homedir(), '.cmdgpt_last_error');

/**
 * Saves a terminal error string to the error log file for later analysis.
 * @param {string} errorText
 */
function saveError(errorText) {
  fs.writeFileSync(ERROR_LOG_PATH, errorText, 'utf8');
}

/**
 * Reads the last saved terminal error.
 * @returns {string | null}
 */
function readLastError() {
  try {
    if (!fs.existsSync(ERROR_LOG_PATH)) return null;
    return fs.readFileSync(ERROR_LOG_PATH, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Analyzes the last terminal error and either uses the configured AI provider
 * or local heuristics to explain the issue and suggest fix commands.
 *
 * @param {string} [errorText] - Override error text (defaults to last saved error).
 * @returns {Promise<{ explanation: string, fixes: string[] }>}
 */
async function analyzeError(errorText) {
  const error = errorText || readLastError();

  if (!error) {
    logger.warn('No error found. Save an error first with `cmdgpt save-error "<error text>"`.');
    return { explanation: 'No error found.', fixes: [] };
  }

  logger.info('Analyzing error...\n');
  logger.info(`Error:\n${error}\n`);

  // Try the configured AI provider first
  if (resolveProvider()) {
    const aiResult = await analyzeWithAI(error);
    if (aiResult) return aiResult;
  }

  // Fall back to local heuristic analysis
  return analyzeLocally(error);
}

/**
 * Heuristic-based local error analysis.
 * @param {string} error
 * @returns {{ explanation: string, fixes: string[] }}
 */
function analyzeLocally(error) {
  const lower = error.toLowerCase();
  const result = { explanation: '', fixes: [] };

  if (lower.includes('command not found') || lower.includes('is not recognized')) {
    const match = error.match(/(?:command not found|is not recognized as).*?[:\s](\S+)/i);
    const cmd = match ? match[1] : 'the command';
    result.explanation = `The command "${cmd}" is not installed or not on your PATH.`;
    result.fixes = [`which ${cmd}`, `echo $PATH`];
    if (lower.includes('node')) result.fixes.unshift('nvm install node');
    if (lower.includes('npm')) result.fixes.unshift('curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -', 'sudo apt-get install -y nodejs');
    if (lower.includes('python')) result.fixes.unshift('sudo apt-get install -y python3');
    if (lower.includes('docker')) result.fixes.unshift('curl -fsSL https://get.docker.com | sh');
    return result;
  }

  if (lower.includes('permission denied')) {
    result.explanation = 'You do not have permission to access this file or directory.';
    result.fixes = ['ls -la', 'chmod +x <file>', 'sudo <command>'];
    return result;
  }

  if (lower.includes('enoent') || lower.includes('no such file')) {
    result.explanation = 'A file or directory that the command expected does not exist.';
    result.fixes = ['ls -la', 'pwd', 'find . -name "<filename>"'];
    return result;
  }

  if (lower.includes('eaddrinuse') || (lower.includes('port') && (lower.includes('in use') || lower.includes('already')))) {
    result.explanation = 'A port is already in use by another process.';
    result.fixes = ['lsof -i :<port>', 'kill -9 $(lsof -t -i:<port>)'];
    return result;
  }

  if (lower.includes('npm err') || lower.includes('npm error')) {
    result.explanation = 'An npm error occurred during package installation or a script execution.';
    result.fixes = ['npm install', 'rm -rf node_modules && npm install', 'npm audit fix'];
    return result;
  }

  if (lower.includes('composer')) {
    result.explanation = 'A Composer (PHP) error occurred.';
    result.fixes = ['composer install', 'composer update', 'composer dump-autoload'];
    return result;
  }

  if (lower.includes('pip') || lower.includes('python')) {
    result.explanation = 'A Python/pip error occurred.';
    result.fixes = ['pip install -r requirements.txt', 'python -m venv venv', 'source venv/bin/activate'];
    return result;
  }

  if (lower.includes('git')) {
    result.explanation = 'A git error occurred.';
    result.fixes = ['git status', 'git fetch --all', 'git reset --hard origin/main'];
    return result;
  }

  if (lower.includes('docker')) {
    result.explanation = 'A Docker error occurred.';
    result.fixes = ['docker ps', 'docker compose down', 'docker system prune -f', 'sudo systemctl start docker'];
    return result;
  }

  result.explanation = 'An error occurred. Set OPENAI_API_KEY or ANTHROPIC_API_KEY for a detailed AI-powered analysis.';
  result.fixes = [];
  return result;
}

module.exports = { analyzeError, saveError, readLastError, ERROR_LOG_PATH };
