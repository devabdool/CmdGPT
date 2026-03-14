'use strict';

/**
 * Git plugin – maps common intents to git commands.
 */
const commands = {
  'push code': ['git add .', 'git commit -m "update"', 'git push'],
  push: ['git add .', 'git commit -m "update"', 'git push'],
  pull: ['git pull'],
  clone: ['git clone'],
  status: ['git status'],
  log: ['git log --oneline -20'],
  branch: ['git branch -a'],
  'create branch': ['git checkout -b'],
  'switch branch': ['git checkout'],
  merge: ['git merge'],
  stash: ['git stash'],
  'stash pop': ['git stash pop'],
  diff: ['git diff'],
  reset: ['git reset --soft HEAD~1'],
  tag: ['git tag'],
  'push tags': ['git push --tags'],
  fetch: ['git fetch --all'],
  rebase: ['git rebase'],
};

/**
 * @param {string} intent
 * @returns {string[] | null}
 */
function resolve(intent) {
  const lower = intent.toLowerCase();
  for (const [key, cmds] of Object.entries(commands)) {
    if (lower.includes(key)) return cmds;
  }
  return null;
}

module.exports = { resolve, commands };
