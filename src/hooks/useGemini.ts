import { useState, useCallback } from 'react';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { MemberRecordA, TitheRecordB, ChatMessage, ChartData, MemberDatabase } from '@/types';

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
      const model = ai.getGenerativeModel({ model: "gemini-2.5-pro" });
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

  const analyzeImage = async (imageFile: File, month?: string, week?: string, dateString?: string): Promise<TitheRecordB[] | null> => {
    if (!apiKey) {
      addToast('AI features are not configured. Please contact support.', 'error');
      return null;
    }

    // Validate required parameters for enhanced extraction
    if (!month || !week || !dateString) {
      addToast('Please select month, week, and date for extraction.', 'warning');
      return null;
    }

    setIsGeneratingReport(true);
    try {
      // Use the enhanced processor with validation
      const { processTitheImageWithValidation } = await import('../services/imageProcessor');
      const { validateTitheBookImage: preValidate } = await import('../services/imageValidator');

      // Pre-validate the image
      const preValidation = await preValidate(imageFile);
      if (!preValidation.isValid) {
        addToast(preValidation.errors.join('. '), 'error');
        return null;
      }
      if (preValidation.warnings.length > 0) {
        addToast(preValidation.warnings[0], 'warning');
      }

      // Process with enhanced function
      const result = await processTitheImageWithValidation(
        imageFile,
        apiKey,
        month,
        week,
        dateString
      );

      // Provide feedback based on validation
      if (!result.isValidTitheBook) {
        addToast('Warning: Image may not match expected Tithe Book format.', 'warning');
      }

      if (result.detectedYear) {
        addToast(`Detected year: ${result.detectedYear}`, 'info');
      }

      if (result.lowConfidenceCount > 0) {
        addToast(
          `${result.lowConfidenceCount} entries have low confidence and may need review.`,
          'warning'
        );
      }

      addToast(`Extracted ${result.entries.length} tithe records.`, 'success');
      return result.entries;

    } catch (error: any) {
      console.error('Error analyzing image:', error);
      addToast(error.message || 'Failed to analyze image. Please try again.', 'error');
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
    // We store the full data in a ref or state to access it during tool execution
    // For simplicity, we'll keep it in state here, but in a real app with huge data,
    // we might want to use a ref or external store.
    setDataContext({
      titheListData,
      memberDatabase,
      currentAssembly
    });

    setChatHistory([
      {
        role: "model",
        parts: [{ text: "Hello! I'm your TACTMS Assistant. I have access to your full database. You can ask me about specific members, tithe statistics, or trends. What would you like to know?" }],
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
        // Use Gemini 2.5 Pro for better tool use capabilities
        const model = ai.getGenerativeModel({
          model: "gemini-2.5-pro",
          systemInstruction: `
            You are an intelligent data analyst for The Apostolic Church Tithe Management System (TACTMS).
            Your Goal: Answer the user's question based *strictly* on the provided data via tools.

            Guidelines:
            - Be concise and professional.
            - Format numbers as currency (GHS).
            - You can generate simple charts if asked. If the user asks for a chart, include a JSON block at the end of your response like this:
              \`\`\`json
              { "chartData": [{ "label": "A", "count": 10 }, ...] }
              \`\`\`
            `,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "get_member_details",
                  description: "Search for a member by name or ID to get their full details and recent tithe history.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      search_term: { type: SchemaType.STRING, description: "Name or Membership ID of the member" }
                    },
                    required: ["search_term"]
                  }
                },
                {
                  name: "get_tithe_stats",
                  description: "Get total tithe statistics for a specific period (month/year) or overall.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      month: { type: SchemaType.STRING, description: "Month name (e.g., January)" },
                      year: { type: SchemaType.STRING, description: "Year (e.g., 2024)" }
                    }
                  }
                },
                {
                  name: "find_top_tithers",
                  description: "Find the top contributors for a given period.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      limit: { type: SchemaType.NUMBER, description: "Number of members to return (default 5)" },
                      year: { type: SchemaType.STRING, description: "Year to filter by" }
                    }
                  }
                }
              ]
            }
          ]
        });

        const chat = model.startChat({
          history: newHistory.map(msg => ({ role: msg.role, parts: msg.parts }))
        });

        let result = await chat.sendMessage(message);
        let response = await result.response;
        let functionCalls = response.functionCalls();

        // Loop to handle multiple function calls if needed
        while (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0]; // Handle first call
          const { name, args } = call;

          let toolResult = {};

          // Execute tools locally
          if (name === "get_member_details") {
            const searchTerm = (args as any).search_term.toLowerCase();
            // Search in member database
            let foundMember = null;
            let memberId = "";

            // Search logic
            for (const [, list] of Object.entries(dataContext.memberDatabase as MemberDatabase)) {
              const match = list.data.find((m: MemberRecordA) =>
                String(m["Membership Number"]).toLowerCase().includes(searchTerm) ||
                `${m["First Name"]} ${m.Surname}`.toLowerCase().includes(searchTerm)
              );
              if (match) {
                foundMember = match;
                memberId = String(match["Membership Number"]);
                break;
              }
            }

            if (foundMember) {
              // Get recent tithes
              const tithes = (dataContext.titheListData as TitheRecordB[])
                .filter(t => String(t["Membership Number"]).includes(memberId))
                .slice(0, 5);

              toolResult = { member: foundMember, recent_tithes: tithes };
            } else {
              toolResult = { error: "Member not found" };
            }
          } else if (name === "get_tithe_stats") {
            const month = (args as any).month;
            const year = (args as any).year;

            let filtered = dataContext.titheListData as TitheRecordB[];
            if (year) {
              filtered = filtered.filter(t => String(t["Transaction Date ('DD-MMM-YYYY')"]).includes(year));
            }
            if (month) {
              filtered = filtered.filter(t => String(t["Transaction Date ('DD-MMM-YYYY')"]).toLowerCase().includes(month.toLowerCase()));
            }

            const total = filtered.reduce((sum, t) => sum + Number(t["Transaction Amount"] || 0), 0);
            const count = filtered.length;
            toolResult = { total_amount: total, transaction_count: count, period: `${month || 'All'} ${year || 'All'}` };

          } else if (name === "find_top_tithers") {
            const limit = (args as any).limit || 5;
            const year = (args as any).year;

            let filtered = dataContext.titheListData as TitheRecordB[];
            if (year) {
              filtered = filtered.filter(t => String(t["Transaction Date ('DD-MMM-YYYY')"]).includes(year));
            }

            // Group by member
            const totals: Record<string, number> = {};
            filtered.forEach(t => {
              const id = String(t["Membership Number"]);
              totals[id] = (totals[id] || 0) + Number(t["Transaction Amount"] || 0);
            });

            const sorted = Object.entries(totals)
              .sort(([, a], [, b]) => b - a)
              .slice(0, limit)
              .map(([id, amount]) => ({ id, amount }));

            toolResult = { top_tithers: sorted };
          }

          // Send tool result back to model
          result = await chat.sendMessage([
            {
              functionResponse: {
                name: name,
                response: toolResult
              }
            }
          ]);
          response = await result.response;
          functionCalls = response.functionCalls();
        }

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
    [chatHistory, dataContext, apiKey],
  );

  return { chatHistory, chartData, isLoading, error, initializeChat, sendMessage };
};
