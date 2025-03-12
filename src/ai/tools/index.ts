import { getWeather} from './weather'
import { firecrawlTool } from './firecrawl';
import { retrieveVideoTool } from './video'
import { gmailTools } from './gmail'

export const tools = [
    getWeather,
    firecrawlTool,
    retrieveVideoTool,
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
