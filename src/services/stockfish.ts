// Stockfishからのメッセージの型定義
type StockfishMessage = {
  bestmove?: string;
  score?: {
    value: number;
    type: 'cp' | 'mate';
  };
};

export class StockfishService {
  private worker: Worker;
  private depth: number = 18;
  private messageQueue: Array<{
    resolve: (value: { bestMove: string; score: number }) => void;
    reject: (reason: any) => void;
  }> = [];

  constructor() {
    this.worker = new Worker(new URL('stockfish', import.meta.url));
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
    this.initializeEngine();
  }

  private initializeEngine() {
    this.worker.postMessage('uci');
    this.worker.postMessage('isready');
    this.worker.postMessage('setoption name MultiPV value 1');
    this.worker.postMessage('setoption name Threads value 1');
  }

  private handleMessage(event: MessageEvent) {
    const message = event.data as string;
    
    if (message.startsWith('bestmove')) {
      const bestMove = message.split(' ')[1];
      const currentEvaluation = this.messageQueue[0];
      
      if (currentEvaluation) {
        this.messageQueue.shift();
        currentEvaluation.resolve({
          bestMove,
          score: this.lastScore || 0
        });
      }
    } else if (message.includes('score cp')) {
      const scoreMatch = message.match(/score cp (-?\d+)/);
      if (scoreMatch) {
        this.lastScore = parseInt(scoreMatch[1]) / 100;
      }
    } else if (message.includes('score mate')) {
      const mateMatch = message.match(/score mate (-?\d+)/);
      if (mateMatch) {
        const moves = parseInt(mateMatch[1]);
        this.lastScore = moves > 0 ? Infinity : -Infinity;
      }
    }
  }

  private handleError(error: ErrorEvent) {
    const currentEvaluation = this.messageQueue[0];
    if (currentEvaluation) {
      this.messageQueue.shift();
      currentEvaluation.reject(new Error('Stockfish evaluation failed: ' + error.message));
    }
  }

  private lastScore: number = 0;

  async evaluatePosition(fen: string): Promise<{ bestMove: string; score: number }> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ resolve, reject });
      
      try {
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${this.depth}`);
      } catch (error) {
        reject(new Error('Failed to send position to Stockfish: ' + error));
        this.messageQueue.pop();
      }
    });
  }

  destroy() {
    this.worker.terminate();
  }
}
