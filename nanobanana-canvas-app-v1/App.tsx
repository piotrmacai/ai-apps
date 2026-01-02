import React from 'react';
import { Canvas } from './components/NodeGraph/Canvas';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-slate-950 text-white">
      <Canvas />
    </div>
  );
};

export default App;