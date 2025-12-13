import React, { useState, useEffect, useRef } from "react";
import { Send, X, Sparkles, User, Bot, BarChart2, Minimize2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, ChartData } from "../types";
import BarChart from "./BarChart";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  chartData: ChartData[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatHistory,
  chartData,
  isLoading,
  error,
  onSendMessage,
  isOpen,
  onToggle,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const suggestions = [
    "Who is the top tither in 2024?",
    "Get tithe stats for January 2024",
    "Show me a chart of top 5 tithers",
    "Search for member 'John'",
  ];

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl bg-gradient-to-r from-[var(--primary-accent-start)] to-[var(--primary-accent-end)] text-white hover:scale-110 transition-transform duration-300 group"
            onClick={onToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Sparkles size={24} className="group-hover:animate-spin-slow" />
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              width: isExpanded ? "600px" : "400px",
              height: isExpanded ? "800px" : "600px"
            }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-24 right-6 max-h-[85vh] z-50 flex flex-col overflow-hidden",
              "glassmorphism shadow-2xl border border-[var(--border-color)] rounded-2xl"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10 shadow-inner">
                  <Sparkles size={18} className="text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-base tracking-tight">Tactms AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[var(--bg-hover)]" onClick={toggleExpand}>
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={onToggle}>
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-[var(--bg-main)]/30 backdrop-blur-sm">
              <div className="space-y-6">
                {chatHistory.length === 0 && (
                  <div className="text-center mt-20 space-y-6 px-4">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl rotate-3"
                    >
                      <Sparkles size={40} className="text-blue-500" />
                    </motion.div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-[var(--text-primary)]">How can I help you?</h4>
                      <p className="text-[var(--text-secondary)] text-sm max-w-[280px] mx-auto leading-relaxed">
                        I can analyze trends, find specific members, or summarize your tithe data in seconds.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mt-4 text-left">
                      {suggestions.map((suggestion, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => onSendMessage(suggestion)}
                          className="text-xs bg-[var(--bg-elevated)] hover:bg-[var(--primary-accent-start)]/10 hover:border-[var(--primary-accent-start)] hover:text-[var(--primary-accent-start)] border border-[var(--border-color)] px-4 py-3 rounded-xl transition-all text-[var(--text-primary)] flex items-center justify-between group"
                        >
                          {suggestion}
                          <Send size={12} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {chatHistory.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border",
                        msg.role === "user"
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-[var(--bg-elevated)] border-[var(--border-color)] text-[var(--primary-accent-start)]"
                      )}
                    >
                      {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div
                      className={cn(
                        "max-w-[85%] p-4 rounded-2xl text-sm shadow-sm",
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-sm glassmorphism-card"
                      )}
                    >
                      <ReactMarkdown
                        className="prose prose-sm dark:prose-invert max-w-none break-words"
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => <div className="overflow-x-auto my-2 rounded-lg border border-[var(--border-color)]"><table className="w-full text-xs" {...props} /></div>,
                          th: ({ node, ...props }) => <th className="bg-[var(--bg-subtle)] px-2 py-1 text-left" {...props} />,
                          td: ({ node, ...props }) => <td className="border-t border-[var(--border-color)] px-2 py-1" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          a: ({ node, ...props }) => <a className="text-blue-500 underline underline-offset-2" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                          code: ({ node, ...props }) => <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[11px]" {...props} />,
                        }}
                      >
                        {msg.parts[0]?.text || ""}
                      </ReactMarkdown>

                      {/* Embed Chart if it's the last message and chartData exists */}
                      {msg.role === 'model' && index === chatHistory.length - 1 && chartData.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-dashed border-[var(--border-color)]">
                          <div className="flex items-center gap-2 mb-3 text-[var(--text-secondary)]">
                            <BarChart2 size={14} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Visual Insight</span>
                          </div>
                          <div className="h-40 w-full">
                            <BarChart data={chartData} />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--primary-accent-start)] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Sparkles size={14} className="animate-pulse" />
                    </div>
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-3 shadow-sm">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                            className="w-1.5 h-1.5 bg-[var(--primary-accent-start)] rounded-full"
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">Analyzing data...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-[var(--bg-elevated)]/80 backdrop-blur-md border-t border-[var(--border-color)]">
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about your data..."
                  className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent-start)]/50 focus:border-[var(--primary-accent-start)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] transition-all shadow-inner"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className={cn(
                    "absolute right-1 top-1 bottom-1 rounded-lg w-10 h-auto shadow-sm transition-all",
                    inputMessage.trim()
                      ? "bg-[var(--primary-accent-start)] hover:bg-[var(--primary-accent-end)] text-white"
                      : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  <Send size={18} />
                </Button>
              </div>
              <div className="mt-2 flex justify-center">
                <p className="text-[10px] text-[var(--text-muted)] font-medium">Powered by Gemini AI • TACTMS Secure</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatInterface;
