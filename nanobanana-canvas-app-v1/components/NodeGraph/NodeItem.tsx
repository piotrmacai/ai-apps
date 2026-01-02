import React, { useRef, useState, useEffect } from 'react';
import { Node, NodeType, NODE_CONFIG, Port, StructuredPrompt } from '../../types';
import { X, Play, Upload, Image as ImageIcon, Type as TypeIcon, Loader2, Ratio, ScanEye, Maximize2, Minimize2, FileJson, FileText, Brush, Eraser, RotateCcw, Wand2 } from 'lucide-react';

interface NodeItemProps {
  node: Node;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portId: string, type: 'source' | 'target') => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, portId: string, type: 'source' | 'target') => void;
  onDataChange: (nodeId: string, data: any) => void;
  onRun?: (nodeId: string) => void;
}

const EMPTY_JSON: StructuredPrompt = {
    subject: "",
    background: "",
    imageType: "",
    style: "",
    texture: "",
    colorPalette: "",
    lighting: "",
    additionalDetails: ""
};

const JSON_LABELS: Record<keyof StructuredPrompt, string> = {
    subject: "Subject",
    background: "Background",
    imageType: "Image Type",
    style: "Style",
    texture: "Texture",
    colorPalette: "Color Palette",
    lighting: "Lighting",
    additionalDetails: "Details"
};

const parseTextToJson = (text: string): StructuredPrompt => {
    if (!text) return { ...EMPTY_JSON };
    
    const extracted: StructuredPrompt = { ...EMPTY_JSON };
    
    // Iterate through known labels to find their positions in the text string
    const indices: { key: keyof StructuredPrompt, index: number }[] = [];
    
    (Object.entries(JSON_LABELS) as [keyof StructuredPrompt, string][]).forEach(([key, label]) => {
        // Look for "Label:" (case insensitive)
        const regex = new RegExp(`${label}:`, 'i');
        const match = text.match(regex);
        if (match && match.index !== undefined) {
            indices.push({ key, index: match.index });
        }
    });

    // Sort by position in text
    indices.sort((a, b) => a.index - b.index);

    // Extract values between indices
    indices.forEach((item, i) => {
        const nextItem = indices[i + 1];
        const start = item.index + JSON_LABELS[item.key].length + 1; // +1 for the colon
        let end = nextItem ? nextItem.index : text.length;
        
        // Extract substring and clean up (remove trailing commas/spaces)
        let val = text.substring(start, end).trim();
        if (val.endsWith(',')) val = val.slice(0, -1).trim();
        
        extracted[item.key] = val;
    });

    return extracted;
};

export const NodeItem: React.FC<NodeItemProps> = ({
  node,
  isSelected,
  onMouseDown,
  onDelete,
  onPortMouseDown,
  onPortMouseUp,
  onDataChange,
  onRun
}) => {
  const config = NODE_CONFIG[node.type];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'json'>(node.data.activeTab || 'text');
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(node.data.brushSize || 20);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onDataChange(node.id, { ...node.data, imageData: reader.result as string, value: file.name, maskData: undefined });
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync from JSON to Text
  const handleJsonChange = (key: keyof StructuredPrompt, value: string) => {
      const currentJson = node.data.jsonValue || EMPTY_JSON;
      const newJson = { ...currentJson, [key]: value };
      
      const stringRepresentation = Object.entries(newJson)
        .filter(([_, v]) => typeof v === 'string' && v.trim() !== '')
        .map(([k, v]) => `${JSON_LABELS[k as keyof StructuredPrompt]}: ${v}`)
        .join(',\n\n'); 

      onDataChange(node.id, { 
          ...node.data, 
          jsonValue: newJson,
          value: stringRepresentation
      });
  };

  const handleTextChange = (newText: string) => {
      const parsedJson = parseTextToJson(newText);
      onDataChange(node.id, {
          ...node.data,
          value: newText,
          jsonValue: parsedJson
      });
  };

  const handleTabChange = (tab: 'text' | 'json') => {
      setActiveTab(tab);
      onDataChange(node.id, { ...node.data, activeTab: tab });
  };

  // --- Drawing Logic ---
  
  useEffect(() => {
    if (node.type === NodeType.IMAGE_EDIT && canvasRef.current && imageRef.current && node.data.imageData) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // If we have saved mask data, restore it, otherwise clear or init
        // BUT, we only want to resize canvas when image loads.
        // The imageRef.current needs to be loaded.
        
        const initCanvas = () => {
             canvas.width = imageRef.current!.width;
             canvas.height = imageRef.current!.height;
             
             if (node.data.maskData) {
                 const maskImg = new Image();
                 maskImg.onload = () => {
                     ctx.clearRect(0, 0, canvas.width, canvas.height);
                     ctx.drawImage(maskImg, 0, 0);
                 };
                 maskImg.src = node.data.maskData;
             }
        };

        if (imageRef.current.complete) {
            initCanvas();
        } else {
            imageRef.current.onload = initCanvas;
        }
    }
  }, [node.data.imageData, node.type]);

  const startDrawing = (e: React.MouseEvent) => {
      if (node.type !== NodeType.IMAGE_EDIT || !canvasRef.current) return;
      setIsDrawing(true);
      draw(e);
  };

  const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      // Save mask
      if (canvasRef.current) {
          const maskData = canvasRef.current.toDataURL('image/png');
          onDataChange(node.id, { ...node.data, maskData });
      }
  };

  const draw = (e: React.MouseEvent) => {
      if (!isDrawing || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      // Calculate scale if CSS size differs from intrinsic size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red semi-transparent mask
      
      // Basic smooth drawing could be better, but simple lineTo is okay for mask
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
  };

  const resetCanvasPath = () => {
      if (canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d');
         ctx?.beginPath();
      }
  };

  const clearMask = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          onDataChange(node.id, { ...node.data, maskData: undefined });
      }
  };


  const getIcon = () => {
    switch (node.type) {
      case NodeType.TEXT_INPUT: return <TypeIcon size={16} className="text-blue-400" />;
      case NodeType.IMAGE_INPUT: return <ImageIcon size={16} className="text-green-400" />;
      case NodeType.ANALYZE_IMAGE: return <ScanEye size={16} className="text-purple-400" />;
      case NodeType.GENERATOR: return <Play size={16} className="text-amber-400" />;
      case NodeType.IMAGE_EDIT: return <Wand2 size={16} className="text-pink-400" />;
    }
  };

  const renderPort = (port: Port) => {
    const isTarget = port.type === 'target';
    return (
      <div 
        key={port.id} 
        className={`flex items-center justify-between group/port ${isTarget ? 'flex-row' : 'flex-row-reverse'}`}
      >
        <div className="relative flex items-center justify-center">
           {/* Port Hitbox & Visual */}
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 cursor-crosshair transition-all duration-200 z-20 shadow-sm
              ${isTarget ? '-ml-[23px]' : '-mr-[23px]'}
              ${port.dataType === 'text' ? 'border-blue-500 bg-slate-950 group-hover/port:bg-blue-500 group-hover/port:scale-125' : 
                port.dataType === 'image' ? 'border-green-500 bg-slate-950 group-hover/port:bg-green-500 group-hover/port:scale-125' : 
                'border-slate-400 bg-slate-950 group-hover/port:bg-slate-400 group-hover/port:scale-125'}
            `}
            onMouseDown={(e) => {
                e.stopPropagation();
                onPortMouseDown(e, node.id, port.id, port.type);
            }}
            onMouseUp={(e) => {
                e.stopPropagation();
                onPortMouseUp(e, node.id, port.id, port.type);
            }}
            title={port.label}
          >
             <div className={`w-1 h-1 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                ${port.dataType === 'text' ? 'bg-blue-500' : port.dataType === 'image' ? 'bg-green-500' : 'bg-slate-400'}
             `}/>
          </div>
        </div>
        <span className={`text-[10px] text-slate-500 uppercase tracking-wider font-bold px-1`}>
          {port.label}
        </span>
      </div>
    );
  };

  const renderJsonEditor = () => {
      const data = node.data.jsonValue || EMPTY_JSON;
      return (
          <div 
            className="flex flex-col gap-3 overflow-y-auto pr-1"
            style={{ maxHeight: isExpanded ? '400px' : '300px' }}
            onMouseDown={e => e.stopPropagation()}
          >
              {Object.entries(EMPTY_JSON).map(([key]) => {
                  const k = key as keyof StructuredPrompt;
                  return (
                      <div key={k} className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                              {JSON_LABELS[k]}
                          </label>
                          <textarea
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none resize-none"
                              rows={2}
                              value={data[k] || ''}
                              onChange={(e) => handleJsonChange(k, e.target.value)}
                              placeholder={`Enter ${JSON_LABELS[k].toLowerCase()}...`}
                          />
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div
      className={`absolute flex flex-col bg-slate-800/95 backdrop-blur-md rounded-lg shadow-xl border transition-all duration-200
        ${isSelected ? 'border-amber-400 ring-1 ring-amber-400/50 shadow-amber-900/20' : 'border-slate-700 hover:border-slate-600'}
      `}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: isExpanded ? 500 : config.width,
        zIndex: isExpanded ? 100 : (isSelected ? 50 : 10)
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50 rounded-t-lg cursor-grab active:cursor-grabbing h-[45px]">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-semibold text-slate-200 text-sm">{config.label}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          className="text-slate-500 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4">
        {/* Input Ports */}
        {config.inputs.length > 0 && (
          <div className="flex flex-col gap-3">
             {config.inputs.map(renderPort)}
          </div>
        )}

        {/* Node Specific Content */}
        <div className="my-1">
          {/* TEXT INPUT NODE */}
          {node.type === NodeType.TEXT_INPUT && (
             <div className="flex flex-col gap-2">
                 <div className="flex bg-slate-900/50 p-1 rounded-md border border-slate-700/50 mb-1">
                     <button onClick={(e) => { e.stopPropagation(); handleTabChange('text'); }} className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded transition-all ${activeTab === 'text' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                         <FileText size={12} /> Prompt
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); handleTabChange('json'); }} className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded transition-all ${activeTab === 'json' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                         <FileJson size={12} /> Structured
                     </button>
                 </div>
                 {activeTab === 'text' ? (
                     <div className="relative group/expand">
                        <textarea
                            className={`w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-200 focus:outline-none focus:border-blue-500 resize-none font-mono placeholder:text-slate-600 transition-all duration-300 ease-in-out ${isExpanded ? 'h-96 text-sm shadow-inner' : 'h-32 text-sm'}`}
                            placeholder="Enter prompt here..."
                            value={node.data.value || ''}
                            onChange={(e) => handleTextChange(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()} 
                        />
                        <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className={`absolute top-2 right-2 p-1.5 rounded-md bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 shadow-lg ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover/expand:opacity-100'}`} title={isExpanded ? "Collapse" : "Expand Editor"}>
                            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    </div>
                 ) : renderJsonEditor()}
             </div>
          )}

          {/* IMAGE & ANALYZE NODES */}
          {(node.type === NodeType.IMAGE_INPUT || node.type === NodeType.ANALYZE_IMAGE) && (
            <div className="flex flex-col gap-2 mt-1">
              <div 
                className="w-full h-32 bg-slate-900 border border-dashed border-slate-700 rounded-md flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-green-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {node.data.imageData ? (
                  <img src={node.data.imageData} alt="Uploaded" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="mx-auto text-slate-600 mb-2 group-hover:text-green-500 transition-colors" size={24} />
                    <span className="text-xs text-slate-500">Click to upload image</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
              <div className="text-xs text-slate-500 truncate px-1 mb-1">{node.data.value || 'No file selected'}</div>
              {node.type === NodeType.ANALYZE_IMAGE && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onRun && onRun(node.id); }} disabled={node.data.isProcessing || !node.data.imageData} className={`w-full py-2 px-3 rounded flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-lg ${node.data.isProcessing || !node.data.imageData ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-900/20'}`}>
                    {node.data.isProcessing ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><ScanEye size={14} /> Analyze & Create Prompt</>}
                  </button>
                  {node.data.error && <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50 break-words mt-2">{node.data.error}</div>}
                </>
              )}
            </div>
          )}

          {/* EDITOR NODE */}
          {node.type === NodeType.IMAGE_EDIT && (
              <div className="flex flex-col gap-3">
                  {/* Editor Toolbar */}
                  <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded border border-slate-700">
                      <div className="flex items-center gap-1 text-xs text-slate-400 px-2 border-r border-slate-700">
                          <Brush size={12} />
                          <span>Brush</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="50" 
                        value={brushSize} 
                        onChange={(e) => { 
                            setBrushSize(parseInt(e.target.value)); 
                            onDataChange(node.id, { ...node.data, brushSize: parseInt(e.target.value) });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        title={`Brush Size: ${brushSize}px`}
                      />
                      <button onClick={clearMask} className="p-1 hover:text-white text-slate-400 transition-colors" title="Clear Mask">
                          <RotateCcw size={12} />
                      </button>
                  </div>

                  {/* Canvas Area */}
                  <div 
                    className="relative w-full h-48 bg-slate-950 border border-slate-700 rounded overflow-hidden cursor-crosshair group/canvas"
                    onMouseDown={(e) => { e.stopPropagation(); startDrawing(e); }}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onMouseEnter={resetCanvasPath}
                  >
                      {node.data.imageData ? (
                          <>
                            <img 
                                ref={imageRef}
                                src={node.data.imageData} 
                                alt="To Edit" 
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                            />
                            <canvas 
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full"
                                style={{ width: '100%', height: '100%' }}
                            />
                            {/* Instruction overlay when empty mask */}
                            {!node.data.maskData && !isDrawing && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50 group-hover/canvas:opacity-0 transition-opacity">
                                    <span className="text-[10px] bg-black/50 px-2 py-1 rounded text-white backdrop-blur-sm">Paint mask here</span>
                                </div>
                            )}
                          </>
                      ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2 pointer-events-none">
                              <ImageIcon size={24} className="opacity-50" />
                              <span className="text-xs">Connect or Upload Image</span>
                          </div>
                      )}
                      
                      {/* Upload Overlay if no image */}
                      {!node.data.imageData && (
                           <div 
                             className="absolute inset-0 cursor-pointer"
                             onClick={() => fileInputRef.current?.click()}
                           />
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRun && onRun(node.id); }}
                    disabled={node.data.isProcessing}
                    className={`w-full py-2 px-3 rounded flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-lg
                        ${node.data.isProcessing 
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-900/20'}
                    `}
                  >
                     {node.data.isProcessing ? <><Loader2 size={14} className="animate-spin" /> Editing...</> : <><Wand2 size={14} /> Magic Edit</>}
                  </button>

                  {node.data.error && <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50 break-words">{node.data.error}</div>}
              </div>
          )}

          {/* GENERATOR NODE */}
          {node.type === NodeType.GENERATOR && (
            <div className="flex flex-col gap-3">
               <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                  <span className="text-xs text-slate-400">Model</span>
                  <span className="text-xs text-amber-500 font-mono">Gemini 2.5 Flash</span>
               </div>
               <div className="flex flex-col gap-2 bg-slate-900/30 p-2 rounded border border-slate-700/30">
                 <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                   <Ratio size={12} />
                   <span>Aspect Ratio</span>
                 </div>
                 <div className="grid grid-cols-3 gap-1.5">
                    {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => {
                      const isActive = (node.data.aspectRatio || '1:1') === ratio;
                      return (
                        <button key={ratio} onClick={(e) => { e.stopPropagation(); onDataChange(node.id, { ...node.data, aspectRatio: ratio }); }} className={`text-[10px] py-1 px-1 rounded border transition-all ${isActive ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-medium' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}>
                          {ratio}
                        </button>
                      );
                    })}
                 </div>
               </div>
               <button onClick={(e) => { e.stopPropagation(); onRun && onRun(node.id); }} disabled={node.data.isProcessing} className={`w-full py-2 px-3 rounded flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-lg ${node.data.isProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-orange-900/20'}`}>
                 {node.data.isProcessing ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Play size={14} fill="currentColor" /> Generate</>}
               </button>
               {node.data.error && <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50 break-words">{node.data.error}</div>}
               {node.data.imageData && (
                 <div className="relative group mt-2">
                    <div className="w-full bg-black rounded overflow-hidden border border-slate-700 flex items-center justify-center" style={{ minHeight: '150px' }}>
                        <img src={node.data.imageData} alt="Generated" className="max-w-full max-h-[300px] object-contain" />
                    </div>
                    <a href={node.data.imageData} download={`generated-${Date.now()}.png`} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm" title="Download">
                        <Upload size={12} className="rotate-180" />
                    </a>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Output Ports */}
        {config.outputs.length > 0 && (
           <div className="flex flex-col gap-3 pt-2 border-t border-slate-700/50">
             {config.outputs.map(renderPort)}
           </div>
        )}
      </div>
    </div>
  );
};