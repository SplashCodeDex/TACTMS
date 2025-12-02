import React, { useState, useEffect, useRef } from "react";
import { Send, X, Sparkles, User, Bot, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";
import { ChatMessage, ChartData } from "../types";
import BarChart from "./BarChart";

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

  const suggestions = [
    "What is the total tithe?",
    "Show me the top 5 tithers",
    "Compare with last week",
    "Any unusual amounts?",
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 ${isOpen
            ? "bg-red-500 text-white rotate-90"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-110"
          }`}
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] max-h-[80vh] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">The Oracle</h3>
                  <p className="text-xs text-[var(--text-secondary)]">AI Data Assistant</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-main)]/50">
              {chatHistory.length === 0 && (
                <div className="text-center mt-10 space-y-4">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles size={32} className="text-blue-500" />
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm px-6">
                    I can analyze your data, find trends, and answer questions. Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center px-4">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => onSendMessage(suggestion)}
                        className="text-xs bg-[var(--bg-elevated)] hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-[var(--border-color)] px-3 py-1.5 rounded-full transition-colors text-[var(--text-primary)]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-indigo-600 text-white"
                      }`}
                  >
                    {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-none"
                      }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.parts[0].text}</p>
                  </div>
                </div>
              ))}

              {/* Chart Display */}
              {chartData.length > 0 && (
                <div className="ml-11 max-w-[85%] bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-3 text-[var(--text-secondary)]">
                    <BarChart2 size={14} />
                    <span className="text-xs font-medium">Visual Insight</span>
                  </div>
                  <div className="h-40">
                    <BarChart data={chartData} />
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Bot size={14} />
                  </div>
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-color)]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about your data..."
                  className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] placeholder-[var(--text-placeholder)]"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="rounded-xl w-10 h-10 flex-shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatInterface;
