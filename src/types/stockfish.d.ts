declare module '../../../node_modules/stockfish/src/stockfish.js' {
  type StockfishInstance = {
    postMessage: (message: string) => void;
    onmessage: ((event: { data: string }) => void) | null;
    terminate: () => void;
  };

  const Stockfish: () => StockfishInstance;
  export default Stockfish;
}
