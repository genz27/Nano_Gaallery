import { GoogleGenAI } from "@google/genai";
import { ModelId, AspectRatio, ImageSize } from "../types";

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface GenerateParams {
  model: ModelId;
  prompt: string;
  imageFile: File | null;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}

export const generateImageContent = async ({
  model,
  prompt,
  imageFile,
  aspectRatio,
  imageSize
}: GenerateParams): Promise<string[]> => {
  
  // Initialize AI with API Key from environment variable
  // Ensure your Cloudflare Pages environment has API_KEY set.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare contents
  const parts: any[] = []; 

  // If there is an image, we add it (multimodal prompt / image editing)
  if (imageFile) {
    const base64Data = await fileToGenerativePart(imageFile);
    parts.push({
      inlineData: {
        mimeType: imageFile.type,
        data: base64Data
      }
    });
  }

  // Add the text prompt if it exists. 
  // Note: For image generation/editing, prompt is usually required or highly recommended.
  if (prompt) {
    parts.push({ text: prompt });
  }

  // Configure Image Generation
  const imageConfig: any = {
    aspectRatio: aspectRatio,
  };

  // imageSize is only supported on the Pro model
  if (model === ModelId.NANO_PRO) {
    imageConfig.imageSize = imageSize;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        imageConfig: imageConfig,
      },
    });

    const generatedUrls: string[] = [];

    // Parse response for images
    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            generatedUrls.push(imageUrl);
          }
        }
      }
    }

    if (generatedUrls.length === 0) {
       // Check if there was a text failure reason (safety filter, etc)
       const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
       if(textPart?.text) {
           throw new Error(`生成失败: ${textPart.text}`);
       }
       throw new Error("未能生成图片，请检查提示词或重试。");
    }

    return generatedUrls;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Provide a more user-friendly error message if possible
    if (error.message?.includes("API key")) {
        throw new Error("API Key 配置无效，请检查后台环境变量。");
    }
    throw new Error(error.message || "生成过程中发生错误");
  }
};