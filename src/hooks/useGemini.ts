import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { MemberRecordA, TitheRecordB, ChatMessage, ChartData, MemberDatabase, TransactionLogEntry } from '@/types';
import type { TitheImageExtractionResult } from '@/services/imageProcessor';
import { GEMINI_MODEL_NAME } from '@/constants';
import { buildDataContext, buildPromptContext } from '@/services/queryTemplates';
import { generatePredictions } from '@/services/predictiveAnalytics';
import type { AnalyticsSummary, Prediction } from '@/services/predictiveAnalytics';
import { chatCache } from '@/services/chatCache';
import { useToast } from '@/context';

export const useGemini = (apiKey: string) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [validationReportContent, setValidationReportContent] = useState('');
  const addToast = useToast();

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
      const model = ai.getGenerativeModel({ model: GEMINI_MODEL_NAME });
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

  const analyzeImage = async (imageFile: File, month?: string, week?: string, dateString?: string, memberDatabase?: MemberRecordA[]): Promise<TitheImageExtractionResult | null> => {
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
      const { processTitheImageWithValidation, verifyLowConfidenceEntries } = await import('../services/imageProcessor');
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
      let result = await processTitheImageWithValidation(
        imageFile,
        apiKey,
        month,
        week,
        dateString,
        undefined, // transactionLogs
        'auto',    // forceMode
        memberDatabase // Pass memberDatabase for optimal matching
      );

      // Provide feedback based on validation
      if (!result.isValidTitheBook && !result.isNotebookFormat) {
        addToast('Warning: Image may not match expected Tithe Book format.', 'warning');
      }

      // Notify if notebook format was detected
      if (result.isNotebookFormat) {
        addToast(`📓 Notebook format detected with ${result.entries.length} entries.`, 'info');
      }

      if (result.detectedYear) {
        addToast(`Detected year: ${result.detectedYear}`, 'info');
      }

      // Auto-verify low-confidence entries with a second pass
      if (result.lowConfidenceCount > 0) {
        addToast(
          `${result.lowConfidenceCount} entries have low confidence. Running verification pass...`,
          'warning'
        );

        // Run multi-pass verification
        const verifiedEntries = await verifyLowConfidenceEntries(
          imageFile,
          apiKey,
          result.entries,
          month,
          week
        );

        // Count how many were corrected
        const correctedCount = result.entries.filter((e, i) =>
          e["Transaction Amount"] !== verifiedEntries[i]["Transaction Amount"]
        ).length;

        if (correctedCount > 0) {
          addToast(`AI corrected ${correctedCount} entries during verification.`, 'success');
        }

        result = { ...result, entries: verifiedEntries };
      }

      addToast(`Extracted ${result.entries.length} tithe records.`, 'success');
      return result;  // Return full result including isNotebookFormat and notebookMetadata

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
  // We keep chartData separated but also integrate it into messages for the new UI
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataContext, setDataContext] = useState<any>(null);
  const dataContextRef = useRef(dataContext);
  const addToast = useToast();

  useEffect(() => {
    dataContextRef.current = dataContext;
  }, [dataContext]);

  const initializeChat = useCallback(async (
    titheListData: TitheRecordB[],
    memberDatabase: MemberDatabase,
    currentAssembly: string,
    transactionLogs?: TransactionLogEntry[]
  ) => {
    const enrichedContext = transactionLogs
      ? buildDataContext(titheListData, transactionLogs, memberDatabase, currentAssembly)
      : null;

    setDataContext({
      titheListData,
      memberDatabase,
      currentAssembly,
      enrichedContext
    });

    // Generate AI-powered predictions if we have enough data
    let analytics: AnalyticsSummary | null = null;
    if (transactionLogs && transactionLogs.length >= 2 && memberDatabase) {
      try {
        analytics = await generatePredictions(transactionLogs, memberDatabase, apiKey);
      } catch (e) {
        console.warn('Failed to generate predictions:', e);
      }
    }

    // Build health score badge
    const healthEmoji = analytics
      ? analytics.healthScore >= 70 ? '✅' : analytics.healthScore >= 40 ? '⚠️' : '🔴'
      : '';
    const healthBadge = analytics
      ? `**Health Score:** ${healthEmoji} ${analytics.healthScore}/100`
      : '';

    // Get top prediction
    const topPrediction = analytics?.predictions[0];
    const predictionLine = topPrediction
      ? `- 🔮 **AI Insight:** ${topPrediction.message}${topPrediction.actionable && topPrediction.action ? ` → *${topPrediction.action}*` : ''}`
      : '';

    const initialMessage = enrichedContext && transactionLogs && transactionLogs.length > 0
      ? `### 🌤️ Good day! I've analyzed your ${currentAssembly} data.

${healthBadge}

**Quick Insights:**
- 📈 **Trend:** ${enrichedContext.currentMonthTotal > enrichedContext.lastMonthTotal ? "Tithes are **up**" : "Tithes are **down**"} compared to last month.
- 👥 **Engagement:** ${enrichedContext.currentWeekTithers} members tithed this week.
- 💰 **Total:** GHS ${enrichedContext.currentMonthTotal.toLocaleString()} collected this month.
${predictionLine}

I'm ready to dive deeper. Try asking:`
      : "### 👋 Hello! I'm connected to your TACTMS database.\n\nI can help you audit members, track trends, or find specific transactions. What would you like to start with?";

    // Dynamic suggestions based on predictions
    const dynamicSuggestions = topPrediction?.actionable && topPrediction?.action
      ? [topPrediction.action, "Show top 5 tithers", "What is the weekly trend?"]
      : enrichedContext
        ? ["Show top 5 tithers", "What is the weekly trend?", "Find inactive members"]
        : ["Load tithe data", "Show all members"];

    setChatHistory([
      {
        role: "model",
        parts: [{ text: initialMessage }],
        summary: enrichedContext ? buildPromptContext(enrichedContext) : undefined,
        suggestions: dynamicSuggestions
      }
    ]);
  }, [apiKey]);

  const sendMessageStream = useCallback(
    async (message: string) => {
      const currentDataContext = dataContextRef.current;
      if (!currentDataContext) {
        const msg = "I'm not connected to your data yet. Please try refreshing the page or loading a file.";
        setError(msg);
        addToast(msg, "error");
        return;
      }
      if (!apiKey) {
        const msg = "AI features are not configured. Please contact support.";
        setError(msg);
        addToast(msg, "error");
        return;
      }

      setIsLoading(true);
      setError(null);
      setChartData([]); // Clear previous chart data

      // Add user message to history
      const userMessage: ChatMessage = { role: "user", parts: [{ text: message }] };
      setChatHistory(prev => [...prev, userMessage]);

      // Check cache for instant response
      const cached = chatCache.get(message);
      if (cached) {
        // Return cached response instantly
        setChatHistory(prev => [...prev, {
          role: "model",
          parts: [{ text: `⚡ ${cached.response}` }],
          suggestions: cached.suggestions
        }]);
        setIsLoading(false);
        addToast("Instant response from cache", "info");
        return;
      }

      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({
          model: GEMINI_MODEL_NAME,
          systemInstruction: `
            You are an intelligent data analyst for The Apostolic Church Tithe Management System (TACTMS).
            Your Goal: Answer the user's question based *strictly* on the provided data via tools.
            Guidelines:
            - Be concise and professional.
            - Format numbers as currency (GHS).
            - Use Markdown for tables and lists.
            - You can generate simple charts if asked. If the user asks for a chart, include a JSON block at the end of your response.
            - You MUST suggest 3 relevant follow-up actions or questions for the user after EVERY response in a JSON block.
            - When showing details for a specific member, ALWAYS include an "entityCard" object in the JSON block with their key details.

            Format your response like this:
            [Your markdown response here]

            \`\`\`json
            {
            "chartData": [{ "label": "A", "count": 10 }, ...],
            "suggestions": ["Drill down", "Show similar members"],
            "entityCard": {
              "type": "member",
              "title": "John Doe",
              "subtitle": "Elder - Assembly Name",
              "details": [
                { "label": "Membership ID", "value": "12345" },
                { "label": "Phone", "value": "024..." },
                { "label": "Status", "value": "Active" }
              ],
              "id": "12345"
            }
            }
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

        // Prepare history for API (Use the FIX: remove first model message)
        // Note: We need to use a snapshot of chatHistory here, but since we just added the user message
        // via setState, we can reconstruct it directly to avoid stale closure issues
        const currentHistory = chatHistory; // This is from the closure, but we'll handle it
        const apiHistory = currentHistory
          .filter((msg, index) => !(index === 0 && msg.role === 'model'))
          .map(msg => ({ role: msg.role, parts: msg.parts }));

        const chat = model.startChat({ history: apiHistory });

        const result = await chat.sendMessageStream(message);

        let accumulatedText = "";

        // Create a placeholder for the model's response
        setChatHistory(prev => [...prev, { role: "model", parts: [{ text: "" }] }]);

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          accumulatedText += chunkText;

          setChatHistory(prev => {
            const newHist = [...prev];
            // Update the last message (the model's response)
            // Note: In streaming, we might get multiple chunks.
            // We blindly update the last message which we just added.
            if (newHist.length > 0) {
              newHist[newHist.length - 1] = {
                role: "model",
                parts: [{ text: accumulatedText }]
              };
            }
            return newHist;
          });
        }

        // Wait for the full response to complete to check for function calls
        // Note: sendMessageStream doesn't easily support function calling in the same flow
        // effectively without some complexity.
        // However, the standard JS SDK handles function calls in the result object *after* streaming if configured,
        // or we might need to use standard sendMessage if we expect tools.
        // LIMITATION: Streaming with tools is tricky.
        // For now, let's Stick to standard sendMessage for TOOLS execution, but maybe we can simulate streaming?
        // Or, we use sendMessage for logic and assume tools are quick, then stream the *text* response?
        // Actually, let's revert to sendMessage for robust tool support but update UI to 'simulate' typing if we can't easily stream tools.
        // WAIT. The prompt said "much better" = streaming.
        // Let's try to check if we can get function calls from the stream response.
        // The SDK docs say `result.response` (awaitable) will contain function calls.

        const response = await result.response;
        const functionCalls = response.functionCalls();

        // If function calls exist, we need to handle them.
        // If we handled them, we might need to send another message to get the text result.
        // This makes streaming the *initial* response slightly disjointed if it's just a tool call.

        if (functionCalls && functionCalls.length > 0) {
          // ... handle function calls (logic copied from previous) ...
          // Since we are in streaming mode, the 'text' might be empty or partial.
          // We need to execute tools and then ask model to generate response based on tools.
          // This SECOND response should be streamed.

          // Loop to handle multiple function calls
          let currentFunctionCalls = functionCalls;
          while (currentFunctionCalls && currentFunctionCalls.length > 0) {
            const call = currentFunctionCalls[0];
            const { name, args } = call;
            let toolResult = {};

            // Execute tools locally (logic reused)
            if (name === "get_member_details") {
              const searchTerm = (args as any).search_term?.toLowerCase() || "";
              let foundMember = null;
              let memberId = "";
              if (currentDataContext.memberDatabase) {
                for (const [, list] of Object.entries(currentDataContext.memberDatabase as MemberDatabase)) {
                  if (!list?.data) continue;
                  const match = list.data.find((m: MemberRecordA) => {
                    const id = String(m["Membership Number"] || "").toLowerCase();
                    const fullName = `${m["First Name"] || ""} ${m.Surname || ""} ${m["Other Names"] || ""}`.toLowerCase();
                    return id.includes(searchTerm) || fullName.includes(searchTerm);
                  });
                  if (match) {
                    foundMember = match;
                    memberId = String(match["Membership Number"]);
                    break;
                  }
                }
              }
              if (foundMember) {
                const tithes = (currentDataContext.titheListData as TitheRecordB[])
                  .filter(t => String(t["Membership Number"]).includes(memberId))
                  .slice(0, 5);
                toolResult = { member: foundMember, recent_tithes: tithes };
              } else {
                toolResult = { error: "Member not found" };
              }
            } else if (name === "get_tithe_stats") {
              const month = (args as any).month;
              const year = (args as any).year;
              let filtered = currentDataContext.titheListData as TitheRecordB[];
              if (year) filtered = filtered.filter(t => String(t["Transaction Date ('DD-MMM-YYYY')"]).includes(year));
              if (month) filtered = filtered.filter(t => String(t["Transaction Date ('DD-MMM-YYYY')"]).toLowerCase().includes(month.toLowerCase()));

              const totalAmount = filtered.reduce((sum, t) => {
                const val = t["Transaction Amount"];
                // Handle string numbers like "1,200.00" safely
                const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
                return sum + num;
              }, 0);

              toolResult = { total_amount: totalAmount, transaction_count: filtered.length, period: `${month || 'All'} ${year || 'All'}` };
            } else if (name === "find_top_tithers") {
              const limit = Number((args as any).limit) || 5;
              const year = (args as any).year;
              let filtered = currentDataContext.titheListData as TitheRecordB[];
              if (year) filtered = filtered.filter(t => String(t["Transaction Date ('DD-MMM-YYYY')"]).includes(year));

              const totals: Record<string, number> = {};
              filtered.forEach(t => {
                const id = String(t["Membership Number"]);
                const val = t["Transaction Amount"];
                const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
                totals[id] = (totals[id] || 0) + num;
              });

              const sorted = Object.entries(totals)
                .sort(([, a], [, b]) => b - a)
                .slice(0, limit)
                .map(([id, amount]) => ({ id, amount }));

              toolResult = { top_tithers: sorted };
            }

            // Send tool result back to model and STREAM the response
            const toolResultStream = await chat.sendMessageStream([
              {
                functionResponse: {
                  name: name,
                  response: toolResult
                }
              }
            ]);

            // Clear the "accumulated" text from the *tool call* generation step if any (usually empty for tool calls)
            // Actually, we want to start a NEW stream for the answer.
            // The previous 'response' (which was just a function call) might have had no text.

            accumulatedText = "";
            for await (const chunk of toolResultStream.stream) {
              const chunkText = chunk.text();
              accumulatedText += chunkText;
              setChatHistory(prev => {
                const newHist = [...prev];
                if (newHist.length > 0) {
                  newHist[newHist.length - 1] = { role: "model", parts: [{ text: accumulatedText }] };
                }
                return newHist;
              });
            }

            const toolResponse = await toolResultStream.response;
            currentFunctionCalls = toolResponse.functionCalls() || [];
          }
        }

        // Final pass for charts, suggestions, and entity cards
        // Regex to match JSON block with optional "json" tag and case-insensitive
        const jsonMatch = accumulatedText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
        if (jsonMatch) {
          try {
            const json = JSON.parse(jsonMatch[1]);
            let update: Partial<ChatMessage> = {};

            if (json.chartData) {
              setChartData(json.chartData);
            }

            if (json.suggestions && Array.isArray(json.suggestions)) {
              update.suggestions = json.suggestions;
            }

            if (json.entityCard) {
              update.entityCard = json.entityCard;
            }

            // Clean the text in the message
            const cleanText = accumulatedText.replace(jsonMatch[0], "").trim();
            update.parts = [{ text: cleanText }];

            // Store in cache for future instant responses
            chatCache.set(message, cleanText, json.suggestions);

            setChatHistory(prev => {
              const newHist = [...prev];
              if (newHist.length > 0) {
                newHist[newHist.length - 1] = {
                  ...newHist[newHist.length - 1],
                  ...update,
                  role: "model"
                };
              }
              return newHist;
            });
          } catch (e) {
            console.error("Failed to parse JSON data from model", e);
          }
        } else {
          // No JSON found, cache the raw response
          chatCache.set(message, accumulatedText.trim());
        }

      } catch (e: any) {
        console.error("Chat Error:", e);
        const msg = e.message || "Failed to get a response.";
        setError(msg);
        addToast(msg, "error");
        setChatHistory(prev => [...prev, { role: "model", parts: [{ text: "I encountered an error processing your request. Please try again." }] }]);
      } finally {
        setIsLoading(false);
      }
    },
    [chatHistory, dataContext, apiKey],
  );

  return { chatHistory, chartData, isLoading, error, initializeChat, sendMessage: sendMessageStream };
};
