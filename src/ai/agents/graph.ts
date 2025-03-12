import { AIMessage, AIMessageChunk, ToolMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from '@langchain/core/runnables';
import { Annotation, StateGraph, START, END, MessagesAnnotation } from '@langchain/langgraph'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { getModelFromConfig} from '@/ai/utils'
import { tools } from "@/ai/tools"
import { imageCaptioningTool, boundingBoxTool, objectDetectionTool } from '@/ai/tools/video'
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
  const toolsWithState = [
    imageCaptioningTool(state),
    boundingBoxTool(state),
    objectDetectionTool(state),
  ]
  const toolExecutor = new ToolNode([...tools, ...toolsWithState])
  const {messages} =  await toolExecutor.invoke(state)
  return { messages }
}

const agentNode = async (state: typeof AgentState.State, config: RunnableConfig) => {

  // const systemPrompt = `You are a helpful assistant.\n Today's date:${new Date().toString()}`;
  const { assetId } = config?.configurable as { assetId: string };
  const systemPrompt = `
  You are a proactive video content intelligence assistant with advanced vision capabilities. 
  Your goal is to thoroughly understand and describe video content, even with limited initial information.
  Use available tools to retrieve relevant video frames, audio transcripts, or audio descriptions as needed.
  
  Ensure you have retrieved relevant data before answering the user’s query.

  Context Parameters:
  Today's date:${new Date().toString()}
  Video Asset ID: ${assetId}
  `;
  // Get the last human message for the query
  const humanMessages = state.messages.filter((message) => message instanceof HumanMessage);
  const lastHumanMessage = humanMessages[humanMessages.length - 1];
  
  const toolsWithState = [
    imageCaptioningTool(state),
    boundingBoxTool(state),
    objectDetectionTool(state),
  ]

  const llm = await getModelFromConfig(config)
  const llmWithTools = llm.bindTools([...tools, ...toolsWithState]);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages")
  ]);
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

