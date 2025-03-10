import { getWeather} from './weather'
import { firecrawlTool } from './firecrawl';
import { StructuredTool, DynamicStructuredTool } from "@langchain/core/tools";

// import { googlePlaces, calculator, duckDuckGoSearch } from './community-tools'

export const tools = [
    getWeather,
    firecrawlTool,
    // googlePlaces,
    // calculator,
    // duckDuckGoSearch(),
];

interface ToolInfo {
    index: number;
    toolName: string;
    description: string;
}
  
export function getToolsInfo(): ToolInfo[] {
    return tools.map((tool, index) => ({
      index,
      toolName: tool.name,
      description: tool.description
    }));
}
