import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import Button from './Button';
import { ChatMessage } from '../hooks/useGemini';

interface ChatInterfaceProps {
    chatHistory: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
    suggestedPrompts: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatHistory, isLoading, onSendMessage, suggestedPrompts }) => {
    const [input, setInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };
    
    const handlePromptClick = (prompt: string) => {
        onSendMessage(prompt);
    }
    
    const formatMessage = (text: string) => {
        let html = text;

        html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-[var(--text-primary)] mt-3 mb-1">$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-gradient-primary mt-4 mb-2">$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gradient-primary mt-5 mb-3">$1</h1>');
        
        html = html.replace(/((?:^[*-] .*(?:\n|$))+)/gm, (match) => {
            const items = match.trim().split('\n').map(item =>
                `<li class="list-disc ml-5 mb-1.5">${item.replace(/^[*-] /, '').trim()}</li>`
            ).join('');
            return `<ul class="list-outside mt-2">${items}</ul>`;
        });

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');

        html = html.replace(/\n/g, '<br />');
        html = html.replace(/<br \/>\s*(<(?:ul|ol|h[1-3]))/g, '$1');
        html = html.replace(/(<\/(?:ul|ol|h[1-3])>)\s*<br \/>/g, '$1');

        return html;
    };


    return (
        <div className="flex flex-col h-[60vh] md:h-[calc(100vh-250px)]">
            <div className="flex-grow overflow-y-auto pr-4 space-y-6">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}`}>
                        <div className={`chat-bubble ${msg.role}`}>
                            {msg.isLoading && msg.parts[0].text === '' ? (
                                <div className="typing-indicator px-2 py-1"><span></span><span></span><span></span></div>
                            ) : (
                                <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatMessage(msg.parts[0].text || '') }} />
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <div className="pt-4 mt-auto">
                <div className="flex flex-wrap gap-2 mb-3">
                    {suggestedPrompts.map(prompt => (
                        <Button key={prompt} size="sm" variant="subtle" onClick={() => handlePromptClick(prompt)} disabled={isLoading}>
                            <Sparkles size={14} className="mr-1.5 text-[var(--primary-accent-end)]"/> {prompt}
                        </Button>
                    ))}
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                        placeholder="Ask a follow-up question..."
                        className="form-input-light flex-grow !rounded-xl resize-none"
                        rows={1}
                        style={{maxHeight: '150px'}}
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" variant="primary" disabled={isLoading || !input.trim()}>
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
