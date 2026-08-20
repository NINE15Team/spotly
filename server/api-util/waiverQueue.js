const transactionQueues = new Map();

/**
 * Serialize async work per transaction ID to avoid concurrent protectedData races.
 *
 * NOTE: in-process only. On multiple dynos this does not serialize across
 * processes; the read-modify-write pattern plus reconciliation converge, but a
 * durable lock (Redis) is the real fix. See WAIVER_IMPLEMENTATION.md §12.
 */
const runSerialized = (transactionId, task) => {
  const key = transactionId?.uuid || transactionId;
  if (!key) {
    return task();
  }

  const previous = transactionQueues.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  transactionQueues.set(
    key,
    next.finally(() => {
      if (transactionQueues.get(key) === next) {
        transactionQueues.delete(key);
      }
    })
  );
  return next;
};

module.exports = { runSerialized };
