import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import FirecrawlApp, { CrawlParams, ScrapeParams, CrawlStatusResponse } from "@mendable/firecrawl-js";
import { z, ZodType } from "zod";

const firecrawlSchema = z.object({
  url: z.string().describe("The URL to scrape."),
  type: z.enum(["scrape", "crawl", "extract"]).optional().describe("The type of operation to perform."),
  prompt: z.string().optional().describe("Prompt to use for natural language extraction."),
  schema: z.union([z.string(), z.object({})]).optional().describe("Schema to extract if any."),
  options: z.record(z.any()).optional().describe("Options like formats, jsonOptions, or limit"),
});

export const firecrawlTool = tool(
  async (input: z.infer<typeof firecrawlSchema>, config?: RunnableConfig | undefined) => {
    const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    const { url, type = "scrape", prompt, schema, options = {} } = input;

    if (!url) {
      throw new Error("URL is required");
    }

    // Validate URL format
    try {
      new URL(url); // This will throw if the URL is invalid
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // Helper function for prompt-based extraction
    const extractWithPrompt = async (url: string, prompt: string, options: any = {}) => {
      try {
        const result = await app.scrapeUrl(url, {
          ...options,
          formats: ["json"],
          jsonOptions: { prompt }, // FIXED: Use correct key
        });
        return result;
      } catch (error) {
        console.error("Error in prompt-based extraction:", error);
        throw error;
      }
    };

    // Handle schema extraction
    let extractionSchema: ZodType<any> | undefined;
    if (schema) {
      if (typeof schema === "string") {
        try {
          extractionSchema = eval(`z.${schema}`) as ZodType<any>;
        } catch (error) {
          console.error("Error parsing schema string:", error);
          throw new Error("Invalid schema format");
        }
      } else {
        extractionSchema = schema as ZodType<any>;
      }
    }

    if (type === "extract") {
      if (!prompt && !schema) {
        throw new Error("For 'extract' type, either prompt or schema must be provided");
      }

      const extractOptions: ScrapeParams<ZodType<any>, undefined> = {
        ...options,
        formats: ["json"],
        jsonOptions: {
          prompt: prompt || "Extract structured data from this page",
          schema: extractionSchema, 
        },
      };

      return JSON.stringify(await app.scrapeUrl(url, extractOptions));
    }

    if (type === "scrape") {
      const scrapeOptions: ScrapeParams<ZodType<any>, undefined> = {
        ...options,
        formats: options.formats || ["markdown", "html", "json"],
        jsonOptions: schema ? { schema: extractionSchema, prompt } : undefined,
      };

      return JSON.stringify(await app.scrapeUrl(url, scrapeOptions));
    }

    if (type === "crawl") {
      const crawlOptions: CrawlParams = {
        limit: options.limit || 100,
        scrapeOptions: {
          formats: options.formats || ["markdown", "html", "json"],
        },
        ...options,
      };

      const result = (await app.crawlUrl(url, crawlOptions, 1, options.timeout || 30)) as CrawlStatusResponse;
      return JSON.stringify(result);
    }

    throw new Error("Invalid type. Must be 'scrape', 'crawl', or 'extract'");
  },
  {
    name: "firecrawl",
    description:
      "A web scraping tool that can extract data from any website. Input should be a JSON string with: url (required), type ('scrape', 'crawl', or 'extract'), prompt (for natural language extraction), schema (optional Zod schema), and options (optional configuration).",
    schema: firecrawlSchema,
  }
);