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
const mockGames = [
  {
    date: '2024.01.01',
    white: 'Player1',
    black: 'Player2',
    pgn: '[Event "Chess.com Game"]\n[Date "2024.01.01"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n[TimeControl "60"]\n\n1. e4 e5 *',
    result: '1-0',
    timeControl: '60',
    gameType: 'Bullet'
  },
  {
    date: '2024.01.02',
    white: 'Player3',
    black: 'Player4',
    pgn: '[Event "Chess.com Game"]\n[Date "2024.01.02"]\n[White "Player3"]\n[Black "Player4"]\n[Result "0-1"]\n[TimeControl "600"]\n\n1. d4 d5 *',
    result: '0-1',
    timeControl: '600',
    gameType: 'Blitz'
  },
  {
    date: '2024.01.03',
    white: 'Player5',
    black: 'Player6',
    pgn: '[Event "Chess.com Game"]\n[Date "2024.01.03"]\n[White "Player5"]\n[Black "Player6"]\n[Result "1-0"]\n[TimeControl "1800"]\n\n1. e4 e5 *',
    result: '1-0',
    timeControl: '1800',
    gameType: 'Rapid'
  },
  {
    date: '2024.01.04',
    white: 'Player7',
    black: 'Player8',
    pgn: '[Event "Chess.com Game"]\n[Date "2024.01.04"]\n[White "Player7"]\n[Black "Player8"]\n[Result "0-1"]\n[TimeControl "1/172800"]\n\n1. d4 d5 *',
    result: '0-1',
    timeControl: '1/172800',
    gameType: 'Daily'
  }
]

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
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2024-01-15'))

    // APIレスポンスをモック
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/archives')) {
        return Promise.resolve({
          json: () => Promise.resolve({ archives: ['https://api.chess.com/pub/player/test/games/2024/01'] })
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
    vi.useRealTimers()
  })

  it('ゲームタイプに応じたアイコンが表示されることを確認', async () => {
    const user = userEvent.setup()
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'test')
    
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
    const firstGame = await screen.findByText('2024.01.01')
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
    await user.type(usernameInput, 'test')
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)

    // 全ゲームが描画されているかを確認（モックデータは4件）
    const initialGames = await screen.findAllByRole('button', { name: /2024/ })
    expect(initialGames).toHaveLength(4)

    // Bulletアイコンをクリック
    const bulletIcon = await screen.findByTestId('filter-bullet-icon')
    await user.click(bulletIcon)

    // Bulletのみが表示されているか確認（モックデータでは1件）
    const bulletGames = screen.getAllByRole('button', { name: /2024/ })
    expect(bulletGames).toHaveLength(1)
    expect(bulletGames[0]).toHaveTextContent('2024.01.01')

    // 再度クリックでフィルタ解除
    await user.click(bulletIcon)
    const resetGames = screen.getAllByRole('button', { name: /2024/ })
    expect(resetGames).toHaveLength(4)

    // 他のゲームタイプでも確認
    const blitzIcon = screen.getByTestId('filter-blitz-icon')
    await user.click(blitzIcon)
    const blitzGames = screen.getAllByRole('button', { name: /2024/ })
    expect(blitzGames).toHaveLength(1)
    expect(blitzGames[0]).toHaveTextContent('2024.01.02')
  })
})

describe('ゲーム選択と情報表示のテスト', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2024-01-15'))

    // APIレスポンスをモック
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/archives')) {
        return Promise.resolve({
          json: () => Promise.resolve({ archives: ['https://api.chess.com/pub/player/test/games/2024/01'] })
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
    vi.useRealTimers()
  })

  it('ゲームを選択すると、ハイライトされ情報が表示されることを確認', async () => {
    const user = userEvent.setup()
    render(<App />)

    // ユーザー名を入力してゲームを取得
    const usernameInput = screen.getByPlaceholderText('例: jishiha')
    await user.type(usernameInput, 'test')
    
    const fetchButton = screen.getByRole('button', { name: '取得' })
    await user.click(fetchButton)

    // 最初のゲームを選択
    const firstGame = await screen.findByText('2024.01.01')
    const firstGameButton = firstGame.closest('button')
    expect(firstGameButton).toBeDefined()
    
    await user.click(firstGameButton!)

    // ハイライトの確認
    expect(firstGameButton).toHaveClass('bg-blue-100')

    // ゲーム情報の表示を確認
    const gameInfo = screen.getByText('選択された対局情報')
    expect(gameInfo).toBeInTheDocument()

    const dateInfo = screen.getByText('日付: 2024.01.01')
    expect(dateInfo).toBeInTheDocument()

    const resultInfo = screen.getByText('結果: 1-0')
    expect(resultInfo).toBeInTheDocument()

    const playerInfo = screen.getByText('白: Player1, 黒: Player2')
    expect(playerInfo).toBeInTheDocument()
  })
})
