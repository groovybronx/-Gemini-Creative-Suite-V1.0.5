
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatConversation, GeminiChatModel, MessagePart, AspectRatio, ImagenModel, GenerationEvent } from '../types';
import { Author } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import SpinnerIcon from './icons/SpinnerIcon';
import RecallIcon from './icons/RecallIcon';
import PaperclipIcon from './icons/PaperclipIcon';
import SparklesIcon from './icons/SparklesIcon';
import EditIcon from './icons/EditIcon';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // result is "data:mime/type;base64,the-real-base64"
        // we want just "the-real-base64"
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

interface ChatWindowProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onViewImage: (images: string[], startIndex: number) => void;
  onEditImage: (imageUrl: string) => void;
}

const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const imagenModels: ImagenModel[] = ['imagen-3.0-generate-002', 'imagen-4.0-generate-001', 'imagen-4.0-ultra-generate-001', 'imagen-4.0-fast-generate-001'];

const imagenModelDisplayNames: Record<ImagenModel, string> = {
    'imagen-3.0-generate-002': 'Imagen 3.0',
    'imagen-4.0-generate-001': 'Imagen 4.0',
    'imagen-4.0-ultra-generate-001': 'Imagen 4.0 Ultra',
    'imagen-4.0-fast-generate-001': 'Imagen 4.0 Fast',
};

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, onConversationCreated, onViewImage, onEditImage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<GeminiChatModel>('gemini-2.5-flash');
  const [uploadedImage, setUploadedImage] = useState<{ url: string; base64: string; mimeType: string; } | null>(null);
  const [showGenerationPanel, setShowGenerationPanel] = useState(false);
  
  // States for image generation panel
  const [genPrompt, setGenPrompt] = useState('');
  const [genAspectRatio, setGenAspectRatio] = useState<AspectRatio>('3:4');
  const [genModel, setGenModel] = useState<ImagenModel>('imagen-3.0-generate-002');
  const [genNumImages, setGenNumImages] = useState(4);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversationIdRef = useRef<string | null>(conversationId);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    currentConversationIdRef.current = conversationId;
    const loadConversation = async () => {
      if (conversationId) {
        const convo = await dbService.getConversation(conversationId);
        if (convo && convo.type === 'chat') {
            const migratedMessages = convo.messages.map(msg => {
                if (msg.parts) return msg;
                // @ts-expect-error handle old format
                if (typeof msg.content === 'string') {
                    // @ts-expect-error handle old format
                    return { ...msg, parts: [{ type: 'text', text: msg.content }]};
                }
                return { ...msg, parts: [{ type: 'text', text: '' }]};
            });
            setMessages(migratedMessages as ChatMessage[]);
            setModel(convo.modelUsed);
        } else {
            setMessages([]);
            setModel('gemini-2.5-flash');
        }
      } else {
        setMessages([{
            id: 'initial',
            author: Author.MODEL,
            parts: [{ type: 'text', text: "Hello! I'm Gemini. How can I assist you today? You can ask me anything or generate an image!" }]
        }]);
        setModel('gemini-2.5-flash');
      }
      setInput('');
      setUploadedImage(null);
      setShowGenerationPanel(false);
      inputRef.current?.focus();
    };
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const base64 = await fileToBase64(file);
        setUploadedImage({
            url: URL.createObjectURL(file),
            base64,
            mimeType: file.type
        });
        setShowGenerationPanel(false); // Can't generate and upload at the same time
    }
    // Reset file input value to allow selecting the same file again
    if(e.target) e.target.value = '';
  }

  const saveMessage = async (message: ChatMessage) => {
    let convoId = currentConversationIdRef.current;
    if (!convoId) {
        // Find first text part for title
        const titleText = (message.parts.find(p => p.type === 'text') as {text:string} | undefined)?.text || 'New Chat';
        convoId = Date.now().toString();
        currentConversationIdRef.current = convoId;
        const newConversation: ChatConversation = {
            id: convoId,
            title: titleText.substring(0, 40) + (titleText.length > 40 ? '...' : ''),
            messages: [message],
            createdAt: Date.now(),
            modelUsed: model,
            isFavorite: false,
            type: 'chat',
        };
        await dbService.addOrUpdateConversation(newConversation);
        onConversationCreated(convoId);
    } else {
        const existingConvo = await dbService.getConversation(convoId);
        if (existingConvo && existingConvo.type === 'chat') {
            existingConvo.messages.push(message);
            await dbService.addOrUpdateConversation(existingConvo);
        }
    }
    return convoId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !uploadedImage || isLoading) return;

    const userParts: MessagePart[] = [];
    if(uploadedImage) {
        userParts.push({ type: 'image', ...uploadedImage });
    }
    if(input.trim()) {
        userParts.push({ type: 'text', text: input });
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      author: Author.USER,
      parts: userParts,
    };
    
    const currentMessages = messages.filter(m => m.id !== 'initial');
    const updatedMessages = [...currentMessages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setUploadedImage(null);
    setIsLoading(true);

    await saveMessage(userMessage);

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: ChatMessage = {
      id: modelMessageId,
      author: Author.MODEL,
      parts: [{ type: 'text', text: '' }],
    };
    setMessages(prev => [...prev, modelMessage]);

    let fullResponse = '';
    for await (const chunk of geminiService.getChatResponseStream(updatedMessages, model)) {
        fullResponse += chunk;
        // Fix: Add a return type annotation to the map callback to ensure type correctness.
        setMessages(prev => prev.map((msg): ChatMessage => msg.id === modelMessageId ? { ...msg, parts: [{ type: 'text', text: fullResponse }] } : msg));
    }
    
    setIsLoading(false);
    
    // Fix: Explicitly type finalModelMessage to prevent type widening on the 'parts' property.
    const finalModelMessage: ChatMessage = { ...modelMessage, parts: [{ type: 'text', text: fullResponse }] };
    await saveMessage(finalModelMessage);
    inputRef.current?.focus();
  };
  
  const handleGenerateImage = async () => {
    if (!genPrompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setShowGenerationPanel(false);

    const userMessage: ChatMessage = {
        id: Date.now().toString(),
        author: Author.USER,
        parts: [{ type: 'text', text: `Generate image: "${genPrompt}"`}]
    };

    setMessages(prev => [...prev.filter(m => m.id !== 'initial'), userMessage]);
    await saveMessage(userMessage);

    const params: GenerationEvent['parameters'] = { model: genModel, aspectRatio: genAspectRatio, numberOfImages: genNumImages };
    const result = await geminiService.generateImage(genPrompt, params);

    if (result) {
        const modelMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            author: Author.MODEL,
            parts: [{
                type: 'imageGenerationResult',
                images: result.map(url => ({ url })),
                prompt: genPrompt,
                parameters: params,
            }]
        };
        setMessages(prev => [...prev, modelMessage]);
        await saveMessage(modelMessage);
    } else {
        const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            author: Author.MODEL,
            parts: [{ type: 'text', text: "Sorry, I failed to generate the image. Please try again." }]
        };
        setMessages(prev => [...prev, errorMessage]);
        await saveMessage(errorMessage);
    }

    setGenPrompt('');
    setIsLoading(false);
    inputRef.current?.focus();
  };
  
  const handleRecallGeneration = (prompt: string, params: GenerationEvent['parameters']) => {
    setGenPrompt(prompt);
    setGenModel(params.model);
    setGenAspectRatio(params.aspectRatio);
    setGenNumImages(params.numberOfImages);
    setShowGenerationPanel(true);
    setUploadedImage(null);
  };

  const renderMessagePart = (part: MessagePart, index: number) => {
    switch(part.type) {
        case 'text':
            return <p key={index} className="whitespace-pre-wrap">{part.text}</p>
        case 'image':
            return <img key={index} src={part.url} alt="User upload" className="max-w-xs rounded-lg mt-2 cursor-pointer" onClick={() => onViewImage([part.url], 0)} />
        case 'imageGenerationResult':
            return (
                <div key={index} className="flex flex-col gap-2 mt-2">
                    {part.prompt && part.parameters && (
                         <div className="flex items-center gap-2">
                            <p className="font-semibold text-text-secondary text-sm">Prompt: <span className="text-text-primary italic">"{part.prompt}"</span></p>
                            <button
                                onClick={() => handleRecallGeneration(part.prompt, part.parameters)}
                                className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-border-color"
                                aria-label="Recall this prompt and its settings"
                                title="Recall this prompt and its settings"
                            >
                                <RecallIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        {part.images.map((image, imgIndex) => (
                            <div key={imgIndex} className="relative group aspect-square">
                                <img src={image.url} alt={`Generated image ${imgIndex + 1}`} className="w-full h-full object-contain rounded-md bg-base-bg" />
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                    <button onClick={() => onViewImage(part.images.map(i => i.url), imgIndex)} className="text-white font-semibold hover:underline">View</button>
                                    <button onClick={() => onEditImage(image.url)} className="text-white font-semibold hover:underline flex items-center gap-1">
                                        <EditIcon className="w-4 h-4" /> Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        default:
            return null;
    }
  }

  return (
    <div className="flex flex-col h-full bg-component-bg rounded-lg overflow-hidden border border-border-color">
      <div className="p-4 border-b border-border-color flex items-center gap-4">
        <label htmlFor="model-select" className="font-semibold text-text-secondary">Model:</label>
        <select 
          id="model-select"
          value={model}
          onChange={e => setModel(e.target.value as GeminiChatModel)}
          disabled={messages.length > 1 && messages.some(m => m.id !== 'initial') || showGenerationPanel}
          className="bg-base-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow disabled:opacity-70"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.author === Author.USER ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.author === Author.MODEL && (
              <div className="w-8 h-8 rounded-full bg-accent-khaki flex-shrink-0"></div>
            )}
            
            {msg.author === Author.USER ? (
                <div className="relative group">
                    <div className="max-w-xl p-3 rounded-lg shadow-md bg-accent-yellow text-gray-900">
                        {msg.parts.map(renderMessagePart)}
                    </div>
                </div>
            ) : (
                <div className="max-w-xl p-3 rounded-lg shadow-md bg-base-bg text-text-primary">
                    {msg.parts.map(renderMessagePart)}
                </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-khaki flex-shrink-0"></div>
            <div className="bg-base-bg text-text-primary p-3 rounded-lg">
                <SpinnerIcon className="w-5 h-5 text-accent-yellow" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-border-color">
        { showGenerationPanel ? (
            <div className="bg-base-bg p-4 rounded-lg border border-border-color">
                <h3 className="font-semibold text-accent-yellow mb-3">Image Generation</h3>
                <div className="space-y-3">
                    <textarea value={genPrompt} onChange={e => setGenPrompt(e.target.value)} placeholder="A futuristic city skyline..." className="w-full h-20 bg-component-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow" />
                    <div className="grid grid-cols-3 gap-2">
                        <select value={genModel} onChange={e => setGenModel(e.target.value as ImagenModel)} className="w-full bg-component-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow">
                            {imagenModels.map(m => <option key={m} value={m}>{imagenModelDisplayNames[m]}</option>)}
                        </select>
                         <select value={genAspectRatio} onChange={e => setGenAspectRatio(e.target.value as AspectRatio)} className="w-full bg-component-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow">
                            {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                        </select>
                        <input type="number" min="1" max="4" value={genNumImages} onChange={e => setGenNumImages(parseInt(e.target.value, 10))} className="w-full bg-component-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow"/>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleGenerateImage} disabled={!genPrompt.trim() || isLoading} className="flex-1 bg-accent-khaki text-white rounded-lg p-2 disabled:opacity-50 hover:bg-opacity-90 transition-colors">Generate</button>
                        <button onClick={() => setShowGenerationPanel(false)} className="bg-border-color text-text-primary rounded-lg p-2 hover:bg-opacity-80 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        ) : (
            <>
                {uploadedImage && (
                    <div className="relative mb-2 w-24 h-24">
                        <img src={uploadedImage.url} alt="upload preview" className="w-full h-full object-cover rounded-lg" />
                        <button onClick={() => setUploadedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">&times;</button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-border-color transition-colors" aria-label="Attach file"><PaperclipIcon /></button>
                <button type="button" onClick={() => { setShowGenerationPanel(true); setUploadedImage(null); }} className="p-2 rounded-full hover:bg-border-color transition-colors" aria-label="Generate image"><SparklesIcon /></button>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-base-bg border border-border-color rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-yellow"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="bg-accent-khaki text-white rounded-full p-2 disabled:opacity-50 hover:bg-opacity-90 transition-colors"
                    disabled={isLoading || (!input.trim() && !uploadedImage)}
                    aria-label="Send message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
                </form>
            </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
