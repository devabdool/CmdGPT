'use strict';

/**
 * Security filter – blocks dangerous commands before execution.
 *
 * This module maintains a list of dangerous command patterns and provides
 * a function to validate a list of commands before they are run.
 */

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//i,
  /rm\s+-rf\s+~\b/i,
  /rm\s+--no-preserve-root/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bpoweroff\b/i,
  /\bmkfs\b/i,
  /\bdd\s+.*of=\/dev/i,
  /\bformat\s+[a-zA-Z]:/i,
  /sudo\s+rm/i,
  /sudo\s+mkfs/i,
  /sudo\s+dd/i,
  />\s*\/dev\/sd[a-z]/i,
  /:\(\)\{.*\|.*&\s*\};:/,      // fork bomb
  /chmod\s+-?R?\s*[0-7]*\s+\//i,
  /chown\s+-?R?\s+.*\s+\//i,
  /\bwipe\b/i,
  /\bfdisk\b.*\/dev\/sd/i,
  /\bparted\b.*\/dev\/sd/i,
];

/**
 * Checks a single command string against the dangerous patterns list.
 * @param {string} command
 * @returns {{ safe: boolean, reason?: string }}
 */
function checkCommand(command) {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return {
        safe: false,
        reason: `Command matches dangerous pattern: ${pattern.toString()}`,
      };
    }
  }
  return { safe: true };
}

/**
 * Validates an array of commands and returns the first violation, if any.
 * @param {string[]} commands
 * @returns {{ safe: boolean, command?: string, reason?: string }}
 */
function validateCommands(commands) {
  for (const cmd of commands) {
    const result = checkCommand(cmd);
    if (!result.safe) {
      return { safe: false, command: cmd, reason: result.reason };
    }
  }
  return { safe: true };
}

module.exports = { checkCommand, validateCommands };
