// src/app/admin/_components/AiCommandSidebar.tsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface AiLogEntry {
  type: 'info' | 'command' | 'response' | 'error';
  message: string;
  timestamp: string;
}

interface AiCommandSidebarProps {
  isSheet?: boolean;
  onClose?: () => void;
}

export function AiCommandSidebar({ isSheet = false, onClose }: AiCommandSidebarProps) {
  const { translate } = useLanguage();
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<AiLogEntry[]>([
    {
        type: 'info',
        message: 'AI Assistant initialized. Ready for commands.',
        timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleSendCommand = () => {
    if (!command.trim()) return;
    
    const newCommandLog: AiLogEntry = {
        type: 'command',
        message: command,
        timestamp: new Date().toLocaleTimeString(),
    };

    const thinkingLog: AiLogEntry = {
        type: 'info',
        message: 'Processing command...',
        timestamp: new Date().toLocaleTimeString(),
    };

    setLogs(prev => [...prev, newCommandLog, thinkingLog]);
    setIsSending(true);

    // This is where you would call your actual AI flow
    setTimeout(() => {
        const responseLog: AiLogEntry = {
            type: 'response',
            message: `Command "${command}" acknowledged. Feature not yet implemented.`,
            timestamp: new Date().toLocaleTimeString(),
        };
        setLogs(prev => [...prev.slice(0, -1), responseLog]); 
        setIsSending(false);
    }, 1500);

    setCommand("");
  };

  const content = (
    <div className="flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Command Center
            </CardTitle>
            {isSheet && (
                <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                    <X className="h-4 w-4" />
                </Button>
            )}
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="space-y-2 flex-grow flex flex-col">
                <h4 className="text-sm font-medium">Activity Log</h4>
                <ScrollArea className="flex-grow rounded-md border p-4">
                    <div className="space-y-3">
                    {logs.map((log, index) => (
                        <div key={index} className="text-xs">
                        <span className="text-muted-foreground mr-2">{log.timestamp}</span>
                        <span className={cn(
                            log.type === 'command' ? 'text-blue-600 font-medium' :
                            log.type === 'response' ? 'text-green-700' : 
                            log.type === 'error' ? 'text-destructive' : ''
                        )}>
                            [{log.type.toUpperCase()}]: {log.message}
                        </span>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </div>
            <div className="space-y-2">
                <h4 className="text-sm font-medium">Issue a Command</h4>
                <Textarea
                    placeholder="e.g., 'Generate a summary of today's attendance reports'"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    disabled={isSending}
                    rows={3}
                />
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSendCommand} disabled={isSending || !command.trim()} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Send Command
            </Button>
        </CardFooter>
    </div>
  );

  if (isSheet) {
    return content;
  }

  return (
    <Card className="sticky top-4 h-[calc(100vh-2rem)]">
      {content}
    </Card>
  );
}
