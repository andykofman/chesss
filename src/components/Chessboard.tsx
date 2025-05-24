import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';

interface ChessboardProps {
  level: number;
}

interface ChessMove {
  from: string;
  to: string;
  piece: string;
  color: 'w' | 'b';
  san: string;
  flags: string;
}

interface LichessEvaluation {
  pvs: Array<{
    moves: string;
    cp?: number;
    mate?: number;
  }>;
}

export default function Chessboard({ level }: ChessboardProps) {
  const [game, setGame] = useState(new Chess());
  const [selectedPiece, setSelectedPiece] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<ChessMove[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, number>>({});
  const [isThinking, setIsThinking] = useState(false);

  // Add a debounced evaluation function
  const evaluatePositions = async (moves: ChessMove[], baseGame: Chess, square: Square) => {
    const batchSize = 3; // Process 3 positions at a time
    const evals: Record<string, number> = {};
    
    for (let i = 0; i < moves.length; i += batchSize) {
      const batch = moves.slice(i, i + batchSize);
      const promises = batch.map(async (move) => {
        const tempGame = new Chess(baseGame.fen());
        tempGame.move({ from: square, to: move.to, promotion: 'q' });
        const evaluation = await getPositionEvaluation(tempGame.fen());
        return { move, evaluation };
      });

      const results = await Promise.all(promises);
      results.forEach(({ move, evaluation }) => {
        evals[move.to] = evaluation;
        // Update evaluations incrementally as they come in
        setEvaluations(prev => ({ ...prev, [move.to]: evaluation }));
      });

      // Add a small delay between batches to prevent rate limiting
      if (i + batchSize < moves.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return evals;
  };

  const handleSquareClick = async (square: Square) => {
    if (isThinking) return;

    if (selectedPiece) {
      try {
        const move = game.move({
          from: selectedPiece,
          to: square,
          promotion: 'q'
        });
        
        if (move) {
          const newGame = new Chess(game.fen());
          setGame(newGame);
          
          // Get computer's move
          const computerMove = await getComputerMove(newGame.fen());
          if (computerMove) {
            const from = computerMove.slice(0, 2) as Square;
            const to = computerMove.slice(2, 4) as Square;
            const promotion = computerMove.length > 4 ? computerMove[4] : undefined;
            
            newGame.move({ from, to, promotion });
            setGame(new Chess(newGame.fen()));
          }
        }
      } catch (e) {
        console.error(e);
      }
      
      setSelectedPiece(null);
      setLegalMoves([]);
      setEvaluations({});
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedPiece(square);
        const moves = game.moves({ square, verbose: true }) as ChessMove[];
        setLegalMoves(moves);
        
        // Clear previous evaluations
        setEvaluations({});
        
        // Start evaluating positions in batches
        evaluatePositions(moves, game, square).catch(console.error);
      }
    }
  };

  const getPositionEvaluation = async (fen: string): Promise<number> => {
    try {
      const response = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`);
      const data: LichessEvaluation = await response.json();
      
      if (data.pvs && data.pvs[0]) {
        if (data.pvs[0].cp !== undefined) {
          return data.pvs[0].cp / 100;
        }
        if (data.pvs[0].mate !== undefined) {
          return data.pvs[0].mate > 0 ? 100 : -100;
        }
      }
      return 0;
    } catch (error) {
      console.error('Error getting evaluation:', error);
      return 0;
    }
  };

  const getComputerMove = async (fen: string): Promise<string | null> => {
    try {
      setIsThinking(true);
      const response = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`);
      const data: LichessEvaluation = await response.json();
      
      if (data.pvs && data.pvs[0] && data.pvs[0].moves) {
        const firstMove = data.pvs[0].moves.split(' ')[0];
        return firstMove;
      }
      return null;
    } catch (error) {
      console.error('Error getting computer move:', error);
      return null;
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="grid grid-cols-8 gap-0 w-[640px] h-[640px] border-2">
      {Array.from({ length: 64 }, (_, i) => {
        const file = String.fromCharCode(97 + (i % 8));
        const rank = 8 - Math.floor(i / 8);
        const square = `${file}${rank}` as Square;
        const piece = game.get(square);
        const isLightSquare = ((rank + file.charCodeAt(0) - 97) % 2) === 0;
        
        return (
          <div
            key={square}
            className={`
              relative w-20 h-20 cursor-pointer
              ${isLightSquare ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
              ${selectedPiece === square ? 'bg-yellow-200/70' : ''}
              ${legalMoves.some(move => move.to === square) ? 'bg-green-200/50' : ''}
              hover:opacity-90 transition-opacity
            `}
            onClick={() => handleSquareClick(square)}
          >
            {piece && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Render chess piece */}
                <img
                  src={`/pieces/${piece.color}${piece.type}.svg`}
                  alt={`${piece.color} ${piece.type}`}
                  className="w-16 h-16"
                />
              </div>
            )}
            {evaluations[square] !== undefined && (
              <div className="absolute top-0 right-0 bg-black text-white p-1 text-sm">
                {evaluations[square].toFixed(1)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}