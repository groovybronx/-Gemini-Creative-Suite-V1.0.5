
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import type { ImageEditingConversation, EditEvent } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import RecallIcon from './icons/RecallIcon';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const parseDataUrl = (dataUrl: string): { base64: string; mimeType: string } | null => {
    const match = dataUrl.match(/^data:(image\/.+);base64,(.+)$/);
    if (!match) return null;
    const [, mimeType, base64] = match;
    return { mimeType, base64 };
}

interface ImageEditorProps {
    conversationId: string | null;
    onSessionCreated: (id: string) => void;
    onViewImage: (images: string[], startIndex: number) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ conversationId, onSessionCreated, onViewImage }) => {
  const [baseImage, setBaseImage] = useState<{ url: string; base64: string; mimeType: string; } | null>(null);
  const [history, setHistory] = useState<EditEvent[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number>(-1); // -1 for base image
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState<{ analysis: boolean; edit: boolean }>({ analysis: false, edit: false });
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [thumbnailSize, setThumbnailSize] = useState(4); // in rem (4rem = 64px)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentConversationIdRef = useRef<string | null>(conversationId);

  useEffect(() => {
    currentConversationIdRef.current = conversationId;
    const loadConversation = async () => {
      if (conversationId) {
        const convo = await dbService.getConversation(conversationId);
        if (convo && convo.type === 'imageEditing') {
          setBaseImage(convo.baseImage);
          const loadedHistory = convo.history || [];
          setHistory(loadedHistory);
          setActiveHistoryIndex(loadedHistory.length - 1); // Set active to the latest image
          setAnalysisResult(convo.analysisResult);
          setPrompt('');
        }
      } else {
        // Reset for new session
        setBaseImage(null);
        setHistory([]);
        setActiveHistoryIndex(-1);
        setAnalysisResult(null);
        setPrompt('');
      }
    };
    loadConversation();
  }, [conversationId]);
  
  const saveSession = async (data: Partial<Omit<ImageEditingConversation, 'id' | 'createdAt' | 'isFavorite' | 'type' | 'title'>>) => {
      let convoId = currentConversationIdRef.current;
      const title = `Edit: ${baseImage ? 'Image Session' : 'New Session'}...`;

      if (!convoId && baseImage) {
        convoId = Date.now().toString();
        currentConversationIdRef.current = convoId;
        const newConversation: ImageEditingConversation = {
          id: convoId,
          title,
          createdAt: Date.now(),
          isFavorite: false,
          type: 'imageEditing',
          baseImage,
          history: data.history || [],
          analysisResult: data.analysisResult,
        };
        await dbService.addOrUpdateConversation(newConversation);
        onSessionCreated(convoId);
      } else if (convoId) {
        const existingConvo = await dbService.getConversation(convoId);
        if (existingConvo && existingConvo.type === 'imageEditing') {
          const updatedConvo: ImageEditingConversation = {
            ...existingConvo,
            ...data,
          };
          await dbService.addOrUpdateConversation(updatedConvo);
        }
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      const newBaseImage = {
        url: URL.createObjectURL(file),
        base64,
        mimeType: file.type,
      };
      setBaseImage(newBaseImage);
      setHistory([]);
      setActiveHistoryIndex(-1);
      setAnalysisResult(null);
      setPrompt('');
      
      currentConversationIdRef.current = null; // Force creation of a new session
      await saveSession({ baseImage: newBaseImage, history: [] });
    }
  };

  const handleAnalyze = async () => {
    if (!baseImage) return;
    setIsLoading({ ...isLoading, analysis: true });
    setAnalysisResult(null);
    const result = await geminiService.analyzeImage(baseImage.base64, baseImage.mimeType, 'Describe this image in detail.');
    setAnalysisResult(result);
    setIsLoading({ ...isLoading, analysis: false });
    await saveSession({ analysisResult: result, history });
  };

  const handleEdit = async () => {
    const sourceImage = activeHistoryIndex === -1 ? baseImage : history[activeHistoryIndex]?.editedImage;
    if (!sourceImage || !prompt.trim()) return;

    setIsLoading({ ...isLoading, edit: true });
    
    // If editing from a past point, truncate the history to create a new branch
    const newHistoryBase = history.slice(0, activeHistoryIndex + 1);

    const resultUrl = await geminiService.editImage(sourceImage.base64, sourceImage.mimeType, prompt);
    
    if(resultUrl) {
        const parsedData = parseDataUrl(resultUrl);
        if (parsedData) {
            const newEvent: EditEvent = {
                prompt,
                editedImage: {
                    url: resultUrl,
                    base64: parsedData.base64,
                    mimeType: parsedData.mimeType,
                },
                timestamp: Date.now()
            };
            const newHistory = [...newHistoryBase, newEvent];
            setHistory(newHistory);
            setActiveHistoryIndex(newHistory.length - 1); // Set new image as active
            await saveSession({ history: newHistory, analysisResult });
        }
    }
    
    setPrompt(''); // Clear prompt after submission
    setIsLoading({ ...isLoading, edit: false });
  };
  
  const displayImage = activeHistoryIndex === -1 ? baseImage?.url : history[activeHistoryIndex]?.editedImage.url;

  return (
    <div className="bg-component-bg rounded-lg border border-border-color h-full flex flex-col overflow-hidden">
        <div className="p-6 pb-0 flex-shrink-0">
            <h2 className="text-2xl font-bold text-accent-yellow">Analyze & Edit Image</h2>
        </div>
        <div className="flex-1 flex overflow-hidden relative p-6 pt-4">
            {/* Main Image Display */}
            <div className="flex-1 flex flex-col gap-4 items-center justify-center min-w-0 pr-4">
                <div className="w-full h-full flex items-center justify-center bg-base-bg rounded-lg p-4 border border-border-color">
                    {displayImage ? (
                    <img
                        src={displayImage}
                        alt="Uploaded or Edited"
                        className="max-h-full max-w-full object-contain rounded-md cursor-pointer"
                        onClick={() => displayImage && onViewImage([displayImage], 0)}
                    />
                    ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-text-secondary border-2 border-dashed border-border-color rounded-lg p-8 hover:bg-base-bg/80 transition-colors"
                    >
                        Click to upload an image
                    </button>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />
                </div>
                 {baseImage && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors w-full max-w-md"
                        >
                        Change Image
                    </button>
                )}
            </div>
            
            {/* Retractable Panel */}
            <div className={`flex-shrink-0 bg-base-bg border-l border-border-color rounded-lg transition-all duration-300 ease-in-out ${isPanelOpen ? 'w-96' : 'w-0'} overflow-hidden`}>
                <div className="p-4 h-full overflow-y-auto w-96 flex flex-col gap-4">
                    {baseImage && (
                        <>
                        <div className="flex flex-col gap-2">
                            <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Add a retro filter..."
                            className="w-full h-20 bg-component-bg border border-border-color rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-accent-yellow"
                            disabled={isLoading.edit}
                            />
                            <button
                            onClick={handleEdit}
                            disabled={isLoading.edit || !prompt.trim()}
                            className="bg-accent-khaki text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 hover:bg-opacity-90 transition-colors w-full"
                            >
                            {isLoading.edit ? <SpinnerIcon className="w-5 h-5 mx-auto" /> : 'Apply Edit'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 border-t border-border-color pt-4">
                            {analysisResult && (
                                <div>
                                    <h3 className="font-semibold text-text-secondary mb-1">Analysis:</h3>
                                    <div className="bg-component-bg p-3 rounded-lg text-sm whitespace-pre-wrap">{analysisResult}</div>
                                </div>
                            )}
                            {(baseImage || history.length > 0) && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold text-text-secondary">Edit History:</h3>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-text-secondary">Size:</label>
                                            <input type="range" min="4" max="12" value={thumbnailSize} onChange={e => setThumbnailSize(Number(e.target.value))} className="w-20 cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {/* Original Image */}
                                        <div 
                                            onClick={() => setActiveHistoryIndex(-1)}
                                            className={`bg-component-bg p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${activeHistoryIndex === -1 ? 'ring-2 ring-accent-yellow' : 'hover:bg-border-color'}`}>
                                            <img src={baseImage.url} alt="Original" className="object-contain rounded-md flex-shrink-0 bg-black/20" style={{width: `${thumbnailSize}rem`, height: `${thumbnailSize}rem`}}/>
                                            <p className="text-sm italic text-text-secondary flex-grow">Original Image</p>
                                        </div>
                                        {/* Edit History */}
                                        {history.map((event, index) => (
                                            <div 
                                                key={event.timestamp} 
                                                onClick={() => setActiveHistoryIndex(index)}
                                                className={`bg-component-bg p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${activeHistoryIndex === index ? 'ring-2 ring-accent-yellow' : 'hover:bg-border-color'}`}
                                            >
                                                <img src={event.editedImage.url} alt="Edit result" className="object-contain rounded-md flex-shrink-0 bg-black/20" style={{width: `${thumbnailSize}rem`, height: `${thumbnailSize}rem`}}/>
                                                <p className="text-sm italic text-text-primary flex-grow">"{event.prompt}"</p>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPrompt(event.prompt); }}
                                                    className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-border-color flex-shrink-0"
                                                    aria-label="Recall this prompt"
                                                    title="Recall this prompt"
                                                >
                                                    <RecallIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!isLoading.analysis && !analysisResult && (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isLoading.analysis}
                                    className="bg-accent-orange text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 hover:bg-opacity-90 transition-colors w-full"
                                >
                                    {isLoading.analysis ? <SpinnerIcon className="w-5 h-5 mx-auto" /> : 'Analyze Image'}
                                </button>
                            )}
                        </div>
                        </>
                    )}
                    {!baseImage && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-text-secondary text-center">Upload an image to start analyzing and editing.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Panel Toggle Button */}
            <button 
                onClick={() => setIsPanelOpen(!isPanelOpen)} 
                className="absolute top-1/2 -translate-y-1/2 bg-component-bg p-1 rounded-full border border-border-color z-10 transition-all duration-300 ease-in-out hover:bg-border-color"
                style={{ right: isPanelOpen ? '24rem' : '0.5rem' }}
            >
                {isPanelOpen ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
            </button>
        </div>
    </div>
  );
};

export default ImageEditor;
