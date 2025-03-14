"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { Message, useChat } from "ai/react";
import type { CoreUserMessage } from 'ai';
import { Send, Square as Stop, ChevronRight, ChevronLeft,
  Sparkles, Paperclip, File, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessage } from "@/components/chat-message"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import type { Chats } from './sidebar-history';
import { ChatHeader, Preset } from '@/components/chat-header';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid'
import { useLocalStorage } from 'usehooks-ts';
import { generateTitleFromUserMessage, generateSuggestions } from '@/app/actions';
import { useFileHandler, FileAttachment } from "@/hooks/use-file"

export function Chat({ id, selectedModelId, settings}: { id: string; selectedModelId: string; settings: Record<string, any> }) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [preset, setPreset] = useLocalStorage<Preset>("selected_preset", {id: "default", name: "Default", customInstructions: "",selectedTools: ["getWeather"],});
  const [ suggestions, setSuggestions] = useState<string[]>([])
  const [isArtifactsOpen, setIsArtifactsOpen] = useState(false)
  const [history, setHistory] = useLocalStorage<Chats>("chats", { chats: [] }, { initializeWithValue: false })
  const saveChatRef = useRef(false);
  const previousMessagesLengthRef = useRef(0);
  
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    isLoading,
    append,
    stop,
    data: dataStream,
  } = useChat({
    api:"/api/chat/langchain",
    //api:"/api/chat",
    body: { id, modelId: selectedModelId, selectedTools:preset.selectedTools, customInstructions:preset.customInstructions},
    sendExtraMessageFields: true,
    initialMessages: history?.chats.find((chat:any) => chat.id === id)?.messages || [],
    onError: (error) => {toast.error(`Something went wrong`);},
    onFinish: (message) => {
      saveChatRef.current = true;
      generateSuggestions({messages}).then(setSuggestions)
    },
    onToolCall({ toolCall, }) { console.log('onToolCall', JSON.stringify(toolCall))},
  })

  const { 
    attachments, 
    isDragging, 
    addFiles, 
    removeAttachment, 
    clearAttachments, 
    handleFileSelect, 
    handleDrop, 
    handleDragOver, 
    handleDragLeave 
  } = useFileHandler()


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
    if (!dataStream?.length) return;
    console.log('dataStream', dataStream)
  }, [dataStream])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading || (!input.trim() && attachments.length === 0)) return

    const formattedAttachments = attachments.map(({ file, previewUrl }) => ({
      name: file.name,
      type: file.type,
      url: previewUrl || "file-placeholder-url",
    }))

    handleSubmit(e, {
      experimental_attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined,
    })

    clearAttachments()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (isLoading) toast.error('Please wait for the model to finish its response!');
      if (isLoading || !input) return;
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>, { experimental_attachments: undefined});
    }
  };

  return (
    <div className="h-screen p-4">
    <div className="flex h-full w-full gap-2 transition-all duration-300 ease-in-out">
    <Card className="flex flex-col h-full w-full">
      <CardHeader>
      <div className="flex items-center justify-between w-full">
      <ChatHeader selectedModelId={selectedModelId} onPresetChange={setPreset} />
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
        {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div className="max-w-md space-y-4">
                  <h2 className="text-2xl font-bold">Welcome to AI Chat</h2>
                  <p className="text-muted-foreground">Start a conversation with the AI assistant.</p>
                </div>
              </div>
        ) : (messages
        .reduce<Message[]>((acc, message, index, arr) => {
          if (message.content.trim() !== "") {
            // Look back for toolInvocation in previous empty messages
            const mergedMessage = { ...message };
            for (let i = index - 1; i >= 0; i--) {
              const prevMessage = arr[i];
              if (prevMessage.content.trim() === "" && prevMessage.toolInvocations) {
                mergedMessage.toolInvocations = [
                  ...(mergedMessage.toolInvocations || []),
                  ...prevMessage.toolInvocations,
                ];
              } else {
                break; // Stop looking when encountering a non-empty message
              }
            }
            acc.push(mergedMessage);
          }
          return acc;
        }, [])
        .map((message:Message, index) => (
          <ChatMessage key={index} message={message} isLast={index === messages.length - 1} />
        )))}
        {isLoading && (
          <div className="text-left">
            <div className="inline-block p-3 rounded-xl bg-muted text-muted-foreground rounded-tl-sm">
              <span className="typing-indicator">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="flex-shrink-0 sticky bottom-0 bg-card z-10">
        <div className="w-full space-y-2">
        {!isLoading && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
              {suggestions.map((text, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="flex items-center gap-1.5 text-xs py-1 h-auto"//className="w-full text-sm p-4 h-10 flex items-center justify-center text-center leading-tight"
                  onClick={() => append({ id: uuidv4(), role:'user', content:text})}
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="whitespace-normal break-words">{text}</span>
                </Button>
              ))}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="w-full space-y-2">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="group relative flex items-center gap-1.5 bg-background rounded-md border p-1.5 pr-7 text-sm">
                    {attachment.previewUrl && (
                      <img src={attachment.previewUrl} alt={attachment.file.name} className="h-5 w-5 rounded" />
                    )}
                    <span className="max-w-[150px] truncate">{attachment.file.name}</span>
                    <button type="button" onClick={() => removeAttachment(attachment.id)} className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={clearAttachments} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear all
                </button>
              </div>
            )}

            {/* Text Input */}
            <div className={`relative ${isDragging ? "ring-2 ring-primary ring-offset-2" : ""}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
             <Textarea
              ref={textAreaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              rows={3}
              autoFocus
              placeholder={isDragging ? "Drop files here..." : "Type your question here or attach files..."}
              className="w-full h-full min-h-[80px] resize-none pr-24"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf,text/*,.js,.jsx,.ts,.tsx,.html,.css,.json" />
                <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-8 w-8 rounded-full">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button type="submit" size="icon" className="rounded-full" disabled={isLoading ? false : !input.trim() && attachments.length === 0}
                  onClick={ isLoading ? stop : undefined}
                  >
                  {isLoading ? <Stop className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  <span className="sr-only">{isLoading ? "Stop" : "Send"}</span>
                </Button>
            </div>
        </div>
        </form>
        </div>
      </CardFooter>
    </Card>
    {/* Artifacts Canvas */}
    <Card className={cn(
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
    </div>
  )
}
