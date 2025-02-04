export class StockfishService {
  private worker!: Worker;
  private depth: number = 18;
  private messageQueue: Map<string, {
    resolve: (value: { bestMove: string; score: number }) => void;
    reject: (reason: any) => void;
    timestamp: number;
  }> = new Map();
  private isEngineReady: boolean = false;
  private lastEvaluationTime: number = 0;
  private readonly EVALUATION_THROTTLE = 100;
  private currentFen: string | null = null;

  constructor() {
    this.initializeWorker();
  }

  public destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.messageQueue.clear();
      this.currentFen = null;
      this.isEngineReady = false;
    }
  }

  private initializeWorker() {
    try {
      const workerUrl = new URL('/chess/stockfish.js', window.location.origin);
      this.worker = new Worker(workerUrl.toString(), {
        type: 'module',
        name: 'stockfish-worker'
      });
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
      this.initializeEngine();
    } catch (error) {
      console.error('Failed to initialize Stockfish worker:', error);
      throw new Error('Stockfish initialization failed');
    }
  }

  private initializeEngine() {
    const initCommands = [
      'uci',
      'setoption name MultiPV value 1',
      'setoption name Threads value 1',
      'setoption name Hash value 32',
      'isready'
    ];

    initCommands.forEach(cmd => this.worker.postMessage(cmd));
  }

  private handleMessage(event: MessageEvent) {
    const message = event.data as string;
    
    if (message === 'readyok') {
      this.isEngineReady = true;
      return;
    }
    
    if (!this.currentFen) return;
    
    if (message.startsWith('bestmove')) {
      const bestMove = message.split(' ')[1];
      const evaluation = this.messageQueue.get(this.currentFen);
      
      if (evaluation) {
        this.messageQueue.delete(this.currentFen);
        evaluation.resolve({
          bestMove,
          score: this.lastScore || 0
        });
        
        this.cleanupOldEvaluations();
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
    if (this.currentFen) {
      const evaluation = this.messageQueue.get(this.currentFen);
      if (evaluation) {
        this.messageQueue.delete(this.currentFen);
        evaluation.reject(new Error('Stockfish evaluation failed: ' + error.message));
      }
    }
    
    this.restartWorker();
  }

  private restartWorker() {
    this.worker.terminate();
    this.initializeWorker();
  }

  private cleanupOldEvaluations() {
    const now = Date.now();
    for (const [fen, evaluation] of this.messageQueue.entries()) {
      if (now - evaluation.timestamp > 5000) {
        this.messageQueue.delete(fen);
        evaluation.reject(new Error('Evaluation timeout'));
      }
    }
  }

  private lastScore: number = 0;

  async evaluatePosition(fen: string): Promise<{ bestMove: string; score: number }> {
    const now = Date.now();
    if (now - this.lastEvaluationTime < this.EVALUATION_THROTTLE) {
      await new Promise(resolve => setTimeout(resolve, this.EVALUATION_THROTTLE));
    }
    this.lastEvaluationTime = now;

    return new Promise((resolve, reject) => {
      if (!this.isEngineReady) {
        reject(new Error('Stockfish engine is not ready'));
        return;
      }

      this.messageQueue.set(fen, { resolve, reject, timestamp: now });
      this.currentFen = fen;
      
      try {
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${this.depth}`);
      } catch (error) {
        this.messageQueue.delete(fen);
        this.currentFen = null;
        reject(new Error('Failed to send position to Stockfish: ' + error));
      }
    });
  }
}
