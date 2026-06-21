import { describe, expect, it } from 'vitest';
import { escapedRssFeedFixture } from '../fixtures/rss.ts';
import { renderRss } from '../lib/rss.ts';

describe('renderRss', () => {
  it('renders escaped RSS items', () => {
    const rss = renderRss(escapedRssFeedFixture, 'provider', 'work', 'Site');
    expect(rss).toContain('<title>A &amp; B - Site</title>');
    expect(rss).toContain('<title>A &amp; B - 第1話 &lt;start&gt;</title>');
    expect(rss).toContain('<guid isPermaLink="false">provider:work:1</guid>');
    expect(rss).toContain('<pubDate>Mon, 22 Jun 2026 00:00:00 GMT</pubDate>');
  });

  it('renders thumbnail HTML as escaped description text', () => {
    const rss = renderRss(
      {
        ...escapedRssFeedFixture,
        items: [
          {
            id: 'thumb',
            title: 'thumbnail',
            url: 'https://example.com/thumb',
            thumbnail: 'https://example.com/thumb?a=1&b=2',
          },
        ],
      },
      'provider',
      'work',
      'Site',
    );

    expect(rss).toContain(
      '<description>&lt;img src=&quot;https://example.com/thumb?a=1&amp;b=2&quot; alt=&quot;&quot;/&gt;&lt;br/&gt;desc &lt;tag&gt;</description>',
    );
  });

  it('renders valid slash and Japanese dates without normalizing invalid dates', () => {
    const rss = renderRss(
      {
        title: 'Date Test',
        link: 'https://example.com/dates',
        description: 'dates',
        items: [
          {
            id: 'slash-valid',
            title: 'slash valid',
            url: 'https://example.com/slash-valid',
            date: '2026/06/22',
          },
          {
            id: 'japanese-valid',
            title: 'japanese valid',
            url: 'https://example.com/japanese-valid',
            date: '2026年6月22日',
          },
          {
            id: 'slash-invalid',
            title: 'slash invalid',
            url: 'https://example.com/slash-invalid',
            date: '2026/13/40',
          },
          {
            id: 'japanese-invalid',
            title: 'japanese invalid',
            url: 'https://example.com/japanese-invalid',
            date: '2026年2月30日',
          },
        ],
      },
      'provider',
      'work',
      'Site',
    );

    expect(rss.match(/<pubDate>Mon, 22 Jun 2026 00:00:00 GMT<\/pubDate>/g)).toHaveLength(2);
    expect(rss).not.toContain('Tue, 09 Feb 2027');
    expect(rss).not.toContain('Mon, 02 Mar 2026');
  });
});
