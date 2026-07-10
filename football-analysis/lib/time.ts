/**
 * Bangkok-time day boundaries. The app's audience is Thai; Vercel servers run UTC, so every
 * "today" boundary computed with plain setHours() lands at UTC midnight — 7 hours off — and a
 * match at 21:00 UTC tonight would wrongly count as "today" when it's actually 04:00 tomorrow in
 * Bangkok. Thailand has no DST, so a fixed +7 offset is exact.
 */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** End of the Bangkok calendar day containing `now`, plus `plusDays` days — as a UTC Date. */
export function bangkokEndOfDay(now: Date = new Date(), plusDays = 0): Date {
  const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  shifted.setUTCHours(23, 59, 59, 999);
  shifted.setUTCDate(shifted.getUTCDate() + plusDays);
  return new Date(shifted.getTime() - BANGKOK_OFFSET_MS);
}

/** Start of the Bangkok calendar day containing `now`, plus `plusDays` days — as a UTC Date. */
export function bangkokStartOfDay(now: Date = new Date(), plusDays = 0): Date {
  const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCDate(shifted.getUTCDate() + plusDays);
  return new Date(shifted.getTime() - BANGKOK_OFFSET_MS);
}
