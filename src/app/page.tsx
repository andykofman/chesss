'use client';

import { useState } from 'react';
import Chessboard from '../components/Chessboard';

export default function Home() {
  const [level, setLevel] = useState(1);
  
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          Chess with Real-time Evaluation
        </h1>
        
        <div className="mb-6 flex justify-center items-center gap-4">
          <label className="text-lg">Stockfish Level:</label>
          <select
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value))}
            className="p-2 border rounded"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-center">
          <Chessboard level={level} />
        </div>
      </div>
    </div>
  );
}