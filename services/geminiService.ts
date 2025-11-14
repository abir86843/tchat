

// FIX: Removed `LiveSession` as it is not an exported member of `@google/genai`.
import { GoogleGenAI, Chat, GenerateContentResponse, LiveCallbacks, Modality, Content, GroundingChunk } from "@google/genai";
import type { AspectRatio } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const baseSystemInstruction = "You are TChat, a helpful AI assistant. When asked about your identity, model, or creator, you must respond with: 'I am a large language model, trained by Triple Craft Digital.' Do not provide any other details about your underlying model.";

export const startChat = (isThinkingMode: boolean, history: Content[] = [], userKnowledge?: string): Chat => {
  const modelName = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  
  let finalSystemInstruction = baseSystemInstruction;
  if (userKnowledge && userKnowledge.trim()) {
    finalSystemInstruction += `\n\nIMPORTANT CONTEXT: The user has provided the following information about themselves: "${userKnowledge}". You should use this information to personalize your responses and treat it as a primary source of truth about the user.`;
  }

  const thinkingConfig = isThinkingMode ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
  
  const config = {
    ...thinkingConfig,
    systemInstruction: finalSystemInstruction,
  };
  
  return ai.chats.create({
    model: modelName,
    config: config,
    history: history,
  });
};

export const sendMessageStream = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
  return chat.sendMessageStream({ message });
};

export const sendMessageWithGoogleSearch = async (contents: Content[], userKnowledge?: string): Promise<{ text: string; sources: { uri: string; title: string }[] }> => {
  let finalSystemInstruction = baseSystemInstruction;
  if (userKnowledge && userKnowledge.trim()) {
    finalSystemInstruction += `\n\nIMPORTANT CONTEXT: The user has provided the following information about themselves: "${userKnowledge}". You should use this information to personalize your responses and treat it as a primary source of truth about the user.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      systemInstruction: finalSystemInstruction,
      tools: [{googleSearch: {}}],
    },
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  
  const sources = groundingChunks
    .map((chunk: GroundingChunk) => chunk.web)
    .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title);

  return { text: response.text, sources: sources };
};

export const performResearch = async (contents: Content[], userKnowledge?: string): Promise<{ text: string; sources: { uri: string; title: string }[] }> => {
  let systemInstruction = baseSystemInstruction;
  if (userKnowledge && userKnowledge.trim()) {
    systemInstruction += `\n\nIMPORTANT CONTEXT: The user has provided the following information about themselves: "${userKnowledge}". You should use this information to personalize your responses and treat it as a primary source of truth about the user.`;
  }

  const researchSystemInstruction = `You are a research assistant. Provide a comprehensive, well-structured, and factual answer based on the user's query using web search. ${systemInstruction}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro", // Use a more powerful model for research
    contents: contents,
    config: {
      systemInstruction: researchSystemInstruction,
      tools: [{googleSearch: {}}],
    },
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  
  const sources = groundingChunks
    .map((chunk: GroundingChunk) => chunk.web)
    .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title);

  return { text: response.text, sources: sources };
};


export const analyzeFile = async (prompt: string, fileBase64: string, mimeType: string): Promise<string> => {
  const filePart = {
    inlineData: {
      data: fileBase64,
      mimeType: mimeType,
    },
  };
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [textPart, filePart] },
  });

  return response.text;
};

export const analyzeVideo = async (prompt: string, fileBase64: string, mimeType: string): Promise<string> => {
  const filePart = {
    inlineData: {
      data: fileBase64,
      mimeType: mimeType,
    },
  };
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts: [textPart, filePart] },
  });

  return response.text;
};


export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: aspectRatio,
    },
  });

  const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
  return `data:image/png;base64,${base64ImageBytes}`;
};

export const editImage = async (prompt: string, fileBase64: string, mimeType: string): Promise<string> => {
    const imagePart = {
        inlineData: {
            data: fileBase64,
            mimeType: mimeType,
        },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const outputMimeType = part.inlineData.mimeType;
            return `data:${outputMimeType};base64,${base64ImageBytes}`;
        }
    }

    throw new Error("No image was generated by the model.");
};

export const generateUserKnowledge = async (userName: string): Promise<string> => {
  const prompt = `Based on the user's name "${userName}", generate a concise, friendly, one-paragraph summary for an AI assistant to use as context. The summary should be in the third person. For example, if the name is 'John Doe', a good summary might be: 'John Doe is a creative professional who is interested in technology and design. He is looking for an AI assistant to help him brainstorm ideas and improve his workflow.'`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: 'You are a helpful writing assistant specializing in creating user profile summaries.',
    },
  });

  return response.text;
};


// FIX: Removed `LiveSession` from return type as it is not an exported member of `@google/genai`.
export const connectLiveSession = (callbacks: LiveCallbacks) => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            // FIX: `responseModalities` expects an array of `Modality` enum members. Changed 'AUDIO' string to `Modality.AUDIO`.
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: baseSystemInstruction,
        },
    });
};