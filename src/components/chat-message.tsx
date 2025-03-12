import React, { memo, useMemo, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "ai/react";
import { SparklesIcon } from "lucide-react"
import Image from "next/image";
import { Badge } from "@/components/ui/badge"; // Assuming you have a Badge component

export type ChatMessageProps = {
  message: Message;
  isLast: boolean;
};


export const ChatMessage = memo(({ message, isLast }: ChatMessageProps) => {
  const [showToolResults, setShowToolResults] = useState(false);

  const { thinkContent, cleanContent } = useMemo(() => {
    const thinkMatch = message.content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
    return {
      thinkContent: message.role === "assistant" ? thinkMatch?.[1]?.trim() : null,
      cleanContent: message.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, "").trim(),
    };
  }, [message.content, message.role]);
  const toolResults = useMemo(() => message.toolInvocations?.filter(t => t.state === "result") || [], [message.toolInvocations]);
  const handleToolClick = () =>  setShowToolResults(prev => !prev);

  return (
    <div className={`mb-4 flex items-start ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      {message.role === "assistant" && (
        <div className="size-8 flex items-center justify-center rounded-full ring-1 shrink-0 ring-border mr-2">
          <SparklesIcon size={14} />
        </div>
      )}

    <div
        className={`inline-block p-3 rounded-xl break-words max-w-full sm:max-w-[75%]
        ${message.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-muted-foreground rounded-tl-sm"}`}
      >
        {thinkContent && (
          <details className="mb-2 text-sm" open>
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Thinking process
            </summary>
            <div className="mt-2 text-muted-foreground">
              <Markdown remarkPlugins={[remarkGfm]}>{thinkContent}</Markdown>
            </div>
          </details>
        )}
        {message.experimental_attachments?.some(({ contentType }) => contentType?.startsWith("image/")) && (
          <div className="flex gap-2">
            {message.experimental_attachments.map(
              ({ url, contentType }, index) =>
                contentType?.startsWith("image/") && (
                  <Image key={`${message.id}-${index}`} src={url} width={200} height={200} alt="attachment" className="rounded-md object-contain" />
                )
            )}
          </div>
        )}
        <div className="mt-2">
          <Markdown remarkPlugins={[remarkGfm]}>{cleanContent}</Markdown>
        </div>
        {/* Tool Invocation Badge */}
        {toolResults.length > 0 && (
          <div className="mt-2">
            <Badge className="cursor-pointer" onClick={handleToolClick}>
              {showToolResults ? "Hide Tool Results" : `View ${toolResults.length} Tool Results`}
            </Badge>
            {showToolResults && (
              <div className="mt-2 p-2 bg-gray-100 rounded">
                {toolResults.map((tool, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    <strong>{tool.toolName}:</strong> {JSON.stringify(tool.result)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
},  (prev, next) => prev.isLast === next.isLast && prev.message === next.message);