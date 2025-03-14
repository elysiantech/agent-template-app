import { useState, useEffect } from "react"
import { toast } from "sonner"

// File attachment type
export interface FileAttachment {
  id: string
  file: File
  previewUrl?: string
}

export function useFileHandler() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Handle file selection from file input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  // Handle paste event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }

      if (files.length > 0) {
        e.preventDefault()
        addFiles(files)
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [])

  // Add files to attachments
  const addFiles = async (files: File[]) => {
    const newAttachments: FileAttachment[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }))

    setAttachments((prev) => [...prev, ...newAttachments])
    toast.success(`Added ${files.length} attachment${files.length > 1 ? "s" : ""}`)
  }

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const updated = prev.filter((attachment) => attachment.id !== id)

      // Revoke object URLs to prevent memory leaks
      const removed = prev.find((attachment) => attachment.id === id)
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }

      return updated
    })
  }

  // Clear all attachments
  const clearAttachments = () => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
    })
    setAttachments([])
  }

  return {
    attachments,
    isDragging,
    addFiles,
    removeAttachment,
    clearAttachments,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  }
}