# CmdGPT

**CmdGPT** is an AI-powered terminal assistant that lets developers execute commands using natural language. It detects your project type, interprets your request, generates the right commands, and executes them safely.

```
cmdgpt start my app
cmdgpt show my docker containers
cmdgpt push my code
cmdgpt setup laravel project
cmdgpt fix
```

---

## Features

| Feature | Description |
|---|---|
| 🧠 Natural Language Execution | Convert plain English into terminal commands |
| 🔍 Project Detection | Auto-detect Laravel, Node, React, Next.js, Django, Docker, Kubernetes, Flutter, Go, Python, and more |
| 🔐 Security Filter | Block dangerous commands like `rm -rf /`, `shutdown`, `mkfs`, fork bombs |
| 🐛 Error Analyzer | Explain terminal errors and suggest or apply fixes |
| 💡 Command Explainer | Describe what any shell command does |
| 🚀 Project Setup | Scaffold new projects with a single command |
| 🔌 Plugin Architecture | Modular plugins for Laravel, Node, Docker, Git, Flutter, Kubernetes |
| 🤖 Optional OpenAI | Enhance interpretation with GPT-4o-mini when `OPENAI_API_KEY` is set |

---

## Installation

```bash
npm install -g cmdgpt
```

Or run locally after cloning:

```bash
git clone https://github.com/devabdool/CmdGPT.git
cd CmdGPT
npm install
npm link          # makes `cmdgpt` available globally
```

---

## Usage

### Natural Language Command Execution

```bash
cmdgpt start my app
cmdgpt run "start my app"
cmdgpt run --dry-run "start my app"   # preview without executing
```

CmdGPT detects your project type and maps the intent:

| Project | Intent | Command(s) |
|---|---|---|
| Laravel | `start my app` | `php artisan serve` |
| Node.js | `start my app` | `npm start` |
| Flutter | `start my app` | `flutter run` |
| Django | `start my app` | `python manage.py runserver` |

### Docker Commands

```bash
cmdgpt show my docker containers    # → docker ps
cmdgpt show all containers          # → docker ps -a
cmdgpt stop containers              # → docker compose down
cmdgpt start containers             # → docker compose up -d
```

### Git Commands

```bash
cmdgpt push my code                 # → git add . && git commit -m "update" && git push
cmdgpt git status                   # → git status
cmdgpt git log                      # → git log --oneline -20
```

### Kubernetes Commands

```bash
cmdgpt list pods                    # → kubectl get pods
cmdgpt get services                 # → kubectl get services
cmdgpt apply config                 # → kubectl apply -f .
```

### Explain a Command

```bash
cmdgpt explain docker compose up -d
cmdgpt explain git rebase
cmdgpt explain kubectl get pods
```

### Fix Terminal Errors

```bash
# Save an error to analyze later
cmdgpt save-error "npm ERR! Cannot read properties of undefined"

# Analyze and optionally fix
cmdgpt fix

# Or pass error text directly
cmdgpt fix --error "bash: flutter: command not found"
```

### Setup a New Project

```bash
cmdgpt setup laravel
cmdgpt setup react
cmdgpt setup flutter
cmdgpt setup node
```

### Detect Project Type

```bash
cmdgpt detect
# ✔ Project type: Next.js (React) (nextjs)
```

---

## OpenAI Integration (Optional)

CmdGPT works offline using built-in pattern matching. For advanced AI-powered interpretation, set your OpenAI API key:

```bash
export OPENAI_API_KEY=sk-...
cmdgpt run "deploy my app to staging"
```

When the key is set, CmdGPT uses **GPT-4o-mini** to interpret requests it couldn't resolve locally, and provides richer explanations and error analysis.

---

## Project Structure

```
cmdgpt/
├── bin/
│   └── cmdgpt.js          # CLI entry point
├── core/
│   ├── projectDetector.js  # Detects project type from working directory files
│   ├── aiInterpreter.js    # Interprets natural language into commands
│   ├── commandExecutor.js  # Executes commands sequentially with streaming output
│   ├── securityFilter.js   # Blocks dangerous commands
│   └── errorAnalyzer.js    # Analyzes terminal errors and suggests fixes
├── plugins/
│   ├── laravel.js          # Laravel / PHP commands
│   ├── node.js             # Node.js / React / Next.js / Vue / Angular commands
│   ├── docker.js           # Docker / Docker Compose commands
│   ├── git.js              # Git commands
│   ├── flutter.js          # Flutter / Dart commands
│   └── kubernetes.js       # Kubernetes / kubectl commands
├── utils/
│   └── logger.js           # Colored console logger
├── tests/
│   ├── securityFilter.test.js
│   ├── projectDetector.test.js
│   ├── aiInterpreter.test.js
│   └── errorAnalyzer.test.js
└── package.json
```

---

## Supported Project Types

| Indicator File | Detected Type |
|---|---|
| `artisan` | Laravel |
| `pubspec.yaml` | Flutter |
| `manage.py` | Django |
| `requirements.txt` / `setup.py` / `pyproject.toml` | Python |
| `go.mod` | Go |
| `docker-compose.yml` | Docker |
| `Dockerfile` | Docker |
| `package.json` (with `next`) | Next.js |
| `package.json` (with `react`) | React |
| `package.json` (with `vue`) | Vue.js |
| `package.json` (with `@angular/core`) | Angular |
| `package.json` (with `express`) | Express.js |
| `package.json` (with `@nestjs/core`) | NestJS |
| `package.json` | Node.js |
| `Gemfile` | Ruby / Rails |
| `pom.xml` / `build.gradle` | Java / Spring |
| `Cargo.toml` | Rust |

---

## Security

CmdGPT blocks dangerous commands before execution. Blocked patterns include:

- `rm -rf /` and variants
- `shutdown`, `reboot`, `halt`, `poweroff`
- `mkfs`, `dd if=... of=/dev/...`
- `sudo rm`, `sudo mkfs`
- Fork bombs (`:(){ :|:& };:`)
- Disk-wiping commands

All commands are shown to the user **with a confirmation prompt** before being executed.

---

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run CLI locally
node bin/cmdgpt.js --help
```

---

## Plugin API

Each plugin exports a `resolve(intent)` function and a `commands` map:

```js
// plugins/myPlugin.js
const commands = {
  'my intent': ['my-tool command'],
};

function resolve(intent) {
  const lower = intent.toLowerCase();
  for (const [key, cmds] of Object.entries(commands)) {
    if (lower.includes(key)) return cmds;
  }
  return null;
}

module.exports = { resolve, commands };
```

Register your plugin in `core/aiInterpreter.js` by adding it to `PROJECT_PLUGIN_MAP`.

---

## License

MIT © [devabdool](https://github.com/devabdool)
