import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemberRecordA, TitheRecordB, ChatMessage, ChartData, MemberDatabase } from '../types';

export const useGemini = (apiKey: string, addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [validationReportContent, setValidationReportContent] = useState('');

  const generateValidationReport = async (originalData: MemberRecordA[]) => {
    if (!originalData || originalData.length === 0) {
      addToast('No data to analyze. Please upload a file first.', 'warning');
      return;
    }
    if (!apiKey) {
      addToast('AI features are not configured. Please contact support.', 'error');
      return;
    }

    setIsGeneratingReport(true);
    setValidationReportContent(''); // Clear previous report

    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const sampleData = originalData.slice(0, 50); // Use a sample
      const prompt = `
      You are a data quality analyst reviewing a church membership list. Analyze the following JSON data sample for quality issues. Provide a concise summary in markdown format. Focus on:
      - Rows with missing critical information (e.g., missing phone numbers, email, membership numbers). List the row number or name if possible.
      - Potential duplicates based on similar names or details.
      - Inconsistent formatting (e.g., in names, phone numbers, or addresses).
      - Any other logical inconsistencies you find.

      Do not suggest changes, just report the issues found. Start the report with a main heading "# Data Quality Report" and a brief summary of findings, then provide details under subheadings like "## Missing Information" or "## Potential Duplicates".

      Data Sample:\n\`\`\`json\n${JSON.stringify(sampleData, null, 2)}\n\`\`\`
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setValidationReportContent(response.text() ?? '');
    } catch (error) {
      console.error('Error generating validation report:', error);
      const errorMessage =
        'Sorry, I encountered an error while generating the report. Please check your connection or API configuration and try again.';
      setValidationReportContent(`# Error\n\n${errorMessage}`);
      addToast('Failed to generate AI report.', 'error');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const analyzeImage = async (imageFile: File): Promise<TitheRecordB[] | null> => {
    if (!apiKey) {
      addToast('AI features are not configured. Please contact support.', 'error');
      return null;
    }

    setIsGeneratingReport(true); // Reuse loading state or add a new one
    try {
      const { processTitheImage } = await import('../services/imageProcessor');
      const data = await processTitheImage(imageFile, apiKey);
      return data;
    } catch (error) {
      console.error('Error analyzing image:', error);
      addToast('Failed to analyze image. Please try again.', 'error');
      return null;
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return { isGeneratingReport, validationReportContent, generateValidationReport, analyzeImage };
};

export const useGeminiChat = (apiKey: string) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataContext, setDataContext] = useState<any>(null);

  // Initialize the chat with data context
  const initializeChat = useCallback((
    titheListData: TitheRecordB[],
    memberDatabase: MemberDatabase,
    currentAssembly: string
  ) => {
    // Create a minimized context to save tokens
    const context = {
      assembly: currentAssembly,
      summary: {
        totalTithe: titheListData.reduce((sum, r) => sum + Number(r["Transaction Amount"] || 0), 0),
        count: titheListData.length,
        date: new Date().toDateString(),
      },
      // Sample of recent records for context
      recentRecords: titheListData.slice(0, 50).map(r => ({
        name: r["Membership Number"], // Contains the name
        amount: r["Transaction Amount"],
        date: r["Transaction Date ('DD-MMM-YYYY')"]
      })),
      // Assembly stats
      assemblyStats: Object.entries(memberDatabase).map(([name, data]) => ({
        name,
        memberCount: data.data.length
      }))
    };
    setDataContext(context);

    // Add initial system message (invisible to user but sets behavior)
    setChatHistory([
      {
        role: "model",
        parts: [{ text: "Hello! I'm your TACTMS Assistant. I can help you analyze your tithe data, find trends, or answer questions about specific members. What would you like to know?" }],
      }
    ]);
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!dataContext) {
        setError("Chat not initialized with data.");
        return;
      }

      if (!apiKey) {
        setError("AI features are not configured. Please contact support.");
        return;
      }

      setIsLoading(true);
      setError(null);

      // Optimistically add user message
      const newHistory = [...chatHistory, { role: "user" as const, parts: [{ text: message }] }];
      setChatHistory(newHistory);

      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Construct the prompt with RAG-lite context
        const systemPrompt = `
        You are an intelligent data analyst for The Apostolic Church Tithe Management System (TACTMS).

        Current Data Context:
        ${JSON.stringify(dataContext, null, 2)}

        Your Goal: Answer the user's question based *strictly* on the provided data.

        Guidelines:
        - Be concise and professional.
        - If asked about "total tithe", use the summary data.
        - If asked about specific members, look at the 'recentRecords' sample.
        - If the answer isn't in the data, say "I don't have that information in my current view."
        - Format numbers as currency (GHS).
        - You can generate simple charts if asked. If the user asks for a chart, include a JSON block at the end of your response like this:
          \`\`\`json
          { "chartData": [{ "label": "A", "count": 10 }, ...] }
          \`\`\`
        `;

        const chat = model.startChat({
          history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Understood. I am ready to analyze the TACTMS data." }] },
            ...newHistory.map(msg => ({ role: msg.role, parts: msg.parts }))
          ]
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        // Check for chart data in the response
        const chartMatch = text.match(/```json\s*({[\s\S]*?})\s*```/);
        let cleanText = text;

        if (chartMatch) {
          try {
            const json = JSON.parse(chartMatch[1]);
            if (json.chartData) {
              setChartData(json.chartData);
              cleanText = text.replace(chartMatch[0], "").trim();
            }
          } catch (e) {
            console.error("Failed to parse chart data", e);
          }
        }

        setChatHistory(prev => [...prev, { role: "model", parts: [{ text: cleanText }] }]);
      } catch (e: any) {
        console.error("Chat Error:", e);
        setError(e.message || "Failed to get a response.");
        setChatHistory(prev => [...prev, { role: "model", parts: [{ text: "I encountered an error processing your request. Please try again." }] }]);
      } finally {
        setIsLoading(false);
      }
    },
    [chatHistory, dataContext],
  );

  return { chatHistory, chartData, isLoading, error, initializeChat, sendMessage };
};
