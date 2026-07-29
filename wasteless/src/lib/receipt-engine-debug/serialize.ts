/** Deep-clone pipeline artifacts into plain JSON-serializable objects. */
export function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function formatJson(value: unknown, indent = 2): string {
  return JSON.stringify(toPlainJson(value), null, indent);
}
