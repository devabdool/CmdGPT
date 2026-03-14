'use strict';

/**
 * Kubernetes plugin – maps common intents to kubectl commands.
 */
const commands = {
  'get pods': ['kubectl get pods'],
  'list pods': ['kubectl get pods'],
  'get services': ['kubectl get services'],
  'list services': ['kubectl get services'],
  'get deployments': ['kubectl get deployments'],
  'list deployments': ['kubectl get deployments'],
  'get nodes': ['kubectl get nodes'],
  'apply config': ['kubectl apply -f .'],
  deploy: ['kubectl apply -f .'],
  'delete pod': ['kubectl delete pod'],
  'describe pod': ['kubectl describe pod'],
  logs: ['kubectl logs'],
  'scale deployment': ['kubectl scale deployment'],
  'rollout status': ['kubectl rollout status deployment'],
  'rollout restart': ['kubectl rollout restart deployment'],
  'get namespaces': ['kubectl get namespaces'],
  'get all': ['kubectl get all'],
  'port forward': ['kubectl port-forward'],
  'exec bash': ['kubectl exec -it'],
  context: ['kubectl config get-contexts'],
  'use context': ['kubectl config use-context'],
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
