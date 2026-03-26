function normalizeToken(value: string): string {
  return value.trim().toLocaleLowerCase("ru-RU");
}

export function tokenizeSearchQuery(query: string): string[] {
  return query
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

export function isSearchMatch(haystack: string, query: string): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;
  const normalizedHaystack = haystack.toLocaleLowerCase("ru-RU");
  return tokens.every((token) => normalizedHaystack.includes(token));
}
