import React, { useEffect, useRef, useState } from 'react';
import { Message, Sender, ImageAttachment, GeneratedImage, AspectRatio } from '../types';
import { IconSparkles, IconImage, IconSend, IconX, IconAspectRatio, IconLayers, IconBrush } from './Icons';

interface SidebarProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  onSend: () => void;
  isLoading: boolean;
  onReuseImage: (img: GeneratedImage) => void;
  activeReferenceImage: ImageAttachment | null;
  onClearReference: () => void;
  sessionTitle: string;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  numberOfImages: number;
  setNumberOfImages: (num: number) => void;
  useAsSource: boolean;
  setUseAsSource: (val: boolean) => void;
  onOpenSketch: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  messages,
  input,
  setInput,
  selectedFile,
  setSelectedFile,
  onSend,
  isLoading,
  onReuseImage,
  activeReferenceImage,
  onClearReference,
  sessionTitle,
  aspectRatio,
  setAspectRatio,
  numberOfImages,
  setNumberOfImages,
  useAsSource,
  setUseAsSource,
  onOpenSketch
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Menus
  const [showAspectRatioMenu, setShowAspectRatioMenu] = useState(false);
  const aspectRatioMenuRef = useRef<HTMLDivElement>(null);
  const [showCountMenu, setShowCountMenu] = useState(false);
  const countMenuRef = useRef<HTMLDivElement>(null);

  // Gemini supported ratios
  const aspectRatios: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const imageCounts = [1, 2, 3];

  // Manage Object URL lifecycle for preview
  useEffect(() => {
    if (selectedFile) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        // Cleanup
        return () => URL.revokeObjectURL(url);
    } else {
        setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aspectRatioMenuRef.current && !aspectRatioMenuRef.current.contains(event.target as Node)) {
        setShowAspectRatioMenu(false);
      }
      if (countMenuRef.current && !countMenuRef.current.contains(event.target as Node)) {
        setShowCountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const renderMessage = (msg: Message) => {
    const isAI = msg.sender === Sender.AI;
    
    return (
      <div key={msg.id} className={`mb-6 flex ${isAI ? 'justify-start' : 'justify-end'}`}>
        <div className={`flex flex-col max-w-[90%] ${isAI ? 'items-start' : 'items-end'}`}>
          
          {/* Avatar / Identity */}
          {isAI && (
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-primary">
              <IconSparkles className="w-4 h-4" />
              <span>AI Designer</span>
            </div>
          )}

          {/* Attachments (User uploaded) */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-2">
              {msg.attachments.map((att, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-surfaceHighlight w-48">
                  <img 
                    src={`data:${att.mimeType};base64,${att.data}`} 
                    alt="Attachment" 
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                    Source
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Text Content */}
          {msg.text && (
            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              isAI 
                ? 'bg-surfaceHighlight text-textMain rounded-tl-none' 
                : 'bg-accent text-white rounded-tr-none'
            }`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to calculate preview style
  const getPreviewStyle = () => {
    const [w, h] = aspectRatio.split(':').map(Number);
    return { aspectRatio: `${w} / ${h}` };
  };

  return (
    <div className="flex flex-col h-full bg-surface border-r border-surfaceHighlight w-full md:w-[400px] lg:w-[450px] shrink-0">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-surfaceHighlight bg-background/50 backdrop-blur">
        <div className="flex items-center gap-2 text-lg font-semibold text-textMain overflow-hidden">
          <span className="shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-accent text-black rounded flex items-center justify-center font-bold">AI</span>
          <span className="truncate">{sessionTitle || "New Project"}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-textMuted text-center p-8 opacity-50">
            <IconSparkles className="w-12 h-12 mb-4 text-primary" />
            <p className="text-sm">Start by describing an image, character, or scene to generate.</p>
          </div>
        )}
        {messages.map(renderMessage)}
        {isLoading && (
            <div className="flex justify-start mb-6">
                 <div className="bg-surfaceHighlight text-textMain px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 backdrop-blur border-t border-surfaceHighlight">
        
        {/* Pending Upload Preview - with Dynamic Aspect Ratio Cut */}
        {selectedFile && previewUrl && (
          <div className="flex items-center gap-3 mb-2 p-2 bg-surfaceHighlight rounded-xl w-full animate-in fade-in slide-in-from-bottom-1">
            {/* Dynamic Ratio Box */}
            <div className="relative h-16 shrink-0 bg-black border border-surfaceHighlight/50 rounded-lg overflow-hidden shadow-sm" style={getPreviewStyle()}>
                <img 
                    src={previewUrl} 
                    alt="preview" 
                    className="w-full h-full object-cover opacity-90"
                />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-medium text-textMain truncate">{selectedFile.name}</span>
                <div className="flex items-center gap-2 mt-1">
                     <label className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                        <input 
                            type="checkbox" 
                            checked={useAsSource} 
                            onChange={(e) => setUseAsSource(e.target.checked)}
                            className="w-3 h-3 rounded border-gray-600 bg-transparent text-primary focus:ring-0" 
                        />
                        <span className="text-[10px] text-textMuted">Use as source</span>
                     </label>
                </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => onOpenSketch(selectedFile)}
                    className="p-1.5 text-textMuted hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Sketch on this"
                >
                    <IconBrush className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => setSelectedFile(null)} 
                    className="p-1.5 text-textMuted hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <IconX className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>
        )}

        {/* Persistent Reference Preview (Only if no file selected) - with Dynamic Aspect Ratio Cut */}
        {!selectedFile && activeReferenceImage && (
           <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-surfaceHighlight/30 border border-primary/20 rounded-xl w-full animate-in fade-in slide-in-from-bottom-2">
                {/* Dynamic Ratio Box */}
                <div className="relative h-16 shrink-0 bg-black border border-surfaceHighlight rounded-lg overflow-hidden shadow-sm" style={getPreviewStyle()}>
                    <img 
                        src={`data:${activeReferenceImage.mimeType};base64,${activeReferenceImage.data}`} 
                        alt="Reference" 
                        className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary mb-0.5">Ref Image ({aspectRatio})</p>
                    <p className="text-[10px] text-textMuted truncate">New output will match this shape</p>
                </div>
                <button 
                    onClick={onClearReference} 
                    className="p-1.5 hover:bg-white/10 rounded-full text-textMuted hover:text-white transition-colors"
                    title="Clear reference"
                >
                    <IconX className="w-3.5 h-3.5" />
                </button>
            </div>
        )}

        <div className="relative flex items-end gap-2 bg-surfaceHighlight rounded-3xl p-2 border border-transparent focus-within:border-gray-600 transition-colors">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-textMuted hover:text-white transition-colors rounded-full hover:bg-white/10 shrink-0"
            title="Upload Image"
          >
            <IconImage className="w-6 h-6" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*"
          />
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeReferenceImage && !selectedFile ? "Describe changes..." : "Describe your idea..."}
            className="flex-1 bg-transparent text-textMain placeholder-textMuted text-sm focus:outline-none py-3 resize-none max-h-32"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          
           {/* Clear Button */}
           {input && (
            <button
                onClick={() => setInput('')}
                className="absolute right-[110px] top-3 p-1 text-textMuted hover:text-white rounded-full bg-surface/50"
            >
                <IconX className="w-3 h-3" />
            </button>
           )}
          
          {/* Controls Group */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Aspect Ratio Selector */}
            <div className="relative" ref={aspectRatioMenuRef}>
                <button
                onClick={() => setShowAspectRatioMenu(!showAspectRatioMenu)}
                className="p-2 text-textMuted hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center gap-1"
                title={`Aspect Ratio: ${aspectRatio}`}
                >
                <IconAspectRatio className="w-5 h-5" />
                <span className="text-[10px] font-medium w-6 text-center hidden md:block">{aspectRatio}</span>
                </button>
                
                {showAspectRatioMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-24 bg-surfaceHighlight border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    {aspectRatios.map((ratio) => (
                    <button
                        key={ratio}
                        onClick={() => {
                        setAspectRatio(ratio);
                        setShowAspectRatioMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/10 ${
                        aspectRatio === ratio ? 'text-primary bg-primary/10' : 'text-textMuted'
                        }`}
                    >
                        {ratio}
                    </button>
                    ))}
                </div>
                )}
            </div>

            {/* Image Count Selector */}
            <div className="relative" ref={countMenuRef}>
                <button
                    onClick={() => setShowCountMenu(!showCountMenu)}
                    className="p-2 text-textMuted hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center gap-1"
                    title={`Generate: ${numberOfImages} images`}
                >
                    <IconLayers className="w-5 h-5" />
                    <span className="text-[10px] font-medium w-3 text-center hidden md:block">{numberOfImages}</span>
                </button>
                
                {showCountMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-20 bg-surfaceHighlight border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    {imageCounts.map((num) => (
                    <button
                        key={num}
                        onClick={() => {
                        setNumberOfImages(num);
                        setShowCountMenu(false);
                        }}
                        className={`w-full text-center px-3 py-2 text-xs transition-colors hover:bg-white/10 ${
                        numberOfImages === num ? 'text-primary bg-primary/10' : 'text-textMuted'
                        }`}
                    >
                        {num}
                    </button>
                    ))}
                </div>
                )}
            </div>
          </div>

          <button 
            onClick={onSend}
            disabled={(!input.trim() && !selectedFile) || isLoading}
            className={`p-2 rounded-full transition-all duration-200 shrink-0 ${
              (!input.trim() && !selectedFile) || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-textMain text-background hover:bg-white'
            }`}
          >
            <IconSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};