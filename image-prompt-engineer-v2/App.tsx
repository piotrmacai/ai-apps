
import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { generatePromptFromImage, editImageWithPrompt } from './services/geminiService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Button } from './components/Button';
import { ImageInputArea } from './components/ImageInputArea';
import { GeneratedImageView } from './components/GeneratedImageView';
import { JsonPromptEditor } from './components/JsonPromptEditor';
import { ChatbotPanel } from './components/ChatbotPanel';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import {
  StructuredPrompt,
  parsePromptToStructured,
  structuredPromptToString,
  createDefaultStructuredPrompt
} from './utils/promptUtils';

interface UserImage {
  base64: string;
  mimeType: string;
  objectURL: string;
}

type PromptFormat = 'text' | 'json' | 'yaml';

const App: React.FC = () => {
  const [userImage, setUserImage] = useState<UserImage | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [structuredPrompt, setStructuredPrompt] = useState<StructuredPrompt | null>(null);
  const [generatedAiImage, setGeneratedAiImage] = useState<string | null>(null);
  
  const [promptFormat, setPromptFormat] = useState<PromptFormat>('text');
  const [editorValue, setEditorValue] = useState<string>('');
  
  const [isLoadingPrompt, setIsLoadingPrompt] = useState<boolean>(false);
  const [isLoadingAiImage, setIsLoadingAiImage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.API_KEY;

  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    setGeneratedPrompt(''); 
    setStructuredPrompt(null);
    setGeneratedAiImage(null); 
    setEditorValue('');
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUserImage({
          base64: base64String,
          mimeType: file.type,
          objectURL: URL.createObjectURL(file),
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process image.');
    }
  }, []);

  const handleGeneratePrompt = useCallback(async () => {
    if (!userImage || !apiKey) {
      setError(!apiKey ? 'API key is missing.' : 'Please upload an image first.');
      return;
    }
    setIsLoadingPrompt(true);
    setError(null);
    setGeneratedPrompt(''); 
    setStructuredPrompt(null);
    setGeneratedAiImage(null); 
    setEditorValue('');
    try {
      const prompt = await generatePromptFromImage(apiKey, userImage.base64, userImage.mimeType);
      setGeneratedPrompt(prompt);
    } catch (err) {
      setError('Failed to generate prompt.');
    } finally {
      setIsLoadingPrompt(false);
    }
  }, [userImage, apiKey]);

  const handleEditImage = useCallback(async () => {
    if (!generatedPrompt.trim() || !apiKey || !userImage) {
      setError('Please generate a prompt and upload an image.');
      return;
    }
    setIsLoadingAiImage(true);
    setError(null);
    try {
      const imageUrl = await editImageWithPrompt(apiKey, generatedPrompt, userImage.base64, userImage.mimeType);
      setGeneratedAiImage(imageUrl);
    } catch (err) {
      setError('Failed to generate AI image.');
    } finally {
      setIsLoadingAiImage(false);
    }
  }, [generatedPrompt, apiKey, userImage]);

  const copyPromptToClipboard = useCallback(() => {
    const textToCopy = promptFormat === 'text' ? generatedPrompt : editorValue;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => alert('Copied!'));
    }
  }, [generatedPrompt, promptFormat, editorValue]);

  const handleFormatChange = useCallback((newFormat: PromptFormat) => {
    setPromptFormat(newFormat);
    if (!structuredPrompt) return;
    if (newFormat === 'json') setEditorValue(JSON.stringify(structuredPrompt, null, 2));
    else if (newFormat === 'yaml') setEditorValue(yamlStringify(structuredPrompt));
    else setEditorValue(generatedPrompt);
  }, [structuredPrompt, generatedPrompt]);

  const handleEditorChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (promptFormat === 'text') {
        setGeneratedPrompt(val);
    } else {
        setEditorValue(val);
        try {
            let newStructured: any = promptFormat === 'json' ? JSON.parse(val) : yamlParse(val);
            if (newStructured && typeof newStructured === 'object') {
                setStructuredPrompt(newStructured as StructuredPrompt);
                setGeneratedPrompt(structuredPromptToString(newStructured as StructuredPrompt));
            }
        } catch (e) {}
    }
  }, [promptFormat]);

  const handleStructuredPromptPartChange = useCallback((updatedStructuredPrompt: StructuredPrompt) => {
    setStructuredPrompt(updatedStructuredPrompt);
    setGeneratedPrompt(structuredPromptToString(updatedStructuredPrompt));
  }, []);

  useEffect(() => {
    if (!structuredPrompt || promptFormat === 'text') return;
    if (promptFormat === 'json') setEditorValue(JSON.stringify(structuredPrompt, null, 2));
    else if (promptFormat === 'yaml') setEditorValue(yamlStringify(structuredPrompt));
  }, [structuredPrompt, promptFormat]);

  useEffect(() => {
    if (isLoadingPrompt) return; 
    const currentStr = structuredPrompt ? structuredPromptToString(structuredPrompt) : null;
    if (generatedPrompt && generatedPrompt !== currentStr) {
      try {
        setStructuredPrompt(parsePromptToStructured(generatedPrompt));
      } catch (e) {
        setStructuredPrompt(createDefaultStructuredPrompt());
      }
    } else if (!generatedPrompt) {
      setStructuredPrompt(null);
    }
  }, [generatedPrompt, isLoadingPrompt]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-neutral-100 selection:bg-white selection:text-black">
      <header className="py-6 text-center border-b border-neutral-800 bg-black/80 backdrop-blur-md">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">AI Image Prompt Engineer</h1>
        <p className="text-neutral-400 mt-2 text-sm">Upload an image, generate a prompt, and refine with AI.</p>
      </header>

      {error && (
        <div className="w-full max-w-7xl mx-auto mt-4 px-4">
          <div className="bg-red-900/50 border border-red-800 text-red-200 p-4 rounded-lg text-sm animate-shake">{error}</div>
        </div>
      )}

      <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 h-full">
          
          {/* Column 1: Media Panel */}
          <div className="space-y-6 flex flex-col">
            <section className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold text-neutral-400 mb-4 border-b border-neutral-800 pb-2 uppercase tracking-widest">1. Upload Source</h2>
              <ImageInputArea onImageUploaded={handleImageUpload} currentImageUrl={userImage?.objectURL} />
            </section>

             <section className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col flex-grow min-h-[400px]">
              <h2 className="text-sm font-bold text-neutral-400 mb-4 border-b border-neutral-800 pb-2 uppercase tracking-widest">3. Result</h2>
              <div className="flex-grow flex flex-col justify-center">
                {isLoadingAiImage ? (
                  <div className="flex flex-col items-center py-10 text-neutral-400">
                    <LoadingSpinner size="lg" />
                    <span className="mt-3 text-sm">Rendering...</span>
                  </div>
                ) : <GeneratedImageView imageUrl={generatedAiImage} prompt={generatedPrompt} />}
              </div>
            </section>
          </div>

          {/* Column 2: Editor Panel */}
          <div className="space-y-6 flex flex-col">
            <section className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b border-neutral-800 pb-2">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">2. Prompt Editor</h2>
                <div className="flex space-x-1 bg-black p-1 rounded-lg border border-neutral-800">
                  {(['text', 'json', 'yaml'] as PromptFormat[]).map((fmt) => (
                      <button key={fmt} onClick={() => handleFormatChange(fmt)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${promptFormat === fmt ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-200'}`}>{fmt.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <textarea
                  value={promptFormat === 'text' ? generatedPrompt : editorValue}
                  onChange={handleEditorChange}
                  className="w-full min-h-[150px] p-4 bg-black border border-neutral-800 rounded-lg text-neutral-200 focus:ring-1 focus:ring-white font-mono text-xs leading-relaxed"
                  placeholder="The AI-generated prompt will appear here..."
                  disabled={isLoadingPrompt || isLoadingAiImage}
              />
              <Button onClick={copyPromptToClipboard} variant="secondary" size="sm" className="mt-3 w-full py-2 text-[10px] uppercase font-bold tracking-widest">Copy to Clipboard</Button>
            </section>

            <section className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm flex-grow">
              <h2 className="text-sm font-bold text-neutral-400 mb-4 border-b border-neutral-800 pb-2 uppercase tracking-widest">Detailed Parameters</h2>
              <div className="h-full">
                {isLoadingPrompt ? <div className="flex justify-center py-10"><LoadingSpinner size="md" /></div> : 
                  structuredPrompt ? <JsonPromptEditor structuredPrompt={structuredPrompt} onStructuredPromptChange={handleStructuredPromptPartChange} disabled={isLoadingAiImage} /> :
                  <div className="text-center text-neutral-600 text-xs py-10 border border-dashed border-neutral-800 rounded-lg">No active prompt data.</div>
                }
              </div>
            </section>
          </div>

          {/* Column 3: AI Chatbot Panel */}
          <div className="flex flex-col h-full">
            <ChatbotPanel 
              apiKey={apiKey} 
              currentPrompt={structuredPrompt} 
              onUpdatePrompt={handleStructuredPromptPartChange} 
              disabled={isLoadingPrompt || isLoadingAiImage} 
            />
          </div>

        </div>
      </main>

      <footer className="sticky-footer bg-black/90 backdrop-blur-md p-4 border-t border-neutral-800">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-2 gap-4">
          <Button onClick={handleGeneratePrompt} disabled={!userImage || isLoadingPrompt || isLoadingAiImage || !apiKey} className="py-4 text-xs font-bold tracking-widest uppercase">
            {isLoadingPrompt ? <LoadingSpinner size="sm" color="text-black" /> : 'Analyze Image'}
          </Button>
          <Button onClick={handleEditImage} disabled={!generatedPrompt.trim() || !userImage || isLoadingAiImage || isLoadingPrompt || !apiKey} className="py-4 text-xs font-bold tracking-widest uppercase" variant="secondary">
            {isLoadingAiImage ? <LoadingSpinner size="sm" color="text-white" /> : 'Generate Image'}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default App;
