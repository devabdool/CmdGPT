# Contributing to CmdGPT

Thank you for your interest in contributing to CmdGPT! 🎉

Whether you're fixing a bug, adding a new feature, or improving documentation — every contribution matters.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/CmdGPT.git
   cd CmdGPT
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Link** the CLI globally for local testing:
   ```bash
   npm link
   ```

---

## Development Workflow

1. Create a new branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes.
3. Run the test suite:
   ```bash
   npm test
   ```
4. Commit your changes with a clear message:
   ```bash
   git commit -m "feat: add support for XYZ"
   ```
5. Push your branch and open a Pull Request against `main`.

---

## Code Style

- Keep functions small and focused.
- Follow the existing patterns in `core/` and `plugins/`.
- Prefer descriptive variable names over comments.

---

## Adding a New Plugin

Plugins live in the `plugins/` directory. Each plugin exports a `resolve(intent)` function and a `commands` map:

```js
// plugins/myTool.js
const commands = {
  'start server': ['my-tool serve'],
  'run tests':    ['my-tool test'],
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

After creating your plugin, register it in `core/aiInterpreter.js` by adding it to `PROJECT_PLUGIN_MAP`.

---

## Reporting Bugs

Please [open an issue](https://github.com/devabdool/CmdGPT/issues/new) and include:

- The command you ran.
- The error message or unexpected output.
- Your OS and Node.js version (`node -v`).

---

## Feature Requests

Have an idea? [Open a feature request issue](https://github.com/devabdool/CmdGPT/issues/new) with a clear description of the problem it solves and how it should work.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
