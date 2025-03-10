import React, { memo, useMemo, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "ai/react";
import Image from "next/image";

export type ChatMessageProps = {
  message: Message;
  isLast: boolean;
};


export const ChatMessage = memo(({ message, isLast }: ChatMessageProps) => {
  const { thinkContent, cleanContent } = useMemo(() => {
    const thinkMatch = message.content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
    return {
      thinkContent: message.role === "assistant" ? thinkMatch?.[1]?.trim() : null,
      cleanContent: message.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, "").trim(),
    };
  }, [message.content, message.role]);

  useEffect(() => {
    if (message.toolInvocations) {
      message.toolInvocations.forEach((toolInvocation: any) => {
        console.log(toolInvocation.toolName, toolInvocation.state)
        if (toolInvocation.toolName === 'getWeather') {
          if ('delta' in toolInvocation){

          }
        }
      });
    }
  }, [message.toolInvocations]);


  return (
    <div className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
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
      </div>
    </div>
  );
},  (prev, next) => prev.isLast === next.isLast && prev.message === next.message);


// <div key={message.id} className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
//   <div className={`inline-block p-3 rounded-xl break-words overflow-wrap breakword max-w-full sm:max-w-[75%]
//       ${ message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
//       ${ message.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`
//     }>
//     {message.role === "assistant" && (
//       <>
//       {/* {message.parts.map((part, index) => {
//         if (part.type === 'reasoning') {
//           return <pre key={index}>{part.reasoning}</pre>;
//         }
//       })} */}
//       {message.toolInvocations ? null : <Markdown>{message.content}</Markdown>}
//       {/* Attachments */}
//       {message.experimental_attachments && message.experimental_attachments.length > 0 && (
//           <div className="mt-2 space-y-1">
//             {message.experimental_attachments.map((attachment, attachmentIndex) => (
//               <div
//                 key={attachmentIndex}
//                 onClick={()=>setIsArtifactsOpen(true)}
//                 className="flex items-center gap-1 p-1.5 bg-background/50 rounded cursor-pointer hover:bg-background/80 transition-colors"
//               >
//                 <FileText className="h-4 w-4 text-primary" />
//                 <span className="text-sm">Attachment {attachmentIndex + 1}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </>
//     )}
//     {message.role === 'user' && (<>{message.content}</>)}
//   </div>
// </div>