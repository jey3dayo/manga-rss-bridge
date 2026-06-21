export const decodeHtml = (value: string): string =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');

export const stripTags = (html: string): string =>
  decodeHtml(html.replaceAll(/<script[\s\S]*?<\/script>/g, '').replaceAll(/<[^>]+>/g, ' '))
    .replaceAll(/\s+/g, ' ')
    .trim();

export const extractMetaContent = (html: string, key: string): string | undefined => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `<meta\\s+(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta\\s+content=["']([^"']*)["'][^>]*(?:name|property)=["']${escaped}["'][^>]*>`,
    'i',
  ).exec(html);
  return match?.[1] || match?.[2] ? decodeHtml((match[1] ?? match[2] ?? '').trim()) : undefined;
};

export const extractTitle = (html: string): string | undefined => {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1] ? stripTags(match[1]) : undefined;
};

export const absoluteUrl = (url: string, base: string): string => new URL(decodeHtml(url), base).toString();

export const uniqueByUrl = <T extends { url: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
};

export const extractBlocksByClass = (html: string, className: string): string[] => {
  const blocks: string[] = [];
  const pattern = new RegExp(`<([a-z0-9]+)(?=[^>]*class=["'][^"']*${className}[^"']*["'])[^>]*>`, 'gi');
  for (const match of html.matchAll(pattern)) {
    if (match.index === undefined || !match[1]) continue;
    const tagName = match[1];
    const start = match.index;
    const openEnd = html.indexOf('>', start);
    if (openEnd < 0) continue;
    let depth = 1;
    const tagPattern = new RegExp(`</?${tagName}(?:\\s[^>]*)?>`, 'gi');
    tagPattern.lastIndex = openEnd + 1;
    for (const tagMatch of html.slice(openEnd + 1).matchAll(tagPattern)) {
      const absoluteIndex = openEnd + 1 + (tagMatch.index ?? 0);
      if (tagMatch[0].startsWith(`</`)) {
        depth -= 1;
      } else {
        depth += 1;
      }
      if (depth === 0) {
        blocks.push(html.slice(start, absoluteIndex + tagMatch[0].length));
        break;
      }
    }
  }
  return blocks;
};
