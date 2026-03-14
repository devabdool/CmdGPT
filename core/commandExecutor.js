'use strict';

const { spawn } = require('child_process');
const logger = require('../utils/logger');
const { validateCommands } = require('./securityFilter');

/**
 * Executes an array of shell commands sequentially, streaming their output.
 *
 * @param {string[]} commands - Shell commands to run.
 * @param {object}   [options]
 * @param {string}   [options.cwd=process.cwd()] - Working directory.
 * @param {boolean}  [options.dryRun=false]      - If true, print commands without running.
 * @returns {Promise<void>}
 */
async function executeCommands(commands, { cwd = process.cwd(), dryRun = false } = {}) {
  if (!Array.isArray(commands) || commands.length === 0) {
    logger.warn('No commands to execute.');
    return;
  }

  // Security check before running anything
  const securityCheck = validateCommands(commands);
  if (!securityCheck.safe) {
    logger.error(`Security violation detected!`);
    logger.error(`Blocked command: ${securityCheck.command}`);
    logger.error(`Reason: ${securityCheck.reason}`);
    throw new Error(`Blocked dangerous command: ${securityCheck.command}`);
  }

  for (const cmd of commands) {
    if (dryRun) {
      logger.cmd(`[DRY RUN] ${cmd}`);
      continue;
    }

    await runCommand(cmd, cwd);
  }
}

/**
 * Runs a single shell command, streaming stdout/stderr.
 * @param {string} cmd
 * @param {string} cwd
 * @returns {Promise<void>}
 */
function runCommand(cmd, cwd) {
  return new Promise((resolve, reject) => {
    logger.cmd(`Running: ${cmd}`);

    const child = spawn(cmd, [], {
      cwd,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => process.stdout.write(data));
    child.stderr.on('data', (data) => process.stderr.write(data));

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}: ${cmd}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start command "${cmd}": ${err.message}`));
    });
  });
}

module.exports = { executeCommands };
