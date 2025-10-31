

import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import type { AspectRatio, ImagenModel, ImageGenerationConversation, GenerationEvent } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import EditIcon from './icons/EditIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import RecallIcon from './icons/RecallIcon';

const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const imagenModels: ImagenModel[] = ['imagen-3.0-generate-002', 'imagen-4.0-generate-001', 'imagen-4.0-ultra-generate-001', 'imagen-4.0-fast-generate-001'];

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="relative group flex items-center">
        <span className="text-text-secondary text-xs border border-text-secondary rounded-full w-4 h-4 flex items-center justify-center ml-1 cursor-help">?</span>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-64 p-2 bg-border-color text-text-primary text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {text}
        </div>
    </div>
);

interface ImageGeneratorProps {
    conversationId: string | null;
    onSessionCreated: (id: string) => void;
    onViewImage: (url: string) => void;
    onEditImage: (imageUrl: string) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ conversationId, onSessionCreated, onViewImage, onEditImage }) => {
  // UI State
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true);
  const [gridCols, setGridCols] = useState(2);
  
  // Basic settings
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  const [model, setModel] = useState<ImagenModel>('imagen-3.0-generate-002');
  const [numberOfImages, setNumberOfImages] = useState(4);
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [outputMimeType, setOutputMimeType] = useState<'image/jpeg' | 'image/png'>('image/png');

  const [history, setHistory] = useState<GenerationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentConversationIdRef = useRef<string | null>(conversationId);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  
  const resetForm = () => {
    setPrompt('');
    setAspectRatio('3:4');
    setModel('imagen-3.0-generate-002');
    setNumberOfImages(4);
    setOutputMimeType('image/png');
  }

  useEffect(() => {
    currentConversationIdRef.current = conversationId;
    const loadConversation = async () => {
      if (conversationId) {
        const convo = await dbService.getConversation(conversationId);
        if (convo && convo.type === 'imageGeneration') {
          setHistory(convo.history);
          if (convo.history.length > 0) {
            const lastEvent = convo.history[convo.history.length - 1];
            const p = lastEvent.parameters;
            setPrompt(''); // Clear prompt for new generation
            setAspectRatio(p.aspectRatio);
            setModel(p.model);
            setNumberOfImages(p.numberOfImages);
            setOutputMimeType(p.outputMimeType || 'image/png');
          } else {
             resetForm();
          }
          setError(null);
        }
      } else {
        resetForm();
        setHistory([]);
        setError(null);
      }
    };
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleRecallPrompt = (event: GenerationEvent) => {
    setPrompt(event.prompt);
    const p = event.parameters;
    setAspectRatio(p.aspectRatio);
    setModel(p.model);
    setNumberOfImages(p.numberOfImages);
    setOutputMimeType(p.outputMimeType || 'image/png');
    setIsSettingsPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    const currentPrompt = prompt;

    const params: GenerationEvent['parameters'] = {
      model,
      aspectRatio,
      numberOfImages,
      outputMimeType,
    };

    const result = await geminiService.generateImage(currentPrompt, params);

    if (result) {
      const newEvent: GenerationEvent = {
        prompt: currentPrompt,
        parameters: params,
        generatedImages: result,
        timestamp: Date.now()
      };
      
      setHistory(prev => [...prev, newEvent]);
      setPrompt('');

      let convoId = currentConversationIdRef.current;
      if (!convoId) {
        convoId = Date.now().toString();
        currentConversationIdRef.current = convoId;
        const newConversation: ImageGenerationConversation = {
          id: convoId,
          title: currentPrompt.substring(0, 40) + (currentPrompt.length > 40 ? '...' : ''),
          createdAt: Date.now(),
          isFavorite: false,
          type: 'imageGeneration',
          history: [newEvent]
        };
        await dbService.addOrUpdateConversation(newConversation);
        onSessionCreated(convoId);
      } else {
        const existingConvo = await dbService.getConversation(convoId);
        if (existingConvo && existingConvo.type === 'imageGeneration') {
            existingConvo.history.push(newEvent);
            await dbService.addOrUpdateConversation(existingConvo);
        }
      }
    } else {
      setError('Failed to generate image. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-component-bg rounded-lg border border-border-color h-full flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
        <div className="flex justify-between items-center flex-shrink-0">
            <h2 className="text-2xl font-bold text-accent-yellow">Generate Image with Imagen</h2>
            <div className="flex items-center gap-3">
                <label htmlFor="size-slider" className="text-sm font-semibold text-text-secondary">Image Size:</label>
                <input 
                    id="size-slider" 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="1" 
                    value={gridCols} 
                    onChange={e => setGridCols(Number(e.target.value))} 
                    className="w-24 cursor-pointer"
                />
                <button
                  onClick={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
                  className="bg-base-bg p-2 rounded-lg border border-border-color hover:bg-border-color transition-colors"
                  aria-label={isSettingsPanelOpen ? 'Hide settings panel' : 'Show settings panel'}
                  title={isSettingsPanelOpen ? 'Hide settings panel' : 'Show settings panel'}
                >
                    {isSettingsPanelOpen ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
        <div className="flex-grow w-full h-full space-y-6">
            {history.map((event, eventIndex) => (
                <div key={event.timestamp}>
                    <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-text-secondary">Prompt: <span className="text-text-primary italic">"{event.prompt}"</span></p>
                        <button
                            onClick={() => handleRecallPrompt(event)}
                            className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-border-color"
                            aria-label="Recall this prompt and its settings"
                            title="Recall this prompt and its settings"
                        >
                            <RecallIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className={`grid grid-cols-${gridCols} gap-4`}>
                        {event.generatedImages.map((image, imgIndex) => (
                            <div key={imgIndex} className="relative group aspect-square">
                                <img
                                src={image}
                                alt={`Generated by Imagen ${imgIndex + 1}`}
                                className="w-full h-full object-contain rounded-md bg-base-bg"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                    <button onClick={() => onViewImage(image)} className="text-white font-bold hover:underline">View</button>
                                    <button onClick={() => onEditImage(image)} className="text-white font-bold hover:underline flex items-center gap-1.5">
                                        <EditIcon className="w-5 h-5" />
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {eventIndex < history.length -1 && <hr className="my-6 border-border-color" />}
                </div>
            ))}
             {isLoading && <div className="flex justify-center pt-10"><SpinnerIcon className="w-12 h-12 text-accent-yellow" /></div>}
             {error && <p className="text-red-400 text-center">{error}</p>}
             {!isLoading && history.length === 0 && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-text-secondary text-center">Your generated images will appear here.</p>
                </div>
             )}
            <div ref={resultsEndRef} />
        </div>
      </div>

      {/* Retractable Settings Panel */}
      <div className={`flex-shrink-0 bg-base-bg border-l border-border-color transition-all duration-300 ease-in-out ${isSettingsPanelOpen ? 'w-96' : 'w-0'} overflow-hidden`}>
            <div className="p-6 h-full overflow-y-auto w-96">
                <h3 className="text-xl font-bold text-accent-yellow mb-4">Settings</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A futuristic city skyline at sunset, cinematic lighting"
                        className="w-full h-32 bg-component-bg border border-border-color rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-accent-yellow"
                        disabled={isLoading}
                    />
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="model-select" className="font-semibold text-text-secondary text-sm">Model:</label>
                            <select id="model-select" value={model} onChange={e => setModel(e.target.value as ImagenModel)} className="w-full mt-1 bg-component-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow" disabled={isLoading}>
                                {imagenModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aspect-ratio" className="font-semibold text-text-secondary text-sm">Aspect Ratio:</label>
                            <select id="aspect-ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full mt-1 bg-component-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow" disabled={isLoading}>
                                {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="num-images" className="font-semibold text-text-secondary text-sm">Number of Images:</label>
                            <input id="num-images" type="number" min="1" max="4" value={numberOfImages} onChange={e => setNumberOfImages(parseInt(e.target.value, 10))} className="w-full mt-1 bg-component-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow" disabled={isLoading}/>
                        </div>
                    </div>
                    <div>
                        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-semibold text-accent-yellow hover:underline">
                            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                        </button>
                        {showAdvanced && (
                            <div className="mt-3 flex flex-col gap-4 border border-border-color bg-component-bg p-4 rounded-lg">
                                <div>
                                    <label htmlFor="output-mime" className="font-semibold text-text-secondary text-sm">File Type:</label>
                                    <select id="output-mime" value={outputMimeType} onChange={e => setOutputMimeType(e.target.value as 'image/jpeg' | 'image/png')} className="w-full mt-1 bg-base-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow" disabled={isLoading}>
                                        <option value="image/png">PNG</option>
                                        <option value="image/jpeg">JPEG</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-auto">
                        <button
                            type="submit"
                            className="w-full bg-accent-khaki text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 hover:bg-opacity-90 transition-colors"
                            disabled={isLoading || !prompt.trim()}
                            >
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                </form>
            </div>
      </div>
    </div>
  );
};

export default ImageGenerator;