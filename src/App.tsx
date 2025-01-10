import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import * as Toast from '@radix-ui/react-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';

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
  const [username, setUsername] = useState('');
  const [pgn, setPgn] = useState('');
  const [currentMove, setCurrentMove] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
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

  const [games, setGames] = useState<Array<{date: string, white: string, black: string, pgn: string}>>([]);
  const [loading, setLoading] = useState(false);

  const fetchGames = async () => {
    if (!username) {
      setFeedback({ type: 'error', message: 'ユーザー名を入力してください' });
      return;
    }

    setLoading(true);
    try {
      // Get archives first
      const archivesResponse = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
      const archivesData = await archivesResponse.json();
      
      if (!archivesData.archives || archivesData.archives.length === 0) {
        setFeedback({ type: 'error', message: '対局データが見つかりませんでした' });
        return;
      }

      // Sort archives in reverse chronological order and take the most recent ones
      const sortedArchives = archivesData.archives.sort().reverse();
      const recentArchives = sortedArchives.slice(0, 2); // Take 2 months to ensure we get at least 10 games

      // Fetch PGN data from recent archives
      const allGames: Array<{date: string, white: string, black: string, pgn: string}> = [];
      
      for (const archiveUrl of recentArchives) {
        const pgnResponse = await fetch(`${archiveUrl}/pgn`);
        const pgnText = await pgnResponse.text();
        
        // Split PGN text into individual games
        const games = pgnText.split('\n\n[').map((game, index) => 
          index === 0 ? game : '[' + game
        ).filter(game => game.trim());

        // Parse each game's metadata
        for (const gamePgn of games) {
          const dateMatch = gamePgn.match(/\[Date "([^"]+)"/);
          const whiteMatch = gamePgn.match(/\[White "([^"]+)"/);
          const blackMatch = gamePgn.match(/\[Black "([^"]+)"/);

          if (dateMatch && whiteMatch && blackMatch) {
            allGames.push({
              date: dateMatch[1],
              white: whiteMatch[1],
              black: blackMatch[1],
              pgn: gamePgn
            });
          }
        }
      }

      // Take the 10 most recent games
      setGames(allGames.slice(0, 10));
      setFeedback({ type: 'success', message: '対局データを取得しました' });
    } catch (error) {
      console.error('Error fetching games:', error);
      setFeedback({ type: 'error', message: '対局データの取得に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const loadPGN = (selectedPgn?: string) => {
    try {
      const game = new Chess();
      game.loadPgn(selectedPgn || pgn);
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
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Chess.com ユーザー名
              </label>
              <div className="flex gap-2">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例: jishiha"
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={fetchGames}
                  disabled={loading}
                  className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                  {loading ? '取得中...' : '取得'}
                </button>
              </div>
            </div>
            {games.length > 0 ? (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">最近の対局</h2>
                <div className="border rounded divide-y">
                  {games.map((game, index) => (
                    <button
                      key={index}
                      onClick={() => loadPGN(game.pgn)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex flex-col"
                    >
                      <span className="font-medium">{game.date}</span>
                      <span className="text-gray-600">
                        {game.white} vs {game.black}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={pgn}
                  onChange={(e) => setPgn(e.target.value)}
                  placeholder="ここにPGNをペーストしてください..."
                  className="w-full h-64 mb-4 p-2 border rounded"
                />
                <button 
                  onClick={() => loadPGN()} 
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                >
                  棋譜を読み込む
                </button>
              </>
            )}
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
              <button
                onClick={() => {
                  if (boardRef.current) {
                    boardRef.current.flip();
                    setIsFlipped(!isFlipped);
                  }
                }}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                title="盤の上下反転"
                aria-label="盤の上下反転"
              >
                <FontAwesomeIcon icon={faRotate} />
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
