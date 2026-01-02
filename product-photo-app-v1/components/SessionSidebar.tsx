
import React from 'react';
import { Session } from '../types';
import { IconPlus, IconMessage, IconTrash, IconSun, IconMoon } from './Icons';

interface SessionSidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  isLoading,
  theme,
  toggleTheme
}) => {
  return (
    <div className="w-[260px] flex-shrink-0 flex flex-col h-full bg-surface border-r border-surfaceHighlight transition-colors duration-300">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={onCreateSession}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-primary hover:opacity-90 text-background rounded-xl transition-all shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed border border-surfaceHighlight"
        >
          <IconPlus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="px-4 py-2 text-xs font-bold text-textMuted uppercase tracking-wider">
          History
        </div>
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => !isLoading && onSelectSession(session.id)}
            className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border border-transparent ${
              session.id === currentSessionId
                ? 'bg-surfaceHighlight text-textMain border-border'
                : 'text-textMuted hover:bg-surfaceHighlight/50 hover:text-textMain'
            } ${isLoading ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <IconMessage className={`w-4 h-4 shrink-0 ${session.id === currentSessionId ? 'text-primary' : 'text-textMuted'}`} />
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {session.title || "Untitled Project"}
              </div>
              <div className="text-[10px] opacity-60">
                {new Date(session.lastModified).toLocaleDateString()}
              </div>
            </div>

            {/* Delete Button - Visible on hover or if active */}
            {sessions.length > 1 && (
                <button
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className={`opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-600 rounded-md transition-all ${
                        session.id === currentSessionId ? 'opacity-100' : ''
                    }`}
                    title="Delete Session"
                    disabled={isLoading}
                >
                    <IconTrash className="w-3.5 h-3.5" />
                </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info & Theme Toggle */}
      <div className="p-4 border-t border-surfaceHighlight bg-surface">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surfaceHighlight/50 hover:bg-surfaceHighlight text-textMain transition-colors mb-4"
        >
            <div className="flex items-center gap-2 text-xs font-medium">
                {theme === 'dark' ? <IconMoon className="w-4 h-4" /> : <IconSun className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-background rounded-full transition-transform shadow-sm ${theme === 'dark' ? 'left-4' : 'left-0.5'}`}></div>
            </div>
        </button>

        <div className="flex items-center gap-2 text-[10px] text-textMuted font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span>Gemini 2.5 Flash Image</span>
        </div>
      </div>
    </div>
  );
};