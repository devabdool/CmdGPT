'use strict';

/**
 * Tests for core/errorAnalyzer.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeError } = require('../core/errorAnalyzer');

describe('errorAnalyzer – local heuristics', () => {
  it('identifies "command not found" errors', async () => {
    const result = await analyzeError('bash: flutter: command not found');
    assert.ok(result.explanation.toLowerCase().includes('not installed') || result.explanation.toLowerCase().includes('path'),
      `Unexpected explanation: ${result.explanation}`);
  });

  it('identifies "permission denied" errors', async () => {
    const result = await analyzeError('bash: /usr/bin/node: Permission denied');
    assert.ok(result.explanation.toLowerCase().includes('permission'), `Unexpected explanation: ${result.explanation}`);
    assert.ok(result.fixes.length > 0, 'Expected at least one fix suggestion');
  });

  it('identifies "ENOENT" errors', async () => {
    const result = await analyzeError('Error: ENOENT: no such file or directory, open \'/app/.env\'');
    assert.ok(result.explanation.toLowerCase().includes('file') || result.explanation.toLowerCase().includes('directory'),
      `Unexpected explanation: ${result.explanation}`);
  });

  it('identifies "port in use" errors', async () => {
    const result = await analyzeError('Error: listen EADDRINUSE: address already in use :::3000');
    assert.ok(result.explanation.toLowerCase().includes('port'), `Unexpected explanation: ${result.explanation}`);
    assert.ok(result.fixes.some((f) => f.includes('lsof')), 'Expected lsof fix command');
  });

  it('identifies npm errors', async () => {
    const result = await analyzeError('npm ERR! Cannot read properties of undefined');
    assert.ok(result.fixes.some((f) => f.includes('npm')), 'Expected npm fix command');
  });

  it('handles unknown errors gracefully', async () => {
    const result = await analyzeError('some completely unknown xyz error 12345');
    assert.ok(typeof result.explanation === 'string');
    assert.ok(Array.isArray(result.fixes));
  });
});
