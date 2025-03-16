"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"

export type ToolMessageProps = {
  toolInvocations?: any[]; // adjust type as needed
  onToolResult?: (toolCallId: string, result: string) => void;
}

export function ToolMessage({ toolInvocations, onToolResult }: ToolMessageProps) {
  const [showResults, setShowResults] = useState(false)
  const toolResults = toolInvocations?.filter(t => t.state === "result") || []

  const handleToggle = () => setShowResults(prev => !prev)

  return (
    <>
      {toolResults.length > 0 && (
        <div className="mt-2">
          <Badge className="cursor-pointer" onClick={handleToggle}>
            {showResults ? "Hide Tool Results" : `View ${toolResults.length} Tool Results`}
          </Badge>
          {showResults && (
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
    </>
  )
}