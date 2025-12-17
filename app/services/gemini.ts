import { GoogleGenAI, GenerateContentResponse, Type, Chat } from "@google/genai";
import { GVA_10_YEAR_REVIEW, MOCK_DATA } from "../constants";

// Helper to get fresh AI instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Generates a high-quality data report using Gemini 3 Flash with Google Search grounding.
 * Summarizes key trends: frequent locations, average casualties, and temporal patterns.
 */
export const generateEnhancedDataReport = async (): Promise<{ text: string; sources: any[] }> => {
  try {
    const ai = getAI();
    const aggregateData = JSON.stringify(GVA_10_YEAR_REVIEW, null, 2);
    const recentData = JSON.stringify(MOCK_DATA, null, 2);
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          text: `You are a Senior Data Analyst specializing in public safety. 
          Analyze the following GVA datasets:
          
          1. 10-YEAR AGGREGATE REVIEW: ${aggregateData}
          2. RECENT INCIDENT SAMPLE: ${recentData}
          
          Provide a comprehensive Markdown report that includes:
          - A summary of key trends over the last decade.
          - Analysis of most frequent states/cities mentioned in recent reports vs historical hotspots.
          - Calculation/estimation of average casualties per year and per incident based on provided data.
          - Temporal patterns (e.g., year-over-year shifts, seasonal peaks).
          
          Use Google Search to cross-reference these findings with current national safety reports or legislative changes that might explain these patterns.
          
          Format with clear headings, bullet points, and a concluding executive summary.`
        }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });

    return {
      text: response.text || "No analysis available.",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Enhanced Report Error:", error);
    return { text: "Error generating report. Please check your API key and connection.", sources: [] };
  }
};

/**
 * Maps Grounding Service: Finds safety resources or hospitals based on location.
 */
export const findLocalSafetyResources = async (lat?: number, lng?: number): Promise<{ text: string; sources: any[] }> => {
  try {
    const ai = getAI();
    const locationPrompt = lat && lng 
      ? `Near my current location (Lat: ${lat}, Lng: ${lng})`
      : "In major US metropolitan areas";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find 5 highly-rated community safety centers, trauma support groups, or victim advocate offices ${locationPrompt}. Provide their details and why they are important for public safety.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: lat && lng ? {
            latLng: { latitude: lat, longitude: lng }
          } : undefined
        }
      },
    });

    return {
      text: response.text || "No resources found.",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Error finding local resources.", sources: [] };
  }
};

/**
 * Pro Chat Session for complex research questions.
 */
let currentChat: Chat | null = null;

export const startProChat = () => {
  const ai = getAI();
  currentChat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are the GVA Data Architect, an elite AI expert in public safety, criminology, and data science. 
      You have access to a 10-year dataset of gun violence metrics and a sample of recent incidents.
      Your goal is to provide deep, evidence-based, and compassionate analysis. 
      When asked about data methodology, explain the scraping process (Selenium/BeautifulSoup) and the importance of data normalization.
      Always maintain a professional and analytical tone.`,
    },
  });
  return currentChat;
};

export const sendChatMessage = async (message: string) => {
  if (!currentChat) startProChat();
  try {
    const response = await currentChat!.sendMessage({ message });
    return response.text || "No response received from the model.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "The AI Expert is currently unavailable. Please check your configuration.";
  }
};