import { describe, it, expect, vi } from 'vitest'
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
