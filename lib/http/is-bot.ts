/**
 * Crawler / bot User-Agent detection.
 *
 * Used to skip live (billed) Google Places lookups for non-human traffic —
 * e.g. the bait-shops page's client-side tackle-shop search, which a
 * JS-executing crawler can trigger via a `?rect=` link without ever
 * granting geolocation permission. See pages/findr/bait-shops.tsx.
 *
 * A missing/empty UA is treated as a bot: real browsers always send one, so
 * an absent UA is a script/monitor/library, for which skipping the live
 * lookup is the cost-protective choice.
 */
const BOT_UA_RE = /bot\b|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|embedly|quorabot|pinterestbot|whatsapp|telegrambot|discordbot|slackbot|twitterbot|applebot|duckduck|baidu|yandex|sogou|exabot|ia_archiver|semrush|ahrefs|mj12|dotbot|petalbot|gptbot|chatgpt|ccbot|claudebot|anthropic|perplexity|amazonbot|bytespider|google-?(bot|other)|headlesschrome|lighthouse|pingdom|uptimerobot|statuscake|curl\/|wget|python-requests|axios\/|node-fetch|go-http-client/i;

/**
 * True when the request looks like a non-human client (crawler, unfurler,
 * monitor, scripted fetch) or sends no User-Agent at all.
 */
export function isBotRequest(userAgent: string | undefined | null): boolean {
  if (!userAgent) return true;
  return BOT_UA_RE.test(userAgent);
}
