'use strict';

const { detectProject } = require('./projectDetector');
const logger = require('../utils/logger');

// Plugins
const laravelPlugin = require('../plugins/laravel');
const nodePlugin = require('../plugins/node');
const dockerPlugin = require('../plugins/docker');
const gitPlugin = require('../plugins/git');
const flutterPlugin = require('../plugins/flutter');
const kubernetesPlugin = require('../plugins/kubernetes');

/**
 * Maps detected project types to their primary plugin.
 */
const PROJECT_PLUGIN_MAP = {
  laravel: laravelPlugin,
  node: nodePlugin,
  react: nodePlugin,
  nextjs: nodePlugin,
  vue: nodePlugin,
  angular: nodePlugin,
  svelte: nodePlugin,
  express: nodePlugin,
  fastify: nodePlugin,
  nestjs: nodePlugin,
  flutter: flutterPlugin,
  'react-native': flutterPlugin,
  docker: dockerPlugin,
  kubernetes: kubernetesPlugin,
};

/**
 * Universal intent patterns that map to commands regardless of project type.
 * Each entry has a `test` function for flexible matching (regex or string includes).
 * Listed from most-specific to least-specific to ensure correct matching.
 */
const UNIVERSAL_PATTERNS = [
  // Git – push comes before pull to avoid false matches
  { test: (s) => /\b(push|commit.{0,20}push)\b/.test(s), plugin: gitPlugin, key: 'push' },
  { test: (s) => /\bdeploy.{0,20}(app|code|project|my)\b|\bdeploy\s*$/.test(s), plugin: gitPlugin, key: 'push' },
  { test: (s) => /\bgit\s+pull\b|\bpull\s+(code|changes|update)\b/.test(s), plugin: gitPlugin, key: 'pull' },
  { test: (s) => /\b(git\s+status|show\s+status|check\s+status)\b/.test(s), plugin: gitPlugin, key: 'status' },
  { test: (s) => /\b(git\s+log|show\s+log|commit\s+history)\b/.test(s), plugin: gitPlugin, key: 'log' },
  { test: (s) => /\b(git\s+branch|list\s+branches|show\s+branches)\b/.test(s), plugin: gitPlugin, key: 'branch' },
  { test: (s) => /\b(git\s+diff|show\s+diff|show\s+changes)\b/.test(s), plugin: gitPlugin, key: 'diff' },
  { test: (s) => /\bgit\s+stash\b/.test(s), plugin: gitPlugin, key: 'stash' },
  { test: (s) => /\b(git\s+fetch|fetch\s+(all|remote))\b/.test(s), plugin: gitPlugin, key: 'fetch' },
  // Docker – containers
  { test: (s) => /\ball.{0,10}containers?\b|docker\s+ps\s+-a/.test(s), plugin: dockerPlugin, key: 'all containers' },
  { test: (s) => /\b(docker\s+ps|show.{0,10}(docker\s+)?containers?|list.{0,10}containers?|running\s+containers?)\b/.test(s), plugin: dockerPlugin, key: 'show containers' },
  { test: (s) => /\b(docker.{0,10}logs?|container.{0,10}logs?)\b/.test(s), plugin: dockerPlugin, key: 'logs' },
  { test: (s) => /\b(docker.{0,10}build|build.{0,10}image)\b/.test(s), plugin: dockerPlugin, key: 'build' },
  { test: (s) => /\b(docker.compose.up|start.{0,10}containers?)\b/.test(s), plugin: dockerPlugin, key: 'start' },
  { test: (s) => /\b(docker.compose.down|stop.{0,10}containers?)\b/.test(s), plugin: dockerPlugin, key: 'stop containers' },
  { test: (s) => /\b(docker.{0,10}prune|clean.{0,10}docker)\b/.test(s), plugin: dockerPlugin, key: 'prune' },
  // Kubernetes
  { test: (s) => /\b(get|list|show).{0,10}pods?\b/.test(s), plugin: kubernetesPlugin, key: 'get pods' },
  { test: (s) => /\b(get|list|show).{0,10}services?\b/.test(s), plugin: kubernetesPlugin, key: 'get services' },
  { test: (s) => /\b(get|list|show).{0,10}deployments?\b/.test(s), plugin: kubernetesPlugin, key: 'get deployments' },
  { test: (s) => /\b(kubectl\s+apply|apply.{0,10}config|k8s.{0,10}deploy)\b/.test(s), plugin: kubernetesPlugin, key: 'apply config' },
  { test: (s) => /\b(rollout.{0,10}restart|restart.{0,10}deployment)\b/.test(s), plugin: kubernetesPlugin, key: 'rollout restart' },
  { test: (s) => /\b(kubectl.{0,10}logs?|pod.{0,10}logs?)\b/.test(s), plugin: kubernetesPlugin, key: 'logs' },
];

/**
 * Interprets a natural-language intent and returns shell commands.
 *
 * Strategy:
 * 1. Check universal patterns (git, docker, k8s) regardless of project type.
 * 2. Detect project type and delegate to its plugin.
 * 3. Fall back to OpenAI if OPENAI_API_KEY is set.
 * 4. Return an empty array with a warning if nothing matched.
 *
 * @param {string} intent - Natural language input.
 * @param {string} [dir=process.cwd()] - Working directory.
 * @returns {Promise<string[]>} Resolved shell commands.
 */
async function interpret(intent, dir = process.cwd()) {
  const lower = intent.toLowerCase().trim();

  // 1. Universal pattern matching (git, docker, kubernetes)
  const universalMatch = matchUniversal(lower);
  if (universalMatch) return universalMatch;

  // 2. Setup intent: detect target framework from the intent string itself
  if (lower.includes('setup') || lower.includes('create') || lower.includes('init')) {
    const setupMatch = matchSetup(lower);
    if (setupMatch) return setupMatch;
  }

  // 3. Project-type plugin matching
  const { type, details } = detectProject(dir);
  logger.debug(`Detected project: ${details}`);

  const plugin = PROJECT_PLUGIN_MAP[type];
  if (plugin) {
    const pluginResult = plugin.resolve(lower);
    if (pluginResult) return pluginResult;
  }

  // 4. Generic Node.js plugin fallback for unknown types
  if (type === 'unknown') {
    const nodeResult = nodePlugin.resolve(lower);
    if (nodeResult) return nodeResult;
  }

  // 5. OpenAI fallback
  if (process.env.OPENAI_API_KEY) {
    return await askOpenAI(intent, type);
  }

  logger.warn(`Could not interpret: "${intent}". Try setting OPENAI_API_KEY for AI-powered interpretation.`);
  return [];
}

/**
 * Matches setup/create/init intents and returns plugin setup commands for the
 * target framework detected within the intent string (not from the filesystem).
 * @param {string} lower
 * @returns {string[] | null}
 */
function matchSetup(lower) {
  const SETUP_MAP = [
    { test: (s) => /laravel/.test(s), plugin: laravelPlugin },
    { test: (s) => /react/.test(s), plugin: nodePlugin },
    { test: (s) => /next(js|\.js)?/.test(s), plugin: nodePlugin },
    { test: (s) => /vue/.test(s), plugin: nodePlugin },
    { test: (s) => /angular/.test(s), plugin: nodePlugin },
    { test: (s) => /flutter/.test(s), plugin: flutterPlugin },
    { test: (s) => /node/.test(s), plugin: nodePlugin },
    { test: (s) => /docker/.test(s), plugin: dockerPlugin },
    { test: (s) => /k8s|kubernetes/.test(s), plugin: kubernetesPlugin },
  ];
  for (const { test, plugin } of SETUP_MAP) {
    if (test(lower) && plugin.commands.setup) return plugin.commands.setup;
  }
  return null;
}

/**
 * Tests the intent against universal patterns.
 * @param {string} lower
 * @returns {string[] | null}
 */
function matchUniversal(lower) {
  for (const { test, plugin, key } of UNIVERSAL_PATTERNS) {
    if (test(lower)) {
      return plugin.commands[key] || null;
    }
  }
  return null;
}

/**
 * Calls the OpenAI API to interpret the intent as shell commands.
 * @param {string} intent
 * @param {string} projectType
 * @returns {Promise<string[]>}
 */
async function askOpenAI(intent, projectType) {
  try {
    const { OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a terminal assistant. Given a natural language request and a project type, return ONLY the shell commands needed, one per line, with no explanation, markdown, or extra text.

Project type: ${projectType}
Operating system: ${process.platform}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: intent },
      ],
      temperature: 0,
      max_tokens: 256,
    });

    const raw = response.choices[0]?.message?.content || '';
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
  } catch (err) {
    logger.error(`OpenAI error: ${err.message}`);
    return [];
  }
}

/**
 * Asks OpenAI to explain what a command does.
 * @param {string} command
 * @returns {Promise<string>}
 */
async function explainCommand(command) {
  if (!process.env.OPENAI_API_KEY) {
    return getLocalExplanation(command);
  }

  try {
    const { OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful terminal assistant. Explain what the given command does in plain English. Be concise but thorough.',
        },
        { role: 'user', content: `Explain: ${command}` },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    return response.choices[0]?.message?.content || 'No explanation available.';
  } catch (err) {
    logger.error(`OpenAI error: ${err.message}`);
    return getLocalExplanation(command);
  }
}

/**
 * Provides a basic local explanation for well-known commands.
 * @param {string} command
 * @returns {string}
 */
function getLocalExplanation(command) {
  const lower = command.toLowerCase();
  const explanations = {
    'docker ps': 'Lists all currently running Docker containers.',
    'docker ps -a': 'Lists all Docker containers, including stopped ones.',
    'docker compose up': 'Starts all services defined in docker-compose.yml.',
    'docker compose down': 'Stops and removes containers defined in docker-compose.yml.',
    'docker compose up -d': 'Starts all services in detached (background) mode.',
    'git status': 'Shows the working tree status – which files are staged, unstaged, or untracked.',
    'git add .': 'Stages all changed files in the current directory for the next commit.',
    'git commit': 'Records staged changes to the repository with a message.',
    'git push': 'Uploads local commits to the remote repository.',
    'git pull': 'Fetches and integrates remote changes into the current branch.',
    'git log': 'Shows the commit history for the current branch.',
    'npm install': 'Installs all dependencies listed in package.json.',
    'npm run dev': 'Starts the development server (as defined in package.json scripts).',
    'npm start': 'Starts the application (as defined in package.json).',
    'npm run build': 'Builds the project for production.',
    'npm test': 'Runs the test suite.',
    'php artisan serve': 'Starts the Laravel built-in development server.',
    'php artisan migrate': 'Runs outstanding database migrations.',
    'php artisan test': 'Runs the Laravel test suite.',
    'flutter run': 'Runs the Flutter app on a connected device or emulator.',
    'flutter build apk': 'Builds an Android APK release.',
    'flutter pub get': 'Fetches the Dart/Flutter dependencies listed in pubspec.yaml.',
    'kubectl get pods': 'Lists all pods in the current Kubernetes namespace.',
    'kubectl apply -f .': 'Applies all Kubernetes manifests found in the current directory.',
  };

  for (const [key, explanation] of Object.entries(explanations)) {
    if (lower.includes(key.toLowerCase())) return explanation;
  }

  return `No local explanation found for "${command}". Set OPENAI_API_KEY for AI-powered explanations.`;
}

module.exports = { interpret, explainCommand };
