export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  error?: string;
}

export async function webSearch(query: string, maxResults = 8): Promise<SearchResponse> {
  try {
    const params = new URLSearchParams({ q: query, kl: "cn-zh" });
    const res = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return { query, results: [], error: `DuckDuckGo returned ${res.status}` };
    }

    const html = await res.text();
    const results = parseDuckDuckGoResults(html, maxResults);

    return { query, results };
  } catch (err) {
    return {
      query,
      results: [],
      error: err instanceof Error ? err.message : "unknown search error",
    };
  }
}

function parseDuckDuckGoResults(html: string, max: number): SearchResult[] {
  const results: SearchResult[] = [];

  const resultRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/g;

  const urls: string[] = [];
  const titles: string[] = [];
  const snippets: string[] = [];

  let match: RegExpExecArray | null;

  while ((match = resultRegex.exec(html)) !== null && urls.length < max) {
    const rawUrl = match[1];
    const decoded = rawUrl.includes("uddg=")
      ? new URLSearchParams(rawUrl.split("?")[1]).get("uddg") ?? rawUrl
      : rawUrl;
    urls.push(decoded);
    titles.push(decodeHtmlEntities(match[2].trim()));
  }

  while ((match = snippetRegex.exec(html)) !== null && snippets.length < max) {
    snippets.push(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, "").trim()));
  }

  for (let i = 0; i < Math.min(urls.length, max); i++) {
    if (urls[i] && titles[i]) {
      results.push({
        title: titles[i],
        url: urls[i],
        snippet: snippets[i] ?? "",
      });
    }
  }

  return results;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

export async function fetchPageContent(
  url: string,
  maxLength = 3000
): Promise<{ url: string; title: string; content: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });

    if (!res.ok) {
      return { url, title: "", content: "", error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : "";

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : html;

    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);

    return { url, title, content: text };
  } catch (err) {
    return {
      url,
      title: "",
      content: "",
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}
