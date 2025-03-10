import { z } from 'zod';
import { tool, Tool } from '@langchain/core/tools';
import { RunnableConfig } from '@langchain/core/runnables';
import { WebBrowser } from "langchain/tools/webbrowser";
import { PythonInterpreterTool } from "@langchain/community/experimental/tools/pyinterpreter";
import { GoogleRoutesAPI } from "@langchain/community/tools/google_routes";
import { GooglePlacesAPI } from "@langchain/community/tools/google_places";
import { Calculator } from "@langchain/community/tools/calculator";
import {
  GoogleCalendarCreateTool,
  GoogleCalendarViewTool,
} from "@langchain/community/tools/google_calendar";
import {
  GmailCreateDraft,
  GmailGetMessage,
  GmailGetThread,
  GmailSearch,
  GmailSendMessage,
} from "@langchain/community/tools/gmail";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

// --- Helper function to create tool definitions ---
function createToolDefinition<T extends Tool>(
  toolInstance: T,
  name: string,
  description: string,
  schema?: z.ZodType<any>, // Optional schema
) {
  return tool(
    async (input: any, config?: RunnableConfig) => {
      try {
        // some tools expects a string
        if (typeof input !== "string") input = JSON.stringify(input);
        const result = await toolInstance.invoke(input);
        // some tools output a string
        if (typeof result !== "string") return JSON.stringify(result);
        return result;
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new Error(`${name} error: ${error.message}`);
        }
        throw new Error(`An unknown error occurred in ${name}`);
      }
    },
    {
      name,
      description,
      schema: schema,
    }
  );
}

// --- Community Tools as tool(...) ---
export const createWebBrowserTool = (model: any, embeddings: any) => {
  const toolInstance = new WebBrowser({ model, embeddings });
  return createToolDefinition(
    toolInstance,
    'web_browser',
    "A tool for browsing the web. Input should be a URL to visit.",
    z.string().describe("Url to visit")
  );
};

export const createPythonInterpreterTool = async (indexURL: string = "../node_modules/pyodide") => {
  const toolInstance = await PythonInterpreterTool.initialize({ indexURL });
  return createToolDefinition(
    toolInstance,
    'python_interpreter',
    "A tool for executing Python code. Input should be valid Python code.",
    z.string().describe("Python code to execute.")
  );
};

// export const googleRoutes = createToolDefinition(
//   new GoogleRoutesAPI(),
//   'google_routes',
//   "A tool for getting route information using Google Routes API. Input should be a JSON string with 'origin' and 'destination'.",
//   z.object({
//     origin: z.string().describe("The starting point of the route"),
//     destination: z.string().describe("The destination of the route"),
//   }).describe("Object containing the origin and destination.")
// );

export const googlePlaces = createToolDefinition(
  new GooglePlacesAPI(),
  'google_places',
  "A tool for searching places using Google Places API. Input should be a search query.",
  z.string().describe("Search query")
);

export const calculator = createToolDefinition(
  new Calculator(),
  'calculator',
  "A tool for performing mathematical calculations. Input should be a mathematical expression.",
  z.string().describe("Mathematical expression to calculate")
);

export const createGoogleCalendarCreateTool = (model: any) => {
  const toolInstance = new GoogleCalendarCreateTool({
    credentials: {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
      privateKey: process.env.GOOGLE_PRIVATE_KEY!,
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
    model,
  });
  return createToolDefinition(
    toolInstance,
    'google_calendar_create',
    "A tool for creating events in Google Calendar. Input should be a JSON string with event details.",
    z.object({
      summary: z.string().describe("Summary of the event"),
      start: z.string().describe("Start of the event in ISO 8601 format"),
      end: z.string().describe("End of the event in ISO 8601 format"),
      description: z.string().optional().describe("Description of the event"),
      location: z.string().optional().describe("Location of the event"),
      attendees: z.array(z.string()).optional().describe("Attendees of the event"),
    }).describe("Object containing the event details.")
  );
};

export const createGoogleCalendarViewTool = (model:any) => {
  const toolInstance = new GoogleCalendarViewTool({
    credentials: {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL!,
      privateKey: process.env.GOOGLE_PRIVATE_KEY!,
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
    model,
  });
  return createToolDefinition(
    toolInstance,
    'google_calendar_view',
    "A tool for viewing events in Google Calendar. Input should be a JSON string with query parameters.",
    z.object({
      timeMin: z.string().describe("Start of the time range to view in ISO 8601 format"),
      timeMax: z.string().describe("End of the time range to view in ISO 8601 format"),
      maxResults: z.number().int().optional().describe("Maximum number of events to return"),
    }).describe("Object containing the query parameters.")
  );
};

export const duckDuckGoSearch = (maxResults: number = 1) => {
  return createToolDefinition(
    new DuckDuckGoSearch({ maxResults }),
    'duckduckgo_search',
    "A tool for searching the web using DuckDuckGo. Input should be a search query.",
    z.object({ query: z.string().describe("The search query") }).describe("Object containing the search query.")
  );
};

