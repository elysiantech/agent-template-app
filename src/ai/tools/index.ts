import { getWeather} from './weather'
import { firecrawlTool } from './firecrawl';

export const tools = [
    getWeather,
    firecrawlTool,
];

export interface ToolInfo {
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
