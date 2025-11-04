import React, { useState } from "react";
import {
  BotMessageSquare,
  AlertTriangle,
  Lightbulb,
  MessageSquareQuote,
  Users,
} from "lucide-react";
import {
  TitheRecordB,
  MembershipReconciliationReport,
  OutreachMessage,
} from "../types";
import Button from "../components/Button";
import SkeletonLoader from "../components/SkeletonLoader";
import { useGeminiChat } from "../hooks/useGemini";
import BarChart from "../components/BarChart";
import ChatInterface from "../components/ChatInterface";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { useOutletContext } from "react-router-dom";
import DOMPurify from "dompurify";

interface AnalyticsSectionProps {
  titheListData: TitheRecordB[];
  currentAssembly: string | null;
  selectedDate: Date;
  addToast: (
    message: string,
    type: "info" | "success" | "error" | "warning",
  ) => void;
  tithersCount: number;
  nonTithersCount: number;
  totalAmount: number;
  reconciliationReport: MembershipReconciliationReport | null;
}

const AISummaryCard: React.FC<{ summary: string }> = ({ summary }) => {
  const formattedSummary = summary
    .replace(/\n/g, "<br />")
    .replace(
      /\* \*\*(.*?)\*\*/g,
      '<li><strong class="text-[var(--primary-accent-start)]">$1</strong>',
    )
    .replace(/<\/strong>:(.*?)<br \/>/g, "</strong>:$1</li>")
    .replace(
      /- \*\*(.*?)\*\*/g,
      '<li><strong class="text-[var(--primary-accent-start)]">$1</strong>',
    )
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-[var(--primary-accent-start)]">$1</strong>',
    )
    .replace(
      /- (.*?)(<br \/>|$)/g,
      '<li class="list-none ml-0 mb-1.5">$1</li>',
    );

  const sanitizedHtml = DOMPurify.sanitize(formattedSummary);

  return (
    <div className="content-card bg-[var(--bg-elevated)] border-l-4 border-[var(--primary-accent-start)]">
      <h3 className="section-heading text-base !mb-3">
        <Lightbulb size={18} className="mr-3 icon-primary" />
        AI-Generated Summary
      </h3>
      <ul
        className="text-sm space-y-2 text-[var(--text-secondary)]"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
};

const OutreachSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="p-4 bg-[var(--bg-card-subtle-accent)] rounded-lg animate-pulse"
      >
        <div className="h-4 bg-[var(--border-color)] rounded w-1/3 mb-3"></div>
        <div className="h-3 bg-[var(--border-color)] rounded w-full mb-1"></div>
        <div className="h-3 bg-[var(--border-color)] rounded w-5/6"></div>
      </div>
    ))}
  </div>
);

import { CopyButton } from "../components/CopyButton";



const AIOutreachAssistant: React.FC<{

  reconciliationReport: MembershipReconciliationReport | null;

  addToast: (

    message: string,

    type: "info" | "success" | "error" | "warning",

  ) => void;

}> = ({ reconciliationReport, addToast }) => {

  const [messages, setMessages] = useState<OutreachMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const newMembers = reconciliationReport?.newMembers || [];



  const handleGenerate = async () => {

    if (newMembers.length === 0) {

      addToast(

        "No new members found in the current data to generate messages for.",

        "warning",

      );

      return;

    }

    if (!import.meta.env.VITE_API_KEY) {

      addToast(

        "AI features are not configured. Please contact support.",

        "error",

      );

      return;

    }



    setIsLoading(true);

    setError(null);

    setMessages([]);



    try {

      const ai = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);

      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

      const memberNames = newMembers

        .map((m) => `${m["First Name"] || ""} ${m.Surname || ""}`.trim())

        .filter(Boolean);



      const prompt = `You are a friendly and welcoming church administrator for The Apostolic Church. Your task is to generate a short, personalized, and encouraging SMS message for each of the following new church members.



Guidelines:

- Keep each message under 160 characters to fit in a standard SMS.

- Start with a warm greeting addressing the member by their first name.

- Express joy that they have joined the church family.

- End with a warm closing, for example "God bless you." or "Welcome to the family!".

- Maintain a positive and uplifting tone.

- DO NOT add any extra text or explanation outside of the required JSON output.



Here are the new members to welcome: ${memberNames.join(", ")}`;



      const result = await model.generateContent({

        contents: [{ role: "user", parts: [{ text: prompt }] }],

        generationConfig: {

          responseMimeType: "application/json",

          responseSchema: {

            type: SchemaType.OBJECT,

            properties: {

              analysis: {

                type: SchemaType.ARRAY,

                items: {

                  type: SchemaType.OBJECT,

                  properties: {

                    memberName: { type: SchemaType.STRING, description: "The full name of the new church member." },

                    message: { type: SchemaType.STRING, description: "The personalized welcome SMS message for the member." },

                  },

                  required: ["memberName", "message"],

                },

              },

            },

            required: ["analysis"],

          },

        },

      });



      const response = result.response;

      const text = response.text();



      if (text) {

        const jsonResponse = JSON.parse(text);

        if (jsonResponse && Array.isArray(jsonResponse.analysis)) {

          setMessages(jsonResponse.analysis);

        } else {

          throw new Error("AI response was not a JSON object with an 'analysis' array.");

        }

      } else {

        throw new Error("AI response was empty.");

      }

    } catch (err) {

      console.error("Error generating outreach messages:", err);

      setError(

        "Sorry, I couldn't generate the messages. The AI might be busy. Please try again in a moment.",

      );

      addToast("Failed to generate outreach messages.", "error");

    } finally {

      setIsLoading(false);

    }

  };



  return (

    <section className="content-card">

      <h2 className="section-heading">

        <MessageSquareQuote size={22} className="mr-3 icon-primary" />

        AI Outreach Assistant

      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

        <div>

          <label htmlFor="outreach-target" className="form-label">

            Select Target Group

          </label>

          <select id="outreach-target" className="form-input-light w-full">

            <option>New Members (Souls Won) ({newMembers.length})</option>

          </select>

        </div>

        <div className="self-end">

          <Button

            onClick={handleGenerate}

            isLoading={isLoading}

            disabled={newMembers.length === 0 || isLoading}

            variant="secondary"

            fullWidth

          >

            Generate Welcome Messages

          </Button>

        </div>

      </div>

      <div className="mt-6 pt-6 border-t border-[var(--border-color)]">

        {isLoading && <OutreachSkeleton />}

        {error && (

          <div className="text-center py-6 text-[var(--danger-text)]">

            <AlertTriangle size={32} className="mx-auto mb-2" />

            <p>{error}</p>

          </div>

        )}

        {!isLoading && !error && messages.length > 0 && (

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">

            {messages.map((msg, index) => (

              <div

                key={index}

                className="p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-color)]"

              >

                <div className="flex justify-between items-center mb-2">

                  <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">

                    <Users size={16} /> {msg.memberName}

                  </h4>

                  <CopyButton content={msg.message} />

                </div>

                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">

                  {msg.message}

                </p>

              </div>

            ))}

          </div>

        )}

        {!isLoading && !error && messages.length === 0 && (

          <div className="text-center py-6 text-[var(--text-muted)]">

            {newMembers.length > 0

              ? "Click 'Generate' to create personalized welcome messages for your new members."

              : "No new members found in the current workspace. Upload and reconcile a new file to identify them."}

          </div>

        )}

      </div>

    </section>

  );

};

const AnalyticsSection: React.FC = () => {
  const {
    titheListData = [],
    currentAssembly,
    selectedDate,
    addToast,
    tithersCount,
    nonTithersCount,
    totalAmount,
    reconciliationReport,
  } = useOutletContext<AnalyticsSectionProps>();
  const { chatHistory, chartData, isLoading, error, startChat, sendMessage } =
    useGeminiChat();

  const handleAnalyzeClick = () => {
    if (!import.meta.env.VITE_API_KEY) {
      addToast("AI feature is not configured.", "error");
      return;
    }
    startChat(
      titheListData,
      currentAssembly,
      selectedDate,
      tithersCount,
      nonTithersCount,
      totalAmount,
    );
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    sendMessage(message);
  };

  const hasData = titheListData.length > 0;
  const hasChatStarted = chatHistory.length > 0;
  const aiSummary = chatHistory[0]?.summary;

  const suggestedPrompts = [
    "What are the key observations from this data?",
    "Suggest some potential actions based on these numbers.",
    "What if participation increased by 10%?",
    `How does ${currentAssembly || "this assembly"} compare to typical patterns?`,
  ];

  return (
    <div className="space-y-8">
      <AIOutreachAssistant
        reconciliationReport={reconciliationReport}
        addToast={addToast}
      />

      <section className="content-card">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2
            id="analytics-heading"
            className="section-heading border-none pb-0 mb-0"
          >
            <BotMessageSquare size={22} className="mr-3 icon-primary" />
            AI-Powered Analytics Chat
          </h2>
          <Button
            onClick={handleAnalyzeClick}
            disabled={!hasData || isLoading}
            isLoading={isLoading && !hasChatStarted}
            variant="primary"
          >
            {hasChatStarted
              ? `Restart Analysis for ${currentAssembly}`
              : "Analyze with AI"}
          </Button>
        </div>
      </section>

      <div className="min-h-[400px]">
        {error && (
          <div className="content-card text-center py-10 flex flex-col items-center">
            <AlertTriangle
              size={48}
              className="text-[var(--danger-text)] mb-4"
            />
            <h3 className="text-xl font-semibold text-[var(--danger-text)]">
              Analysis Failed
            </h3>
            <p className="text-[var(--text-secondary)] mt-2 max-w-md">
              {error}
            </p>
          </div>
        )}

        {!hasChatStarted && !isLoading && !error && (
          <div className="content-card text-center py-10 flex flex-col items-center animate-fadeIn">
            <BotMessageSquare
              size={52}
              className="mx-auto text-[var(--text-muted)] mb-4 opacity-50"
            />
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              Ready for Insights?
            </h3>
            <p className="text-[var(--text-secondary)] mt-2 max-w-md">
              {hasData
                ? `You have a list for ${currentAssembly} Assembly ready. Click "Analyze with AI" to start a conversation about your data.`
                : "Generate or load a tithe list in the Processor view, then come back here to get an AI-powered analysis."}
            </p>
          </div>
        )}

        {isLoading && !hasChatStarted && (
          <div className="content-card">
            <SkeletonLoader />
          </div>
        )}

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
              {chartData.length > 0 && (
                <div className="content-card animate-fadeIn">
                  <h3 className="section-heading text-base !mb-6">
                    Contribution Distribution
                  </h3>
                  <BarChart data={chartData} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsSection;
