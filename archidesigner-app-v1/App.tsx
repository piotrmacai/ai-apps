

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DashboardView } from './components/DashboardView';
import { AlbumView } from './components/AlbumView';
import { EditorView } from './components/EditorView';
import { Sidebar } from './components/Sidebar';
import type { Album, ImageVariation } from './types';
import { saveAlbumsToDB, loadAlbumsFromDB } from './utils/storage';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'album' | 'editor'>('dashboard');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(() => {
    return localStorage.getItem('ai-product-studio-active-album-id') || null;
  });
  
  const [imageToEdit, setImageToEdit] = useState<ImageVariation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  const activeAlbum = albums.find(a => a.id === activeAlbumId);

  // Load albums from IndexedDB on mount
  useEffect(() => {
    loadAlbumsFromDB().then(loadedAlbums => {
      setAlbums(loadedAlbums);
      setIsDataLoaded(true);
    });
  }, []);

  // Save albums to IndexedDB whenever they change
  useEffect(() => {
    if (isDataLoaded) {
        saveAlbumsToDB(albums);
    }
  }, [albums, isDataLoaded]);

  // Save active album ID to localStorage
  useEffect(() => {
    if (activeAlbumId) {
      localStorage.setItem('ai-product-studio-active-album-id', activeAlbumId);
    } else {
      localStorage.removeItem('ai-product-studio-active-album-id');
    }
  }, [activeAlbumId]);


  const handleCreateNewProject = useCallback((switchToNew = true) => {
    const newAlbum: Album = {
      id: Date.now().toString(),
      title: `Residence Project ${albums.length + 1}`,
      chatHistory: [],
      galleryImages: [],
      createdAt: new Date(),
    };
    setAlbums(prev => [...prev, newAlbum]);
    if (switchToNew) {
      setActiveAlbumId(newAlbum.id);
      setView('album');
    }
    return newAlbum;
  }, [albums.length]);

  // Effect to handle initial routing once data is loaded
  useEffect(() => {
    if (!isDataLoaded) return;

    if (albums.length === 0) {
      // First time user, create a new project and switch to it
      handleCreateNewProject(true);
    } else {
      // Returning user, ensure there's a valid active album
      let currentActiveId = activeAlbumId;
      if (!currentActiveId || !albums.some(a => a.id === currentActiveId)) {
        // If active ID is missing or invalid, set to the most recent album
        const latestAlbum = [...albums].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        if (latestAlbum) {
          setActiveAlbumId(latestAlbum.id);
          currentActiveId = latestAlbum.id;
        }
      }
      // If we have a valid album, go directly to it, otherwise stay on the dashboard
      if (currentActiveId && view === 'dashboard') {
        // Only switch if we are still on dashboard (initial load)
        // setView('album'); // removed auto-switch to album to let user see dashboard on return
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded]); 

  const handleSelectAlbum = (albumId: string) => {
    setActiveAlbumId(albumId);
    setView('album');
  };

  const updateAlbum = (updatedAlbum: Album) => {
    setAlbums(prev => prev.map(a => a.id === updatedAlbum.id ? updatedAlbum : a));
  };
  
  const handleGoToEditor = (image: ImageVariation) => {
    setImageToEdit(image);
    setView('editor');
  };

  const handleGoToEditorDirectly = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelectedForEditing = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const tempImage: ImageVariation = {
        id: `direct-edit-${Date.now()}`,
        title: file.name,
        description: 'Directly uploaded for editing',
        imageUrl: imageUrl,
        createdAt: new Date(),
      };
      setImageToEdit(tempImage);
      setView('editor');
    };
    reader.readAsDataURL(file);
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleReturnFromEditor = (newImage?: ImageVariation) => {
    const wasDirectEdit = imageToEdit?.id.startsWith('direct-edit-');
    
    if (newImage && activeAlbum) {
      const updatedAlbum = {
        ...activeAlbum,
        galleryImages: [...activeAlbum.galleryImages, newImage]
      };
      updateAlbum(updatedAlbum);
    }
    setImageToEdit(null);
    
    if (wasDirectEdit) {
        handleGoHome();
    } else {
        setView('album');
    }
  };
  
  const handleGoHome = () => {
    setView('dashboard');
  }

  const renderView = () => {
    if (!isDataLoaded) {
        return <div className="h-full flex items-center justify-center"><div className="initial-loader"></div></div>;
    }

    switch (view) {
      case 'editor':
        if (!imageToEdit) {
          setView('album'); 
          return null;
        }
        return <EditorView image={imageToEdit} onDone={handleReturnFromEditor} isDevMode={isDevMode} />;
      case 'album':
        if (!activeAlbum) {
          setView('dashboard');
          return null;
        }
        return <AlbumView album={activeAlbum} onUpdateAlbum={updateAlbum} onEditImage={handleGoToEditor} />;
      case 'dashboard':
      default:
        return <DashboardView albums={albums} onSelectAlbum={handleSelectAlbum} onNewAlbum={() => handleCreateNewProject(true)} />;
    }
  };

  return (
    <div className="h-screen bg-[#0D0D0D] text-gray-200 flex">
      <Sidebar 
        onNewAlbum={() => handleCreateNewProject(true)} 
        onGoHome={handleGoHome} 
        onGoToEditor={handleGoToEditorDirectly}
        isDevMode={isDevMode}
        onToggleDevMode={() => setIsDevMode(prev => !prev)}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelectedForEditing}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      <div className="flex-1 h-full overflow-y-auto">
        {renderView()}
      </div>
    </div>
  );
};

export default App;
