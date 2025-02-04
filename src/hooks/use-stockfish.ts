import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

interface StockfishEvaluation {
  bestMove: string;
  score: number;
}

export function useStockfish() {
  const [stockfish, setStockfish] = useState<Worker | null>(null);
  const evaluationCache = useRef<Map<string, StockfishEvaluation>>(new Map());
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const initWorker = async () => {
      try {
        const worker = new Worker('/chess/stockfish.js');
        workerRef.current = worker;
        setStockfish(worker);
        
        worker.addEventListener('message', (e) => {
          console.log('Stockfish:', e.data);
        });
        
        worker.postMessage('uci');
        worker.postMessage('setoption name MultiPV value 1');
      } catch (error) {
        console.error('Failed to initialize Stockfish worker:', error);
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const evaluatePosition = async (game: Chess): Promise<StockfishEvaluation | null> => {
    return new Promise((resolve) => {
      if (!stockfish) {
        resolve(null);
        return;
      }
      
      const fen = game.fen();
      if (evaluationCache.current.has(fen)) {
        return resolve(evaluationCache.current.get(fen)!);
      }

      const messageHandler = (e: { data: string }) => {
        if (e.data.includes('bestmove')) {
          const bestMove = e.data.split(' ')[1];
          const scoreMatch = e.data.match(/score cp (-?\d+)/);
          const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
          
          const evaluation = { bestMove, score };
          evaluationCache.current.set(fen, evaluation);
          stockfish.removeEventListener('message', messageHandler);
          resolve(evaluation);
        }
      };

      stockfish.addEventListener('message', messageHandler);
      stockfish.postMessage(`position fen ${fen}`);
      stockfish.postMessage('go depth 15');
    });
  };

  return { evaluatePosition };
}
