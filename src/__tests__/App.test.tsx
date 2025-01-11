import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// モックとして chessboard.js を扱う
const mockFlip = vi.fn()
const mockPosition = vi.fn()
const mockDestroy = vi.fn()

const mockChessboard = () => ({
  position: mockPosition,
  destroy: mockDestroy,
  flip: mockFlip
})

vi.stubGlobal('Chessboard', mockChessboard)

// モックゲームデータ
// Set up a fixed base date for mock data
const BASE_DATE = new Date('2024-01-15');

const mockGames = Array.from({ length: 25 }, (_, i) => {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() - i);
  const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '.');
  
  const gameTypes = ['Bullet', 'Blitz', 'Rapid', 'Daily'];
  const timeControls = ['180', '600', '1800', '1/172800'];
  const typeIndex = i % 4;
  
  return {
    date: formattedDate,
    white: `Player${i * 2 + 1}`,
    black: `Player${i * 2 + 2}`,
    pgn: `[Event "Chess.com Game"]\n[Date "${formattedDate}"]\n[White "Player${i * 2 + 1}"]\n[Black "Player${i * 2 + 2}"]\n[Result "${i % 2 === 0 ? '1-0' : '0-1'}"]\n[TimeControl "${timeControls[typeIndex]}"]\n\n1. ${i % 2 === 0 ? 'e4 e5' : 'd4 d5'} *`,
    result: i % 2 === 0 ? '1-0' : '0-1',
    timeControl: timeControls[typeIndex],
    gameType: gameTypes[typeIndex]
  };
})

describe('チェス盤のテスト', () => {
  it('盤面が表示され、反転ボタンを押すと flip() が呼ばれていることを確認', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 反転ボタンは aria-label="盤の上下反転" で定義されている
    const flipButton = await screen.findByRole('button', { name: '盤の上下反転' })
    expect(flipButton).toBeDefined()

    // ボタンを押下
    await user.click(flipButton)

    // flip が呼ばれたことを確認
    expect(mockFlip).toHaveBeenCalledTimes(1)
  })
})

describe('ゲームタイプアイコンのテスト', () => {
  beforeAll(() => {
    // Set up a fixed date for all tests in this suite
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    // APIレスポンスをモック
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/archives')) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return Promise.resolve({
          json: () => Promise.resolve({ 
            archives: [`https://api.chess.com/pub/player/test/games/${year}/${month}`] 
          })
        } as Response)
      }
      if (url.includes('/pgn')) {
        return Promise.resolve({
          text: () => Promise.resolve(mockGames.map(game => game.pgn).join('\n\n'))
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ゲームタイプに応じたアイコンが表示されることを確認', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    vi.advanceTimersByTime(100)
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)
    vi.advanceTimersByTime(1000)

    // ゲームタイプアイコンを確認
    const bulletIcons = await screen.findAllByTestId('bullet-icon')
    expect(bulletIcons[0]).toBeInTheDocument()
    expect(bulletIcons[0]).toHaveClass('text-amber-800')

    const blitzIcons = await screen.findAllByTestId('blitz-icon')
    expect(blitzIcons[0]).toBeInTheDocument()
    expect(blitzIcons[0]).toHaveClass('text-yellow-500')

    const rapidIcons = await screen.findAllByTestId('rapid-icon')
    expect(rapidIcons[0]).toBeInTheDocument()
    expect(rapidIcons[0]).toHaveClass('text-green-500')

    const dailyIcons = await screen.findAllByTestId('daily-icon')
    expect(dailyIcons[0]).toBeInTheDocument()
    expect(dailyIcons[0]).toHaveClass('text-orange-500')

    // ゲームを選択してゲームタイプ情報を確認
    const firstGame = await screen.findByText(mockGames[0].date)
    const firstGameButton = firstGame.closest('button')
    await user.click(firstGameButton!)
    vi.advanceTimersByTime(500)

    // 選択されたゲーム情報にゲームタイプとアイコンが表示されることを確認
    // Use a more flexible text matching approach
    // Find game type info by role and content
    const gameTypeInfo = screen.getByRole('heading', { name: '選択された対局情報' });
    expect(gameTypeInfo).toBeInTheDocument();
    
    // Find game type text with Bullet (exact format from component)
    const gameTypeText = screen.getByText('ゲームタイプ: Bullet');
    expect(gameTypeText).toBeInTheDocument();

    // Verify game type icon
    const selectedGameIcon = screen.getAllByTestId('bullet-icon')[1] // Second bullet icon (in game details)
    expect(selectedGameIcon).toBeInTheDocument()
    expect(selectedGameIcon).toHaveClass('text-amber-800')
  })

  it('ゲームタイプフィルタが機能することを確認', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    vi.advanceTimersByTime(100)
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)
    vi.advanceTimersByTime(1000)

    // Wait for games to load and verify pagination
    await screen.findByText(mockGames[0].date);
    
    // Get all game buttons (excluding navigation and filter buttons)
    const gameButtons = screen.getAllByRole('button').filter(button => {
      const text = button.textContent || '';
      return mockGames.some(game => text.includes(game.date));
    });
    
    // Should show first page of games (10 per page)
    expect(gameButtons).toHaveLength(10);

    // Bulletアイコンをクリック
    const bulletIcon = await screen.findByTestId('filter-bullet-icon')
    await user.click(bulletIcon)
    vi.advanceTimersByTime(1000)
    
    // Wait for filter to apply
    await screen.findByText(mockGames[0].date)
    vi.advanceTimersByTime(1000)

    // Verify filtered Bullet games (should show all Bullet games up to page limit)
    const bulletGames = screen.getAllByRole('button').filter(button =>
      button.textContent?.match(/\d{4}\.\d{2}\.\d{2}/) && // Has a date
      mockGames.some(game => 
        game.gameType === 'Bullet' && 
        button.textContent?.includes(game.date)
      )
    );
    const expectedBulletGames = Math.min(10, mockGames.filter(g => g.gameType === 'Bullet').length);
    expect(bulletGames).toHaveLength(expectedBulletGames);
    expect(bulletGames[0]).toHaveTextContent(mockGames[0].date)

    // 再度クリックでフィルタ解除
    await user.click(bulletIcon)
    vi.advanceTimersByTime(1000)
    
    // Wait for filter to reset
    await screen.findByText(mockGames[0].date)
    vi.advanceTimersByTime(1000)
    
    const resetGames = screen.getAllByRole('button', { name: new RegExp(mockGames[0].date) })
    expect(resetGames).toHaveLength(10) // Back to showing first page

    // 他のゲームタイプでも確認
    const blitzIcon = screen.getByTestId('filter-blitz-icon')
    await user.click(blitzIcon)
    await screen.findByText(mockGames[1].date) // Wait for filtered games to load
    vi.advanceTimersByTime(1000)
    const blitzGames = screen.getAllByRole('button', { name: /.*/ }).filter(button => 
      button.textContent && button.textContent.includes(mockGames[1].date)
    )
    const expectedBlitzGames = Math.min(10, Math.ceil(25/4)) // 25 total games, 4 types, max 10 per page
    expect(blitzGames).toHaveLength(expectedBlitzGames)
  })
})

describe('ページネーションのテスト', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  // getPageNumbers 関数をテストするためにコンポーネントから抽出
  const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    const delta = 2;

    pages.push(1);

    const leftBound = Math.max(2, current - delta);
    const rightBound = Math.min(total - 1, current + delta);

    if (leftBound > 2) {
      pages.push('ellipsis');
    } else if (leftBound === 2) {
      pages.push(2);
    }

    for (let i = leftBound; i <= rightBound; i++) {
      if (i === leftBound && i > 2) {
        pages.push(i);
      } else if (i === rightBound && i < total - 1) {
        pages.push(i);
      } else if (i > leftBound && i < rightBound) {
        pages.push(i);
      }
    }

    if (rightBound < total - 1) {
      pages.push('ellipsis');
    } else if (rightBound === total - 1) {
      pages.push(total - 1);
    }

    if (total > 1) {
      pages.push(total);
    }

    return pages;
  };

  describe('getPageNumbers関数のテスト', () => {
    it('7ページ以下の場合、全てのページ番号を表示', () => {
      expect(getPageNumbers(1, 1)).toEqual([1]);
      expect(getPageNumbers(1, 3)).toEqual([1, 2, 3]);
      expect(getPageNumbers(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('現在のページの前後2ページと最初/最後のページを表示', () => {
      const result = getPageNumbers(5, 10);
      expect(result).toEqual([1, 'ellipsis', 3, 4, 5, 6, 7, 'ellipsis', 10]);
    });

    it('最初のページ付近では左の省略記号を表示しない', () => {
      const result = getPageNumbers(2, 10);
      expect(result).toEqual([1, 2, 3, 4, 'ellipsis', 10]);
    });

    it('最後のページ付近では右の省略記号を表示しない', () => {
      const result = getPageNumbers(9, 10);
      expect(result).toEqual([1, 'ellipsis', 7, 8, 9, 10]);
    });
  });

  it('ページ数が多いときに省略記号が表示されることを確認', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    vi.advanceTimersByTime(100)
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)
    vi.advanceTimersByTime(1000)

    // ゲームが読み込まれるのを待つ
    await screen.findByText(mockGames[0].date)
    vi.advanceTimersByTime(1000)

    // ページネーションの表示を確認
    const pagination = await screen.findByRole('navigation', { name: 'pagination' })
    expect(pagination).toBeInTheDocument()

    // 最初のページ、最後のページが表示されることを確認
    const page1 = screen.getByRole('link', { name: '1ページ目へ' })
    const page2 = screen.getByRole('link', { name: '2ページ目へ' })
    const page3 = screen.getByRole('link', { name: '3ページ目へ' }) // With 25 games and 10 per page, we have 3 pages

    expect(page1).toBeInTheDocument()
    expect(page2).toBeInTheDocument()
    expect(page3).toBeInTheDocument()

    // 3ページしかないので省略記号は表示されない
    expect(screen.queryByText('More pages')).not.toBeInTheDocument()

    // レスポンシブデザインのテスト
    // ページネーションが横に広がりすぎないことを確認
    const paginationContent = pagination.querySelector('ul')
    expect(paginationContent).toHaveClass('flex-wrap')
  })
})

describe('ゲーム選択と情報表示のテスト', () => {
  beforeAll(() => {
    // Set up a fixed date for all tests in this suite
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    // APIレスポンスをモック
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/archives')) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return Promise.resolve({
          json: () => Promise.resolve({ 
            archives: [`https://api.chess.com/pub/player/test/games/${year}/${month}`] 
          })
        } as Response)
      }
      if (url.includes('/pgn')) {
        return Promise.resolve({
          text: () => Promise.resolve(mockGames.map(game => game.pgn).join('\n\n'))
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ゲームを選択すると、ハイライトされ情報が表示されることを確認', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    vi.advanceTimersByTime(100)
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)
    vi.advanceTimersByTime(1000)

    // 最初のゲームを選択（日付は動的に生成される）
    const firstGame = await screen.findByRole('button', { name: new RegExp(mockGames[0].date) })
    const firstGameButton = firstGame
    expect(firstGameButton).toBeDefined()
    
    await user.click(firstGameButton)

    // ハイライトの確認
    expect(firstGameButton).toHaveClass('bg-blue-100')

    // ゲーム情報の表示を確認
    const gameInfo = screen.getByText('選択された対局情報')
    expect(gameInfo).toBeInTheDocument()

    // Use regex for text that might be split across elements
    const dateInfo = screen.getByText(new RegExp(`日付: ${mockGames[0].date}`))
    expect(dateInfo).toBeInTheDocument()

    const resultInfo = screen.getByText(new RegExp(`結果: ${mockGames[0].result}`))
    expect(resultInfo).toBeInTheDocument()

    const playerInfo = screen.getByText(new RegExp(`白: ${mockGames[0].white}, 黒: ${mockGames[0].black}`))
    expect(playerInfo).toBeInTheDocument()

    // Check game type info with regex
    const gameTypeInfo = screen.getByText(/ゲームタイプ: Bullet/)
    expect(gameTypeInfo).toBeInTheDocument()
  })
})
