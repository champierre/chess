import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

declare global {
  interface Window {
    Chessboard: any;
  }
}

interface ChessMove {
  after: string;
  before: string;
  color: 'w' | 'b';
  flags: string;
  from: string;
  to: string;
  piece: string;
  san: string;
}

function App() {
  const [pgn, setPgn] = useState('');
  const [currentMove, setCurrentMove] = useState(0);
  const boardRef = useRef<any>(null);
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      boardRef.current = window.Chessboard(containerRef.current, {
        position: 'start',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
      });
    }

    return () => {
      if (boardRef.current) {
        boardRef.current.destroy();
      }
    };
  }, []);

  const loadPGN = () => {
    try {
      const game = new Chess();
      game.loadPgn(pgn);
      gameRef.current = game;
      setCurrentMove(0);
      boardRef.current.position('start');
    } catch (error) {
      console.error('Invalid PGN:', error);
    }
  };

  const nextMove = () => {
    if (gameRef.current && currentMove < gameRef.current.history().length) {
      const moves = gameRef.current.history({ verbose: true }) as ChessMove[];
      const move = moves[currentMove];
      if (move) {
        boardRef.current.position(move.after);
        setCurrentMove(prev => prev + 1);
      }
    }
  };

  const prevMove = () => {
    if (gameRef.current && currentMove > 0) {
      const moves = gameRef.current.history({ verbose: true }) as ChessMove[];
      const move = moves[currentMove - 2];
      boardRef.current.position(move ? move.after : 'start');
      setCurrentMove(prev => prev - 1);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">チェス棋譜ビューワー</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder="ここにPGNをペーストしてください..."
            className="w-full h-64 mb-4 p-2 border rounded"
          />
          <button 
            onClick={loadPGN} 
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            棋譜を読み込む
          </button>
        </div>
        
        <div>
          <div ref={containerRef} className="mb-4" />
          <div className="flex justify-center gap-4">
            <button 
              onClick={prevMove}
              className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
            >
              前の手
            </button>
            <button 
              onClick={nextMove}
              className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
            >
              次の手
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App
