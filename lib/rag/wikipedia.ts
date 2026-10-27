// Wikipedia articles as plain text through the MediaWiki API (CC BY-SA 4.0: every passage keeps
// its article, revision and licence, and the citation popover shows them).

export interface Article {
  id: string; // "wiki:Second_Punic_War"
  title: string;
  url: string;
  revision: string;
  extract: string;
}

const API = "https://en.wikipedia.org/w/api.php";
export const USER_AGENT = "ChronicleHistoryPrototype/0.1 (learning-history prototype; contact via repository owner)";
export const WIKIPEDIA_LICENSE = "CC BY-SA 4.0";

/** fetchArticle, waiting and retrying when Wikipedia says "too many requests" (honours Retry-After). */
export async function fetchArticlePolitely(title: string, opts: { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void>; tries?: number } = {}): Promise<Article | null> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const tries = opts.tries ?? 5;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchArticle(title, opts.fetch);
    } catch (e) {
      const wait = (e as { retryAfterMs?: number }).retryAfterMs;
      if (wait === undefined || attempt >= tries) throw e;
      await sleep(Math.max(wait, 2000 * 2 ** attempt));
    }
  }
}

export async function fetchArticle(title: string, fetchImpl: typeof fetch = fetch): Promise<Article | null> {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", redirects: "1",
    prop: "extracts|revisions|info", explaintext: "1", exsectionformat: "wiki",
    rvprop: "ids", inprop: "url", titles: title,
  });
  const res = await fetchImpl(`${API}?${params}`, { headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT } });
  if (!res.ok) {
    const err = new Error(`Wikipedia ${res.status} for "${title}"`) as Error & { retryAfterMs?: number };
    if (res.status === 429 || res.status >= 500) err.retryAfterMs = (Number(res.headers.get("retry-after")) || 0) * 1000;
    throw err;
  }
  const data = await res.json() as {
    query?: { pages?: { title: string; missing?: boolean; extract?: string; fullurl?: string; revisions?: { revid: number }[] }[] };
  };
  const page = data.query?.pages?.[0];
  if (!page || page.missing || !page.extract) return null;
  return {
    id: `wiki:${page.title.replace(/ /g, "_")}`,
    title: page.title,
    url: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    revision: String(page.revisions?.[0]?.revid ?? ""),
    extract: page.extract,
  };
}

export const attributionFor = (a: Pick<Article, "title" | "revision">) =>
  `From the Wikipedia article "${a.title}"${a.revision ? ` (revision ${a.revision})` : ""}, ${WIKIPEDIA_LICENSE}.`;
