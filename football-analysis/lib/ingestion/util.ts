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
