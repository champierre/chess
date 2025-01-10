import React, { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import * as Toast from '@radix-ui/react-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsUpDown, faCheck, faXmark, faEquals, faBolt, faRocket, faStopwatch, faSun } from '@fortawesome/free-solid-svg-icons';

type ChessBoard = {
  position: (fen: string) => void;
  destroy: () => void;
  flip: () => void;
};

declare global {
  interface Window {
    Chessboard: (
      element: HTMLDivElement,
      config: {
        position: string;
        pieceTheme: string;
      }
    ) => ChessBoard;
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

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Game {
  date: string;
  white: string;
  black: string;
  pgn: string;
  result: string;
  timeControl?: string;  // Raw PGN TimeControl value
  gameType?: 'Bullet' | 'Blitz' | 'Rapid' | 'Daily';  // Derived game type
}

function getGameTypeIcon(gameType: 'Bullet' | 'Blitz' | 'Rapid' | 'Daily'): JSX.Element {
  switch (gameType) {
    case 'Bullet':
      return <FontAwesomeIcon data-testid="bullet-icon" icon={faRocket} className="text-amber-800" title="Bullet" />;
    case 'Blitz':
      return <FontAwesomeIcon data-testid="blitz-icon" icon={faBolt} className="text-yellow-500" title="Blitz" />;
    case 'Rapid':
      return <FontAwesomeIcon data-testid="rapid-icon" icon={faStopwatch} className="text-green-500" title="Rapid" />;
    case 'Daily':
      return <FontAwesomeIcon data-testid="daily-icon" icon={faSun} className="text-orange-500" title="Daily" />;
  }
}

function deriveGameType(timeControl: string | undefined): 'Bullet' | 'Blitz' | 'Rapid' | 'Daily' {
  if (!timeControl) return 'Rapid'; // Default to Rapid if no time control specified
  
  // Check if it's a daily game (contains fraction)
  if (timeControl.includes('/')) {
    return 'Daily';
  }

  // Parse the base time in seconds
  const seconds = parseInt(timeControl.split('|')[0], 10);
  
  // Classify based on time thresholds
  if (seconds <= 180) return 'Bullet';      // 3 minutes or less
  if (seconds <= 600) return 'Blitz';       // 10 minutes or less
  if (seconds < 3600) return 'Rapid';       // Less than 60 minutes
  return 'Daily';                           // 60 minutes or more
}

function getResultIcon(game: Game, currentUser: string) {
  if (game.result === "1/2-1/2") {
    return <FontAwesomeIcon icon={faEquals} className="text-gray-600 ml-1" />;
  }
  
  const userIsWhite = game.white === currentUser;
  const userWon = (userIsWhite && game.result === "1-0") || (!userIsWhite && game.result === "0-1");
  
  if (userWon) {
    return <FontAwesomeIcon icon={faCheck} className="text-green-500 ml-1" />;
  } else {
    return <FontAwesomeIcon icon={faXmark} className="text-red-500 ml-1" />;
  }
}

function App() {
  const [username, setUsername] = useState('');
  const [pgn, setPgn] = useState('');
  const [currentMove, setCurrentMove] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const boardRef = useRef<ChessBoard | null>(null);
  const gameRef = useRef<Chess | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ensure refs are mutable
  const mutableBoardRef = boardRef as React.MutableRefObject<ChessBoard | null>;
  const mutableGameRef = gameRef as React.MutableRefObject<Chess | null>;
  
  const itemsPerPage = 10;
  const totalPages = Math.ceil(games.length / itemsPerPage);
  const paginatedGames = games.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Load saved username from localStorage
  useEffect(() => {
    try {
      const savedUsername = localStorage.getItem('chessUsername');
      if (savedUsername) {
        setUsername(savedUsername);
      }
    } catch (error) {
      console.error('Failed to load username from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      mutableBoardRef.current = window.Chessboard(containerRef.current, {
        position: 'start',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
      });
    }

    return () => {
      if (mutableBoardRef.current) {
        mutableBoardRef.current.destroy();
      }
    };
  }, [mutableBoardRef]);

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

      // Save username to localStorage on successful API response
      try {
        localStorage.setItem('chessUsername', username);
      } catch (error) {
        console.error('Failed to save username to localStorage:', error);
      }

      // Sort archives in reverse chronological order
      const sortedArchives = archivesData.archives.sort().reverse();
      const allGames: Game[] = [];
      
      console.log(`Found ${sortedArchives.length} archives to process`);
      
      // Process archives until we have 100 games or run out of archives
      for (const archiveUrl of sortedArchives) {
        if (allGames.length >= 100) {
          console.log('Reached 100 games limit, stopping archive processing');
          break;
        }
        
        const pgnResponse = await fetch(`${archiveUrl}/pgn`);
        const pgnText = await pgnResponse.text();
        
        // Split PGN text into individual games
        const games = pgnText.split('\n\n[').map((game, index) => 
          index === 0 ? game : '[' + game
        ).filter(game => game.trim());
        
        console.log(`Found ${games.length} games in archive ${archiveUrl}`);

        // Parse each game's metadata
        for (const gamePgn of games) {
          if (allGames.length >= 100) {
            console.log(`Reached 100 games limit while processing archive ${archiveUrl}`);
            break;
          }
          
          const dateMatch = gamePgn.match(/\[Date "([^"]+)"/);
          const whiteMatch = gamePgn.match(/\[White "([^"]+)"/);
          const blackMatch = gamePgn.match(/\[Black "([^"]+)"/);
          const resultMatch = gamePgn.match(/\[Result "([^"]+)"/);
          const timeControlMatch = gamePgn.match(/\[TimeControl "([^"]+)"/);

          if (dateMatch && whiteMatch && blackMatch && resultMatch) {
            allGames.push({
              date: dateMatch[1],
              white: whiteMatch[1],
              black: blackMatch[1],
              pgn: gamePgn,
              result: resultMatch[1],
              timeControl: timeControlMatch ? timeControlMatch[1] : undefined,
              gameType: deriveGameType(timeControlMatch ? timeControlMatch[1] : undefined)
            });
          }
        }
      }

      console.log(`Total games collected before sorting: ${allGames.length}`);
      
      // Sort games by date in reverse chronological order and take up to 100
      const sortedGames = allGames.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      setGames(sortedGames);
      setCurrentPage(1); // Reset to first page when new games are fetched
      setFeedback({ type: 'success', message: `${sortedGames.length}件の対局データを取得しました` });
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
      mutableGameRef.current = game;
      setCurrentMove(0);
      if (mutableBoardRef.current) {
        mutableBoardRef.current.position('start');
      }
      setFeedback({ type: 'success', message: '棋譜を読み込みました' });
    } catch (error) {
      console.error('Invalid PGN:', error);
      setFeedback({ type: 'error', message: '棋譜の形式が正しくありません' });
    }
  };

  const nextMove = () => {
    if (mutableGameRef.current && currentMove < mutableGameRef.current.history().length && mutableBoardRef.current) {
      const moves = mutableGameRef.current.history({ verbose: true }) as ChessMove[];
      const move = moves[currentMove];
      if (move) {
        mutableBoardRef.current.position(move.after);
        setCurrentMove(prev => prev + 1);
      }
    }
  };

  const prevMove = () => {
    if (mutableGameRef.current && currentMove > 0 && mutableBoardRef.current) {
      const moves = mutableGameRef.current.history({ verbose: true }) as ChessMove[];
      const move = moves[currentMove - 2];
      mutableBoardRef.current.position(move ? move.after : 'start');
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
                  {paginatedGames.map((game: Game, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        loadPGN(game.pgn);
                        setSelectedGame(game);
                      }}
                      className={`w-full px-4 py-2 text-left flex flex-col ${
                        selectedGame === game ? "bg-blue-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">
                        {game.date} {getResultIcon(game, username)}
                        {game.gameType && (
                          <span className="ml-2">{getGameTypeIcon(game.gameType)}</span>
                        )}
                      </span>
                      <span className="text-gray-600">
                        {game.white} vs {game.black}
                      </span>
                    </button>
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                          aria-label="前のページへ"
                        >
                          前へ
                        </PaginationPrevious>
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            aria-label={`${page}ページ目へ`}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                          aria-label="次のページへ"
                        >
                          次へ
                        </PaginationNext>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
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
            {selectedGame && (
              <div className="mb-4 p-2 bg-gray-100 rounded">
                <p className="font-bold mb-1">選択された対局情報</p>
                <p>日付: {selectedGame.date}</p>
                <p>結果: {selectedGame.result}</p>
                <p>白: {selectedGame.white}, 黒: {selectedGame.black}</p>
                {selectedGame.gameType && (
                  <p>ゲームタイプ: {selectedGame.gameType} <span className="ml-2">{getGameTypeIcon(selectedGame.gameType)}</span></p>
                )}
              </div>
            )}
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
                  if (mutableBoardRef.current) {
                    mutableBoardRef.current.flip();
                    setIsFlipped(!isFlipped);
                  }
                }}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                title="盤の上下反転"
                aria-label="盤の上下反転"
              >
                <FontAwesomeIcon icon={faArrowsUpDown} />
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
