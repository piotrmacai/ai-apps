export enum NodeType {
  TEXT_INPUT = 'TEXT_INPUT',
  IMAGE_INPUT = 'IMAGE_INPUT',
  ANALYZE_IMAGE = 'ANALYZE_IMAGE',
  GENERATOR = 'GENERATOR',
  IMAGE_EDIT = 'IMAGE_EDIT'
}

export interface StructuredPrompt {
  subject: string;
  background: string;
  imageType: string;
  style: string;
  texture: string;
  colorPalette: string;
  lighting: string;
  additionalDetails: string;
}

export interface NodeData {
  label: string;
  value?: string; // For text prompt
  jsonValue?: StructuredPrompt; // For structured prompt
  activeTab?: 'text' | 'json'; // UI state
  imageData?: string; // Base64 for image input or output
  maskData?: string; // Base64 for the drawn mask
  brushSize?: number; // Brush size for editing
  isProcessing?: boolean;
  error?: string;
  // Specific configurations can go here
  model?: string;
  aspectRatio?: string;
}

export interface Node {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface Edge {
  id: string;
  source: string; // Node ID
  sourceHandle: string; // Output identifier (e.g., "text", "image")
  target: string; // Node ID
  targetHandle: string; // Input identifier (e.g., "prompt", "refImage")
}

export interface Port {
  id: string;
  label: string;
  type: 'source' | 'target';
  dataType: 'text' | 'image' | 'any';
}

export interface SavedState {
  id: string;
  name: string;
  timestamp: number;
  nodes: Node[];
  edges: Edge[];
}

export type LibraryItemType = 'prompt' | 'workflow';

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  name: string;
  description?: string;
  content: string | { nodes: Node[], edges: Edge[] }; // string for prompt, object for workflow
  timestamp: number;
  isDefault?: boolean; // To prevent deletion of starter items
}

export const NODE_CONFIG: Record<NodeType, {
  label: string;
  inputs: Port[];
  outputs: Port[];
  width: number;
}> = {
  [NodeType.TEXT_INPUT]: {
    label: 'Text Prompt',
    inputs: [{ id: 'input', label: 'In', type: 'target', dataType: 'text' }],
    outputs: [{ id: 'text', label: 'Text', type: 'source', dataType: 'text' }],
    width: 320
  },
  [NodeType.IMAGE_INPUT]: {
    label: 'Image Source',
    inputs: [],
    outputs: [{ id: 'image', label: 'Image', type: 'source', dataType: 'image' }],
    width: 280
  },
  [NodeType.ANALYZE_IMAGE]: {
    label: 'Analyze Image',
    inputs: [],
    outputs: [{ id: 'text', label: 'Analysis', type: 'source', dataType: 'text' }],
    width: 320
  },
  [NodeType.GENERATOR]: {
    label: 'Image Output',
    inputs: [
      { id: 'prompt', label: 'Prompt', type: 'target', dataType: 'text' },
      { id: 'refImage', label: 'Ref Image', type: 'target', dataType: 'image' }
    ],
    outputs: [{ id: 'output', label: 'Result', type: 'source', dataType: 'image' }],
    width: 320
  },
  [NodeType.IMAGE_EDIT]: {
    label: 'Magic Editor',
    inputs: [
      { id: 'image', label: 'Image', type: 'target', dataType: 'image' },
      { id: 'prompt', label: 'Prompt', type: 'target', dataType: 'text' }
    ],
    outputs: [{ id: 'output', label: 'Result', type: 'source', dataType: 'image' }],
    width: 400
  }
};