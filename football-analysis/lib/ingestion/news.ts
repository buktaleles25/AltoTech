import Parser from "rss-parser";
import { prisma } from "@/lib/db";
import { hoursFromNow, readMockJson, USE_MOCK_DATA } from "./util";

type MockNews = {
  title: string;
  url: string;
  source: string;
  relatedTeamId: string | null;
  summary: string;
  publishedAtOffsetHours: number;
};

const FREE_RSS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "BBC Sport" },
  { url: "https://www.espn.com/espn/rss/soccer/news", source: "ESPN FC" },
  { url: "https://www.skysports.com/rss/12040", source: "Sky Sports" },
];

/**
 * Pulls football news from free RSS feeds (no API key, no rate limit) and best-effort tags
 * each item with a related team by matching team names against the headline.
 */
export async function ingestNews(): Promise<{ upserts: number }> {
  if (USE_MOCK_DATA) return ingestNewsFromMock();
  return ingestNewsFromRss();
}

async function ingestNewsFromMock(): Promise<{ upserts: number }> {
  const news = await readMockJson<MockNews[]>("news.json");
  let count = 0;

  for (const item of news) {
    await prisma.newsItem.upsert({
      where: { url: item.url },
      update: {},
      create: {
        title: item.title,
        url: item.url,
        source: item.source,
        relatedTeamId: item.relatedTeamId,
        summary: item.summary,
        publishedAt: hoursFromNow(item.publishedAtOffsetHours),
      },
    });
    count += 1;
  }

  return { upserts: count };
}

async function ingestNewsFromRss(): Promise<{ upserts: number }> {
  const parser = new Parser();
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  let count = 0;

  for (const feed of FREE_RSS_FEEDS) {
    let parsed;
    try {
      parsed = await parser.parseURL(feed.url);
    } catch (err) {
      console.error(`Failed to parse RSS feed ${feed.url}:`, err);
      continue;
    }

    for (const item of parsed.items) {
      if (!item.link || !item.title) continue;
      const relatedTeam = teams.find((t) => item.title!.toLowerCase().includes(t.name.toLowerCase()));

      await prisma.newsItem.upsert({
        where: { url: item.link },
        update: {},
        create: {
          title: item.title,
          url: item.link,
          source: feed.source,
          relatedTeamId: relatedTeam?.id ?? null,
          summary: item.contentSnippet ?? null,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
        },
      });
      count += 1;
    }
  }

  return { upserts: count };
}
