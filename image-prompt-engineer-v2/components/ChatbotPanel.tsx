
import React, { useState, useRef, useEffect } from 'react';
import { StructuredPrompt } from '../utils/promptUtils';
import { refinePromptWithAI } from '../services/geminiService';
import { LoadingSpinner } from './LoadingSpinner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotPanelProps {
  apiKey: string | undefined;
  currentPrompt: StructuredPrompt | null;
  onUpdatePrompt: (newPrompt: StructuredPrompt) => void;
  disabled: boolean;
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ apiKey, currentPrompt, onUpdatePrompt, disabled }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if (!inputValue.trim() || !apiKey || !currentPrompt || isProcessing) return;

    const userMsg = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const updatedPrompt = await refinePromptWithAI(apiKey, currentPrompt, userMsg);
      onUpdatePrompt(updatedPrompt);
      setMessages(prev => [...prev, { role: 'assistant', content: "I've updated the prompt based on your request. Check the editors to see the changes!" }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble processing that request. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-neutral-800 bg-black/40">
        <h2 className="text-lg font-semibold text-white tracking-wide flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          AI Assistant
        </h2>
        <p className="text-xs text-neutral-500 mt-1">Ask me to change specific parts of your prompt.</p>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center py-10 opacity-50 flex flex-col items-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
             </svg>
             <p className="text-sm">Try: "Change the style to vintage oil painting" or "Add a neon sunset to the background"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-white text-black font-medium' 
                : 'bg-neutral-800 text-neutral-200 border border-neutral-700'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 border border-neutral-700 p-3 rounded-xl flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span className="text-xs text-neutral-400">Refining prompt...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-black border-t border-neutral-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={currentPrompt ? "How should I change the prompt?" : "Generate a prompt first..."}
            disabled={!currentPrompt || disabled || isProcessing}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-full py-2.5 pl-4 pr-12 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-white transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || disabled || isProcessing || !currentPrompt}
            className="absolute right-2 p-1.5 bg-white text-black rounded-full hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
