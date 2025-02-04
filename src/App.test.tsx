import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import React from 'react';
import App from './App';

interface ChessboardConfig {
  position?: (fen: string) => void;
  destroy?: () => void;
  [key: string]: any;
}

// Chessboardのモック
const mockPosition = vi.fn();
const mockDestroy = vi.fn();
const mockEvaluatePosition = vi.fn().mockImplementation(() => {
  return Promise.resolve({ bestMove: 'e2e4', score: 0.5 });
});

vi.stubGlobal('Chessboard', (_container: HTMLElement, config: ChessboardConfig) => {
  const instance = {
    position: mockPosition,
    destroy: mockDestroy,
    ...config
  };
  // グローバルなChessboardインスタンスを設定
  (window as any).chessboard = instance;
  return instance;
});

vi.mock('./services/stockfish', () => ({
  StockfishService: vi.fn().mockImplementation(() => ({
    evaluatePosition: mockEvaluatePosition,
    destroy: vi.fn()
  }))
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPosition.mockClear();
  mockDestroy.mockClear();
  mockEvaluatePosition.mockClear();
});

describe('Stockfish integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows best move indicator when move is optimal', async () => {
    render(<App />);

    // PGNを入力して読み込み
    const textarea = screen.getByPlaceholderText('ここにPGNをペーストしてください...');
    fireEvent.change(textarea, { target: { value: '1. e4 e5 2. Nf3 Nc6' } });
    const loadButton = screen.getByText('読み込む');
    await act(async () => {
      fireEvent.click(loadButton);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // 次の手ボタンをクリック
    const nextButton = screen.getByLabelText('次の手');
    await act(async () => {
      fireEvent.click(nextButton);
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    // 評価中の状態を確認
    await waitFor(() => {
      const evaluatingElement = screen.getByTestId('evaluating');
      expect(evaluatingElement).toBeInTheDocument();
      expect(evaluatingElement).toHaveTextContent('評価中...');
    }, { timeout: 3000 });

    // 評価が完了するまで待機
    await waitFor(() => {
      expect(mockEvaluatePosition).toHaveBeenCalled();
    }, { timeout: 3000 });

    // 最善手の表示を確認
    await waitFor(() => {
      expect(screen.queryByTestId('evaluating')).not.toBeInTheDocument();
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
    await act(async () => {
      fireEvent.click(screen.getByText('読み込む'));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // 次の手を2回クリック
    const nextButton = screen.getByLabelText('次の手');
    
    // 最初の手
    await act(async () => {
      fireEvent.click(nextButton);
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    await waitFor(() => {
      const evaluatingElement = screen.getByTestId('evaluating');
      expect(evaluatingElement).toBeInTheDocument();
      expect(evaluatingElement).toHaveTextContent('評価中...');
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockEvaluatePosition).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });

    // 2回目の手
    await act(async () => {
      fireEvent.click(nextButton);
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    await waitFor(() => {
      const evaluatingElement = screen.getByTestId('evaluating');
      expect(evaluatingElement).toBeInTheDocument();
      expect(evaluatingElement).toHaveTextContent('評価中...');
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockEvaluatePosition).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });
    });
  });
});
