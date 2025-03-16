"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Lock, Check, X, Loader2 } from "lucide-react"

interface AuthToolProps {
  provider: string
  onAuthSuccess: (token: string) => void
  onAuthFailure?: (error: string) => void
  disabled?: boolean
  status?:string
}

export function AuthTool({ provider, onAuthSuccess, onAuthFailure, disabled = false, status }: AuthToolProps) {
  const [authState, setAuthState] = useState<"idle" | "loading" | "success" | "failed">("idle")

  const handleAuth = (provider: string) => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    let authWindow = window.open(
      `/api/auth?provider=${provider}`,
      "_blank",
      `width=${width},height=${height},top=${top},left=${left},resizable=no,scrollbars=no,status=no`
    );
    // If the browser blocked the popup, open in a new tab
    if (!authWindow || authWindow.closed || typeof authWindow.closed === "undefined") {
      window.location.href = `/api/auth?provider=${provider}`;
      return;
    }

    const receiveMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { success, token, error } = event.data
      authWindow?.close();
      window.removeEventListener("message", receiveMessage);
      if (success) {
        onAuthSuccess(token)
        // location.reload(); // Refresh chat to detect auth
      } else {
        if (onAuthFailure) onAuthFailure(error || "Authentication failed")
      }
    };

    window.addEventListener("message", receiveMessage);
  };
  return (status ? (
    <div className="inline-flex items-center gap-2 p-2 bg-muted/30 border rounded-md">
      <Lock className="h-4 w-4 text-primary" />
      <span className="text-sm">
        {status?.startsWith("Authenticated") ? `✔️ Authenticated` : `❌ ${status}`}
      </span>
    </div>
  ): (
    <div className="inline-flex items-center gap-2 p-2 bg-muted/30 border rounded-md">
      <Lock className="h-4 w-4 text-primary" />
      <span className="text-sm">Sign in with {provider}</span>
      <Button size="sm" onClick={() => handleAuth(provider)} disabled={disabled || authState === "loading"}>
        {authState === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : authState === "success" ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : authState === "failed" ? (
          <X className="h-4 w-4 text-red-500" />
        ) : (
          "Sign In"
        )}
      </Button>
    </div>
  ))
}