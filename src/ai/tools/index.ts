import { getWeather} from './weather'
import { firecrawlTool } from './firecrawl';
import { gmailTools } from './gmail'

export const tools = [
    getWeather,
    firecrawlTool,
    ...gmailTools
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
