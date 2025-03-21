import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import ExaClient from "exa-js";
import { ExaRetriever } from "@langchain/exa";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import {   StringOutputParser } from '@langchain/core/output_parsers'
import dedent from "dedent"
import { z } from "zod";

const searchSchema = z.object({
    query: z.string().describe("web search friendly query"),
    numResults: z.number().int().min(1).max(100).default(5).optional()
    .describe("Maximum number of search results to return")
})
const llm = new ChatOpenAI({ model:'gpt-4o-mini', apiKey:process.env.OPENAI_API_KEY});

export const exaSearchTool = tool(
    async ({query, numResults}: z.infer<typeof searchSchema>, config?: RunnableConfig) => {
        const exaClient = new ExaClient(process.env.EXA_API_KEY || "");
        const retriever = new ExaRetriever({
            client: exaClient,
            searchArgs: {
                filterEmptyResults: true,
                numResults,
            },
        });
        const searchDocuments = await retriever.invoke(query);
        const summarizationPrompt = ChatPromptTemplate.fromMessages([
            ['system',`Summarize the document. Pay close attention to any keywords and facts.`],
            ['human',dedent(`Document:
            {pageContent}
            
            Summarize the document with a concise paragraph. Only include the most important concepts, takeaways, and any actionable advice.`
        )]])
        try{
        const summarizer = summarizationPrompt.pipe(llm).pipe(new StringOutputParser())
        const summaries = await summarizer.batch(searchDocuments)
        return summaries.join("\n")
        } catch (err){
            console.log(err)
        }
       return ""
    },
    {
    name: "webSearch",
    description: `Useful tool to search the web. `,
    schema: searchSchema,
    //responseFormat: "content_and_artifact"
    }
);
