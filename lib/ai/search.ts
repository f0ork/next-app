import { chromium } from "playwright";

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

let browserInstance: Awaited<ReturnType<typeof chromium.launch>> | null = null;

async function getBrowser() {
  if (!browserInstance?.isConnected()) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function webSearch(
  query: string,
  maxResults = 8
): Promise<SearchResponse> {
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForSelector("li.b_algo", { timeout: 8000 }).catch(() => {});

    const results: SearchResult[] = await page.evaluate((max: number) => {
      const items: SearchResult[] = [];
      document.querySelectorAll("li.b_algo").forEach((el, i) => {
        if (i >= max) return;
        const titleEl = el.querySelector("h2 a");
        const snippetEl = el.querySelector(".b_caption p");
        items.push({
          title: titleEl?.textContent?.trim() || "",
          url: (titleEl as HTMLAnchorElement)?.href || "",
          snippet: snippetEl?.textContent?.trim() || "",
        });
      });
      return items;
    }, maxResults);

    return { query, results };
  } catch (err) {
    return {
      query,
      results: [],
      error: err instanceof Error ? err.message : "search failed",
    };
  } finally {
    await page?.close().catch(() => {});
  }
}

export async function fetchPageContent(
  url: string,
  maxLength = 3000
): Promise<{ url: string; title: string; content: string; error?: string }> {
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });

    const title = await page.title();

    const content = await page.evaluate((max: number) => {
      const body = document.body;
      if (!body) return "";

      const scripts = body.querySelectorAll(
        "script, style, nav, header, footer, iframe, noscript"
      );
      scripts.forEach((el) => el.remove());

      const text = body.innerText || body.textContent || "";
      return text.replace(/\s+/g, " ").trim().slice(0, max);
    }, maxLength);

    return { url, title, content };
  } catch (err) {
    return {
      url,
      title: "",
      content: "",
      error: err instanceof Error ? err.message : "fetch failed",
    };
  } finally {
    await page?.close().catch(() => {});
  }
}

export async function closeBrowser(): Promise<void> {
  await browserInstance?.close().catch(() => {});
  browserInstance = null;
}
