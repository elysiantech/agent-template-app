import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import FirecrawlApp, { CrawlParams, ScrapeParams, CrawlStatusResponse } from "@mendable/firecrawl-js";
import { z, ZodType } from "zod";

const MAX_RESPONSE_LENGTH = 102480;

const firecrawlSchema = z.object({
  url: z.string()
    .url("Must be a valid and reachable URL.")
    .describe("The target URL to scrape."),

  type: z.enum(["scrape", "crawl", "extract"])
    .optional()
    .describe("The type of operation to perform."),

  prompt: z.string()
    .optional()
    .describe("Prompt for natural language extraction. Required when 'extract' is in formats."),

  formats: z.array(z.enum([
    "markdown", "html", "links", "rawHtml", "extract"
  ]))
  .nonempty({ message: "At least one format must be specified." })
  .describe("An array of desired content formats to extract."),

  schema: z.union([z.string(), z.object({})])
    .optional()
    .describe("Optional schema for structured extraction."),
})

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export const firecrawlTool =  tool(
   async (input: z.infer<typeof firecrawlSchema>, config?: RunnableConfig) => {
    const { url, type = "scrape", prompt, formats, schema } = input;

    try {
      // Validate URL format
      new URL(url);

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

      let result: any;

      if (type === "extract") {
        if (!prompt && !schema) {
          throw new Error("For 'extract' type, either prompt or schema must be provided.");
        }

        const extractOptions: ScrapeParams<ZodType<any>, undefined> = {
          formats: ["extract"],
          extract: {
            prompt: prompt || "Extract structured data from this page",
            schema: extractionSchema,
          },
        };

        result = await app.scrapeUrl(url, extractOptions);
      } else if (type === "scrape") {
        result = await app.scrapeUrl(url, { formats });
      } else if (type === "crawl") {
        const crawlOptions: CrawlParams = {
          limit: 100,
          scrapeOptions: {
            formats,
          },
        };

        result = (await app.crawlUrl(url, crawlOptions, 1)) as CrawlStatusResponse;
      } else {
        throw new Error("Invalid type. Must be 'scrape', 'crawl', or 'extract'.");
      }

      if (!result.success) throw new Error(`Operation failed: ${JSON.stringify(result)}`);

      // Ensure response fits within the max length
      const responseString = JSON.stringify(result);
      return responseString.length > MAX_RESPONSE_LENGTH
        ? responseString.substring(0, MAX_RESPONSE_LENGTH) + "..."
        : responseString;

    } catch (error) {
      console.error("Firecrawl API error:", error);
      throw new Error(`Failed to process request: ${error}`);
    }
  },
  {
  name: "firecrawl",
  description: `A web scraping tool that can extract data from any website. 
    Input should be a JSON object with: url (required), type ('scrape', 'crawl', or 'extract'), 
    prompt (for natural language extraction), schema (optional Zod schema), and formats.`,
  schema: firecrawlSchema,
  }
);