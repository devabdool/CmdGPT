'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Detects the project type by inspecting files in the given directory.
 * @param {string} [dir=process.cwd()] - Directory to inspect.
 * @returns {{ type: string, details: string }}
 */
function detectProject(dir = process.cwd()) {
  const files = getFiles(dir);

  if (files.includes('artisan')) {
    return { type: 'laravel', details: 'Laravel (PHP)' };
  }
  if (files.includes('pubspec.yaml')) {
    return { type: 'flutter', details: 'Flutter (Dart)' };
  }
  if (files.includes('android') && files.includes('ios')) {
    return { type: 'react-native', details: 'React Native' };
  }
  if (files.includes('manage.py')) {
    return { type: 'django', details: 'Django (Python)' };
  }
  if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
    return { type: 'python', details: 'Python project' };
  }
  if (files.includes('go.mod')) {
    return { type: 'go', details: 'Go project' };
  }
  if (files.includes('docker-compose.yml') || files.includes('docker-compose.yaml')) {
    return { type: 'docker', details: 'Docker Compose project' };
  }
  if (files.includes('Dockerfile')) {
    return { type: 'docker', details: 'Docker project' };
  }
  if (files.includes('kubernetes') || files.includes('k8s') || hasKubernetesManifests(dir)) {
    return { type: 'kubernetes', details: 'Kubernetes project' };
  }
  if (files.includes('package.json')) {
    return detectNodeProject(dir);
  }
  if (files.includes('Gemfile')) {
    return { type: 'ruby', details: 'Ruby / Rails project' };
  }
  if (files.includes('pom.xml') || files.includes('build.gradle')) {
    return { type: 'java', details: 'Java / Spring project' };
  }
  if (files.includes('Cargo.toml')) {
    return { type: 'rust', details: 'Rust project' };
  }

  return { type: 'unknown', details: 'Unknown project type' };
}

/**
 * Further identifies a Node.js project (React, Next.js, Vue, Angular, etc.).
 * @param {string} dir
 */
function detectNodeProject(dir) {
  try {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (deps['next']) return { type: 'nextjs', details: 'Next.js (React)' };
    if (deps['react']) return { type: 'react', details: 'React.js' };
    if (deps['vue']) return { type: 'vue', details: 'Vue.js' };
    if (deps['@angular/core']) return { type: 'angular', details: 'Angular' };
    if (deps['svelte']) return { type: 'svelte', details: 'Svelte' };
    if (deps['express']) return { type: 'express', details: 'Express.js (Node.js)' };
    if (deps['fastify']) return { type: 'fastify', details: 'Fastify (Node.js)' };
    if (deps['@nestjs/core']) return { type: 'nestjs', details: 'NestJS' };
    if (pkg.scripts && pkg.scripts.dev) {
      return { type: 'node', details: 'Node.js project (with dev script)' };
    }
    return { type: 'node', details: 'Node.js project' };
  } catch {
    return { type: 'node', details: 'Node.js project' };
  }
}

/**
 * Returns a flat list of file/directory names in a directory (non-recursive).
 * @param {string} dir
 * @returns {string[]}
 */
function getFiles(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Checks whether a directory contains Kubernetes YAML manifests.
 * @param {string} dir
 * @returns {boolean}
 */
function hasKubernetesManifests(dir) {
  try {
    const entries = fs.readdirSync(dir);
    return entries.some((entry) => {
      if (!/\.(yml|yaml)$/.test(entry)) return false;
      try {
        const content = fs.readFileSync(path.join(dir, entry), 'utf8');
        return /kind:\s*(Deployment|Service|Pod|Ingress|ConfigMap)/i.test(content);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

module.exports = { detectProject };
