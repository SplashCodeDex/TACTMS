import React from 'react';
import { BotMessageSquare, AlertTriangle, Lightbulb } from 'lucide-react';
import { TitheRecordB } from '../types';
import Button from '../components/Button';
import SkeletonLoader from '../components/SkeletonLoader';
import { useGeminiChat } from '../hooks/useGemini';
import BarChart from '../components/BarChart';
import ChatInterface from '../components/ChatInterface';

interface AnalyticsSectionProps {
  titheListData: TitheRecordB[];
  currentAssembly: string | null;
  selectedDate: Date;
  addToast: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  tithersCount: number;
  nonTithersCount: number;
  totalAmount: number;
}

const AISummaryCard: React.FC<{ summary: string }> = ({ summary }) => {
    const formattedSummary = summary
        .replace(/\n/g, '<br />')
        .replace(/\* \*\*(.*?)\*\*/g, '<li><strong class="text-[var(--primary-accent-start)]">$1</strong>')
        .replace(/<\/strong>:(.*?)<br \/>/g, '</strong>:$1</li>')
        .replace(/- \*\*(.*?)\*\*/g, '<li><strong class="text-[var(--primary-accent-start)]">$1</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--primary-accent-start)]">$1</strong>')
        .replace(/- (.*?)(<br \/>|$)/g, '<li class="list-none ml-0 mb-1.5">$1</li>');

    return (
        <div className="content-card bg-[var(--bg-elevated)] border-l-4 border-[var(--primary-accent-start)]">
            <h3 className="section-heading text-base !mb-3"><Lightbulb size={18} className="mr-3 icon-primary"/>AI-Generated Summary</h3>
            <ul className="text-sm space-y-2 text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: formattedSummary }}/>
        </div>
    )
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  titheListData,
  currentAssembly,
  selectedDate,
  addToast,
  tithersCount,
  nonTithersCount,
  totalAmount
}) => {
  const { chatHistory, chartData, isLoading, error, startChat, sendMessage } = useGeminiChat();

  const handleAnalyzeClick = () => {
    if (!process.env.API_KEY) {
      addToast("AI feature is not configured.", 'error');
      return;
    }
    startChat(titheListData, currentAssembly, selectedDate, tithersCount, nonTithersCount, totalAmount);
  };
  
  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    sendMessage(message);
  }

  const hasData = titheListData.length > 0;
  const hasChatStarted = chatHistory.length > 0;
  const aiSummary = chatHistory[0]?.summary;
  
  const suggestedPrompts = [
      "What are the key observations from this data?",
      "Suggest some potential actions based on these numbers.",
      "What if participation increased by 10%?",
      `How does ${currentAssembly || 'this assembly'} compare to typical patterns?`
  ];

  return (
    <div className="space-y-8">
      <section className="content-card">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 id="analytics-heading" className="section-heading border-none pb-0 mb-0">
            <BotMessageSquare size={22} className="mr-3 icon-primary" />
            AI-Powered Analytics Chat
          </h2>
          <Button 
            onClick={handleAnalyzeClick} 
            disabled={!hasData || isLoading}
            isLoading={isLoading && !hasChatStarted}
            variant="primary"
          >
            {hasChatStarted ? `Restart Analysis for ${currentAssembly}` : 'Analyze with AI'}
          </Button>
        </div>
      </section>

      <div className="min-h-[400px]">
        {error && (
            <div className="content-card text-center py-10 flex flex-col items-center">
                <AlertTriangle size={48} className="text-[var(--danger-text)] mb-4" />
                <h3 className="text-xl font-semibold text-[var(--danger-text)]">Analysis Failed</h3>
                <p className="text-[var(--text-secondary)] mt-2 max-w-md">{error}</p>
            </div>
        )}

        {!hasChatStarted && !isLoading && !error && (
          <div className="content-card text-center py-10 flex flex-col items-center animate-fadeIn">
            <BotMessageSquare size={52} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Ready for Insights?</h3>
            <p className="text-[var(--text-secondary)] mt-2 max-w-md">
              {hasData
                ? `You have a list for ${currentAssembly} Assembly ready. Click "Analyze with AI" to start a conversation about your data.`
                : "Generate or load a tithe list in the Processor view, then come back here to get an AI-powered analysis."
              }
            </p>
          </div>
        )}

        {isLoading && !hasChatStarted && <div className="content-card"><SkeletonLoader /></div>}

        {hasChatStarted && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                {aiSummary && <AISummaryCard summary={aiSummary} />}
                <div className="content-card">
                    <ChatInterface 
                        chatHistory={chatHistory}
                        isLoading={isLoading}
                        onSendMessage={handleSendMessage}
                        suggestedPrompts={suggestedPrompts}
                    />
                </div>
            </div>
            <div className="lg:col-span-1 space-y-8 sticky top-8">
              {chartData.length > 0 &&
                <div className="content-card animate-fadeIn">
                    <h3 className="section-heading text-base !mb-6">Contribution Distribution</h3>
                    <BarChart data={chartData} />
                </div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSection;