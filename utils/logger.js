'use strict';

const chalk = require('chalk');

const LOG_LEVELS = {
  info: { color: 'cyan', prefix: 'ℹ' },
  success: { color: 'green', prefix: '✔' },
  warn: { color: 'yellow', prefix: '⚠' },
  error: { color: 'red', prefix: '✖' },
  debug: { color: 'magenta', prefix: '◉' },
  cmd: { color: 'blue', prefix: '▶' },
};

function log(level, message) {
  const { color, prefix } = LOG_LEVELS[level] || LOG_LEVELS.info;
  console.log(chalk[color](`${prefix} ${message}`));
}

const logger = {
  info: (msg) => log('info', msg),
  success: (msg) => log('success', msg),
  warn: (msg) => log('warn', msg),
  error: (msg) => log('error', msg),
  debug: (msg) => log('debug', msg),
  cmd: (msg) => log('cmd', msg),
  banner() {
    console.log(chalk.cyan.bold('\n╔══════════════════════════════╗'));
    console.log(chalk.cyan.bold('║         CmdGPT v1.0.0        ║'));
    console.log(chalk.cyan.bold('║ AI-Powered Terminal Assistant ║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════╝\n'));
  },
};

module.exports = logger;
