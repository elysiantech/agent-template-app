import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import {RunnableConfig} from '@langchain/core/runnables';
import { Annotation, StateGraph, START, END, MessagesAnnotation } from '@langchain/langgraph'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { getModelFromConfig} from '@/ai/utils'
import { tools } from "@/ai/tools/index"
import { z } from "zod";

const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
});

const shouldContinue = (state: typeof AgentState.State) => { 
  const lastMessage = state.messages[state.messages.length - 1] as AIMessageChunk
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) return "true"
  return "false"
}

const toolNode = async (state: typeof AgentState.State) => {
  const toolExecutor = new ToolNode(tools)
  const {messages} =  await toolExecutor.invoke(state)
  return { messages }
}

const agentNode = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a helpful assistant.\n Today's date:${new Date().toString()}`],
    new MessagesPlaceholder("messages")
  ]);
  const llm = await getModelFromConfig(config)
  const llmWithTools = llm.bindTools(tools);
  const response = await prompt.pipe(llmWithTools).invoke({
    messages: state.messages,
  });
  return { messages: [new AIMessage(response as AIMessageChunk)] }
}

export const agent = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, { true:"tools", false:END})
  .compile()

