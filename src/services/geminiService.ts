import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ScanResult {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  explanation: string;
  reasons: string[];
  safeAlternatives: string[];
  deepAnalysis?: string;
}

export async function analyzeContent(
  type: "email" | "sms" | "url", 
  content: string,
  deepScan: boolean = false
): Promise<ScanResult> {
  const model = deepScan ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  const prompt = `Analyze the following ${type} for phishing or scam attempts:
  
  Content: ${content}
  
  Provide a risk score (0-100), risk level (Low, Medium, High), a human-readable explanation, a list of specific reasons for the flag, and safe alternatives for the user.
  ${deepScan ? "Since this is a DEEP SCAN, provide an additional 'deepAnalysis' field with a detailed breakdown of the psychological tactics, technical indicators, and advanced threat intelligence context." : ""}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      thinkingConfig: deepScan ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.NUMBER },
          riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          explanation: { type: Type.STRING },
          reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
          safeAlternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
          deepAnalysis: { type: Type.STRING },
        },
        required: ["riskScore", "riskLevel", "explanation", "reasons", "safeAlternatives"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
