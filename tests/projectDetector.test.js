'use strict';

/**
 * Tests for core/projectDetector.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { detectProject } = require('../core/projectDetector');

/**
 * Helper: create a temp directory with specified files.
 * @param {string[]} filenames
 * @returns {string} path to the temp dir
 */
function makeTempDir(filenames) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdgpt-test-'));
  for (const f of filenames) {
    fs.writeFileSync(path.join(tmpDir, f), '');
  }
  return tmpDir;
}

describe('projectDetector', () => {
  let tmpDirs = [];

  after(() => {
    for (const d of tmpDirs) {
      try { fs.rmSync(d, { recursive: true }); } catch { /* ignore */ }
    }
  });

  function tmpDir(files) {
    const d = makeTempDir(files);
    tmpDirs.push(d);
    return d;
  }

  it('detects Laravel project', () => {
    const dir = tmpDir(['artisan', 'composer.json']);
    assert.equal(detectProject(dir).type, 'laravel');
  });

  it('detects Flutter project', () => {
    const dir = tmpDir(['pubspec.yaml']);
    assert.equal(detectProject(dir).type, 'flutter');
  });

  it('detects Django project', () => {
    const dir = tmpDir(['manage.py']);
    assert.equal(detectProject(dir).type, 'django');
  });

  it('detects Go project', () => {
    const dir = tmpDir(['go.mod']);
    assert.equal(detectProject(dir).type, 'go');
  });

  it('detects Docker Compose project', () => {
    const dir = tmpDir(['docker-compose.yml']);
    assert.equal(detectProject(dir).type, 'docker');
  });

  it('detects Python project', () => {
    const dir = tmpDir(['requirements.txt']);
    assert.equal(detectProject(dir).type, 'python');
  });

  it('detects generic Node.js project', () => {
    const dir = tmpDir([]);
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'my-app', scripts: {} }));
    assert.equal(detectProject(dir).type, 'node');
  });

  it('detects React project from package.json dependencies', () => {
    const dir = tmpDir([]);
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ dependencies: { react: '^18.0.0' } }));
    assert.equal(detectProject(dir).type, 'react');
  });

  it('detects Next.js project', () => {
    const dir = tmpDir([]);
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ dependencies: { next: '^14.0.0' } }));
    assert.equal(detectProject(dir).type, 'nextjs');
  });

  it('returns unknown for empty directory', () => {
    const dir = tmpDir([]);
    assert.equal(detectProject(dir).type, 'unknown');
  });
});
