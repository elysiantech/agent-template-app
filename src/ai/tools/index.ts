import { getWeather} from './weather'
import { firecrawlTool } from './firecrawl';
import { retrieveVideoTool } from './video'
import { gmailTools } from './gmail'


export interface Tool {
    name: string;       // What the agent sees
    displayName: string; // User-friendly name
    description: string;
    tool: any;     // Actual tool function
}

// Declare tools in one place
export const tools: Tool[] = [
    {
        displayName: "Weather Forecast",
        name: getWeather.name,
        description: "Get current weather data",
        tool: getWeather
    },
    {
        displayName: "Web Scraper",
        name: firecrawlTool.name,
        description: "Search the web for current information",
        tool: firecrawlTool
    },
    {
        displayName: "Retrieve Video Frames",
        name:  retrieveVideoTool.name,
        description:  "Extract frames from a video",
        tool: retrieveVideoTool
    },
    ...gmailTools.map((tool) => ({
        displayName: `Gmail Actions ${tool.name}`,
        name: tool.name,
        description: tool.name,
        tool
    }))
];

// Function to return user-friendly tool info
export interface ToolInfo {
    name:string;
    displayName: string;
    description: string;
}

export function getToolsInfo() {
    return tools.map(({ name, displayName, description }) => ({
        name, displayName, description
    }));
}

// export const tools = [
//     getWeather,
//     firecrawlTool,
//     retrieveVideoTool,
//     ...gmailTools
// ];


// export function getToolsInfo(): ToolInfo[] {
//     return tools.map((tool, index) => ({
//       index,
//       toolName: tool.name,
//       description: tool.description
//     }));
// }
