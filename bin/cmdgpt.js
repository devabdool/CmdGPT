#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const inquirer = require('inquirer');
const logger = require('../utils/logger');
const { interpret, explainCommand } = require('../core/aiInterpreter');
const { executeCommands } = require('../core/commandExecutor');
const { detectProject } = require('../core/projectDetector');
const { analyzeError, saveError } = require('../core/errorAnalyzer');
const {
  readConfig,
  setConfigValue,
  PROVIDERS,
  DEFAULT_MODELS,
  CONFIG_PATH,
} = require('../core/config');

const program = new Command();

program
  .name('cmdgpt')
  .description('AI-powered terminal assistant – execute commands using natural language')
  .version('1.0.0');

// ──────────────────────────────────────────────────────────
// Shared helper: interpret intent and confirm-then-execute
// ──────────────────────────────────────────────────────────
async function runIntent(intent, { dryRun = false, dir = process.cwd() } = {}) {
  logger.banner();
  logger.info(`Interpreting: "${intent}"`);

  const commands = await interpret(intent, dir);
  if (!commands.length) {
    logger.warn('No commands could be generated for that intent.');
    logger.info('Try: cmdgpt explain <command>  |  cmdgpt fix  |  cmdgpt detect');
    return;
  }

  logger.info('Commands to run:');
  commands.forEach((cmd) => logger.cmd(cmd));

  if (dryRun) return;

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Execute these commands?',
      default: true,
    },
  ]);

  if (!confirm) {
    logger.warn('Aborted.');
    return;
  }

  try {
    await executeCommands(commands, { cwd: dir });
    logger.success('Done!');
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────
// cmdgpt run <intent...>
// ──────────────────────────────────────────────────────────
program
  .command('run <intent...>')
  .description('Interpret and execute a natural language command')
  .option('-d, --dry-run', 'Print commands without executing them')
  .option('--dir <path>', 'Working directory', process.cwd())
  .action(async (intentWords, options) => {
    await runIntent(intentWords.join(' '), { dryRun: options.dryRun, dir: options.dir });
  });

// ──────────────────────────────────────────────────────────
// cmdgpt fix
// ──────────────────────────────────────────────────────────
program
  .command('fix')
  .description('Analyze the last terminal error and suggest or apply fixes')
  .option('-e, --error <text>', 'Pass error text directly instead of reading from log')
  .action(async (options) => {
    logger.banner();
    const { explanation, fixes } = await analyzeError(options.error);

    logger.info('Analysis:');
    console.log(`\n${explanation}\n`);

    if (fixes.length === 0) {
      logger.warn('No fix commands could be determined.');
      return;
    }

    logger.info('Suggested fix commands:');
    fixes.forEach((cmd) => logger.cmd(cmd));

    const { shouldFix } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldFix',
        message: 'Apply the suggested fix commands?',
        default: false,
      },
    ]);

    if (shouldFix) {
      try {
        await executeCommands(fixes);
        logger.success('Fix applied!');
      } catch (err) {
        logger.error(err.message);
        process.exit(1);
      }
    }
  });

// ──────────────────────────────────────────────────────────
// cmdgpt save-error <text>
// ──────────────────────────────────────────────────────────
program
  .command('save-error <text...>')
  .description('Save a terminal error for later analysis with `cmdgpt fix`')
  .action((textWords) => {
    saveError(textWords.join(' '));
    logger.success('Error saved. Run `cmdgpt fix` to analyze it.');
  });

// ──────────────────────────────────────────────────────────
// cmdgpt explain <command...>
// ──────────────────────────────────────────────────────────
program
  .command('explain <command...>')
  .description('Explain what a shell command does')
  .allowUnknownOption(true)
  .action(async (commandWords) => {
    logger.banner();
    // Re-collect all words after 'explain' including any flags like -d
    const explainIdx = process.argv.indexOf('explain');
    const cmd = explainIdx >= 0 ? process.argv.slice(explainIdx + 1).join(' ') : commandWords.join(' ');
    logger.info(`Explaining: "${cmd}"`);
    const explanation = await explainCommand(cmd);
    console.log(`\n${explanation}\n`);
  });

// ──────────────────────────────────────────────────────────
// cmdgpt detect
// ──────────────────────────────────────────────────────────
program
  .command('detect')
  .description('Detect the project type in the current directory')
  .option('--dir <path>', 'Directory to inspect', process.cwd())
  .action((options) => {
    const { type, details } = detectProject(options.dir);
    logger.success(`Project type: ${details} (${type})`);
  });

// ──────────────────────────────────────────────────────────
// cmdgpt setup <type...>
// ──────────────────────────────────────────────────────────
program
  .command('setup <type...>')
  .description('Set up a new project (e.g. laravel, react, flutter, node)')
  .option('-d, --dry-run', 'Print commands without executing them')
  .option('--dir <path>', 'Target directory', process.cwd())
  .action(async (typeWords, options) => {
    await runIntent(`setup ${typeWords.join(' ')} project`, { dryRun: options.dryRun, dir: options.dir });
  });

// ──────────────────────────────────────────────────────────
// cmdgpt config
// View and set configuration (AI provider, model, etc.)
// ──────────────────────────────────────────────────────────
const configCmd = program
  .command('config')
  .description('View or update CmdGPT configuration');

configCmd
  .command('get [key]')
  .description('Show the current configuration (or a single key)')
  .action((key) => {
    const cfg = readConfig();
    if (key) {
      const val = cfg[key];
      if (val === undefined) {
        logger.warn(`Key "${key}" is not set in the config.`);
      } else {
        logger.info(`${key} = ${JSON.stringify(val)}`);
      }
    } else {
      if (Object.keys(cfg).length === 0) {
        logger.info(`No config found at ${CONFIG_PATH}`);
        logger.info(`Defaults: provider = auto-detect from env vars, models = ${JSON.stringify(DEFAULT_MODELS)}`);
      } else {
        logger.info(`Config (${CONFIG_PATH}):`);
        console.log(JSON.stringify(cfg, null, 2));
      }
    }
  });

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value (e.g. provider openai, provider anthropic)')
  .action((key, value) => {
    if (key === 'provider' && !PROVIDERS.includes(value)) {
      logger.error(`Invalid provider "${value}". Supported providers: ${PROVIDERS.join(', ')}`);
      process.exit(1);
    }
    setConfigValue(key, value);
    logger.success(`Config updated: ${key} = ${value}`);
    logger.info(`Saved to ${CONFIG_PATH}`);
  });

// ──────────────────────────────────────────────────────────
// Shorthand fallback: treat unknown subcommands as intents
// e.g. `cmdgpt start my app`  →  interpret "start my app"
// ──────────────────────────────────────────────────────────
program.on('command:*', async (operands) => {
  const intent = operands.join(' ');
  const rawArgs = process.argv.slice(2);
  const dryRun = rawArgs.includes('-d') || rawArgs.includes('--dry-run');
  await runIntent(intent, { dryRun });
});

program.parse(process.argv);

