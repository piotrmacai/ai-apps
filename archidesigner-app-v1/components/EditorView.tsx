


import React, { useState, useRef, useEffect } from 'react';
import { ImageVariation } from '../types';
import { remixImageWithReference } from '../services/geminiService';
import { t } from '../i18n';
import { Spinner } from './Spinner';
import { EditorVariationSelector } from './EditorVariationSelector';

interface EditorViewProps {
  image: ImageVariation;
  onDone: (newImage?: ImageVariation) => void;
  isDevMode: boolean;
}

export const EditorView: React.FC<EditorViewProps> = ({ image, onDone }) => {
  const [currentImage, setCurrentImage] = useState(image);
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<{ url: string, file: File } | null>(null);
  
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating'>('idle');
  const [variationsToSelect, setVariationsToSelect] = useState<ImageVariation[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setGenerationStatus('generating');
    
    try {
        const sourceBase64 = currentImage.imageUrl.split(',')[1];
        const sourceMime = currentImage.imageUrl.substring(currentImage.imageUrl.indexOf(':') + 1, currentImage.imageUrl.indexOf(';'));
        
        let refData = null;
        if (referenceImage) {
            const reader = new FileReader();
            const refBase64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(referenceImage.file);
            });
            refData = { base64Data: refBase64, mimeType: referenceImage.file.type };
        }

        const results = await remixImageWithReference(
            { base64Data: sourceBase64, mimeType: sourceMime },
            refData,
            prompt
        );
        
        const variations = results.map((b64, i) => ({
            id: `mod-${Date.now()}-${i}`,
            title: `Modification ${i+1}`,
            description: prompt,
            imageUrl: `data:${sourceMime};base64,${b64}`,
            createdAt: new Date(),
        }));
        
        setVariationsToSelect(variations);
        setGenerationStatus('idle');

    } catch (e) {
        console.error("Modification error", e);
        // Could set an error state here
        setGenerationStatus('idle');
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setReferenceImage({
              url: URL.createObjectURL(file),
              file: file
          });
      }
  };

  const removeReference = () => {
      if (referenceImage) {
          URL.revokeObjectURL(referenceImage.url);
          setReferenceImage(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  // Cleanup object URL
  useEffect(() => {
      return () => {
          if (referenceImage) URL.revokeObjectURL(referenceImage.url);
      }
  }, []);

  return (
    <div className="flex h-full bg-[#131314]">
       {/* Left Panel: Canvas / Preview */}
       <div className="flex-1 bg-[#0D0D0D] flex flex-col min-w-0">
          <header className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                 <span className="text-gray-400">Modifier Studio /</span> {currentImage.title}
              </h2>
              <button 
                onClick={() => onDone()}
                className="text-gray-400 hover:text-white"
              >
                  {t('close')}
              </button>
          </header>
          
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
              <img 
                src={currentImage.imageUrl} 
                alt="Editing" 
                className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
              />
              {generationStatus === 'generating' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <Spinner size="lg" />
                      <p className="text-white mt-4 font-medium animate-pulse">Transforming Architecture...</p>
                  </div>
              )}
          </div>
       </div>

       {/* Right Sidebar: Modification Controls */}
       <div className="w-96 bg-[#1E1F22] border-l border-white/10 flex flex-col shadow-xl">
          <div className="p-6 flex-1 overflow-y-auto space-y-8">
              
              {/* Reference Image Section */}
              <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t('referenceImageLabel')}</label>
                  
                  {!referenceImage ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-600 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-white/5 transition-all group"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-blue-400 mb-2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          <span className="text-sm text-gray-400 group-hover:text-gray-200">{t('uploadReferencePlaceholder')}</span>
                      </div>
                  ) : (
                      <div className="relative group rounded-xl overflow-hidden border border-white/10">
                          <img src={referenceImage.url} alt="Reference" className="w-full h-40 object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeReference(); }}
                                className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                          </div>
                      </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleReferenceUpload}
                  />
                  <p className="text-xs text-gray-500">Optional. Upload a photo to copy its material style or lighting.</p>
              </div>

              {/* Prompt Section */}
              <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t('modificationPromptLabel')}</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('modificationPromptPlaceholder')}
                    className="w-full h-32 bg-[#131314] rounded-xl border border-white/10 p-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
              </div>

          </div>
          
          <div className="p-6 border-t border-white/10 bg-[#131314]">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generationStatus !== 'idle'}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                    !prompt.trim() || generationStatus !== 'idle'
                    ? 'bg-gray-700 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                }`}
              >
                  {generationStatus === 'generating' ? (
                      <Spinner />
                  ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M9 22v-4a3 3 0 0 1 6 0v4"/><path d="M12 2v8"/></svg>
                        {t('renderModification')}
                      </>
                  )}
              </button>
          </div>
       </div>

       {/* Variations Selector Modal */}
       {variationsToSelect && (
           <EditorVariationSelector 
              variations={variationsToSelect} 
              onSelect={(selected) => {
                  onDone(selected);
                  setVariationsToSelect(null);
              }}
              onCancel={() => setVariationsToSelect(null)}
           />
       )}
    </div>
  );
};