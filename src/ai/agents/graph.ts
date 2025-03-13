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

const getSelectedToolsFromConfig = ( config: RunnableConfig ) =>{
  const { selectedTools } = config.configurable as { selectedTools?: string[] };
  const agentTools = (selectedTools && selectedTools.length > 0)
    ? tools.filter(tool => selectedTools.includes(tool.name)).map(({ tool }) => tool)
    : tools.map(({ tool }) => tool); // all tools

  return agentTools;
};
  
const toolNode = async (state: typeof AgentState.State, config: RunnableConfig) => {
  const toolsWithState = [
    imageCaptioningTool(state),
    boundingBoxTool(state),
    objectDetectionTool(state),
  ]
  const agentTools = getSelectedToolsFromConfig(config)
  const toolExecutor = new ToolNode([...agentTools, ...toolsWithState])
  const {messages} =  await toolExecutor.invoke(state)
  return { messages }
}

const agentNode = async (state: typeof AgentState.State, config: RunnableConfig) => {

const systemPrompt = `
  You are a highly capable AI assistant with advanced reasoning and tool-usage abilities.
  You adapt dynamically to user needs, whether analyzing content, generating insights, or assisting with technical tasks.
  Use all available tools effectively before responding to ensure accuracy and completeness.
  Today's date: ${new Date().toString()}
  `;
  const { assetId, customInstructions } = config?.configurable as { assetId: string, customInstructions?: string };
  // Get the last human message for the query
  const humanMessages = state.messages.filter((message) => message instanceof HumanMessage);
  const lastHumanMessage = humanMessages[humanMessages.length - 1];
  
  const toolsWithState = [
    imageCaptioningTool(state),
    boundingBoxTool(state),
    objectDetectionTool(state),
  ]
  const agentTools = getSelectedToolsFromConfig(config)
  const llm = await getModelFromConfig(config)
  const llmWithTools = llm.bindTools([...agentTools, ...toolsWithState]);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `${systemPrompt}\n\n${customInstructions}`],
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

