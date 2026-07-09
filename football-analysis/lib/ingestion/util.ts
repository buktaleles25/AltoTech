import fs from "node:fs/promises";
import path from "node:path";

export const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== "false";

export async function readMockJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(process.cwd(), "mock", fileName);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}. Set it in .env or enable USE_MOCK_DATA=true.`);
  }
  return value;
}

/**
 * API-Football is reachable two ways: directly at api-sports.io (sign up free at
 * dashboard.api-football.com, header `x-apisports-key`), or via the RapidAPI marketplace
 * (header `x-rapidapi-key` + `x-rapidapi-host`). Same data, different auth — support both so
 * whichever one a user actually manages to sign up for just works. Prefers the direct key.
 */
export function apiFootballFetch(path: string): Promise<Response> {
  const directKey = process.env.APIFOOTBALL_KEY;
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (directKey) {
    return fetch(`https://v3.football.api-sports.io${path}`, {
      headers: { "x-apisports-key": directKey },
    });
  }
  if (rapidApiKey) {
    return fetch(`https://api-football-v1.p.rapidapi.com${path}`, {
      headers: { "x-rapidapi-key": rapidApiKey, "x-rapidapi-host": "api-football-v1.p.rapidapi.com" },
    });
  }
  throw new Error("Missing APIFOOTBALL_KEY or RAPIDAPI_KEY. Set one in .env or enable USE_MOCK_DATA=true.");
}
