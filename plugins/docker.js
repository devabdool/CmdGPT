'use strict';

/**
 * Docker plugin – maps common intents to Docker / Docker Compose commands.
 */
const commands = {
  'show containers': ['docker ps'],
  'list containers': ['docker ps'],
  'all containers': ['docker ps -a'],
  'running containers': ['docker ps'],
  'stop containers': ['docker compose down'],
  start: ['docker compose up -d'],
  build: ['docker compose build'],
  restart: ['docker compose restart'],
  logs: ['docker compose logs -f'],
  'pull images': ['docker pull'],
  'list images': ['docker images'],
  'remove image': ['docker rmi'],
  'remove container': ['docker rm'],
  prune: ['docker system prune -f'],
  'exec bash': ['docker exec -it'],
  ps: ['docker ps'],
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
