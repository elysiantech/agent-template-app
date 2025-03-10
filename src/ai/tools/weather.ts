import {z} from 'zod';
import {tool, Tool} from '@langchain/core/tools';
import {RunnableConfig} from '@langchain/core/runnables';

export const getWeather = tool(
    async (input) => {
    if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
      return "It's 60 degrees and foggy.";
    } else {
      return "It's 90 degrees and sunny.";
    }
    }, {
    name: "getWeather",
    description: "Call to get the current weather.",
    schema: z.object({
      location: z.string().describe("Location to get the weather for."),
    }),
    
});
