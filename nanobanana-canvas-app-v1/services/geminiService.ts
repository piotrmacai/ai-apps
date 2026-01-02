
import { GoogleGenAI, Type } from "@google/genai";
import { StructuredPrompt } from "../types";

// Always obtain API key from process.env.API_KEY and use it directly during initialization
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const extractBase64Data = (base64String: string) => {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return { mimeType: matches[1], data: matches[2] };
  }
  return null;
};

export const generateImageContent = async (
  prompt: string,
  base64Image?: string,
  aspectRatio: string = "1:1"
): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-2.5-flash-image'; // Nano Banana 2.5

  const parts: any[] = [];
  
  if (base64Image) {
    const imgData = extractBase64Data(base64Image);
    if (imgData) {
      parts.push({
        inlineData: imgData
      });
    }
  }

  // Text part
  parts.push({ text: prompt || "Generate an amazing creative image." });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    return extractImageFromResponse(response);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate image.");
  }
};

export const editImageContent = async (
  prompt: string,
  base64Image: string,
  base64Mask?: string
): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-2.5-flash-image';

  const parts: any[] = [];

  // 1. Original Image
  const imgData = extractBase64Data(base64Image);
  if (imgData) {
    parts.push({ inlineData: imgData });
  } else {
    throw new Error("Invalid base image data");
  }

  // 2. Mask Image (if provided)
  if (base64Mask) {
    const maskData = extractBase64Data(base64Mask);
    if (maskData) {
       parts.push({ inlineData: maskData });
    }
  }

  // 3. Text Prompt
  let finalPrompt = prompt;
  if (base64Mask) {
      finalPrompt += " (Edit the image based on the provided red mask area)";
  }
  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      }
    });

    return extractImageFromResponse(response);
  } catch (error: any) {
    console.error("Gemini Edit Error:", error);
    throw new Error(error.message || "Failed to edit image.");
  }
};

export const analyzeImageContent = async (base64Image: string): Promise<{ text: string; json: StructuredPrompt }> => {
  const ai = getAiClient();
  // Using gemini-3-flash-preview as recommended for basic text and multimodal tasks
  const model = 'gemini-3-flash-preview';

  const parts: any[] = [];
  
  const imgData = extractBase64Data(base64Image);
  if (imgData) {
    parts.push({ inlineData: imgData });
  } else {
    throw new Error("Invalid image data format");
  }

  const prompt = `
  Analyze this image and return a JSON object with two top-level keys:
  1. "fullDescription": A detailed descriptive text prompt (string).
  2. "structured": A structured object with the following specific fields:
     - subject
     - background
     - imageType
     - style
     - texture
     - colorPalette
     - lighting
     - additionalDetails
  
  Ensure all fields in "structured" are strings. Fill them with detailed observations from the image.
  `;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullDescription: { type: Type.STRING },
            structured: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                background: { type: Type.STRING },
                imageType: { type: Type.STRING },
                style: { type: Type.STRING },
                texture: { type: Type.STRING },
                colorPalette: { type: Type.STRING },
                lighting: { type: Type.STRING },
                additionalDetails: { type: Type.STRING },
              },
              required: ['subject', 'background', 'imageType', 'style', 'texture', 'colorPalette', 'lighting', 'additionalDetails']
            }
          },
          required: ['fullDescription', 'structured']
        }
      }
    });

    if (response.candidates && response.candidates.length > 0) {
        // Correct usage of .text getter
        const text = response.text || "{}";
        const jsonResponse = JSON.parse(text);
        
        const defaultJson: StructuredPrompt = {
            subject: "", background: "", imageType: "", style: "", texture: "", colorPalette: "", lighting: "", additionalDetails: ""
        };

        return {
            text: jsonResponse.fullDescription || "",
            json: { ...defaultJson, ...jsonResponse.structured }
        };
    }
    throw new Error("Empty response");
  } catch (error: any) {
    console.error("Gemini Analyze Error:", error);
    throw new Error(error.message || "Failed to analyze image.");
  }
};

const extractImageFromResponse = (response: any): string => {
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const contentParts = candidates[0].content.parts;
      for (const part of contentParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
      const textPart = contentParts.find((p: any) => p.text);
      if (textPart) {
        throw new Error(`Model returned text: ${textPart.text.substring(0, 100)}...`);
      }
    }
    throw new Error("No image data found in response.");
};
