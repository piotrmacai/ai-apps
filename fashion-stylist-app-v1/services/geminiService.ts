
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const processBackgroundImage = async (bg?: string | File | null) => {
    if (!bg) return null;
    if (bg instanceof File) {
        return await fileToPart(bg);
    }
    return dataUrlToPart(bg);
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    throw new Error(textFeedback || "The AI model did not return an image.");
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image';

export const generateModelImage = async (userImage: File, backgroundImage?: string | null): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const bgPart = await processBackgroundImage(backgroundImage);
    
    let prompt = "You are an expert fashion photographer AI. Transform the person in this image into a professional fashion model photo. Preserve identity and body type perfectly. Final image must be photorealistic. Return ONLY the final image.";
    const parts: any[] = [userImagePart];
    
    if (bgPart) {
        prompt += " Place the person naturally in the provided background image. Match lighting, shadows, and camera angle to the new environment.";
        parts.push(bgPart);
    } else {
        prompt += " The original background from the provided image MUST be preserved exactly.";
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File, backgroundImage?: string | null): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    const bgPart = await processBackgroundImage(backgroundImage);

    let prompt = `Expert virtual try-on AI. Replace clothing in 'model image' with 'garment image'. 
1. **Garment Replacement:** Full replacement, natural folds and shadows.
2. **Preserve Model:** Face, hair, and pose must remain identical.
3. **Background:** `;

    const parts: any[] = [modelImagePart, garmentImagePart];

    if (bgPart) {
         prompt += "Composite the person into the provided background image. The output background MUST BE the provided background image. Match shadows and light.";
         parts.push(bgPart);
    } else {
         prompt += "Preserve the original background from the 'model image' perfectly.";
    }
    
    prompt += "\nReturn ONLY the final image.";
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string, backgroundImage?: string | null): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const bgPart = await processBackgroundImage(backgroundImage);

    let prompt = `Expert fashion photographer AI. Regenerate this image with a new perspective: "${poseInstruction}". Person and outfit must remain identical.`;
    const parts: any[] = [tryOnImagePart];

    if (bgPart) {
        prompt += " Composite the subject into the provided background image. Ensure the background is clearly visible and lighting is matched.";
        parts.push(bgPart);
    } else {
        prompt += " The background style must remain identical to the original image.";
    }

    prompt += " Return ONLY the final image.";
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return handleApiResponse(response);
};
