
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { OutfitLayer } from '../types';
import { Trash2Icon, UploadCloudIcon, XIcon } from './icons';

interface OutfitStackProps {
  outfitHistory: OutfitLayer[];
  onRemoveLastGarment: () => void;
  backgroundImageUrl: string | null;
  onUploadBackground: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBackground: () => void;
  isLoading: boolean;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ 
  outfitHistory, 
  onRemoveLastGarment,
  backgroundImageUrl,
  onUploadBackground,
  onRemoveBackground,
  isLoading
}) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Background Section */}
      <div className="flex flex-col">
        <h2 className="text-xl font-serif tracking-wider text-gray-800 border-b border-gray-400/50 pb-2 mb-3">Scene Background</h2>
        <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-gray-300 bg-white flex-shrink-0 shadow-sm">
            {backgroundImageUrl ? (
              <img src={backgroundImageUrl} alt="Background" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <span className="text-[10px] font-bold text-center leading-tight uppercase tracking-tighter">Original<br/>Scene</span>
              </div>
            )}
          </div>
          <div className="flex-grow flex flex-col gap-2">
            <label className={`flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-white border border-gray-300 rounded-lg shadow-sm transition-all active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 text-gray-700'}`}>
              <UploadCloudIcon className="w-4 h-4 mr-2" />
              {backgroundImageUrl ? 'Change' : 'Upload BG'}
              <input 
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/webp"
                onChange={onUploadBackground}
                disabled={isLoading}
              />
            </label>
            {backgroundImageUrl && (
              <button 
                onClick={onRemoveBackground}
                disabled={isLoading}
                className="flex items-center justify-center w-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <Trash2Icon className="w-3.5 h-3.5 mr-2" />
                Remove BG
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scene Stack Section */}
      <div className="flex flex-col">
        <h2 className="text-xl font-serif tracking-wider text-gray-800 border-b border-gray-400/50 pb-2 mb-3">Scene Stack</h2>
        <div className="space-y-2">
          {/* Background Layer in Stack */}
          {backgroundImageUrl && (
            <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 shadow-sm animate-fade-in">
              <div className="flex items-center overflow-hidden">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mr-3 text-[10px] font-bold text-indigo-600 bg-indigo-100 rounded-full">
                  BG
                </span>
                <img src={backgroundImageUrl} alt="Background Layer" className="flex-shrink-0 w-12 h-12 object-cover rounded-md mr-3 border border-indigo-200" />
                <span className="font-semibold text-indigo-900 truncate text-sm">
                  Custom Background
                </span>
              </div>
              <button
                onClick={onRemoveBackground}
                disabled={isLoading}
                className="flex-shrink-0 text-indigo-400 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {outfitHistory.map((layer, index) => (
            <div
              key={layer.garment?.id || 'base'}
              className={`flex items-center justify-between p-2 rounded-lg animate-fade-in border shadow-sm ${index === 0 ? 'bg-gray-50 border-gray-200' : 'bg-white/50 border-gray-200/80'}`}
            >
              <div className="flex items-center overflow-hidden">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-gray-600 bg-gray-200 rounded-full">
                    {index + 1}
                  </span>
                  {layer.garment && (
                      <img src={layer.garment.url} alt={layer.garment.name} className="flex-shrink-0 w-12 h-12 object-cover rounded-md mr-3" />
                  )}
                  <span className={`font-semibold truncate text-sm ${index === 0 ? 'text-gray-600' : 'text-gray-800'}`} title={layer.garment?.name}>
                    {layer.garment ? layer.garment.name : 'Base Model'}
                  </span>
              </div>
              {index > 0 && index === outfitHistory.length - 1 && (
                <button
                  onClick={onRemoveLastGarment}
                  disabled={isLoading}
                  className="flex-shrink-0 text-gray-500 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Remove ${layer.garment?.name}`}
                >
                  <Trash2Icon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OutfitStack;
