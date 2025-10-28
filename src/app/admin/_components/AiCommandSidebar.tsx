// src/app/admin/_components/AiCommandSidebar.tsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AiLogEntry {
  type: 'info' | 'command' | 'response';
  message: string;
  timestamp: string;
}

export function AiCommandSidebar() {
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

    // Simulate AI processing and response
    const thinkingLog: AiLogentry = {
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
        setLogs(prev => [...prev.slice(0, -1), responseLog]); // Replace "Processing..." with response
        setIsSending(false);
    }, 1500);

    setCommand("");
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Command Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Activity Log</h4>
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={index} className="text-xs">
                  <span className="text-muted-foreground mr-2">{log.timestamp}</span>
                  <span className={
                    log.type === 'command' ? 'text-blue-600 font-medium' :
                    log.type === 'response' ? 'text-green-700' : ''
                  }>
                    [{log.type.toUpperCase()}]: {log.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div>
            <h4 className="text-sm font-medium mb-2">Issue a Command</h4>
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
    </Card>
  );
}