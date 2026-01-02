import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Sidebar } from './components/Sidebar';
import { SessionSidebar } from './components/SessionSidebar';
import { MainGallery } from './components/MainGallery';
import { SketchModal } from './components/SketchModal';
import { Message, GeneratedImage, Sender, ImageAttachment, Session, AspectRatio } from './types';
import { generateOrEditImage, fileToBase64 } from './services/geminiService';

// --- Types ---
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// --- Helper Functions ---
const createNewSession = (): Session => ({
  id: Date.now().toString(),
  title: '',
  messages: [],
  gallery: [],
  activeReferenceImage: null,
  lastModified: Date.now(),
  aspectRatio: '3:4',
  numberOfImages: 1,
});

const App: React.FC = () => {
  // --- State: Theme ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aidesigner_theme') as 'light' | 'dark' || 'dark';
    }
    return 'dark';
  });

  // --- State: Sessions ---
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = localStorage.getItem('aidesigner_sessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse sessions", e);
    }
    return [createNewSession()];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem('aidesigner_current_id') || '';
    } catch { return ''; }
  });

  // --- State: UI & Data ---
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [useAsSource, setUseAsSource] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- State: Sketching ---
  const [isSketchOpen, setIsSketchOpen] = useState(false);
  const [sketchBaseImage, setSketchBaseImage] = useState<string | null>(null);
  const [isSketch, setIsSketch] = useState(false); // Flag to track if current input is a sketch

  // --- Effects ---

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('aidesigner_theme', theme);
  }, [theme]);

  // Ensure active session
  useEffect(() => {
    if (!sessions.find(s => s.id === currentSessionId)) {
      if (sessions.length > 0) setCurrentSessionId(sessions[0].id);
      else {
        const newS = createNewSession();
        setSessions([newS]);
        setCurrentSessionId(newS.id);
      }
    }
  }, [sessions, currentSessionId]);

  // Persist Sessions
  useEffect(() => {
    try {
      localStorage.setItem('aidesigner_sessions', JSON.stringify(sessions));
      localStorage.setItem('aidesigner_current_id', currentSessionId);
    } catch (e) {
      addToast("Local storage full. Older data might be lost.", 'error');
    }
  }, [sessions, currentSessionId]);

  // Reset flags when file changes naturally
  useEffect(() => {
    if (selectedFile) {
        setUseAsSource(true);
        // If it's a manual upload, it's not a sketch unless explicitly set by handleSaveSketch
        // We only reset isSketch if it was just a raw upload, but handleSaveSketch sets it to true immediately after this fires.
        // Actually, handleSaveSketch sets state. 
        // We'll rely on the handler setting it to true.
        // If user manually clicks upload, we should set isSketch(false).
        // BUT selectedFile changes in handleSaveSketch too.
        // We will reset isSketch in the handleFileSelect wrapper in Sidebar instead.
    }
  }, [selectedFile]);

  // --- Computed ---
  const activeSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId) || sessions[0], 
  [sessions, currentSessionId]);

  // --- Actions ---

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const updateCurrentSession = useCallback((updater: (session: Session) => Session) => {
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...updater(s), lastModified: Date.now() } : s
    ));
  }, [currentSessionId]);

  const handleCreateSession = useCallback(() => {
    const newSession = createNewSession();
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput('');
    setSelectedFile(null);
    setIsSketch(false);
  }, []);

  const handleDeleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return filtered.length === 0 ? [createNewSession()] : filtered;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    // Capture state at moment of send
    const currentInput = input;
    const currentFile = selectedFile;
    const currentAspectRatio = activeSession.aspectRatio;
    const currentNumImages = activeSession.numberOfImages || 1;
    const shouldUseSource = useAsSource;
    const currentIsSketch = isSketch; // Capture the sketch flag

    // Reset UI
    setInput('');
    setSelectedFile(null);
    setIsSketch(false); // Reset sketch flag for next turn
    setIsLoading(true);

    let attachmentForRequest: ImageAttachment | undefined = undefined;
    let messageAttachments: ImageAttachment[] = [];
    
    // Process Upload
    if (currentFile) {
      try {
        const base64 = await fileToBase64(currentFile);
        const newAttachment = { mimeType: currentFile.type, data: base64 };
        messageAttachments.push(newAttachment);
        
        if (shouldUseSource) {
            attachmentForRequest = newAttachment;
            // Update persistent reference
            updateCurrentSession(s => ({ ...s, activeReferenceImage: newAttachment }));
        } else {
            // Fallback to existing reference if not using new file as source
            if (activeSession.activeReferenceImage) {
                attachmentForRequest = activeSession.activeReferenceImage;
            }
        }
      } catch (e) {
        console.error("File error", e);
        addToast("Failed to process image.", 'error');
        setIsLoading(false);
        return;
      }
    } else {
      // No file uploaded, use existing reference
      if (activeSession.activeReferenceImage) {
        attachmentForRequest = activeSession.activeReferenceImage;
      }
    }

    // Create User Message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: currentInput,
      attachments: messageAttachments,
      timestamp: Date.now()
    };

    updateCurrentSession(s => {
      const newMessages = [...s.messages, userMessage];
      let newTitle = s.title;
      if (!newTitle) {
          if (currentInput) newTitle = currentInput.slice(0, 30);
          else if (currentFile) newTitle = currentIsSketch ? "Sketch Edit" : "Image Upload";
          else newTitle = "New Generation";
      }
      return { ...s, messages: newMessages, title: newTitle || "Project" };
    });

    try {
      // API Call
      const imageBytesArray = await generateOrEditImage(
          currentInput, 
          currentAspectRatio, 
          currentNumImages, 
          attachmentForRequest,
          currentIsSketch // Pass the flag!
      );

      const generatedImages: GeneratedImage[] = imageBytesArray.map((bytes, idx) => ({
        id: `${Date.now()}-${idx}`,
        data: bytes,
        prompt: currentInput || (attachmentForRequest ? "Variation" : "Generated Image"),
        timestamp: Date.now()
      }));

      // Create AI Response Text
      const countText = generatedImages.length > 1 ? ` ${generatedImages.length} images` : '';
      let aiText = "";
      
      if (currentIsSketch) {
         aiText = `I've realized your sketch${countText} with: "${currentInput}" (${currentAspectRatio})`;
      } else if (attachmentForRequest && !currentFile) {
         aiText = `Updated based on reference: "${currentInput}" (${currentAspectRatio})`;
      } else if (attachmentForRequest && currentFile) {
         aiText = currentInput 
            ? `Variation based on upload: "${currentInput}"`
            : `Variation of your uploaded image`;
      } else {
        aiText = `Generated${countText}: "${currentInput}" (${currentAspectRatio})`;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: aiText,
        generatedImages: generatedImages,
        timestamp: Date.now()
      };

      updateCurrentSession(s => ({
        ...s,
        messages: [...s.messages, aiMessage],
        gallery: [...s.gallery, ...generatedImages]
      }));

    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: `Error: ${error.message || "Something went wrong."}`,
        timestamp: Date.now()
      };
      updateCurrentSession(s => ({ ...s, messages: [...s.messages, errorMessage] }));
      addToast("Generation failed", 'error');
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedFile, isLoading, activeSession, updateCurrentSession, useAsSource, isSketch]);

  // --- Sketching Handlers ---
  const handleOpenSketchForFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        setSketchBaseImage(e.target?.result as string);
        setIsSketchOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenSketchForGenerated = (img: GeneratedImage) => {
    setSketchBaseImage(`data:image/png;base64,${img.data}`);
    setIsSketchOpen(true);
  };

  const handleSaveSketch = (dataUrl: string) => {
    // Convert DataURL to File
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const file = new File([u8arr], "sketch.png", { type: mime });

    setSelectedFile(file);
    setUseAsSource(true);
    setIsSketch(true); // CRITICAL: Mark as sketch for prompt engineering
    setInput("Apply changes based on my sketch");
    addToast("Sketch saved as input", 'success');
  };

  // --- Reuse Image ---
  const handleReuseImage = useCallback((img: GeneratedImage) => {
    fetch(`data:image/png;base64,${img.data}`)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "reused-image.png", { type: "image/png" });
        setSelectedFile(file);
        setUseAsSource(true);
        setIsSketch(false); // Reusing is not sketching
        setInput("");
        addToast("Image set as reference", 'info');
      });
  }, []);

  const handleClearReference = useCallback(() => {
    updateCurrentSession(s => ({ ...s, activeReferenceImage: null }));
    addToast("Reference cleared", 'info');
  }, [updateCurrentSession]);

  if (!activeSession) return <div className="flex h-screen items-center justify-center bg-background text-textMain">Loading...</div>;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          isLoading={isLoading}
          theme={theme}
          toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        />

        <Sidebar 
            messages={activeSession.messages}
            input={input}
            setInput={setInput}
            selectedFile={selectedFile}
            setSelectedFile={(f) => {
                setSelectedFile(f);
                if (f) setIsSketch(false); // Reset sketch if manually picking file
            }}
            onSend={handleSend}
            isLoading={isLoading}
            onReuseImage={handleReuseImage}
            activeReferenceImage={activeSession.activeReferenceImage}
            onClearReference={handleClearReference}
            sessionTitle={activeSession.title}
            aspectRatio={activeSession.aspectRatio}
            setAspectRatio={(r) => updateCurrentSession(s => ({ ...s, aspectRatio: r }))}
            numberOfImages={activeSession.numberOfImages || 1}
            setNumberOfImages={(n) => updateCurrentSession(s => ({ ...s, numberOfImages: n }))}
            useAsSource={useAsSource}
            setUseAsSource={setUseAsSource}
            onOpenSketch={handleOpenSketchForFile}
        />

        <MainGallery 
            images={activeSession.gallery}
            onReuseImage={handleReuseImage}
            onSketchImage={handleOpenSketchForGenerated}
        />

        <SketchModal 
            isOpen={isSketchOpen}
            onClose={() => setIsSketchOpen(false)}
            initialImageSrc={sketchBaseImage}
            onSave={handleSaveSketch}
        />
        
        {/* Toast Portal */}
        {ReactDOM.createPortal(
            <div id="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
                        t.type === 'error' ? 'bg-red-600' : 
                        t.type === 'success' ? 'bg-green-600' : 'bg-gray-800'
                    }`}>
                        {t.message}
                    </div>
                ))}
            </div>,
            document.body
        )}
    </div>
  );
};

export default App;