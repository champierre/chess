import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { vi, Mock } from 'vitest';
import App from './App';
import { mutableBoardRef } from './App';
import { StockfishService } from './services/stockfish';

interface ChessboardConfig {
  position?: (fen: string) => void;
  destroy?: () => void;
  [key: string]: any;
}

// Chessboardのモック
const mockPosition = vi.fn();
const mockDestroy = vi.fn();

vi.stubGlobal('Chessboard', (_container: HTMLElement, config: ChessboardConfig) => {
  const instance = {
    position: mockPosition,
    destroy: mockDestroy,
    ...config
  };
  return instance;
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPosition.mockClear();
  mockDestroy.mockClear();
  mockEvaluatePosition.mockClear();
});

const mockEvaluatePosition = vi.fn().mockResolvedValue({ bestMove: 'e2e4', score: 0.5 });
const mockDestroy = vi.fn();

vi.mock('./services/stockfish', () => ({
  StockfishService: vi.fn().mockImplementation(() => ({
    evaluatePosition: mockEvaluatePosition,
    destroy: mockDestroy
  }))
}));

describe('Stockfish integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows best move indicator when move is optimal', async () => {
    render(<App />);

    // PGNを入力
    const textarea = screen.getByPlaceholderText('ここにPGNをペーストしてください...');
    fireEvent.change(textarea, { target: { value: '1. e4 e5 2. Nf3 Nc6' } });

    // 読み込みボタンをクリック
    const loadButton = screen.getByText('読み込む');
    fireEvent.click(loadButton);

    // 次の手ボタンをクリック
    const nextButton = screen.getByLabelText('次の手');
    fireEvent.click(nextButton);

    // 評価中の表示を確認
    await waitFor(() => {
      expect(screen.getByText('評価中...')).toBeInTheDocument();
    }, { timeout: 1000 });

    // 最善手の表示を確認（非同期処理の完了を待つ）
    await waitFor(() => {
      const bestMoveIndicator = screen.getByTestId('best-move-indicator');
      expect(bestMoveIndicator).toBeInTheDocument();
      expect(bestMoveIndicator).toHaveAttribute('title', '最善手です');
    }, { timeout: 3000 });
  });

  test('evaluates position after each move', async () => {
    render(<App />);

    // PGNを入力して読み込み
    const textarea = screen.getByPlaceholderText('ここにPGNをペーストしてください...');
    fireEvent.change(textarea, { target: { value: '1. e4 e5 2. Nf3 Nc6' } });
    fireEvent.click(screen.getByText('読み込む'));

    // 次の手を2回クリック
    const nextButton = screen.getByLabelText('次の手');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // StockfishServiceのevaluatePositionが2回呼ばれることを確認
    await waitFor(() => {
      expect(mockEvaluatePosition).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });
  });
});
