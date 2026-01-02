import React, { useRef, useEffect, useState } from 'react';
import { IconX, IconCheck, IconUndo, IconBrush } from './Icons';

interface SketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageSrc: string | null;
  onSave: (dataUrl: string) => void;
}

export const SketchModal: React.FC<SketchModalProps> = ({
  isOpen,
  onClose,
  initialImageSrc,
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(10); // Default larger for high-res
  const [history, setHistory] = useState<ImageData[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Resolution scaling factor (internal / visual)
  const [scaleRatio, setScaleRatio] = useState(1);

  // Colors palette
  const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  useEffect(() => {
    if (isOpen && initialImageSrc && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Reset
      setImageLoaded(false);
      setHistory([]);

      img.onload = () => {
        // 1. Set Internal Resolution to match Source Image
        canvas.width = img.width;
        canvas.height = img.height;

        // 2. Calculate Display Size (CSS) to fit in container
        const containerW = containerRef.current!.clientWidth;
        const containerH = containerRef.current!.clientHeight;
        
        // We only limit by CSS. The canvas element itself stays high res.
        // We calculate the ratio to map mouse events later.
        // The image will be fitted with object-fit: contain behavior via logic if we wanted manual control,
        // but simple CSS style.width = '100%' works if we handle aspect ratio.
        
        // Actually, to map mouse events correctly, we need to know exactly how large it is rendered.
        // Let's compute the fitted dimensions:
        const imgRatio = img.width / img.height;
        const containerRatio = containerW / containerH;
        
        let visualWidth, visualHeight;
        
        if (imgRatio > containerRatio) {
            visualWidth = containerW;
            visualHeight = containerW / imgRatio;
        } else {
            visualHeight = containerH;
            visualWidth = containerH * imgRatio;
        }

        // Set visual style
        canvas.style.width = `${visualWidth}px`;
        canvas.style.height = `${visualHeight}px`;

        // Store ratio for event mapping (Internal Pixels / Visual Pixels)
        setScaleRatio(img.width / visualWidth);

        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Initial snapshot
          setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
          setImageLoaded(true);
        }
      };
      img.src = initialImageSrc;
    }
  }, [isOpen, initialImageSrc]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Map visual coordinate to internal coordinate
    return {
        x: (clientX - rect.left) * scaleRatio,
        y: (clientY - rect.top) * scaleRatio
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Save history (limit to last 10 steps for memory)
        const newHistory = [...history, ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)];
        if (newHistory.length > 10) newHistory.shift();
        setHistory(newHistory);
        ctx.closePath();
      }
    }
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    // Scale brush size to resolution so it looks consistent regardless of image size
    const scaledBrushSize = brushSize * scaleRatio;

    ctx.lineWidth = scaledBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current state
      const prevState = newHistory[newHistory.length - 1];
      ctx.putImageData(prevState, 0, 0);
      setHistory(newHistory);
    }
  };

  const handleSave = () => {
    if (canvasRef.current) {
      // Export at full resolution
      onSave(canvasRef.current.toDataURL('image/png'));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200">
      
      {/* Top Bar */}
      <div className="w-full h-16 flex items-center justify-between px-6 bg-black border-b border-white/10 absolute top-0 z-20">
        <h2 className="text-white font-medium flex items-center gap-2">
           <IconBrush className="w-5 h-5" />
           Sketch & Edit
        </h2>
        <div className="flex gap-4">
             <button onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10">
                <IconX className="w-6 h-6" />
             </button>
        </div>
      </div>

      {/* Canvas Area - Flex Center */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-4 lg:p-8" ref={containerRef}>
         <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchEnd={stopDrawing}
            onTouchMove={draw}
            className="bg-white/5 border border-white/10 shadow-2xl cursor-crosshair touch-none block"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
         />
         {!imageLoaded && <div className="text-white/50 animate-pulse">Loading image canvas...</div>}
      </div>

      {/* Toolbar */}
      <div className="w-full h-auto py-4 lg:h-24 bg-zinc-900 border-t border-white/10 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 px-6 pb-safe z-20">
         
         {/* Colors */}
         <div className="flex items-center gap-3 overflow-x-auto max-w-full px-2">
            {colors.map(c => (
                <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                />
            ))}
         </div>

         <div className="hidden lg:block w-px h-10 bg-white/20"></div>

         {/* Brush Size */}
         <div className="flex items-center gap-3 w-full lg:w-auto justify-center">
             <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
             <input 
                type="range" 
                min="1" 
                max="50" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-32 lg:w-48 accent-primary cursor-pointer"
             />
             <div className="w-6 h-6 rounded-full bg-white opacity-50"></div>
         </div>

         <div className="hidden lg:block w-px h-10 bg-white/20"></div>

         {/* Actions */}
         <div className="flex gap-4">
            <button 
                onClick={handleUndo} 
                className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                title="Undo"
            >
                <IconUndo className="w-5 h-5" />
            </button>
            <button 
                onClick={handleSave} 
                className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
                <IconCheck className="w-5 h-5" />
                <span className="hidden sm:inline">Use Sketch</span>
            </button>
         </div>

      </div>
    </div>
  );
};