import { describe, expect, it } from 'vitest';
import { escapedRssFeedFixture } from '../fixtures/rss.js';
import { renderRss } from '../lib/rss.js';

describe('renderRss', () => {
  it('renders escaped RSS items', () => {
    const rss = renderRss(escapedRssFeedFixture, 'provider', 'work', 'Site');
    expect(rss).toContain('<title>A &amp; B - Site</title>');
    expect(rss).toContain('<title>A &amp; B - 第1話 &lt;start&gt;</title>');
    expect(rss).toContain('<guid isPermaLink="false">provider:work:1</guid>');
    expect(rss).toContain('<pubDate>Mon, 22 Jun 2026 00:00:00 GMT</pubDate>');
  });
});
