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
  type: "email" | "sms" | "url" | "notification", 
  content: string,
  deepScan: boolean = false
): Promise<ScanResult> {
  const model = deepScan ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  const prompt = `Analyze the following ${type} content for phishing, scam attempts, or malicious threats. 
  The content provided might be a single message or an entire conversation thread.
  
  Content: ${content}
  
  Please perform a comprehensive security audit of this content. Look for:
  1. Psychological triggers (urgency, fear, greed, authority).
  2. Technical red flags (suspicious links, mismatched domains, spoofed headers if present).
  3. Structural anomalies (poor grammar, unusual formatting, generic greetings).
  4. Malicious intent (requests for PII, credentials, or financial transfers).
  
  Provide:
  - riskScore: A numeric score from 0 to 100 (0 = Safe, 100 = Critical Threat).
  - riskLevel: "Low", "Medium", or "High".
  - explanation: A clear, human-readable summary of the findings.
  - reasons: A list of specific indicators that led to this risk assessment.
  - safeAlternatives: Actionable advice for the user to stay safe.
  ${deepScan ? "- deepAnalysis: A detailed breakdown of the psychological tactics, technical indicators, and advanced threat intelligence context." : ""}`;

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

export interface ThreatIntel {
  title: string;
  trend: "Increasing" | "Stable" | "Decreasing";
  risk: "Low" | "Medium" | "High";
  description: string;
  sourceUrl: string;
}

export async function getEmergingThreats(): Promise<ThreatIntel[]> {
  const prompt = `Provide a list of 3-5 currently emerging phishing threats or cybersecurity trends as of March 2026. 
  For each threat, provide:
  - title: A short, catchy title.
  - trend: "Increasing", "Stable", or "Decreasing".
  - risk: "Low", "Medium", or "High".
  - description: A brief explanation of the threat.
  - sourceUrl: A real or plausible URL for more information.
  
  Focus on new tactics like AI-driven phishing, QR code scams, or specific brand impersonations active right now.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            trend: { type: Type.STRING, enum: ["Increasing", "Stable", "Decreasing"] },
            risk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            description: { type: Type.STRING },
            sourceUrl: { type: Type.STRING },
          },
          required: ["title", "trend", "risk", "description", "sourceUrl"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
}
