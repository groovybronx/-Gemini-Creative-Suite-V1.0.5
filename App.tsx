
import React, { useState, useCallback, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import ImageEditor from './components/ImageEditor';
import ImageViewer from './components/ImageViewer';
import HistorySidebar from './components/HistorySidebar';
import ThemeSelector from './components/ThemeSelector';
import SettingsIcon from './components/icons/SettingsIcon';
import { dbService } from './services/dbService';
import type { Conversation, ImageEditingConversation } from './types';

type ActiveView = 'chat' | 'edit';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [galleryData, setGalleryData] = useState<{ images: string[]; currentIndex: number } | null>(null);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchConversations = async () => {
      const allConvos = await dbService.getAllConversations();
      setConversations(allConvos);
    };
    fetchConversations();
  }, [refreshTrigger]);

  const handleSessionCreated = useCallback((id: string) => {
    setCurrentConversationId(id);
    setRefreshTrigger(t => t + 1);
  }, []);

  const handleSelectConversation = useCallback(async (id: string) => {
    const convo = await dbService.getConversation(id);
    if (convo) {
      switch (convo.type) {
        case 'chat':
          setActiveView('chat');
          break;
        case 'imageGeneration':
          // Deprecated view, stay in chat view but load the session.
          // Or even better, hide them from sidebar. For now, we just don't switch.
           setActiveView('chat');
          break;
        case 'imageEditing':
          setActiveView('edit');
          break;
      }
      setCurrentConversationId(id);
    }
  }, []);

  const handleNewSession = useCallback(() => {
    setCurrentConversationId(null);
    // When creating a new session, the active view remains the same,
    // but its content is reset because conversationId becomes null.
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await dbService.deleteConversation(id);
    setConversations(prevConvos => prevConvos.filter(c => c.id !== id));
    if (currentConversationId === id) {
        setCurrentConversationId(null);
    }
  }, [currentConversationId]);
  
  const handleToggleFavorite = useCallback(async (id: string) => {
    const convo = conversations.find(c => c.id === id);
    if(convo){
        const updatedConvo = {...convo, isFavorite: !convo.isFavorite };
        await dbService.addOrUpdateConversation(updatedConvo);
        setConversations(convos => convos.map(c => c.id === id ? updatedConvo : c));
    }
  }, [conversations]);

  const handleStartEditing = useCallback(async (imageUrl: string) => {
    const match = imageUrl.match(/^data:(image\/.+);base64,(.+)$/);
    if (!match) {
        console.error("Invalid image URL format for editing");
        return;
    }
    const [, mimeType, base64] = match;

    const newConversation: ImageEditingConversation = {
        id: Date.now().toString(),
        title: `Edit of generated image...`,
        createdAt: Date.now(),
        isFavorite: false,
        type: 'imageEditing',
        baseImage: { url: imageUrl, base64, mimeType },
        history: [],
    };

    await dbService.addOrUpdateConversation(newConversation);
    setActiveView('edit');
    setCurrentConversationId(newConversation.id);
    setRefreshTrigger(t => t + 1);
  }, []);

  const handleViewImage = (images: string[], startIndex: number) => {
    setGalleryData({ images, currentIndex: startIndex });
  };

  const handleCloseViewer = () => {
    setGalleryData(null);
  };

  const handleNavigateGallery = (newIndex: number) => {
    if (galleryData) {
        if (newIndex >= 0 && newIndex < galleryData.images.length) {
            setGalleryData({ ...galleryData, currentIndex: newIndex });
        }
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'chat':
        return <ChatWindow
                    onViewImage={handleViewImage}
                    conversationId={currentConversationId}
                    onConversationCreated={handleSessionCreated}
                    onEditImage={handleStartEditing}
                />;
      case 'edit':
        return <ImageEditor 
                    onViewImage={handleViewImage} 
                    conversationId={currentConversationId}
                    onSessionCreated={handleSessionCreated}
                />;
      default:
        return <ChatWindow
                    onViewImage={handleViewImage}
                    conversationId={currentConversationId}
                    onConversationCreated={handleSessionCreated}
                    onEditImage={handleStartEditing}
                />;
    }
  };

  const NavButton: React.FC<{
    view: ActiveView;
    label: string;
  }> = ({ view, label }) => (
    <button
      onClick={() => {
          setActiveView(view);
          setCurrentConversationId(null);
      }}
      className={`px-4 py-2 rounded-md font-semibold transition-colors ${
        activeView === view
          ? 'bg-accent-yellow text-gray-900'
          : 'bg-base-bg hover:bg-border-color'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-screen w-screen p-4 flex flex-col gap-4 font-sans">
      <header className="flex-shrink-0 bg-component-bg p-2 rounded-lg border border-border-color flex items-center justify-between">
        <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-accent-khaki" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor"/></svg>
            <h1 className="text-xl font-bold text-text-primary">Gemini Creative Suite</h1>
        </div>
        <div className="flex items-center gap-2">
            <nav className="flex gap-2 bg-base-bg p-1 rounded-lg">
                <NavButton view="chat" label="Chatbot" />
                <NavButton view="edit" label="Edit Image" />
            </nav>
            <button
                onClick={() => setIsThemeSelectorOpen(true)}
                className="p-2 rounded-lg bg-base-bg hover:bg-border-color transition-colors"
                aria-label="Open theme settings"
            >
                <SettingsIcon />
            </button>
        </div>
      </header>
      <main className="flex-grow min-h-0 flex gap-4">
        <HistorySidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewSession}
            onDeleteConversation={handleDeleteConversation}
            onToggleFavorite={handleToggleFavorite}
        />
        <div className="flex-grow min-h-0">
         {renderView()}
        </div>
      </main>
      {galleryData && (
        <ImageViewer
          images={galleryData.images}
          currentIndex={galleryData.currentIndex}
          onClose={handleCloseViewer}
          onNavigate={handleNavigateGallery}
        />
      )}
      {isThemeSelectorOpen && (
        <ThemeSelector onClose={() => setIsThemeSelectorOpen(false)} />
      )}
    </div>
  );
};

export default App;
