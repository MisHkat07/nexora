/**
 * Drops menu items the user isn't allowed to use, plus dividers left dangling at the edges.
 * `allowed` maps item keys to booleans; items not listed are always kept.
 */
export function withoutForbidden(items, allowed) {
  const kept = items.filter((item) => !(item.key in allowed) || allowed[item.key]);
  while (kept.length && kept[kept.length - 1].type === 'divider') kept.pop();
  while (kept.length && kept[0].type === 'divider') kept.shift();
  return kept;
}
