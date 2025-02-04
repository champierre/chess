import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import type { JSX } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import * as Toast from '@radix-ui/react-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsUpDown, faCheck, faXmark, faEquals, faBolt, faRocket, faStopwatch, faSun } from '@fortawesome/free-solid-svg-icons';
import { StockfishService } from './services/stockfish';

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
  PaginationEllipsis,
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
  if (seconds < 180) return 'Bullet';      // less than 3 minutes
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
  const [selectedGameType, setSelectedGameType] = useState<'Bullet' | 'Blitz' | 'Rapid' | 'Daily' | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentMoveIsBest, setCurrentMoveIsBest] = useState(false);
  const boardRef = useRef<ChessBoard | null>(null);
  const gameRef = useRef<Chess | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stockfishRef = useRef<StockfishService | null>(null);

  // Ensure refs are mutable
  const mutableBoardRef = boardRef as React.MutableRefObject<ChessBoard | null>;
  const mutableGameRef = gameRef as React.MutableRefObject<Chess | null>;
  
  const itemsPerPage = 10;
  const filteredGames = selectedGameType
    ? games.filter((game: Game) => game.gameType === selectedGameType)
    : games;
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
  const paginatedGames = filteredGames.slice(
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
    stockfishRef.current = new StockfishService();
    return () => {
      stockfishRef.current?.destroy();
    };
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
      
      // Calculate threshold date (90 days ago)
      const now = new Date();
      const thresholdDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      console.log(`Fetching games after ${thresholdDate.toISOString()}`);
      
      // Process archives to get games from the last 90 days
      for (const archiveUrl of sortedArchives) {
        const pgnResponse = await fetch(`${archiveUrl}/pgn`);
        const pgnText = await pgnResponse.text();
        
        // Split PGN text into individual games
        const games = pgnText.split('\n\n[').map((game, index) => 
          index === 0 ? game : '[' + game
        ).filter(game => game.trim());
        
        console.log(`Found ${games.length} games in archive ${archiveUrl}`);

        // Parse each game's metadata
        for (const gamePgn of games) {
          const dateMatch = gamePgn.match(/\[Date "([^"]+)"/);
          const whiteMatch = gamePgn.match(/\[White "([^"]+)"/);
          const blackMatch = gamePgn.match(/\[Black "([^"]+)"/);
          const resultMatch = gamePgn.match(/\[Result "([^"]+)"/);
          const timeControlMatch = gamePgn.match(/\[TimeControl "([^"]+)"/);

          if (dateMatch && whiteMatch && blackMatch && resultMatch) {
            // Check if the game is within the last 90 days
            const gameDate = new Date(dateMatch[1].replace(/\./g, '-'));
            console.log(`gameDate: ${dateMatch[1]}`);
            if (gameDate < thresholdDate) {
              // Skip games older than 90 days
              continue;
            }
            
            // Only add games within the last 90 days
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
        return new Date(b.date.replace(/\./g, '-')).getTime() - new Date(a.date.replace(/\./g, '-')).getTime();
      });
      
      setGames(sortedGames);
      setCurrentPage(1); // Reset to first page when new games are fetched
      setFeedback({ type: 'success', message: `過去90日間の対局を${sortedGames.length}件取得しました` });
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

  const evaluateCurrentPosition = async () => {
    if (!mutableGameRef.current || !stockfishRef.current) return;
    
    setIsEvaluating(true);
    try {
      const fen = mutableGameRef.current.fen();
      const evaluation = await stockfishRef.current.evaluatePosition(fen);
      if (currentMove > 0 && mutableGameRef.current) {
        const moves = mutableGameRef.current.history({ verbose: true }) as ChessMove[];
        const lastMove = moves[currentMove - 1];
        setCurrentMoveIsBest(lastMove && `${lastMove.from}${lastMove.to}` === evaluation.bestMove);
      }
    } catch (error) {
      setFeedback({ type: 'error', message: '評価中にエラーが発生しました' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextMove = async () => {
    if (mutableGameRef.current && currentMove < mutableGameRef.current.history().length && mutableBoardRef.current) {
      const moves = mutableGameRef.current.history({ verbose: true }) as ChessMove[];
      const move = moves[currentMove];
      if (move) {
        mutableBoardRef.current.position(move.after);
        setCurrentMove(prev => prev + 1);
        await evaluateCurrentPosition();
      }
    }
  };

  const prevMove = async () => {
    if (mutableGameRef.current && currentMove > 0 && mutableBoardRef.current) {
      const moves = mutableGameRef.current.history({ verbose: true }) as ChessMove[];
      const move = moves[currentMove - 2];
      mutableBoardRef.current.position(move ? move.after : 'start');
      setCurrentMove(prev => prev - 1);
      await evaluateCurrentPosition();
    }
  };

  return (
    <Toast.Provider swipeDirection="right">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Chess棋譜Viewer</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Chess.com ユーザー名"
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
                <h2 className="text-lg font-semibold mb-2 flex items-center">
                  <span className="mr-4">最近の対局</span>
                  <div className="flex items-center space-x-4">
                    <button
                      data-testid="filter-bullet-icon"
                      data-devinid="filter-bullet"
                      onClick={() => setSelectedGameType((prev: 'Bullet' | 'Blitz' | 'Rapid' | 'Daily' | null) => prev === 'Bullet' ? null : 'Bullet')}
                      className={`cursor-pointer text-2xl ${selectedGameType === 'Bullet' ? 'text-amber-800' : 'text-gray-300'}`}
                      title="Bullet"
                    >
                      <FontAwesomeIcon icon={faRocket} />
                    </button>
                    <button
                      data-testid="filter-blitz-icon"
                      data-devinid="filter-blitz"
                      onClick={() => setSelectedGameType((prev: 'Bullet' | 'Blitz' | 'Rapid' | 'Daily' | null) => prev === 'Blitz' ? null : 'Blitz')}
                      className={`cursor-pointer text-2xl ${selectedGameType === 'Blitz' ? 'text-yellow-500' : 'text-gray-300'}`}
                      title="Blitz"
                    >
                      <FontAwesomeIcon icon={faBolt} />
                    </button>
                    <button
                      data-testid="filter-rapid-icon"
                      data-devinid="filter-rapid"
                      onClick={() => setSelectedGameType((prev: 'Bullet' | 'Blitz' | 'Rapid' | 'Daily' | null) => prev === 'Rapid' ? null : 'Rapid')}
                      className={`cursor-pointer text-2xl ${selectedGameType === 'Rapid' ? 'text-green-500' : 'text-gray-300'}`}
                      title="Rapid"
                    >
                      <FontAwesomeIcon icon={faStopwatch} />
                    </button>
                    <button
                      data-testid="filter-daily-icon"
                      data-devinid="filter-daily"
                      onClick={() => setSelectedGameType((prev: 'Bullet' | 'Blitz' | 'Rapid' | 'Daily' | null) => prev === 'Daily' ? null : 'Daily')}
                      className={`cursor-pointer text-2xl ${selectedGameType === 'Daily' ? 'text-orange-500' : 'text-gray-300'}`}
                      title="Daily"
                    >
                      <FontAwesomeIcon icon={faSun} />
                    </button>
                  </div>
                </h2>
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
                        </PaginationPrevious>
                      </PaginationItem>
                      {(() => {
                        // ページネーション表示用のユーティリティ関数
                        const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
                          if (total <= 7) {
                            return Array.from({ length: total }, (_, i) => i + 1);
                          }

                          const pages: (number | 'ellipsis')[] = [];
                          const delta = 2; // 現在のページの前後に表示するページ数

                          // 最初のページは常に表示
                          pages.push(1);

                          // 現在のページの周辺のページを計算
                          const leftBound = Math.max(2, current - delta);
                          const rightBound = Math.min(total - 1, current + delta);

                          // 左側の省略記号
                          if (leftBound > 2) {
                            pages.push('ellipsis');
                          } else if (leftBound === 2) {
                            pages.push(2);
                          }

                          // 現在のページの周辺
                          for (let i = leftBound; i <= rightBound; i++) {
                            if (i === leftBound && i > 2) {
                              pages.push(i);
                            } else if (i === rightBound && i < total - 1) {
                              pages.push(i);
                            } else if (i > leftBound && i < rightBound) {
                              pages.push(i);
                            }
                          }

                          // 右側の省略記号
                          if (rightBound < total - 1) {
                            pages.push('ellipsis');
                          } else if (rightBound === total - 1) {
                            pages.push(total - 1);
                          }

                          // 最後のページは常に表示
                          if (total > 1) {
                            pages.push(total);
                          }

                          return pages;
                        };

                        return getPageNumbers(currentPage, totalPages).map((page, idx) => (
                          <PaginationItem key={`${idx}-${page}`}>
                            {page === 'ellipsis' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                onClick={() => setCurrentPage(page as number)}
                                isActive={currentPage === page}
                                aria-label={`${page}ページ目へ`}
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ));
                      })()}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                          aria-label="次のページへ"
                        >
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
                  読み込む
                </button>
              </>
            )}
          </div>
          
          <div>
            {selectedGame && (
              <div className="mb-4 p-2 bg-gray-100 rounded">
                <p className="font-bold mb-1">対局情報</p>
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
                aria-label="前の手"
              >
                <ArrowLeft size={24} />
              </button>
              <button 
                onClick={nextMove}
                className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
                aria-label="次の手"
              >
                <ArrowRight size={24} />
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
              {isEvaluating ? (
                <span className="text-gray-500 flex items-center">評価中...</span>
              ) : currentMoveIsBest && currentMove > 0 ? (
                <div className="flex items-center text-green-500" title="最善手です" data-testid="best-move-indicator">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
              ) : null}
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
