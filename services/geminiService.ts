import { GoogleGenAI, Modality, type Content, type Part } from "@google/genai";
// Fix: Import GenerationEvent type.
import { Author, type ChatMessage, type GenerationEvent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildContents = (messages: ChatMessage[]): Content[] => {
    return messages
        .filter(msg => msg.parts.some(part => part.type === 'text' || part.type === 'image')) // We only send text and user images to the API
        .map(msg => {
            // Fix: Use Array.reduce for safer type handling when creating the parts array.
            const parts: Part[] = msg.parts.reduce<Part[]>((acc, part) => {
                if (part.type === 'text') {
                    acc.push({ text: part.text });
                } else if (part.type === 'image') {
                    acc.push({
                        inlineData: {
                            mimeType: part.mimeType,
                            data: part.base64,
                        },
                    });
                }
                return acc;
            }, []);
            return {
                role: msg.author === Author.USER ? 'user' : 'model',
                parts,
            };
        });
};


export const geminiService = {
  getChatResponseStream: async function* (messages: ChatMessage[], model: string): AsyncGenerator<string> {
    try {
        const contents = buildContents(messages);
        const responseStream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
                systemInstruction: 'You are a helpful and creative AI assistant. Your name is Gemini.',
            }
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error getting chat response stream:", error);
        yield "Sorry, I encountered an error. Please try again.";
    }
  },

  generateImage: async (prompt: string, params: GenerationEvent['parameters']): Promise<string[] | null> => {
    try {
      const { model, numberOfImages, aspectRatio, outputMimeType } = params;
      
      const config: any = {
          numberOfImages,
          aspectRatio,
          outputMimeType: outputMimeType || 'image/png',
      };

      const response = await ai.models.generateImages({
        model,
        prompt,
        config,
      });

      const mimeType = outputMimeType || 'image/png';
      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages.map(img => `data:${mimeType};base64,${img.image.imageBytes}`);
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  },

  analyzeImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      };
      const textPart = {
        text: prompt,
      };
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      return response.text;
    } catch (error) {
      console.error("Error analyzing image:", error);
      return "Sorry, I couldn't analyze the image.";
    }
  },

  editImage: async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          return `data:image/png;base64,${base64ImageBytes}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Error editing image:", error);
      return null;
    }
  },
};
