
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Node, Edge, NodeType, NODE_CONFIG, SavedState, LibraryItem } from '../../types';
import { NodeItem } from './NodeItem';
import { ConnectionLine } from './ConnectionLine';
import { generateImageContent, analyzeImageContent, editImageContent } from '../../services/geminiService';
import { 
  Plus, 
  Sparkles, 
  Image as ImageIcon, 
  Type as TypeIcon, 
  Trash2, 
  Save, 
  History, 
  X, 
  Clock, 
  FolderOpen,
  LayoutTemplate,
  ChevronRight,
  ChevronLeft,
  ScanEye,
  Wand2
} from 'lucide-react';

// --- Default Library Content ---
const DEFAULT_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'def-workflow-1',
    type: 'workflow',
    name: 'Simple Text-to-Image',
    description: 'Basic generation setup',
    content: {
      nodes: [
        { id: 'temp-1', type: NodeType.TEXT_INPUT, position: { x: 0, y: 0 }, data: { label: 'Text Prompt', value: 'An astronaut riding a horse on Mars' } },
        { id: 'temp-2', type: NodeType.GENERATOR, position: { x: 350, y: 0 }, data: { label: 'Image Output', aspectRatio: '1:1' } }
      ],
      edges: [
        { id: 'temp-e1', source: 'temp-1', sourceHandle: 'text', target: 'temp-2', targetHandle: 'prompt' }
      ]
    },
    timestamp: Date.now(),
    isDefault: true
  },
  {
    id: 'def-workflow-2',
    type: 'workflow',
    name: 'Image Variation',
    description: 'Image input to generator',
    content: {
      nodes: [
        { id: 'temp-3', type: NodeType.IMAGE_INPUT, position: { x: 0, y: 0 }, data: { label: 'Source Image' } },
        { id: 'temp-4', type: NodeType.GENERATOR, position: { x: 350, y: 0 }, data: { label: 'Variation Output', aspectRatio: '1:1' } }
      ],
      edges: [
        { id: 'temp-e2', source: 'temp-3', sourceHandle: 'image', target: 'temp-4', targetHandle: 'refImage' }
      ]
    },
    timestamp: Date.now(),
    isDefault: true
  }
];

export const Canvas: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // UI State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  
  // Dragging & Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<{
    sourceNodeId: string;
    sourceHandle: string;
    sourceType: 'source' | 'target';
    currX: number;
    currY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Viewport State
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('canvas_history');
      if (storedHistory) setSavedStates(JSON.parse(storedHistory));
    } catch (e) { console.error("History load failed", e); }

    try {
      const storedLib = localStorage.getItem('canvas_library');
      if (storedLib) {
        setLibraryItems(JSON.parse(storedLib));
      } else {
        setLibraryItems(DEFAULT_LIBRARY_ITEMS);
        localStorage.setItem('canvas_library', JSON.stringify(DEFAULT_LIBRARY_ITEMS));
      }
    } catch (e) { console.error("Library load failed", e); }
  }, []);

  const saveHistoryToStorage = (newStates: SavedState[]) => {
    try {
      localStorage.setItem('canvas_history', JSON.stringify(newStates));
      setSavedStates(newStates);
    } catch (e) { console.error("Storage error", e); }
  };

  const saveLibraryToStorage = (newItems: LibraryItem[]) => {
    try {
      localStorage.setItem('canvas_library', JSON.stringify(newItems));
      setLibraryItems(newItems);
    } catch (e) { console.error("Storage error", e); }
  };

  // --- Port Positioning ---

  const getPortPosition = useCallback((nodeId: string, handleId: string, type: 'source' | 'target') => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    const config = NODE_CONFIG[node.type];
    const isInput = type === 'target';
    
    let yOffset = 0;
    if (isInput) {
        // Inputs are at the top, after the 45px header and 16px padding
        const startY = 61;
        const index = config.inputs.findIndex(p => p.id === handleId);
        yOffset = startY + (index * 26) + 7; 
    } else {
        // Outputs are at the bottom, relative to total height
        let baseHeight = 100;
        if (node.type === NodeType.TEXT_INPUT) baseHeight = 250; 
        if (node.type === NodeType.IMAGE_INPUT) baseHeight = 230;
        if (node.type === NodeType.ANALYZE_IMAGE) baseHeight = 280; 
        if (node.type === NodeType.GENERATOR) {
            baseHeight = 350; 
            if (node.data.imageData) baseHeight += 200;
        }
        if (node.type === NodeType.IMAGE_EDIT) {
             baseHeight = 400; 
        }

        const index = config.outputs.findIndex(p => p.id === handleId);
        yOffset = baseHeight - 40 + (index * 26); 
    }

    const xOffset = isInput ? 0 : config.width; 
    return { x: node.position.x + xOffset, y: node.position.y + yOffset };
  }, [nodes]);

  // --- Node Actions ---

  const addNode = (type: NodeType) => {
    const id = `node-${Date.now()}`;
    const x = -viewport.x + (window.innerWidth / 2) - 150; 
    const y = -viewport.y + (window.innerHeight / 2) - 100;
    
    setNodes(prev => [...prev, {
      id,
      type,
      position: { x, y },
      data: { 
        label: NODE_CONFIG[type].label,
        aspectRatio: type === NodeType.GENERATOR ? '1:1' : undefined,
        brushSize: 20
      }
    }]);
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
  };

  const updateNodeData = (id: string, data: any) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  };

  const handleRun = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === NodeType.GENERATOR) {
        const promptEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'prompt');
        const imageEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'refImage');

        let promptText = '';
        let refImageBase64 = undefined;

        if (promptEdge) {
            const sourceNode = nodes.find(n => n.id === promptEdge.source);
            if (sourceNode) promptText = sourceNode.data.value || ''; 
        }

        if (imageEdge) {
            const sourceNode = nodes.find(n => n.id === imageEdge.source);
            if (sourceNode?.data.imageData) refImageBase64 = sourceNode.data.imageData;
        }

        if (!promptText && !refImageBase64) {
            updateNodeData(nodeId, { error: "Connect a text prompt or image source." });
            return;
        }

        updateNodeData(nodeId, { isProcessing: true, error: undefined });
        try {
            const aspectRatio = node.data.aspectRatio || "1:1";
            const resultImage = await generateImageContent(promptText, refImageBase64, aspectRatio);
            updateNodeData(nodeId, { isProcessing: false, imageData: resultImage });
        } catch (err: any) {
            updateNodeData(nodeId, { isProcessing: false, error: err.message || "Generation failed" });
        }

    } else if (node.type === NodeType.ANALYZE_IMAGE) {
        if (!node.data.imageData) {
            updateNodeData(nodeId, { error: "Upload an image first." });
            return;
        }

        updateNodeData(nodeId, { isProcessing: true, error: undefined });
        try {
            const result = await analyzeImageContent(node.data.imageData);
            updateNodeData(nodeId, { isProcessing: false, value: result.text, jsonValue: result.json });

            const existingEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'text');
            if (existingEdge) {
                const targetNode = nodes.find(n => n.id === existingEdge.target);
                if (targetNode && targetNode.type === NodeType.TEXT_INPUT) {
                     updateNodeData(targetNode.id, { value: result.text, jsonValue: result.json, activeTab: 'json' });
                }
            } else {
                const newTextNodeId = `node-${Date.now()}`;
                const newTextNode: Node = {
                    id: newTextNodeId,
                    type: NodeType.TEXT_INPUT,
                    position: { x: node.position.x + NODE_CONFIG[NodeType.ANALYZE_IMAGE].width + 50, y: node.position.y },
                    data: { label: 'Analyzed Prompt', value: result.text, jsonValue: result.json, activeTab: 'json' }
                };
                const newEdge: Edge = { id: `e-${Date.now()}`, source: nodeId, sourceHandle: 'text', target: newTextNodeId, targetHandle: 'input' };
                setNodes(prev => [...prev, newTextNode]);
                setEdges(prev => [...prev, newEdge]);
            }
        } catch (err: any) {
            updateNodeData(nodeId, { isProcessing: false, error: err.message || "Analysis failed" });
        }

    } else if (node.type === NodeType.IMAGE_EDIT) {
        let sourceImage = node.data.imageData;
        let promptText = "";

        const imageInEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'image');
        const promptInEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'prompt');

        if (imageInEdge) {
             const src = nodes.find(n => n.id === imageInEdge.source);
             if (src?.data.imageData) sourceImage = src.data.imageData;
        }

        if (promptInEdge) {
             const src = nodes.find(n => n.id === promptInEdge.source);
             if (src?.data.value) promptText = src.data.value;
        }

        if (!sourceImage) {
            updateNodeData(nodeId, { error: "No image source found." });
            return;
        }
        if (!promptText) {
             updateNodeData(nodeId, { error: "Please connect a text prompt." });
             return;
        }

        updateNodeData(nodeId, { isProcessing: true, error: undefined });
        try {
            const result = await editImageContent(promptText, sourceImage, node.data.maskData);
            updateNodeData(nodeId, { isProcessing: false, imageData: result, maskData: undefined });
        } catch (err: any) {
            updateNodeData(nodeId, { isProcessing: false, error: err.message || "Edit failed" });
        }
    }
  };

  // --- Workflow Management ---

  const handleAddToCanvas = (item: LibraryItem) => {
    if (item.type !== 'workflow') return;
    const content = item.content as { nodes: Node[], edges: Edge[] };
    const idMap: Record<string, string> = {};
    const newNodes = content.nodes.map((n, idx) => {
      const newId = `node-${Date.now()}-${idx}`;
      idMap[n.id] = newId;
      return { ...n, id: newId, data: { ...n.data, isProcessing: false } };
    });
    const newEdges = content.edges.map((e, idx) => ({ ...e, id: `e-${Date.now()}-${idx}`, source: idMap[e.source], target: idMap[e.target] }));
    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newEdges]);
  };

  const handleSaveWorkflow = () => {
    if (nodes.length === 0) return;
    const name = prompt("Name this workflow:", "My Workflow");
    if (!name) return;
    const newItem: LibraryItem = { id: crypto.randomUUID(), type: 'workflow', name, content: { nodes, edges }, timestamp: Date.now() };
    saveLibraryToStorage([newItem, ...libraryItems]);
  };

  // --- Session Persistence ---

  // Fix: Added missing handleSaveState to save nodes and edges into history
  const handleSaveState = () => {
    if (nodes.length === 0) return;
    const name = prompt("Name this session:", `Session ${new Date().toLocaleString()}`);
    if (!name) return;
    const newState: SavedState = {
      id: crypto.randomUUID(),
      name,
      timestamp: Date.now(),
      nodes,
      edges
    };
    saveHistoryToStorage([newState, ...savedStates]);
  };

  // Fix: Added missing handleLoadState to restore previously saved canvas state
  const handleLoadState = (state: SavedState) => {
    setNodes(state.nodes);
    setEdges(state.edges);
    setHistoryOpen(false);
  };

  // --- Mouse Interactivity ---

  // Fix: Added missing handleCanvasMouseDown to manage panning and deselect nodes
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setSelectedNodeId(null);
    if (e.target === canvasRef.current) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return; 
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        setIsDragging(true);
        setDragNodeId(nodeId);
        const mouseX = (e.clientX - viewport.x) / viewport.zoom;
        const mouseY = (e.clientY - viewport.y) / viewport.zoom;
        setDragOffset({ x: mouseX - node.position.x, y: mouseY - node.position.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && dragNodeId) {
        const mouseX = (e.clientX - viewport.x) / viewport.zoom;
        const mouseY = (e.clientY - viewport.y) / viewport.zoom;
        setNodes(prev => prev.map(n => n.id === dragNodeId ? { ...n, position: { x: mouseX - dragOffset.x, y: mouseY - dragOffset.y } } : n));
    }
    if (connecting) {
        const mouseX = (e.clientX - viewport.x) / viewport.zoom;
        const mouseY = (e.clientY - viewport.y) / viewport.zoom;
        setConnecting(prev => prev ? { ...prev, currX: mouseX, currY: mouseY } : null);
    }
    if (isPanning) {
        setViewport(prev => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
    }
  }, [isDragging, dragNodeId, dragOffset, connecting, isPanning, panStart, viewport]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNodeId(null);
    setConnecting(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string, type: 'source' | 'target') => {
    e.stopPropagation(); e.preventDefault();
    if (type === 'target') return; 
    const pos = getPortPosition(nodeId, portId, type);
    setConnecting({ sourceNodeId: nodeId, sourceHandle: portId, sourceType: type, startX: pos.x, startY: pos.y, currX: pos.x, currY: pos.y });
  };

  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, portId: string, type: 'source' | 'target') => {
    e.stopPropagation();
    if (!connecting || connecting.sourceNodeId === nodeId || connecting.sourceType === type) return;
    const newEdge: Edge = { id: `e-${Date.now()}`, source: connecting.sourceNodeId, sourceHandle: connecting.sourceHandle, target: nodeId, targetHandle: portId };
    setEdges(prev => [...prev.filter(e => !(e.target === nodeId && e.targetHandle === portId)), newEdge]);
    setConnecting(null);
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden flex flex-col">
        {/* Workflow Sidebar */}
        <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-[60] transition-transform duration-300 ${libraryOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase text-xs tracking-widest"><LayoutTemplate size={14}/> Workflows</div>
                <button onClick={handleSaveWorkflow} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold transition-colors">SAVE CURRENT</button>
            </div>
            <div className="p-2 space-y-1">
                {libraryItems.map(item => (
                    <div key={item.id} className="group p-2 rounded hover:bg-slate-800 cursor-pointer flex justify-between items-center" onClick={() => handleAddToCanvas(item)}>
                        <div className="truncate flex-1 text-xs text-slate-300">{item.name}</div>
                        {!item.isDefault && <button onClick={(e) => { e.stopPropagation(); saveLibraryToStorage(libraryItems.filter(i => i.id !== item.id)); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400"><Trash2 size={12}/></button>}
                    </div>
                ))}
            </div>
        </div>

        <button onClick={() => setLibraryOpen(!libraryOpen)} className={`absolute top-4 z-[70] p-1.5 bg-slate-800 border border-slate-700 rounded-r text-slate-400 transition-all ${libraryOpen ? 'left-64' : 'left-0'}`}>
            {libraryOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
        </button>

        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-full shadow-2xl">
             <button onClick={() => addNode(NodeType.TEXT_INPUT)} className="px-4 py-2 text-xs font-bold hover:bg-slate-700 rounded-full flex items-center gap-2 transition-colors"><TypeIcon size={14} className="text-blue-400"/> TEXT</button>
             <button onClick={() => addNode(NodeType.IMAGE_INPUT)} className="px-4 py-2 text-xs font-bold hover:bg-slate-700 rounded-full flex items-center gap-2 transition-colors"><ImageIcon size={14} className="text-green-400"/> IMAGE</button>
             <button onClick={() => addNode(NodeType.ANALYZE_IMAGE)} className="px-4 py-2 text-xs font-bold hover:bg-slate-700 rounded-full flex items-center gap-2 transition-colors"><ScanEye size={14} className="text-purple-400"/> ANALYZE</button>
             <button onClick={() => addNode(NodeType.IMAGE_EDIT)} className="px-4 py-2 text-xs font-bold hover:bg-slate-700 rounded-full flex items-center gap-2 transition-colors"><Wand2 size={14} className="text-pink-400"/> MAGIC EDIT</button>
             <button onClick={() => addNode(NodeType.GENERATOR)} className="px-4 py-2 text-xs font-bold hover:bg-slate-700 rounded-full flex items-center gap-2 transition-colors"><Sparkles size={14} className="text-amber-400"/> OUTPUT</button>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button onClick={handleSaveState} className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors shadow-lg" title="Save Session"><Save size={18}/></button>
            <button onClick={() => setHistoryOpen(true)} className="p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors shadow-lg" title="History"><History size={18}/></button>
        </div>

        {/* History Sidebar */}
        <div className={`fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-700 z-[60] transition-transform duration-300 ${historyOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center font-bold text-xs uppercase tracking-widest text-slate-400">
                <span>Session History</span>
                <button onClick={() => setHistoryOpen(false)}><X size={16}/></button>
            </div>
            <div className="p-4 space-y-3">
                {savedStates.map(state => (
                    <div key={state.id} onClick={() => handleLoadState(state)} className="p-3 bg-slate-800 border border-slate-700 rounded hover:border-indigo-500 cursor-pointer flex justify-between items-center group">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-slate-200 font-bold truncate w-48">{state.name}</div>
                            <div className="text-[10px] text-slate-500">{new Date(state.timestamp).toLocaleString()}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); saveHistoryToStorage(savedStates.filter(s => s.id !== state.id)); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400"><Trash2 size={14}/></button>
                    </div>
                ))}
            </div>
        </div>

        {/* Main Canvas Area */}
        <div 
            ref={canvasRef}
            className="w-full h-full grid-pattern cursor-grab active:cursor-grabbing"
            onMouseDown={handleCanvasMouseDown}
            style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}
        >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
                {edges.map(edge => {
                    const sourcePos = getPortPosition(edge.source, edge.sourceHandle, 'source');
                    const targetPos = getPortPosition(edge.target, edge.targetHandle, 'target');
                    return <ConnectionLine key={edge.id} x1={sourcePos.x} y1={sourcePos.y} x2={targetPos.x} y2={targetPos.y} />;
                })}
                {connecting && <ConnectionLine x1={connecting.startX} y1={connecting.startY} x2={connecting.currX} y2={connecting.currY} isActive />}
            </svg>

            {nodes.map(node => (
                <NodeItem
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onMouseDown={handleMouseDown}
                    onDelete={deleteNode}
                    onPortMouseDown={handlePortMouseDown}
                    onPortMouseUp={handlePortMouseUp}
                    onDataChange={updateNodeData}
                    onRun={handleRun}
                />
            ))}
        </div>
        
        <div className="absolute bottom-4 right-4 z-40 bg-slate-900/80 backdrop-blur p-3 rounded border border-slate-800 text-[10px] text-slate-500 pointer-events-none uppercase tracking-widest font-bold">
            Creative Studio Canvas v1.2
        </div>
    </div>
  );
};
