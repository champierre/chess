declare module 'stockfish' {
  type StockfishInstance = {
    postMessage: (message: string) => void;
    onmessage: ((event: { data: string }) => void) | null;
    terminate: () => void;
  };

  const Stockfish: () => StockfishInstance;
  export default Stockfish;
}
