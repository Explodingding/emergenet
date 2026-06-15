// Pure helpers for fault propagation analysis

/**
 * Given the list of nodes, a Set of node ids with injected faults, return a new
 * list of nodes whose status reflects propagation:
 *   - 'fault'        => node id is in faultedIds
 *   - 'affected'     => any ancestor in the dependency chain is faulted
 *   - 'operational'  => otherwise
 */
export function computeNetworkStatus(nodes, faultedIds) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const faultSet = faultedIds instanceof Set ? faultedIds : new Set(faultedIds || []);

  // memoised ancestor-fault check
  const cache = new Map();
  const hasFaultedAncestor = (id) => {
    if (cache.has(id)) return cache.get(id);
    const node = byId.get(id);
    if (!node) return false;
    let result = false;
    for (const parent of node.dependsOn || []) {
      if (faultSet.has(parent) || hasFaultedAncestor(parent)) {
        result = true;
        break;
      }
    }
    cache.set(id, result);
    return result;
  };

  return nodes.map((n) => {
    if (faultSet.has(n.id)) return { ...n, status: 'fault' };
    if (hasFaultedAncestor(n.id)) return { ...n, status: 'affected' };
    return { ...n, status: 'operational' };
  });
}

/** Return list of node ids that are affected (downstream) of given root fault id */
export function downstreamOf(nodes, rootId) {
  const result = new Set();
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    for (const n of nodes) {
      if ((n.dependsOn || []).includes(current) && !result.has(n.id)) {
        result.add(n.id);
        queue.push(n.id);
      }
    }
  }
  return Array.from(result);
}

export const TYPE_LABEL = {
  transformer: 'Transformer',
  switchgear: 'Switchgear',
  distribution: 'Distribution Board',
  cabinet: 'Cabinet',
};
