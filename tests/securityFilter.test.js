'use strict';

/**
 * Tests for core/securityFilter.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkCommand, validateCommands } = require('../core/securityFilter');

describe('securityFilter', () => {
  describe('checkCommand', () => {
    it('allows safe commands', () => {
      assert.deepEqual(checkCommand('npm install').safe, true);
      assert.deepEqual(checkCommand('git push').safe, true);
      assert.deepEqual(checkCommand('docker ps').safe, true);
      assert.deepEqual(checkCommand('ls -la').safe, true);
    });

    it('blocks rm -rf /', () => {
      assert.equal(checkCommand('rm -rf /').safe, false);
    });

    it('blocks shutdown', () => {
      assert.equal(checkCommand('shutdown now').safe, false);
    });

    it('blocks mkfs', () => {
      assert.equal(checkCommand('mkfs.ext4 /dev/sda').safe, false);
    });

    it('blocks sudo rm', () => {
      assert.equal(checkCommand('sudo rm -rf /tmp').safe, false);
    });

    it('blocks fork bomb', () => {
      assert.equal(checkCommand(':(){ :|:& };:').safe, false);
    });

    it('blocks reboot', () => {
      assert.equal(checkCommand('reboot').safe, false);
    });
  });

  describe('validateCommands', () => {
    it('returns safe for all-safe command array', () => {
      const result = validateCommands(['npm install', 'git status']);
      assert.equal(result.safe, true);
    });

    it('returns unsafe and reports the offending command', () => {
      const result = validateCommands(['npm install', 'rm -rf /', 'git push']);
      assert.equal(result.safe, false);
      assert.equal(result.command, 'rm -rf /');
    });

    it('handles empty array gracefully', () => {
      assert.equal(validateCommands([]).safe, true);
    });
  });
});
