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
    pgn: '[Event "Chess.com Game"]\n[Date "2024.01.01"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n1. e4 e5 1-0',
    result: '1-0'
  },
  {
    date: '2024.01.02',
    white: 'Player3',
    black: 'Player4',
    pgn: '[Event "Chess.com Game"]\n[Date "2024.01.02"]\n[White "Player3"]\n[Black "Player4"]\n[Result "0-1"]\n1. d4 d5 0-1',
    result: '0-1'
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

describe('ゲーム選択と情報表示のテスト', () => {
  beforeEach(() => {
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
