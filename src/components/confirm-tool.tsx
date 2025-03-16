"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

interface ConfirmationToolProps {
  question: string
  onConfirm: (result: boolean) => void
  disabled?: boolean
}

export function ConfirmationTool({ question, onConfirm, disabled = false }: ConfirmationToolProps) {
    const [responded, setResponded] = useState(false)
    const [response, setResponse] = useState<boolean | null>(null)
  
    const handleResponse = (value: boolean) => {
      if (disabled || responded) return
  
      setResponse(value)
      setResponded(true)
      onConfirm(value)
    }
  
    return (
      <div className="inline-flex items-center gap-3 bg-muted/30 rounded-md border p-2 mt-2">
        <p className="text-sm">{question}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={response === true ? "default" : "outline"}
            onClick={() => handleResponse(true)}
            disabled={disabled || responded}
            className="flex items-center gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            Yes
          </Button>
          <Button
            size="sm"
            variant={response === false ? "default" : "outline"}
            onClick={() => handleResponse(false)}
            disabled={disabled || responded}
            className="flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            No
          </Button>
        </div>
      </div>
    )
  }

