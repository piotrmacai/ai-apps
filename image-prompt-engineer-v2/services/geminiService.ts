
import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { PROMPT_GENERATION_SYSTEM_INSTRUCTION } from '../constants';
import { structuredPromptToString, StructuredPrompt } from "../utils/promptUtils";

const getAiClient = (apiKey: string) => new GoogleGenAI({ apiKey });

export const generatePromptFromImage = async (apiKey: string, imageBase64: string, mimeType: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  
  const imagePart: Part = {
    inlineData: {
      mimeType: mimeType,
      data: imageBase64,
    },
  };

  const textPart: Part = {
    text: "Analyze this image and generate a structured prompt based on your system instructions."
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [textPart, imagePart] },
      config: {
        systemInstruction: PROMPT_GENERATION_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });
    
    if (!response.candidates || response.candidates.length === 0) {
        throw new Error("The model returned no content.");
    }

    let jsonText = response.text.trim();
    const structuredResult: StructuredPrompt = JSON.parse(jsonText);
    return structuredPromptToString(structuredResult);

  } catch (error) {
    console.error("Error in generatePromptFromImage:", error);
    throw error;
  }
};

export const editImageWithPrompt = async (apiKey: string, prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
  const ai = getAiClient(apiKey);
  const imagePart: Part = { inlineData: { data: imageBase64, mimeType: mimeType } };
  const textPart: Part = { text: `Generate an image matching this description: ${prompt}` };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
    });

    if (!response.candidates?.[0]?.content?.parts) throw new Error("Empty response");

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.mimeType.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image returned.");
  } catch (error) {
    console.error("Error in editImageWithPrompt:", error);
    throw error;
  }
};

export const refinePromptWithAI = async (
  apiKey: string,
  currentPrompt: StructuredPrompt,
  userInstruction: string
): Promise<StructuredPrompt> => {
  const ai = getAiClient(apiKey);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Current Prompt: ${JSON.stringify(currentPrompt)}\nUser Request: ${userInstruction}`,
    config: {
      systemInstruction: `You are an expert Image Prompt Engineer. 
      Your task is to modify the provided StructuredPrompt JSON based on the user's natural language request.
      - ONLY modify fields mentioned or implied by the user request.
      - Maintain high quality and artistic coherence.
      - Return the FULL updated JSON object.
      - Ensure all keys exist: subject, background, imageType, style, texture, colorPalette, lighting, additionalDetails.`,
      responseMimeType: 'application/json',
    },
  });

  try {
    return JSON.parse(response.text) as StructuredPrompt;
  } catch (e) {
    console.error("Failed to parse AI refined prompt", e);
    return currentPrompt;
  }
};
