





import React from 'react';
import { t } from '../i18n';
import { HomeIcon } from './icons/HomeIcon';
import { NewAlbumIcon } from './icons/NewAlbumIcon';
import { EditSidebarIcon } from './icons/EditSidebarIcon';
import { DevModeIcon } from './icons/DevModeIcon';

interface SidebarProps {
  onNewAlbum: () => void;
  onGoHome: () => void;
  onGoToEditor: () => void;
  isDevMode: boolean;
  onToggleDevMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewAlbum, onGoHome, onGoToEditor, isDevMode, onToggleDevMode }) => {
  return (
    <aside className="w-16 bg-[#0D0D0D] flex flex-col items-center py-4 space-y-6 flex-shrink-0 border-r border-white/10">
      <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white" title="ArchiDesigner">
        {/* Architecture / Building Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4 8 4v14"/>
            <path d="M8 21v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <rect x="10" y="9" width="4" height="4"/>
        </svg>
      </div>
      <div className="flex flex-col items-center space-y-4">
        <button onClick={onGoHome} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg" aria-label={t('home')}>
          <HomeIcon />
        </button>
        <button onClick={onNewAlbum} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg" aria-label={t('newAlbum')}>
          <NewAlbumIcon />
        </button>
        <button onClick={onGoToEditor} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg" aria-label={t('editDirectly')}>
          <EditSidebarIcon />
        </button>
      </div>

      <div className="flex-1"></div>

      <div className="flex flex-col items-center space-y-4">
        <button 
            onClick={onToggleDevMode} 
            className={`p-2 rounded-lg transition-colors ${isDevMode ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
            aria-label={t('devMode')}
            title={t('devMode')}
        >
          <DevModeIcon />
        </button>
      </div>
    </aside>
  );
};
