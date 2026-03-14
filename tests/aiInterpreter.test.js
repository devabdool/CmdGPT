'use strict';

/**
 * Tests for core/aiInterpreter.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { interpret } = require('../core/aiInterpreter');
const os = require('os');

// Use a temp empty dir to keep project detection predictable for universal patterns
const EMPTY_DIR = os.tmpdir();

describe('aiInterpreter – universal patterns', () => {
  it('maps "show my docker containers" to docker ps', async () => {
    const cmds = await interpret('show my docker containers', EMPTY_DIR);
    assert.ok(cmds.includes('docker ps'), `Expected docker ps in [${cmds}]`);
  });

  it('maps "push my code" to git commands', async () => {
    const cmds = await interpret('push my code', EMPTY_DIR);
    assert.ok(cmds.includes('git add .'), `Expected git add . in [${cmds}]`);
    assert.ok(cmds.includes('git push'), `Expected git push in [${cmds}]`);
  });

  it('maps "list pods" to kubectl get pods', async () => {
    const cmds = await interpret('list pods', EMPTY_DIR);
    assert.ok(cmds.includes('kubectl get pods'), `Expected kubectl get pods in [${cmds}]`);
  });

  it('maps "show all containers" to docker ps -a', async () => {
    const cmds = await interpret('show all containers', EMPTY_DIR);
    assert.ok(cmds.includes('docker ps -a'), `Expected docker ps -a in [${cmds}]`);
  });

  it('maps "git status" to git status command', async () => {
    const cmds = await interpret('git status', EMPTY_DIR);
    assert.ok(cmds.includes('git status'), `Expected git status in [${cmds}]`);
  });

  it('maps "git log" to git log', async () => {
    const cmds = await interpret('git log', EMPTY_DIR);
    assert.ok(cmds.some((c) => c.startsWith('git log')), `Expected git log in [${cmds}]`);
  });
});

describe('aiInterpreter – project-specific patterns', () => {
  const fs = require('fs');
  const path = require('path');

  function makeDirWithFile(filename, content = '') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdgpt-int-'));
    fs.writeFileSync(path.join(dir, filename), content);
    return dir;
  }

  it('maps "start" in Laravel project to php artisan serve', async () => {
    const dir = makeDirWithFile('artisan');
    const cmds = await interpret('start', dir);
    assert.ok(cmds.includes('php artisan serve'), `Expected php artisan serve in [${cmds}]`);
    fs.rmSync(dir, { recursive: true });
  });

  it('maps "start" in Node project to npm start', async () => {
    const dir = makeDirWithFile('package.json', JSON.stringify({ name: 'app', scripts: { start: 'node app.js' } }));
    const cmds = await interpret('start', dir);
    assert.ok(cmds.includes('npm start'), `Expected npm start in [${cmds}]`);
    fs.rmSync(dir, { recursive: true });
  });

  it('maps "start" in Flutter project to flutter run', async () => {
    const dir = makeDirWithFile('pubspec.yaml');
    const cmds = await interpret('start', dir);
    assert.ok(cmds.includes('flutter run'), `Expected flutter run in [${cmds}]`);
    fs.rmSync(dir, { recursive: true });
  });
});
