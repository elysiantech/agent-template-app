"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { Message, useChat } from "ai/react";
import type { CoreUserMessage } from 'ai';
import { Send, Square as Stop, ChevronRight, ChevronLeft, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import type { Chats } from './sidebar-history';
import { ChatHeader } from '@/components/chat-header';
import { toast } from 'sonner';
import { useLocalStorage } from 'usehooks-ts';
import { generateTitleFromUserMessage, generateSuggestions } from '@/app/actions';
  
export function Chat({ id, selectedModelId, settings}: { id: string; selectedModelId: string; settings: Record<string, any> }) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isArtifactsOpen, setIsArtifactsOpen] = useState(false)
  const [history, setHistory] = useLocalStorage<Chats>(
    `chats`,
    { chats: [] },
    {
      initializeWithValue: false,
    },
  );
  const previousMessagesLengthRef = useRef(0);
  const saveChatRef = useRef(false);
  
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    isLoading,
    stop,
  } = useChat({
    //api:"/api/chat/langchain",
    api:"/api/chat",
    body: { id, modelId: selectedModelId },
    sendExtraMessageFields: true,
    initialMessages:
      history?.chats.find((chat:any) => chat.id === id)?.messages || [],
    onError: (error) => {toast.error(`Something went wrong`);},
    onFinish: (message) => {
      saveChatRef.current = true;
      // generateSuggestions({messages}).then(console.log)
      console.log(message)
    },
    onToolCall({ toolCall, }) {
      console.log('onToolCall', JSON.stringify(toolCall))
    },
  })

  // When the messages change, update the history
  useEffect(() => {
    const updateHistory = async () => {
      // Skip if messages are empty or haven't actually changed
      if (!messages || messages.length === 0) return;
      if (!saveChatRef.current) return;
      if (messages.length === previousMessagesLengthRef.current) return;

      // Update the refs
      previousMessagesLengthRef.current = messages.length;
      saveChatRef.current = false;

      const existingChat = history.chats.find((chat) => chat.id === id);
      const otherChats = history.chats.filter((chat) => chat.id !== id);

      // Prepare the updated or new chat
      const updatedChat = existingChat
        ? {
            ...existingChat,
            messages,
          }
        : {
            id,
            messages,
            createdAt: new Date(),
            title: await generateTitleFromUserMessage({
              message: messages.find((message) => message.role === 'user',) as CoreUserMessage,
            }),
          };

      setHistory({
        ...history,
        chats: [updatedChat, ...otherChats],
      });
    };

    updateHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    history,
    messages,
    saveChatRef.current,
    previousMessagesLengthRef.current,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isLoading || !input) return;
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>, { experimental_attachments: undefined});
    }
  };

  return (
    <div className="flex h-full w-full gap-2 transition-all duration-300 ease-in-out">
    <Card className="flex flex-col h-full w-full">
      <CardHeader>
      <div className="flex items-center justify-between w-full">
      <ChatHeader selectedModelId={selectedModelId} settings={settings}/>
      {!isArtifactsOpen && (
        <Button
          onClick={ ()=> setIsArtifactsOpen(true)}
          variant="outline"
          size="icon"
          className="mr-2"
          aria-label="Open artifacts canvas"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto p-4">
        {messages.map((m:Message, index) => (
          <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
            <div className={`inline-block p-3 rounded-xl break-words overflow-wrap breakword max-w-full sm:max-w-[75%]
                ${ m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                ${ m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`
              }>
              {m.role === "assistant" && (
                <>
                {/* {m.parts.map((part, index) => {
                  if (part.type === 'reasoning') {
                    return <pre key={index}>{part.reasoning}</pre>;
                  }
                })} */}
                {m.toolInvocations ? null : m.content}
                {/* Attachments */}
                {m.experimental_attachments && m.experimental_attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.experimental_attachments.map((attachment, attachmentIndex) => (
                        <div
                          key={attachmentIndex}
                          onClick={()=>setIsArtifactsOpen(true)}
                          className="flex items-center gap-1 p-1.5 bg-background/50 rounded cursor-pointer hover:bg-background/80 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm">Attachment {attachmentIndex + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {m.role === 'user' && (<>{m.content}</>)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left">
            <div className="inline-block p-3 rounded-xl bg-muted text-muted-foreground rounded-tl-sm">
              <span className="typing-indicator">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="flex-shrink-0 sticky bottom-0 bg-card  z-10">
        <div className="w-full space-y-2">
          <div className="relative">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder="Type your question here..."
              className="w-full h-full resize-none pr-10"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 bottom-2 rounded-full"
              onClick={
                isLoading
                  ? stop // Call stop directly if loading
                  : () => handleSubmit(new Event("submit") as any, { experimental_attachments: undefined })
              }
            >
              {isLoading ? <Stop className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">{isLoading ? "Stop" : "Send"}</span>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
    {/* Artifacts Canvas */}
    <Card
        className={cn(
          "flex flex-col h-full transition-all duration-300 ease-in-out",
          isArtifactsOpen ? "w-3/4" : "w-0 opacity-0 overflow-hidden",
        )}
      >
        {isArtifactsOpen && (
          <>
            <CardHeader className="relative p-4">
              <Button
                onClick={() => setIsArtifactsOpen(false)}
                variant="outline"
                size="icon"
                className="absolute top-4 left-4"
                aria-label="Close artifacts canvas"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-grow p-4">
              <div className="h-full w-full bg-muted/30 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Your artifacts will appear here</p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

