
import React, { useState, useRef, useEffect } from 'react';
import { t } from '../i18n';
import { WebSearchToggle } from './WebSearchToggle';
import { AspectRatioSelector } from './AspectRatioSelector';

interface ChatInputProps {
  onSend: (prompt: string, imageFiles: File[], useWebSearch: boolean, aspectRatio: string, sourceImageUrl?: string) => void;
  prefilledImage?: File | null;
  prefilledPrompt?: string;
  onPrefillConsumed?: () => void;
  isDisabled?: boolean;
  hasActiveImage?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  prefilledImage,
  prefilledPrompt,
  onPrefillConsumed,
  isDisabled = false,
  hasActiveImage = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const consumedRef = useRef({ image: false, prompt: false });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  useEffect(() => {
    // This effect handles adding a single prefilled image from the gallery
    if (prefilledImage && !consumedRef.current.image) {
      const newFiles = [...imageFiles, prefilledImage];
      setImageFiles(newFiles);
      const newUrls = [...imageUrls, URL.createObjectURL(prefilledImage)];
      setImageUrls(newUrls);
      consumedRef.current.image = true;
      onPrefillConsumed?.();
    }
    // Clean up URLs when component unmounts or files change
    return () => {
      imageUrls.forEach(URL.revokeObjectURL);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledImage, onPrefillConsumed]);

  useEffect(() => {
    if (prefilledPrompt && !consumedRef.current.prompt) {
      setPrompt(prefilledPrompt);
      consumedRef.current.prompt = true;
      onPrefillConsumed?.();
    }
  }, [prefilledPrompt, onPrefillConsumed]);

  useEffect(() => {
    // This effect is to handle the case where the parent component might reset the prefills
    if (!prefilledImage) {
        consumedRef.current.image = false;
    }
    if (!prefilledPrompt) {
        consumedRef.current.prompt = false;
    }
  }, [prefilledImage, prefilledPrompt]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // FIX: Add explicit File[] type to ensure correct type inference in the map function below.
      const files: File[] = Array.from(e.target.files);
      const newFiles = [...imageFiles, ...files];
      setImageFiles(newFiles);

      const newUrls = files.map(file => URL.createObjectURL(file));
      setImageUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handleSend = () => {
    // Enable send if we have a prompt AND (files OR an active context image)
    if ((prompt.trim() && (imageFiles.length > 0 || hasActiveImage)) && onSend) {
      onSend(prompt.trim(), imageFiles, useWebSearch, aspectRatio);
      setPrompt('');
      setImageFiles([]);
      setImageUrls([]);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      consumedRef.current = { image: false, prompt: false };
    }
  };

  const handleRotate = (direction: 'left' | 'right') => {
    // Allow rotation if we have an active image reference or current uploads
    if (!hasActiveImage && imageFiles.length === 0) return;
    
    // Construct a high-fidelity prompt for architectural novel view synthesis
    const rotationPrompt = direction === 'left' 
        ? "Novel View Synthesis: Rotate the building view 90 degrees to the LEFT to reveal the LEFT SIDE facade. \n\nCRITICAL CONSTRAINTS:\n1. IDENTITY PRESERVATION: You MUST use the exact same materials (brick color, siding type, roof style, window frame style) as the reference image.\n2. GEOMETRY EXTRAPOLATION: Logically extend the horizontal lines of the facade to the new side. Do not change the architectural style.\n3. PERSPECTIVE: Generate a photorealistic 3/4 perspective showing the front and left side." 
        : "Novel View Synthesis: Rotate the building view 90 degrees to the RIGHT to reveal the RIGHT SIDE facade. \n\nCRITICAL CONSTRAINTS:\n1. IDENTITY PRESERVATION: You MUST use the exact same materials (brick color, siding type, roof style, window frame style) as the reference image.\n2. GEOMETRY EXTRAPOLATION: Logically extend the horizontal lines of the facade to the new side. Do not change the architectural style.\n3. PERSPECTIVE: Generate a photorealistic 3/4 perspective showing the front and right side.";
    
    // We send this immediately
    if (onSend) {
        onSend(rotationPrompt, imageFiles, useWebSearch, aspectRatio);
        // Clear inputs after triggering the command
        setPrompt('');
        setImageFiles([]);
        setImageUrls([]);
        if(fileInputRef.current) {
             fileInputRef.current.value = "";
        }
        consumedRef.current = { image: false, prompt: false };
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
    });
  }

  const hasContext = imageFiles.length > 0 || hasActiveImage;

  return (
    <div className="bg-[#1C1C1E] rounded-2xl flex flex-col p-2.5 shadow-lg w-full">
      {/* Top Section: Inputs */}
      <div className="flex w-full items-start gap-2">
         {/* Uploaded Images Preview */}
         {imageFiles.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
             {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img src={url} alt={`Upload preview ${index + 1}`} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                <button 
                  onClick={() => removeImage(index)}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold border-2 border-[#1C1C1E] hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove image ${index + 1}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasActiveImage ? "Describe changes, new background, or rotation..." : t('chatPlaceholder')}
            className="bg-transparent text-white placeholder-gray-500 focus:outline-none text-base w-full px-1 resize-none py-2 max-h-[120px]"
            disabled={isDisabled}
        />
      </div>
      
      {/* Bottom Toolbar */}
      <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                multiple
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors"
                disabled={isDisabled}
                title="Upload new image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            <WebSearchToggle isEnabled={useWebSearch} onToggle={setUseWebSearch} />
        </div>

        <div className="flex items-center gap-2">
            {/* Active Image Indicator moved here */}
            {hasActiveImage && imageFiles.length === 0 && (
                <div className="flex items-center gap-1.5 mr-2 px-2 py-1 rounded bg-blue-900/20 border border-blue-500/20">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Ref Active</span>
                </div>
            )}

            <div className="h-4 w-px bg-white/10 mx-1"></div>

            <AspectRatioSelector selectedRatio={aspectRatio} onSelectRatio={setAspectRatio} />
            
            {/* Rotation Controls */}
            <div className="flex items-center gap-1 mx-1">
                <button
                    onClick={() => handleRotate('left')}
                    disabled={isDisabled || !hasContext}
                    title={t('rotateLeft')}
                    className="p-1.5 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                </button>
                <button
                    onClick={() => handleRotate('right')}
                    disabled={isDisabled || !hasContext}
                    title={t('rotateRight')}
                    className="p-1.5 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                        <path d="M21 3v5h-5"/>
                    </svg>
                </button>
            </div>

            <button
                onClick={handleSend}
                disabled={!prompt.trim() || !hasContext || isDisabled}
                className="ml-2 p-2 rounded-lg bg-white text-black hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
        </div>
      </div>
    </div>
  );
};
