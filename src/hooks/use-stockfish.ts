import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Stockfish from 'stockfish/src/stockfish.js';

interface StockfishEvaluation {
  bestMove: string;
  score: number;
}

export function useStockfish() {
  const [stockfish, setStockfish] = useState<ReturnType<typeof Stockfish> | null>(null);
  const evaluationCache = useRef<Map<string, StockfishEvaluation>>(new Map());

  useEffect(() => {
    const engine = Stockfish();
    engine.postMessage('uci');
    engine.postMessage('setoption name MultiPV value 1');
    setStockfish(engine);

    return () => engine.terminate();
  }, []);

  const evaluatePosition = async (game: Chess): Promise<StockfishEvaluation> => {
    return new Promise((resolve) => {
      if (!stockfish) return;
      
      const fen = game.fen();
      if (evaluationCache.current.has(fen)) {
        return resolve(evaluationCache.current.get(fen)!);
      }

      stockfish.onmessage = (e: { data: string }) => {
        const message = e.data;
        if (message.includes('bestmove')) {
          const bestMove = message.split(' ')[1];
          const scoreMatch = message.match(/score cp (-?\d+)/);
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
          
          const evaluation = { bestMove, score };
          evaluationCache.current.set(fen, evaluation);
          resolve(evaluation);
        }
      };

      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage('go depth 15');
    });
  };

  return { evaluatePosition };
}
