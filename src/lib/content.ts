export const byNewest = <T extends { data: { date: Date } }>(items: T[]) =>
  [...items].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

export function entrySlug(id: string) {
  return id.replace(/\.(md|mdx)$/, '');
}

export function adjacentEntries<T>(items: T[], index: number) {
  return { previous: items[index + 1], next: items[index - 1] };
}
