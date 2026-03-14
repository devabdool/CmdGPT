# Assets

This directory contains static assets for the CmdGPT documentation.

## demo.gif

A short screen-recording of CmdGPT in action.

To create your own:

```bash
# 1. Install a terminal GIF recorder (e.g., asciinema + agg, or ttyrec + ttygif)
npm install -g terminalizer

# 2. Record a session
terminalizer record demo

# 3. Render to GIF
terminalizer render demo -o demo.gif
```

Then move `demo.gif` into this `assets/` directory and commit it.
