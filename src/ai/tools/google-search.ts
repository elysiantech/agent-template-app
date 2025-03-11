import { tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import { decode } from "html-entities";
import { convert as htmlToText } from "html-to-text";
import * as cheerio from "cheerio";

const API_PROXY_PREFIX = process.env.GOOGLE_PLUGIN_API_PROXY_PREFIX ?? "";

const googleSearchSchema = z.string().describe("Search query for Google");

async function searchGoogle(query: string, maxResults = 6) {
  const headers = new Headers({ "User-Agent": getRandomUserAgent() });
  const response = await fetch(
    `${API_PROXY_PREFIX}https://www.google.com/search?nfpr=1&num=${maxResults}&pws=0&q=${encodeURIComponent(query)}`,
    { headers }
  );

  const $ = cheerio.load(await response.text());
  const results = $("div.g")
    .map((_:any, elem:any) => {
      const item = cheerio.load(elem);
      const url = item("a").attr("href")?.trim() ?? "";
      if (!url || url === "#") return null;
      return {
        url,
        title: decode(item("h3").text()),
        description: htmlToText(item(`div[data-sncf~="1"]`).text().trim()),
      };
    })
    .get()
    .slice(0, maxResults);

  return results.length ? results.map(({ title, description }:{title:string, description:string}) => `${title}\n${description}`).join("\n\n") : "No good search results found.";
}

export const googleSearchTool = tool(
  async (input: z.infer<typeof googleSearchSchema>, config?: RunnableConfig) => searchGoogle(input),
  {
    name: "google_search",
    description: "Perform a Google search for real-time information. Input should be a search query.",
    schema: googleSearchSchema,
  }
);

const uaList = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:93.0) Gecko/20100101 Firefox/93.0",
  "Mozilla/5.0 (X11; Linux x86_64; rv:93.0) Gecko/20100101 Firefox/93.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36 Edg/94.0.992.38",
];

function getRandomUserAgent() {
  return uaList[Math.floor(Math.random() * uaList.length)];
}