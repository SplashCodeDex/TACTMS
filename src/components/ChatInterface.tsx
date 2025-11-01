import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import Button from "./Button";
import { ChatMessage } from "../types";
import { formatMarkdown } from "../lib/markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  suggestedPrompts: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatHistory,
  isLoading,
  onSendMessage,
  suggestedPrompts,
}) => {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handlePromptClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-[60vh] md:h-[calc(100vh-250px)]">
      <ScrollArea className="flex-grow pr-4 space-y-6">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role}`}>
            <div className={`chat-bubble ${msg.role}`}>
              {msg.isLoading && msg.parts[0].text === "" ? (
                <div className="typing-indicator px-2 py-1">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(msg.parts[0].text || ""),
                  }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </ScrollArea>
      <div className="pt-4 mt-auto">
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestedPrompts.map((prompt) => (
            <Button
              key={prompt}
              size="sm"
              variant="subtle"
              onClick={() => handlePromptClick(prompt)}
              disabled={isLoading}
            >
              <Sparkles
                size={14}
                className="mr-1.5 text-[var(--primary-accent-end)]"
              />{" "}
              {prompt}
            </Button>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) handleSend(e);
            }}
            placeholder="Ask a follow-up question..."
            className="form-input-light flex-grow !rounded-xl resize-none"
            rows={1}
            style={{ maxHeight: "150px" }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            variant="primary"
            disabled={isLoading || !input.trim()}
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
