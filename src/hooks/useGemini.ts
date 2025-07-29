

import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, Part } from '@google/genai';
import { TitheRecordB } from '../types';
import { formatDateDDMMMYYYY } from '../services/excelProcessor';
import { ChartData } from '../components/BarChart';

const API_KEY = import.meta.env.VITE_API_KEY;

export interface ChatMessage {
    role: 'user' | 'model';
    parts: Part[];
    isLoading?: boolean;
    summary?: string; // For the new proactive AI summary
}

export const useGeminiChat = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatRef = useRef<Chat | null>(null);

  const startChat = useCallback(async (
    data: TitheRecordB[],
    assemblyName: string | null,
    listDate: Date,
    tithersCount: number,
    nonTithersCount: number,
    totalAmount: number
  ) => {
    if (!API_KEY) {
      setError("API Key for Gemini is not configured. Please contact support.");
      return;
    }
    if (!data || data.length === 0) {
      setError("No data available to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setChatHistory([]);
    setChartData([]);
    chatRef.current = null;

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `You are an expert financial analyst for a church, acting as a helpful AI assistant named 'Dex'. You are in a chat with a user about their tithe data${assemblyName ? ` for the ${assemblyName} Assembly` : ''}.
          - Your tone should be encouraging, insightful, and professional.
          - Keep your responses concise and easy to read. Use markdown for formatting (bolding, lists).
          - When asked for analysis, ground your answers in the data provided.
          - For your very first message, you MUST provide a JSON object containing 'summary' and 'chartData'.
          - The 'summary' must be a concise, bulleted markdown string of the most important, actionable insights from the data provided. It should be 2-4 bullet points.
          - The 'chartData' should be an array of objects for contribution brackets, excluding the 'GHS 0' bracket. Each object needs a 'label' (string) and 'count' (number).
          - Structure your first response like this:
            \`\`\`json
            {
              "summary": "- **Participation:** 75% of members contributed this period.\\n- **Key Bracket:** The GHS 51-200 bracket had the most contributors.",
              "chartData": [ ... ]
            }
            \`\`\`
          - For all subsequent messages, respond conversationally as a helpful assistant without using the JSON format. Start your first conversational response with 'Hello! I've analyzed the data...'.`,
        },
      });
      setChat(newChat);
      chatRef.current = newChat;

      const totalRecords = data.length;
      const tithersPercentage = totalRecords > 0 ? ((tithersCount / totalRecords) * 100).toFixed(1) : "0.0";
      const avgContribution = tithersCount > 0 ? (totalAmount / tithersCount).toFixed(2) : "0.00";

      const brackets = { 'GHS 0': nonTithersCount, 'GHS 1-50': 0, 'GHS 51-200': 0, 'GHS 201-500': 0, 'GHS 501-1000': 0, 'GHS 1000+': 0 };
      data.forEach(r => {
        const amount = Number(r['Transaction Amount']) || 0;
        if (amount > 0) {
          if (amount <= 50) brackets['GHS 1-50']++;
          else if (amount <= 200) brackets['GHS 51-200']++;
          else if (amount <= 500) brackets['GHS 201-500']++;
          else if (amount <= 1000) brackets['GHS 501-1000']++;
          else brackets['GHS 1000+']++;
        }
      });
      const bracketDataString = JSON.stringify(brackets);

      const initialPrompt = `
        Here is the data summary for my analysis. Please provide the initial report in the required JSON format.
        - Assembly: ${assemblyName || 'Unknown'}
        - Transaction Date for List: ${formatDateDDMMMYYYY(listDate)}
        - Total Records: ${totalRecords}
        - Tithers (gave > 0): ${tithersCount} (${tithersPercentage}%)
        - Non-Tithers (gave 0): ${nonTithersCount}
        - Total Amount Collected: GHS ${totalAmount.toFixed(2)}
        - Average Contribution per Tither: GHS ${avgContribution}
        - Contribution Bracket Counts: ${bracketDataString}
      `;
      
      const response = await newChat.sendMessage({ message: initialPrompt });
      const responseText = response.text;
      
      let initialSummary = "I'm having trouble providing an initial analysis. Please try again.";
      try {
        let jsonStr = responseText.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        const parsedData = JSON.parse(jsonStr);
        if (parsedData.chartData) setChartData(parsedData.chartData);
        if (parsedData.summary) initialSummary = parsedData.summary;

        // Add the summary to the very first message in history
        setChatHistory([{ 
            role: 'model', 
            parts: [{ text: `Hello! I've analyzed the data for **${assemblyName || 'your assembly'}**. Ask me anything about it!` }], 
            summary: initialSummary 
        }]);

      } catch (e) {
          console.error("Failed to parse initial JSON response:", e);
          setError("AI response was not in the expected format. Displaying raw response.");
          setChatHistory([{ role: 'model', parts: [{ text: responseText }] }]);
      }
      
    } catch (e) {
      console.error("Gemini API Error:", e);
      setError("Failed to start chat with AI. The service may be unavailable. Please try again later.");
      setChatHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    const currentChat = chatRef.current;
    if (!currentChat) {
        setError("Chat is not initialized. Please start an analysis first.");
        return;
    }

    setIsLoading(true);
    const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
    const loadingMessage: ChatMessage = { role: 'model', parts: [{ text: '' }], isLoading: true };
    setChatHistory(prev => [...prev, newUserMessage, loadingMessage]);

    try {
        const stream = await currentChat.sendMessageStream({ message });
        let responseText = '';

        for await (const chunk of stream) {
            responseText += chunk.text;
            setChatHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: responseText }], isLoading: true };
                return newHistory;
            });
        }
        
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: responseText }] };
            return newHistory;
        });

    } catch(e) {
        console.error("Gemini Send Message Error:", e);
        const errorMessage = "Sorry, I encountered an error. Please try again.";
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: errorMessage }] };
            return newHistory;
        });
    } finally {
        setIsLoading(false);
    }
  }, []);

  return { chatHistory, chartData, isLoading, error, startChat, sendMessage };
};
