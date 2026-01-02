
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, Trash2Icon, SaveIcon, PlusIcon, HistoryIcon } from './icons';
import { Session } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  onLoadSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
  onSaveSession: () => void;
  onNewSession: () => void;
  canSave: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  sessions, 
  onLoadSession, 
  onDeleteSession, 
  onSaveSession, 
  onNewSession,
  canSave
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          
          {/* Sidebar */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 bottom-0 w-80 bg-white z-50 shadow-2xl flex flex-col border-r border-gray-200"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-serif tracking-wider text-gray-800 flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-gray-600"/>
                History
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-4 grid grid-cols-2 gap-3 border-b border-gray-100 bg-white">
              <button
                onClick={onSaveSession}
                disabled={!canSave}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <SaveIcon className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">Save Current</span>
              </button>
              <button
                onClick={onNewSession}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-800 bg-gray-900 text-white hover:bg-gray-800 transition-all active:scale-95 shadow-md"
              >
                <PlusIcon className="w-5 h-5 mb-1" />
                <span className="text-xs font-semibold">New Session</span>
              </button>
            </div>

            {/* Session List */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50/30">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center p-4">
                  <HistoryIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No saved sessions yet.</p>
                  <p className="text-xs mt-1">Generate a look and save it to see it here.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                    onClick={() => onLoadSession(session)}
                  >
                    <div className="relative aspect-[3/4] w-full bg-gray-100">
                      <img 
                        src={session.thumbnailUrl} 
                        alt="Session thumbnail" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 shadow-sm"
                        title="Delete Session"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
