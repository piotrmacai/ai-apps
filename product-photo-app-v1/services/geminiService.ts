import { GoogleGenAI } from "@google/genai";
import { ImageAttachment, AspectRatio } from "../types";

// Gemini 2.5 Flash Image (Free Tier Compatible)
const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Generates or edits an image based on a prompt and optional reference images.
 */
export const generateOrEditImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  numberOfImages: number,
  referenceImage?: ImageAttachment,
  isSketch: boolean = false
): Promise<string[]> => {
  
  // Initialize strictly with process.env.API_KEY as per security guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Helper function to generate a single image
  const generateSingleImage = async (): Promise<string> => {
    const parts: any[] = [];

    // 1. Add Reference Image if exists
    if (referenceImage) {
      parts.push({
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType,
        },
      });
    }

    // 2. Construct Prompt with Aspect Ratio and Specific Style Logic
    let styleInstruction = "";

    if (isSketch) {
        // SKETCH MODE: Strict adherence to the drawing
        // We do NOT want to "rearrange" a sketch, we want to "fill" it.
        styleInstruction = " Strict Instruction: The provided image is a sketch and layout guide. Generate a photorealistic high-quality image that strictly follows the lines, composition, and layout of the sketch. Do not rearrange the objects. Fill the sketched area with the subject described.";
    } else {
        // STANDARD MODE: Product Editorial
        // We want to enhance and professionalize the composition.
        styleInstruction = " Style: product editorial photography, award winning style, for fashion and other products.";
        if (referenceImage) {
             styleInstruction += " Rearrange the product into a more editorial professional product photo.";
        } else {
             styleInstruction += " Composition: Professional editorial product layout.";
        }
    }

    const aspectText = ` Aspect ratio: ${aspectRatio}.`;
    
    // Ensure we have a base prompt
    const corePrompt = prompt 
        ? prompt 
        : (referenceImage ? (isSketch ? "Realize this sketch photorealistically." : "Generate a variation of this image.") : "Generate an image of a high-end product.");
        
    const fullPrompt = `${corePrompt} ${styleInstruction} ${aspectText}`;
    
    parts.push({ text: fullPrompt });

    try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: {
            parts: parts,
          },
        });

        // 3. Parse Response with robust error handling
        if (response.candidates && response.candidates.length > 0) {
          const content = response.candidates[0].content;
          
          // Check for Finish Reason other than STOP
          const finishReason = response.candidates[0].finishReason;
          if (finishReason && finishReason !== 'STOP') {
              // Map IMAGE_OTHER to a more user-friendly message if possible, 
              // otherwise throw the reason.
              if (finishReason === 'IMAGE_OTHER' || finishReason === 'OTHER') {
                   // Often caused by strict safety filters or model refusal on complex prompts
                   throw new Error("The model could not process this request. Try simplifying your prompt or using a different reference image.");
              }
              throw new Error(`Generation stopped: ${finishReason}`);
          }

          if (content && content.parts) {
            let textOutput = "";

            for (const part of content.parts) {
              // Check for Image
              if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
              }
              // Collect Text (often contains refusal reasons or descriptions)
              if (part.text) {
                textOutput += part.text;
              }
            }

            // If we loop through all parts and find no image, but found text:
            if (textOutput) {
                // Truncate long refusal messages
                const msg = textOutput.length > 200 ? textOutput.slice(0, 200) + '...' : textOutput;
                throw new Error(`Model response: "${msg}"`);
            }
          }
        }
        
        throw new Error("No image data found in response.");

    } catch (e: any) {
        // Re-throw with context if needed, but the inner throws are usually good.
        throw e;
    }
  };

  try {
    // Parallel generation for batch requests
    const promises = Array.from({ length: numberOfImages }).map(() => generateSingleImage());
    const results = await Promise.all(promises);
    return results;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Helper to convert a File object to Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        // Remove the Data-URL prefix (e.g. "data:image/png;base64,")
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};