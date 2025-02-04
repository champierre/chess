import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import App from './App';
import { StockfishService } from './services/stockfish';

vi.mock('./services/stockfish', () => ({
  StockfishService: vi.fn().mockImplementation(() => ({
    evaluatePosition: vi.fn().mockResolvedValue({ bestMove: 'e2e4', score: 0.5 }),
    destroy: vi.fn()
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
    });

    // 最善手の表示を確認
    await waitFor(() => {
      const bestMoveIndicator = screen.getByTitle('最善手です');
      expect(bestMoveIndicator).toBeInTheDocument();
    });
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
      const mockStockfish = StockfishService as unknown as { mock: { results: Array<{ value: { evaluatePosition: vi.Mock } }> } };
      const mockInstance = mockStockfish.mock.results[0].value;
      expect(mockInstance.evaluatePosition).toHaveBeenCalledTimes(2);
    });
  });
});
