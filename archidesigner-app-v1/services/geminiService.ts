import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ImageVariation, ApiObject, BoundingBox } from "../types";
import { getCurrentLanguage } from "../i18n";

let ai: GoogleGenAI | null = null;

// Lazy initialization of the AI client
const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set. Please configure it to use the AI features.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// Helper to extract a JSON object or array from a string that might contain extraneous text or markdown fences.
const extractJson = (text: string): string => {
    // First, try to find JSON within markdown fences (```json ... ```)
    const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1].trim();
    }

    // If no markdown fence, find the first '{' or '[' and the last '}' or ']'
    const firstBracket = text.indexOf('[');
    const firstBrace = text.indexOf('{');
    
    let start = -1;
    
    if (firstBracket === -1) {
        start = firstBrace;
    } else if (firstBrace === -1) {
        start = firstBracket;
    } else {
        start = Math.min(firstBracket, firstBrace);
    }
    
    if (start === -1) {
        // If we found neither, the response is not valid JSON.
        // It could be a conversational refusal from the model.
        throw new Error(`Could not find a valid JSON object or array in the response. Model returned: "${text}"`);
    }

    const lastBracket = text.lastIndexOf(']');
    const lastBrace = text.lastIndexOf('}');
    
    const end = Math.max(lastBracket, lastBrace);

    if (end === -1 || end < start) {
        throw new Error(`Could not find a valid JSON object or array in the response. Model returned: "${text}"`);
    }

    return text.substring(start, end + 1);
};


// This is an internal helper function, not exported.
const editImageInternal = async (
  images: { base64Data: string, mimeType: string }[],
  prompt: string,
  maskBase64?: string
): Promise<string> => {
  try {
    // Validate the prompt to prevent API errors from empty/invalid text parts.
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error("A valid, non-empty prompt is required for image editing.");
    }
    if (!images || images.length === 0) {
        throw new Error("At least one image is required for editing.");
    }
      
    const client = getAiClient();

    const imageParts = images.map(img => ({ inlineData: { data: img.base64Data, mimeType: img.mimeType } }));

    const parts: any[] = [
      ...imageParts,
      { text: prompt },
    ];
    
    if (maskBase64) {
      // The mask applies to the first image in the sequence.
      parts.unshift({
        inlineData: { data: maskBase64, mimeType: 'image/png' }
      });
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        // FIX: Per guideline, only IMAGE modality is supported for gemini-2.5-flash-image.
        responseModalities: [Modality.IMAGE],
        temperature: 0.1, // EXTREME PRECISION: Very low temperature to force strict prompt adherence
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Image generation was blocked. Reason: ${response.promptFeedback.blockReason}`);
      }
      throw new Error('The API did not return any candidates. The request may have been blocked or failed.');
    }
    
    const candidate = response.candidates[0];
    
    if (!candidate.content?.parts) {
        throw new Error('The API returned a candidate with no content parts.');
    }

    let returnedImage: string | null = null;
    let returnedText: string | null = null;

    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        returnedImage = part.inlineData.data;
      } else if (part.text) {
        returnedText = part.text;
      }
    }

    if (returnedImage) {
      return returnedImage;
    }

    let errorMessage = 'The API did not return an image. The response may have been blocked.';
    if (returnedText) {
      errorMessage = `The AI failed to generate an image and returned this message: "${returnedText}"`;
    }

    throw new Error(errorMessage);
    
  } catch (error) {
    console.error('Error calling Gemini API for image editing:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Could not edit the image.');
  }
};

const generationPlanSchema = {
  type: Type.OBJECT,
  properties: {
    textResponse: {
      type: Type.STRING,
      description: 'A professional, architectural text response to the user. Should sound like an expert architect or interior designer. IMPORTANT: Respond in the language specified by the "lang" field.',
    },
    variations: {
      type: Type.ARRAY,
      description: 'A list of 3 architectural visualization variations based on the user prompt.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'A professional title for this rendering (e.g., "Modern Facade", "Isometric Perspective", "Evening Illumination"). Must be in the user\'s language.'
          },
          description: {
            type: Type.STRING,
            description: 'A brief description of the architectural style, materials, or perspective used. Must be in the user\'s language.'
          },
          modifiedPrompt: {
            type: Type.STRING,
            description: 'The full, detailed prompt for the AI visualizer. MUST be in ENGLISH. If rotating view, explicitely describe the 3D geometry from the new angle.'
          }
        },
        required: ["title", "description", "modifiedPrompt"]
      }
    },
    followUpSuggestions: {
        type: Type.ARRAY,
        description: 'A list of 4 short, actionable follow-up prompts, specifically focusing on perspective changes (e.g., "Show from the side", "Bird\'s eye view") or material changes. Must be in the user\'s language.',
        items: {
            type: Type.STRING,
        }
    }
  },
  required: ["textResponse", "variations", "followUpSuggestions"]
};

type PlanResult = {
  textResponse: string;
  variations: any[];
  followUpSuggestions: string[];
};

type GeneratorYield = 
  | { status: 'progress', message: string }
  | { plan: PlanResult, groundingMetadata?: any }
  | ImageVariation;


// This is now an async generator to stream results
export async function* generateImageEdits(
  images: { base64Data: string, mimeType: string }[],
  userPrompt: string,
  useWebSearch: boolean = false,
  aspectRatio: string
): AsyncGenerator<GeneratorYield> {
  
  const client = getAiClient();
  const lang = getCurrentLanguage();

  let planPrompt: string;
  const config: any = {
      temperature: 0.1, // EXTREME PRECISION: Very low temperature for planning to ensure instruction following
      topP: 0.8,
      topK: 40,
  }; 
  const imageParts = images.map(img => ({ inlineData: { data: img.base64Data, mimeType: img.mimeType } }));
  const contents: any = { parts: [...imageParts] };

  if (useWebSearch) {
    yield { status: 'progress', message: 'Researching architectural trends...' };
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    yield { status: 'progress', message: 'Synthesizing 3D perspectives...' };
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    config.tools = [{ googleSearch: {} }];
    
    planPrompt = `You are a world-class AI Architect and 3D Visualizer.
        User's prompt (in "${lang}"): "${userPrompt}".
        Desired Aspect Ratio: "${aspectRatio}".

        Your task is to use web search to find relevant architectural styles and create a plan for 3 distinct visualizations.
        
        CRITICAL EXECUTION PROTOCOL:
        1. PRECISE ADHERENCE: You must follow the user's text instructions explicitly. Do not deviate.
        2. MANDATORY CONSTRAINTS: If the user specifies specific materials, colors, or styles, use them exactly.
        3. For rotations or perspective shifts, use 3D geometry logic to preserve the building's identity.

        1. Analyze the structure in the image.
        2. Perform Google searches for architectural styles, materials, and landscaping defined in the prompt.
        3. Create 3 distinct concepts. Include at least one variation that changes the PERSPECTIVE or LIGHTING if appropriate.
        4. Write a professional response in "${lang}".
        5. For each variation:
            a. Title & Description in "${lang}".
            b. 'modifiedPrompt' in ENGLISH: Detailed architectural brief. Mention materials (concrete, wood, glass), lighting (softbox, natural, golden hour), and camera angle (eye-level, drone shot, 2-point perspective). 
            *Important*: Start the prompt with "A photorealistic architectural rendering with a ${aspectRatio} aspect ratio...".
            *For Rotations*: Explicitly state: "Same house as reference image, rotated 90 degrees left/right. Continue the white clapboard siding and black window frames to the side wall."
        6. Generate 4 follow-up prompts in "${lang}". at least two MUST propose perspective changes.
        
        EXTREMELY IMPORTANT: Response must be valid JSON matching the schema.`;
    
    contents.parts.push({ text: planPrompt });

  } else {
     config.responseMimeType = 'application/json';
     config.responseSchema = generationPlanSchema;
     planPrompt = `You are a world-class AI Architect and 3D Visualizer.
        User's prompt: "${userPrompt}". Language: "${lang}".
        Desired Aspect Ratio: "${aspectRatio}".

        CRITICAL EXECUTION PROTOCOL:
        1. PRECISE ADHERENCE: You must follow the user's text instructions explicitly. Do not deviate.
        2. MANDATORY CONSTRAINTS: If the user specifies specific materials, colors, or styles, use them exactly.
        3. IDENTITY PRESERVATION: Keep the building's geometry unless asked to change it.

        Your task:
        1. Write a professional architect's response in "${lang}".
        2. Create 3 visualization concepts. 
           - Variation 1: LITERAL interpretation of the prompt.
           - Variation 2 & 3: Architectural explorations that still STRICTLY follow all constraints.
           - Focus on: Materials, Lighting, Landscaping, and Structural modifications.
        3. For 'modifiedPrompt' (ENGLISH): 
           - Start with: "A photorealistic architectural rendering with a ${aspectRatio} aspect ratio...".
           - INSTRUCTION: Include specific visual descriptors for every constraint in the user's prompt.
           - **Rotation Logic**: If rotating, explicitly describe the geometry of the newly visible sides to ensure consistency.
             - Example: "The side wall continues the red brick pattern from the front. The roof pitch is maintained."
        4. Generate 4 follow-up prompts in "${lang}". **Highlight the ability to rotate views** (e.g., "Rotate the house 45 degrees", "Show the side profile").
        
        Return JSON only.`;
    
    contents.parts.push({ text: planPrompt });
  }

  const planResponse = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: config
  });
  
  // Use the robust JSON extraction method.
  const planJsonText = extractJson(planResponse.text);
  const plan = JSON.parse(planJsonText);
  
  const groundingMetadata = planResponse.candidates?.[0]?.groundingMetadata;

  if (!plan.textResponse || !Array.isArray(plan.variations) || plan.variations.length === 0) {
    throw new Error("Failed to create a valid generation plan.");
  }

  // Yield the initial text response and suggestions
  yield { plan, groundingMetadata };
  yield { status: 'progress', message: 'Rendering 3D visualizations...' };


  for (const variation of plan.variations) {
    try {
      // If the AI planner fails to generate a prompt, create a fallback.
      const promptForGeneration = (variation.modifiedPrompt || "").trim()
        ? variation.modifiedPrompt
        : `Architectural visualization: ${userPrompt}, style: ${variation.title}`;

      const editedImageBase64 = await editImageInternal(images, promptForGeneration);
      const newVariation: ImageVariation = {
        id: Date.now().toString() + Math.random(),
        title: variation.title,
        description: variation.description,
        imageUrl: `data:${images[0].mimeType};base64,${editedImageBase64}`,
        createdAt: new Date(),
      };
      yield newVariation; // Yield each image as it's generated
    } catch (error) {
      console.error(`Failed to generate variation "${variation.title}":`, error);
       // Create a fallback for the retry payload as well.
      const promptForRetry = (variation.modifiedPrompt || "").trim()
        ? variation.modifiedPrompt
        : `${userPrompt}, in the style of: ${variation.title}`;

      const errorVariation: ImageVariation = {
        id: Date.now().toString() + Math.random(),
        title: variation.title,
        description: variation.description,
        imageUrl: '', // No image URL
        createdAt: new Date(),
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown generation error.',
        retryPayload: {
          images: images,
          prompt: promptForRetry,
          aspectRatio: aspectRatio,
        }
      };
      yield errorVariation;
    }
  }
}

export const retryImageGeneration = async (
    images: { base64Data: string, mimeType: string }[],
    prompt: string,
    aspectRatio: string
): Promise<string> => {
    // Defensively add aspect ratio instruction if it seems to be missing from the prompt.
    const ratioPattern = /\b(aspect ratio)\b/i;
    let finalPrompt = prompt;
    if (!ratioPattern.test(prompt)) {
        console.warn("Retrying prompt without explicit aspect ratio. Prepending instruction.");
        finalPrompt = `A photorealistic architectural image with a ${aspectRatio} aspect ratio. ${prompt}`;
    }
    return await editImageInternal(images, finalPrompt);
};

export const editImageWithMask = async (
    imageBase64: string,
    mimeType: string,
    prompt: string,
    maskBase64: string
): Promise<string[]> => {
    const maskedPrompt = `You are a professional architectural editor. Your task is to modify the building/room based on the request, but ONLY inside the white masked area. Keep the surrounding structure unchanged. Request: "${prompt}". Make it look structurally sound and photorealistic.`;
    
    const imageInput = [{ base64Data: imageBase64, mimeType: mimeType }];
    const promises = [
        editImageInternal(imageInput, maskedPrompt, maskBase64),
        editImageInternal(imageInput, maskedPrompt, maskBase64),
        editImageInternal(imageInput, maskedPrompt, maskBase64),
    ];
    return Promise.all(promises);
};

export const generateRepositionPrompt = async (
    visualInstructionImageBase64: string,
    movedObjects: { label: string; originalBox: BoundingBox; newBox: BoundingBox }[]
): Promise<string> => {
    try {
        const client = getAiClient();
        const objectNames = movedObjects.map(obj => `'${obj.label}'`).join(', ');

        const scalingInstructions = movedObjects.map(obj => {
            const originalWidth = obj.originalBox.xMax - obj.originalBox.xMin;
            const originalHeight = obj.originalBox.yMax - obj.originalBox.yMin;
            const newWidth = obj.newBox.xMax - obj.newBox.xMin;
            const newHeight = obj.newBox.yMax - obj.newBox.yMin;

            const originalArea = originalWidth * originalHeight;
            const newArea = newWidth * newHeight;
            
            if (originalArea <= 0) return `For '${obj.label}', move it as shown.`;

            const ratio = newArea / originalArea;
            
            if (ratio > 1.2) {
                return `For '${obj.label}', make it appear closer/larger in the perspective.`;
            } else if (ratio < 0.8) {
                return `For '${obj.label}', make it appear further away/smaller in the perspective.`;
            } else {
                return `For '${obj.label}', preserve its scale.`;
            }
        }).join('\n    - ');

        const prompt = `You are a tool translating visual architectural edits into a command.
**VISUAL INSTRUCTIONS:** Red arrows indicate moving architectural elements (windows, doors, furniture).
**ANALYSIS:**
1. Move the elements as shown.
2. ${scalingInstructions}
3. Maintain structural integrity of the building/room.

**OUTPUT:** Single line command. No quotes.`;
        
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: visualInstructionImageBase64, mimeType: 'image/png' } },
                    { text: prompt }
                ]
            }
        });
        
        const firstLine = response.text.trim().split('\n')[0];
        return firstLine.replace(/^"|"$/g, '').trim();

    } catch (error) {
        console.error('Error generating reposition prompt:', error);
        throw new Error('Could not generate a prompt for repositioning.');
    }
};

export const applyRepositionEdit = async (
    visualInstructionImageBase64: string,
    mimeType: string,
    generatedPrompt: string
): Promise<string[]> => {
    const finalPrompt = `You are an architectural visualizer. 
    1. Execute this edit: "${generatedPrompt}".
    2. Use red arrows in the image as the move guide.
    3. INPAINT the empty space left behind with matching wall/floor textures perfectly.
    4. Ensure lighting consistency.
    5. Output a clean image without arrows.`;

    const imageInput = [{ base64Data: visualInstructionImageBase64, mimeType: mimeType }];
    const promises = [
        editImageInternal(imageInput, finalPrompt),
        editImageInternal(imageInput, finalPrompt),
        editImageInternal(imageInput, finalPrompt),
    ];
    return Promise.all(promises);
};

export const remixImageWithReference = async (
    sourceImage: { base64Data: string; mimeType: string },
    referenceImage: { base64Data: string; mimeType: string } | null,
    prompt: string
): Promise<string[]> => {
    // This uses the Gemini Flash Image model to modify the source image based on the prompt and optional reference
    const inputImages = [sourceImage];
    if (referenceImage) {
        inputImages.push(referenceImage);
    }
    
    // Create a specific instruction for global modification
    const fullPrompt = `Architectural Modification Task.
    Primary Source Image: The first image provided (Base Geometry).
    ${referenceImage ? "Style Reference Image: The second image provided. Extract ONLY materials, lighting, and vibe." : ""}
    User Requirement: "${prompt}"
    
    CRITICAL INSTRUCTIONS:
    1. EXTREME PRECISION: You must implement the "User Requirement" exactly as written. Do not hallucinate unrequested changes.
    2. IDENTITY PRESERVATION: Keep the underlying building structure/geometry of the Primary Source Image unless the user explicitly asks to change the shape/structure.
    3. If the user asks for a specific material (e.g., "red brick"), use it. If they ask for a specific time of day, use it.
    4. Output: High quality, photorealistic 8k architectural render.`;
    
    // Generate 3 variations
    const promises = [
        editImageInternal(inputImages, fullPrompt),
        editImageInternal(inputImages, fullPrompt),
        editImageInternal(inputImages, fullPrompt),
    ];
    
    return Promise.all(promises);
}


const objectSegmentationSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "Unique ID."
      },
      parentId: {
        type: Type.STRING,
        description: "Parent ID or null."
      },
      label: {
        type: Type.STRING,
        description: "Architectural element (e.g., 'Window', 'Door', 'Roof', 'Sofa')."
      },
      box_2d: {
        type: Type.ARRAY,
        description: "Bounding box [yMin, xMin, yMax, xMax], 0-1000.",
        items: { type: Type.NUMBER },
        minItems: 4,
        maxItems: 4,
      },
    },
    required: ["id", "parentId", "label", "box_2d"]
  }
};

export const segmentObjectsInImage = async (
  imageBase64: string,
  mimeType: string,
): Promise<ApiObject[]> => {
  console.log("Starting architectural element segmentation...");
  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType: mimeType } },
                { text: "Analyze the image and detect architectural elements and furniture. Organize them hierarchically (e.g., House -> Wall -> Window). Return JSON with id, label, parentId, and box_2d." }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: objectSegmentationSchema,
            thinkingConfig: { thinkingBudget: 0 }
        }
    });
    console.log("Raw JSON response:", response.text);

    const detectedObjects = JSON.parse(response.text);
    
    if (!Array.isArray(detectedObjects)) {
        throw new Error("Invalid format.");
    }
    
    return detectedObjects.map(obj => ({
        ...obj,
        parentId: obj.parentId || null,
    }));

  } catch (error) {
    console.error("Error during segmentation:", error);
    throw new Error("Could not detect architectural elements.");
  }
};