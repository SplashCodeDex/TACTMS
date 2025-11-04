import { useState, useCallback } from 'react';
import { GoogleGenerativeAI, Content, SchemaType } from '@google/generative-ai';
import { MemberRecordA, TitheRecordB, ChatMessage, ChartData } from '../types';

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

  return { isGeneratingReport, validationReportContent, generateValidationReport };
};

export const useGeminiChat = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startChat = useCallback(
    async (
      titheListData: TitheRecordB[],
      currentAssembly: string | null,
      selectedDate: Date,
      tithersCount: number,
      nonTithersCount: number,
      totalAmount: number,
    ) => {
      setIsLoading(true);
      setError(null);
      setChatHistory([]);
      setChartData([]);

      try {
        const ai = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
        const model = ai.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        You are a church financial analyst AI. Analyze the following tithe data and provide a summary and insights.
        - Assembly: ${currentAssembly}
        - Date: ${selectedDate.toDateString()}
        - Total Tithe: ${totalAmount}
        - Tithers: ${tithersCount}
        - Non-Tithers: ${nonTithersCount}
        - Data: ${JSON.stringify(
          titheListData.slice(0, 10),
        )} (first 10 rows)

        Provide a summary of the data and some key observations. Also, provide a data array for a chart showing the distribution of tithe amounts.
        `;

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                          type: SchemaType.OBJECT,
                          properties: {
                            summary: { type: SchemaType.STRING, description: "A summary of the tithe data and key observations." },
                            chartData: { type: SchemaType.ARRAY, description: "An array of objects for a chart showing the distribution of tithe amounts.", items: { type: SchemaType.OBJECT, properties: { label: { type: SchemaType.STRING }, count: { type: SchemaType.NUMBER } } } },
                          },
                          required: ["summary", "chartData"],
                        },
                      },
                    });        const response = await result.response;
        const text = response.text();

        const jsonResponse = JSON.parse(text);

        setChatHistory([
          {
            role: "model",
            parts: [{ text: jsonResponse.summary }],
            summary: jsonResponse.summary,
          },
        ]);
        setChartData(jsonResponse.chartData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      setError(null);
      const updatedChatHistory = [...chatHistory, { role: "user" as const, parts: [{ text: message }] }];
      setChatHistory(updatedChatHistory);

      try {
        const ai = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
        const model = ai.getGenerativeModel({ model: "gemini-pro" });
        
        const chat = model.startChat({
          history: updatedChatHistory
            .filter(msg => msg.role !== 'user' || msg.parts[0].text.trim() !== '') // Filter out empty user messages
            .map((msg) => ({
              role: msg.role,
              parts: msg.parts,
            })) as Content[],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        setChatHistory((prev) => [...prev, { role: "model", parts: [{ text }] }]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    },
    [chatHistory],
  );

  return { chatHistory, chartData, isLoading, error, startChat, sendMessage };
};
