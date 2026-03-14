'use strict';

const logger = require('../utils/logger');
const { resolveProvider, resolveModel, resolveApiKey } = require('./config');

// ─────────────────────────────────────────────────────────────────────────────
// Shared prompt templates
// ─────────────────────────────────────────────────────────────────────────────

const INTERPRET_SYSTEM = (projectType) =>
  `You are a terminal assistant. Given a natural language request and a project type, return ONLY the shell commands needed, one per line, with no explanation, markdown, or extra text.\n\nProject type: ${projectType}\nOperating system: ${process.platform}`;

const EXPLAIN_SYSTEM =
  'You are a helpful terminal assistant. Explain what the given command does in plain English. Be concise but thorough.';

const ANALYZE_PROMPT = (error) =>
  `A developer encountered the following terminal error:\n\n\`\`\`\n${error}\n\`\`\`\n\nPlease:\n1. Explain what this error means in plain English.\n2. List the exact shell commands needed to fix it (one per line, inside a JSON array under the key "fixes").\n\nRespond in JSON format:\n{\n  "explanation": "<plain-English explanation>",\n  "fixes": ["<command1>", "<command2>"]\n}`;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits a raw LLM text response (one command per line) into a string array.
 * @param {string} raw
 * @returns {string[]}
 */
function parseCommandLines(raw) {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

/**
 * Parses a JSON error analysis response from either provider.
 * @param {string} raw
 * @returns {{ explanation: string, fixes: string[] }}
 */
function parseAnalysisJson(raw) {
  try {
    // Strip markdown code fences if the model wrapped it
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      explanation: parsed.explanation || 'No explanation.',
      fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
    };
  } catch {
    return { explanation: raw || 'No explanation.', fixes: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI implementation
// ─────────────────────────────────────────────────────────────────────────────

async function openaiChat(messages, { model, maxTokens = 512, jsonMode = false } = {}) {
  const { OpenAI } = require('openai');
  const apiKey = resolveApiKey('openai');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
  const client = new OpenAI({ apiKey });

  const opts = {
    model,
    messages,
    temperature: 0,
    max_tokens: maxTokens,
  };
  if (jsonMode) opts.response_format = { type: 'json_object' };

  const response = await client.chat.completions.create(opts);
  return response.choices[0]?.message?.content || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic implementation
// ─────────────────────────────────────────────────────────────────────────────

async function anthropicChat(messages, { model, maxTokens = 512, system } = {}) {
  const Anthropic = require('@anthropic-ai/sdk');
  const apiKey = resolveApiKey('anthropic');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
  const client = new Anthropic.default({ apiKey });

  const opts = {
    model,
    max_tokens: maxTokens,
    messages,
  };
  if (system) opts.system = system;

  const response = await client.messages.create(opts);
  return response.content[0]?.text || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a natural-language intent to the configured AI provider and returns
 * the shell commands to execute.
 *
 * @param {string} intent      - Natural language request.
 * @param {string} projectType - Detected project type (e.g. 'node', 'laravel').
 * @returns {Promise<string[]>}
 */
async function askAI(intent, projectType) {
  const provider = resolveProvider();
  if (!provider) {
    logger.warn('No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY, or run `cmdgpt config set provider <openai|anthropic>`.');
    return [];
  }

  const model = resolveModel(provider);
  logger.debug(`Using AI provider: ${provider} (model: ${model})`);

  try {
    let raw;
    if (provider === 'openai') {
      raw = await openaiChat(
        [
          { role: 'system', content: INTERPRET_SYSTEM(projectType) },
          { role: 'user', content: intent },
        ],
        { model, maxTokens: 256 },
      );
    } else {
      raw = await anthropicChat(
        [{ role: 'user', content: intent }],
        { model, maxTokens: 256, system: INTERPRET_SYSTEM(projectType) },
      );
    }
    return parseCommandLines(raw);
  } catch (err) {
    logger.error(`${provider} error: ${err.message}`);
    return [];
  }
}

/**
 * Asks the configured AI provider to explain what a shell command does.
 *
 * @param {string} command - Shell command to explain.
 * @returns {Promise<string>}
 */
async function explainWithAI(command) {
  const provider = resolveProvider();
  if (!provider) return null;

  const model = resolveModel(provider);
  logger.debug(`Using AI provider: ${provider} (model: ${model})`);

  try {
    if (provider === 'openai') {
      return await openaiChat(
        [
          { role: 'system', content: EXPLAIN_SYSTEM },
          { role: 'user', content: `Explain: ${command}` },
        ],
        { model, maxTokens: 512 },
      );
    } else {
      return await anthropicChat(
        [{ role: 'user', content: `Explain: ${command}` }],
        { model, maxTokens: 512, system: EXPLAIN_SYSTEM },
      );
    }
  } catch (err) {
    logger.error(`${provider} error: ${err.message}`);
    return null;
  }
}

/**
 * Asks the configured AI provider to analyze a terminal error and return
 * an explanation + suggested fix commands.
 *
 * @param {string} error - Raw terminal error text.
 * @returns {Promise<{ explanation: string, fixes: string[] } | null>}
 */
async function analyzeWithAI(error) {
  const provider = resolveProvider();
  if (!provider) return null;

  const model = resolveModel(provider);
  logger.debug(`Using AI provider: ${provider} (model: ${model})`);

  try {
    let raw;
    if (provider === 'openai') {
      raw = await openaiChat(
        [{ role: 'user', content: ANALYZE_PROMPT(error) }],
        { model, maxTokens: 512, jsonMode: true },
      );
    } else {
      raw = await anthropicChat(
        [{ role: 'user', content: ANALYZE_PROMPT(error) }],
        { model, maxTokens: 512, system: 'You are a helpful terminal assistant. Always respond in valid JSON.' },
      );
    }
    return parseAnalysisJson(raw);
  } catch (err) {
    logger.error(`${provider} error: ${err.message}`);
    return null;
  }
}

module.exports = { askAI, explainWithAI, analyzeWithAI };
