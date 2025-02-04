import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

interface StockfishEvaluation {
  bestMove: string;
  score: number;
}

type StockfishInstance = {
  postMessage: (message: string) => void;
  addMessageListener: (callback: (message: string) => void) => void;
  removeMessageListener: (callback: (message: string) => void) => void;
  terminate: () => void;
};

export function useStockfish() {
  const [stockfish, setStockfish] = useState<StockfishInstance | null>(null);
  const evaluationCache = useRef<Map<string, StockfishEvaluation>>(new Map());

  useEffect(() => {
    let engine: StockfishInstance | null = null;
    
    const initEngine = async () => {
      const Stockfish = (await import('stockfish')).default;
      engine = new Stockfish();
      engine.postMessage('uci');
      engine.postMessage('setoption name MultiPV value 1');
      setStockfish(engine);
    };

    initEngine();

    return () => {
      if (engine) {
        engine.terminate();
      }
    };
  }, []);

  const evaluatePosition = async (game: Chess): Promise<StockfishEvaluation> => {
    return new Promise((resolve) => {
      if (!stockfish) return;
      
      const fen = game.fen();
      if (evaluationCache.current.has(fen)) {
        return resolve(evaluationCache.current.get(fen)!);
      }

      const messageHandler = (message: string) => {
        if (message.includes('bestmove')) {
          const bestMove = message.split(' ')[1];
          const scoreMatch = message.match(/score cp (-?\d+)/);
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
          
          const evaluation = { bestMove, score };
          evaluationCache.current.set(fen, evaluation);
          stockfish.removeMessageListener(messageHandler);
          resolve(evaluation);
        }
      };

      stockfish.addMessageListener(messageHandler);
      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage('go depth 15');
    });
  };

  return { evaluatePosition };
}
