import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
const mockGames = Array.from({ length: 25 }, (_, i) => {
  const date = new Date();
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
  beforeEach(() => {
    // APIレスポンスをモック
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/archives')) {
        return Promise.resolve({
          json: () => Promise.resolve({ archives: ['https://api.chess.com/pub/player/test/games/2025/01'] })
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
    const user = userEvent.setup()
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)

    // Bulletゲームのアイコンを確認
    const bulletIcon = await screen.findByTestId('bullet-icon')
    expect(bulletIcon).toBeInTheDocument()
    expect(bulletIcon).toHaveClass('text-amber-800')

    // Blitzゲームのアイコンを確認
    const blitzIcon = await screen.findByTestId('blitz-icon')
    expect(blitzIcon).toBeInTheDocument()
    expect(blitzIcon).toHaveClass('text-yellow-500')

    // Rapidゲームのアイコンを確認
    const rapidIcon = await screen.findByTestId('rapid-icon')
    expect(rapidIcon).toBeInTheDocument()
    expect(rapidIcon).toHaveClass('text-green-500')

    // Dailyゲームのアイコンを確認
    const dailyIcon = await screen.findByTestId('daily-icon')
    expect(dailyIcon).toBeInTheDocument()
    expect(dailyIcon).toHaveClass('text-orange-500')

    // ゲームを選択してゲームタイプ情報を確認
    const firstGame = await screen.findByText('2025.01.07')
    const firstGameButton = firstGame.closest('button')
    await user.click(firstGameButton!)

    // 選択されたゲーム情報にゲームタイプとアイコンが表示されることを確認
    const gameTypeInfo = screen.getByText(/ゲームタイプ: Bullet/)
    expect(gameTypeInfo).toBeInTheDocument()
    const selectedGameIcon = screen.getAllByTestId('bullet-icon')[1] // 2つ目のBulletアイコン（詳細表示）
    expect(selectedGameIcon).toBeInTheDocument()
  })

  it('ゲームタイプフィルタが機能することを確認', async () => {
    const user = userEvent.setup()
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)

    // 全ゲームが描画されているかを確認（モックデータは4件）
    const initialGames = await screen.findAllByRole('button', { name: /2025/ })
    expect(initialGames).toHaveLength(4)

    // Bulletアイコンをクリック
    const bulletIcon = await screen.findByTestId('filter-bullet-icon')
    await user.click(bulletIcon)

    // Bulletのみが表示されているか確認（モックデータでは1件）
    const bulletGames = screen.getAllByRole('button', { name: /2025/ })
    expect(bulletGames).toHaveLength(1)
    expect(bulletGames[0]).toHaveTextContent('2025.01.07')

    // 再度クリックでフィルタ解除
    await user.click(bulletIcon)
    const resetGames = screen.getAllByRole('button', { name: /2025/ })
    expect(resetGames).toHaveLength(4)

    // 他のゲームタイプでも確認
    const blitzIcon = screen.getByTestId('filter-blitz-icon')
    await user.click(blitzIcon)
    const blitzGames = screen.getAllByRole('button', { name: /2025/ })
    expect(blitzGames).toHaveLength(1)
    expect(blitzGames[0]).toHaveTextContent('2025.01.08')
  })
})

describe('ページネーションのテスト', () => {
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
    const user = userEvent.setup()
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)

    // ページネーションの表示を確認
    const pagination = screen.getByRole('navigation', { name: 'pagination' })
    expect(pagination).toBeInTheDocument()

    // 最初のページ、省略記号、最後のページが表示されることを確認
    const page1 = screen.getByRole('link', { name: '1ページ目へ' })
    const page2 = screen.getByRole('link', { name: '2ページ目へ' })
    const page3 = screen.getByRole('link', { name: '3ページ目へ' })
    const ellipsis = screen.getByText('More pages')
    const lastPage = screen.getByRole('link', { name: '68ページ目へ' })

    expect(page1).toBeInTheDocument()
    expect(page2).toBeInTheDocument()
    expect(page3).toBeInTheDocument()
    expect(ellipsis).toBeInTheDocument()
    expect(lastPage).toBeInTheDocument()

    // レスポンシブデザインのテスト
    // ページネーションが横に広がりすぎないことを確認
    const paginationContent = pagination.querySelector('ul')
    expect(paginationContent).toHaveClass('flex-wrap')
  })
})

describe('ゲーム選択と情報表示のテスト', () => {
  beforeEach(() => {
    // APIレスポンスをモック
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/archives')) {
        return Promise.resolve({
          json: () => Promise.resolve({ archives: ['https://api.chess.com/pub/player/test/games/2025/01'] })
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
    const user = userEvent.setup()
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'testuser')
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)

    // 最初のゲームを選択
    const firstGame = await screen.findByText('2025.01.07')
    const firstGameButton = firstGame.closest('button')
    expect(firstGameButton).toBeDefined()
    
    await user.click(firstGameButton!)

    // ハイライトの確認
    expect(firstGameButton).toHaveClass('bg-blue-100')

    // ゲーム情報の表示を確認
    const gameInfo = screen.getByText('選択された対局情報')
    expect(gameInfo).toBeInTheDocument()

    const dateInfo = screen.getByText('日付: 2025.01.07')
    expect(dateInfo).toBeInTheDocument()

    const resultInfo = screen.getByText('結果: 1-0')
    expect(resultInfo).toBeInTheDocument()

    const playerInfo = screen.getByText('白: Player1, 黒: Player2')
    expect(playerInfo).toBeInTheDocument()
  })
})
