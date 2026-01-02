import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { AspectRatio, ImageResolution } from '../types';

// Initialize the API client
// Using process.env.API_KEY as the standard environment variable for the platform
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ReferenceImages {
  product?: string;
  model?: string;
  background?: string;
}

// Configuration to reduce safety blocks for legitimate fashion content
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
];

/**
 * Helper to extract mime type and base64 data correctly.
 */
const processBase64 = (base64String: string) => {
  const mimeMatch = base64String.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const data = base64String.replace(/^data:([^;]+);base64,/, '');
  return { mimeType, data };
};

/**
 * Safely extracts the image data from a Gemini GenerateContentResponse.
 * Uses rigorous checking to prevent "Cannot read properties of undefined" errors.
 * Handles safety errors gracefully.
 */
const extractImageFromResponse = (response: GenerateContentResponse): string => {
  if (!response) {
    throw new Error("Generation failed: No response received from API.");
  }

  // Check for prompt feedback (safety blocks)
  if (response.promptFeedback && response.promptFeedback.blockReason) {
    throw new Error(`Safety Block: ${response.promptFeedback.blockReason}`);
  }

  if (!response.candidates || !Array.isArray(response.candidates) || response.candidates.length === 0) {
    throw new Error("Generation failed: No candidates returned from model.");
  }

  const candidate = response.candidates[0];

  // Check if candidate is valid
  if (!candidate) {
    throw new Error("Generation failed: Candidate is undefined.");
  }

  // Check content existence safely
  if (!candidate.content) {
    // Handle specific finish reasons cleanly
    if (candidate.finishReason) {
      if (candidate.finishReason === 'IMAGE_OTHER' || candidate.finishReason === 'SAFETY') {
        throw new Error("Safety Block");
      }
      if (candidate.finishReason !== 'STOP') {
         throw new Error(`Generation stopped. Reason: ${candidate.finishReason}`);
      }
    }
    throw new Error("Generation failed: Response contained no content.");
  }

  // Check parts existence safely
  if (!candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
    throw new Error("Generation failed: Content has no parts.");
  }

  // Iterate to find the image part
  for (const part of candidate.content.parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  // If we got here, there was content but no image data
  throw new Error("Generation completed but no image data was found in the response.");
};

/**
 * Generate a high-quality fashion image using Gemini.
 * Supports switching between Gemini 2.5 Flash (Nano Banana) and Gemini 3 Pro (Nano Banana Pro).
 * Includes auto-retry logic for safety blocks.
 */
export const generateFashionImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  resolution: ImageResolution,
  references: ReferenceImages,
  modelVersion: '2.5' | '3' = '2.5'
): Promise<string> => {
  
  // Helper to execute generation
  const executeGen = async (promptText: string) => {
    const parts: any[] = [];

    // Construct the multimodal prompt with labeled references
    if (references.product) {
      const { mimeType, data } = processBase64(references.product);
      parts.push({ text: "Primary Product Reference (You MUST feature this item):" });
      parts.push({
        inlineData: { mimeType, data }
      });
    }

    if (references.model) {
      const { mimeType, data } = processBase64(references.model);
      parts.push({ text: "Model Reference (Use this person/pose):" });
      parts.push({
        inlineData: { mimeType, data }
      });
    }

    if (references.background) {
      const { mimeType, data } = processBase64(references.background);
      parts.push({ text: "Background/Scene Reference (Use this environment):" });
      parts.push({
        inlineData: { mimeType, data }
      });
    }

    // Add safety/quality guardrails to the system prompt part
    // Using forceful positive framing to avoid safety triggers
    const promptGuardrails = "Generate a professional, commercial fashion catalog photograph. The lighting is bright and even (studio lighting). The subject is fully clothed in a modest, elegant style suitable for general audiences. No suggestive content. High resolution, photorealistic.";
    
    parts.push({ text: `Instructions: ${promptGuardrails} ${promptText}` });

    // Determine model based on selection
    const modelName = modelVersion === '3' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
      safetySettings: SAFETY_SETTINGS, // Apply permissive safety settings
    };

    // Image resolution (1K, 2K, 4K) is only supported by gemini-3-pro-image-preview
    if (modelVersion === '3') {
      config.imageConfig.imageSize = resolution;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      config: config,
    });

    return extractImageFromResponse(response);
  };

  try {
    // Attempt 1: Use user prompt
    const userPrompt = prompt.trim() || "fashion editorial image featuring the provided product";
    return await executeGen(userPrompt);
  } catch (error: any) {
    // Retry logic for safety blocks
    if (error.message.includes("Safety Block") || error.message.includes("SAFETY")) {
      console.warn("Safety filter triggered. Retrying with sanitized prompt...");
      try {
        // Attempt 2: Sanitize prompt (remove user text that might be triggering) and use strictly safe description
        const fallbackPrompt = "Professional product photography, mannequin or model wearing the product, simple clean composition, commercial catalog style.";
        return await executeGen(fallbackPrompt);
      } catch (retryError: any) {
        console.error("Retry failed:", retryError);
        throw new Error("Unable to generate image. The content may conflict with safety guidelines even after sanitization.");
      }
    }
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Unknown generation error");
  }
};

/**
 * Edit an existing image using Gemini 2.5 Flash Image.
 * Supports multi-input references (Product, Model, Scene) as context for the edit.
 * Supports optional sketch mask.
 */
export const editFashionImage = async (
  imageBase64: string,
  prompt: string,
  maskBase64?: string,
  references?: ReferenceImages
): Promise<string> => {
  try {
    const { mimeType: imageMime, data: imageData } = processBase64(imageBase64);
    
    const parts: any[] = [
      {
        inlineData: {
          mimeType: imageMime,
          data: imageData,
        },
      }
    ];

    if (maskBase64) {
       const { mimeType: maskMime, data: maskData } = processBase64(maskBase64);
       parts.push({
         inlineData: {
           mimeType: maskMime,
           data: maskData
         }
       });
       parts.push({ text: "Use the provided sketch/mask image as a strict guide for the area to edit." });
    }

    // Add context references for the edit
    if (references) {
      if (references.product) {
        const { mimeType, data } = processBase64(references.product);
        parts.push({ text: "Product Reference to insert/use:" });
        parts.push({ inlineData: { mimeType, data } });
      }
      if (references.model) {
        const { mimeType, data } = processBase64(references.model);
        parts.push({ text: "Model Reference to use:" });
        parts.push({ inlineData: { mimeType, data } });
      }
      if (references.background) {
        const { mimeType, data } = processBase64(references.background);
        parts.push({ text: "Scene Reference to use:" });
        parts.push({ inlineData: { mimeType, data } });
      }
    }

    const userPrompt = prompt.trim() || "Make the requested edits professionally.";
    // Add safety guardrails to edit prompt as well
    const promptGuardrails = "Perform a professional fashion edit. Ensure the result is photorealistic, fully clothed, and suitable for commercial catalog use. ";
    
    parts.push({ text: `${promptGuardrails} ${userPrompt}` });

    // Using gemini-2.5-flash-image for editing tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
      config: {
        safetySettings: SAFETY_SETTINGS // Apply permissive safety settings
      }
    });

    return extractImageFromResponse(response);
  } catch (error: any) {
    console.error("Gemini Edit Error:", error);
    throw new Error(error.message || "Unknown edit error");
  }
};

/**
 * Analyze an uploaded image (e.g., flat lay garment) to generate a description.
 * Uses Gemini 3 Pro Preview for deep understanding.
 */
export const analyzeImage = async (imageBase64: string): Promise<string> => {
  try {
    const { mimeType, data } = processBase64(imageBase64);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            },
          },
          {
            text: "Analyze this fashion image. Describe the garment style, material, color, and key details in a concise paragraph suitable for a fashion catalog.",
          },
        ],
      },
    });

    // Manually extract text to avoid SDK crashes on getter access if response is weird
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
       const text = response.candidates[0].content.parts.map(p => p.text).join('');
       return text || "No description generated.";
    }
    
    return "Could not analyze image.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analysis failed. Please try again.";
  }
};

/**
 * Chat assistant for the app.
 */
export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are an expert Fashion Director and AI Technical Assistant. You help users design outfits, suggest campaign ideas, and troubleshoot the FashionGen Studio app. Keep answers professional, chic, and concise.",
    },
  });
};