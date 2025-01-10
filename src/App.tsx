import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import * as Toast from '@radix-ui/react-toast';

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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
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
      setFeedback({ type: 'success', message: '棋譜を読み込みました' });
    } catch (error) {
      console.error('Invalid PGN:', error);
      setFeedback({ type: 'error', message: '棋譜の形式が正しくありません' });
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
    <Toast.Provider swipeDirection="right">
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
      {feedback && (
        <Toast.Root
          open={!!feedback}
          onOpenChange={() => setFeedback(null)}
          className={`fixed bottom-4 right-4 p-4 rounded ${
            feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
          duration={3000}
        >
          <Toast.Description>{feedback.message}</Toast.Description>
        </Toast.Root>
      )}
      <Toast.Viewport className="fixed bottom-0 right-0 flex flex-col p-4 gap-2 w-96 m-0 list-none z-50" />
    </Toast.Provider>
  );
}

export default App
