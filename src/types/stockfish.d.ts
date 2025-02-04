declare module 'stockfish' {
  export class Stockfish {
    postMessage(message: string): void;
    addMessageListener(callback: (message: string) => void): void;
    removeMessageListener(callback: (message: string) => void): void;
    terminate(): void;
  }
}
