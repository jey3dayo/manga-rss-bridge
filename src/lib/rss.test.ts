import { describe, expect, it } from 'vitest';
import { escapedRssFeedFixture } from '../fixtures/rss.ts';
import { renderRss } from './rss.ts';

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

  it('does not normalize dates that roll over only partially or shift era', () => {
    const rss = renderRss(
      {
        title: 'Date Test',
        link: 'https://example.com/dates',
        description: 'dates',
        items: [
          {
            id: 'month-overflow',
            title: 'month overflow',
            url: 'https://example.com/month-overflow',
            date: '2026/13/15',
          },
          {
            id: 'era-year',
            title: 'era year',
            url: 'https://example.com/era-year',
            date: '0099/06/15',
          },
        ],
      },
      'provider',
      'work',
      'Site',
    );

    expect(rss).not.toContain('<pubDate>');
    expect(rss).not.toContain('Fri, 15 Jan 2027');
    expect(rss).not.toContain('Tue, 15 Jun 1999');
  });

  it('does not accept dates with extra characters around slash or Japanese formats', () => {
    const rss = renderRss(
      {
        title: 'Date Test',
        link: 'https://example.com/dates',
        description: 'dates',
        items: [
          {
            id: 'slash-prefix',
            title: 'slash prefix',
            url: 'https://example.com/slash-prefix',
            date: 'x2026/06/22',
          },
          {
            id: 'slash-suffix',
            title: 'slash suffix',
            url: 'https://example.com/slash-suffix',
            date: '2026/06/22x',
          },
          {
            id: 'japanese-prefix',
            title: 'japanese prefix',
            url: 'https://example.com/japanese-prefix',
            date: 'x2026年6月22日',
          },
          {
            id: 'japanese-suffix',
            title: 'japanese suffix',
            url: 'https://example.com/japanese-suffix',
            date: '2026年6月22日x',
          },
        ],
      },
      'provider',
      'work',
      'Site',
    );

    expect(rss).not.toContain('<pubDate>');
  });

  it('renders Japanese dates with two-digit months', () => {
    const rss = renderRss(
      {
        title: 'Date Test',
        link: 'https://example.com/dates',
        description: 'dates',
        items: [
          {
            id: 'japanese-december',
            title: 'japanese december',
            url: 'https://example.com/japanese-december',
            date: '2026年12月25日',
          },
        ],
      },
      'provider',
      'work',
      'Site',
    );

    expect(rss).toContain('<pubDate>Fri, 25 Dec 2026 00:00:00 GMT</pubDate>');
  });

  it('omits pubDate for unparseable dates instead of rendering Invalid Date', () => {
    const rss = renderRss(
      {
        title: 'Date Test',
        link: 'https://example.com/dates',
        description: 'dates',
        items: [
          {
            id: 'garbage',
            title: 'garbage',
            url: 'https://example.com/garbage',
            date: 'not-a-date',
          },
        ],
      },
      'provider',
      'work',
      'Site',
    );

    expect(rss).not.toContain('Invalid Date');
    expect(rss).not.toContain('<pubDate>');
  });

  it('renders items without a date without a pubDate line or blank line', () => {
    const rss = renderRss(
      {
        title: 'Feed',
        link: 'https://example.com/feed',
        description: 'desc',
        items: [
          {
            id: '1',
            title: 'No Date',
            url: 'https://example.com/1',
          },
        ],
      },
      'provider',
      'work',
      'Site',
    );

    expect(rss).toContain(
      [
        '    <item>',
        '      <title>Feed - No Date</title>',
        '      <link>https://example.com/1</link>',
        '      <guid isPermaLink="false">provider:work:1</guid>',
        '      <description>desc</description>',
        '    </item>',
      ].join('\n'),
    );
    expect(rss).not.toContain('<pubDate>');
  });
});
