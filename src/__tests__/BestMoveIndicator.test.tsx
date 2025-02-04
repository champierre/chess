import { describe, it, expect } from 'vitest'
import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { BestMoveIndicator } from '../components/BestMoveIndicator'
import type { ChessMove } from '../App'

describe('BestMoveIndicator', () => {
  const mockMove: ChessMove = {
    after: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    color: 'w',
    flags: 'b',
    from: 'e2',
    to: 'e4',
    san: 'e4',
    piece: 'p'
  }

  it('最善手の場合、チェックマークと評価値を表示', () => {
    const evaluation = { bestMove: 'e4', score: 45 }
    render(<BestMoveIndicator currentMove={mockMove} evaluation={evaluation} />)

    expect(screen.getByTitle('最善手です')).toBeInTheDocument()
    expect(screen.getByText('評価値: 45')).toBeInTheDocument()
  })

  it('最善手でない場合、バツ印と評価値を表示', () => {
    const evaluation = { bestMove: 'd4', score: 35 }
    render(<BestMoveIndicator currentMove={mockMove} evaluation={evaluation} />)

    expect(screen.getByTitle('最善手: d4')).toBeInTheDocument()
    expect(screen.getByText('評価値: 35')).toBeInTheDocument()
  })

  it('評価がnullの場合、何も表示しない', () => {
    const { container } = render(<BestMoveIndicator currentMove={mockMove} evaluation={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
