import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
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

  // ゲーム選択と情報表示のテスト
  test('ゲームを選択すると、ハイライトされ情報が表示されることを確認', async () => {
    render(<App />);

    // PGNを入力して読み込み
    const testPgn = `[Event "Test Game"]
[Site "Chess.com"]
[Date "2024.02.04"]
[White "test"]
[Black "opponent"]
[Result "1-0"]
[TimeControl "60"]
[Variant "Standard"]

1. e4 e5 *`;

    const textarea = screen.getByPlaceholderText('ここにPGNをペーストしてください...');
    fireEvent.change(textarea, { target: { value: testPgn } });
    
    await act(async () => {
      fireEvent.click(screen.getByText('読み込む'));
      // UIの更新を待機
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // PGNの読み込みが完了するまで待機
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // ゲーム情報セクションの存在を確認
    const gameInfo = screen.getByTestId('game-info');
    expect(gameInfo).toBeInTheDocument();

    // 日付要素の存在を確認
    const dateElement = within(gameInfo).getByTestId('game-date');
    expect(dateElement).toBeInTheDocument();
    expect(dateElement).toHaveTextContent('2024.02.04');
    
    // 日付ラベルの存在を確認
    const dateLabel = within(gameInfo).getByText('日付');
    expect(dateLabel).toBeInTheDocument();
  });

  test('shows best move indicator when move is optimal', async () => {
    render(<App />);

    // PGNを入力して読み込み
    const textarea = screen.getByPlaceholderText('ここにPGNをペーストしてください...');
    fireEvent.change(textarea, { target: { value: '1. e4 e5 2. Nf3 Nc6' } });
    
    await act(async () => {
      fireEvent.click(screen.getByText('読み込む'));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // 次の手ボタンをクリック
    const nextButton = screen.getByLabelText('次の手');
    
    await act(async () => {
      fireEvent.click(nextButton);
      // 評価状態の変更を待機
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 評価中の状態を確認（下部の評価状態表示）
    const evaluationStatus = screen.getAllByTestId('evaluation-status')[0];
    expect(evaluationStatus).toHaveTextContent('評価中...');

    // 評価が完了するまで待機
    await act(async () => {
      await mockEvaluatePosition();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 最善手の表示を確認
    const bestMoveIndicator = screen.getByTestId('best-move-indicator');
    expect(bestMoveIndicator).toBeInTheDocument();
    expect(bestMoveIndicator).toHaveAttribute('title', '最善手です');
  });

  test('evaluates position after each move', async () => {
    render(<App />);

    // PGNを入力して読み込み
    const textarea = screen.getByPlaceholderText('ここにPGNをペーストしてください...');
    fireEvent.change(textarea, { target: { value: '1. e4 e5 2. Nf3 Nc6' } });
    
    await act(async () => {
      fireEvent.click(screen.getByText('読み込む'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 次の手を2回クリック
    const nextButton = screen.getByLabelText('次の手');
    
    // 最初の手
    await act(async () => {
      fireEvent.click(nextButton);
      // 評価状態の変更を待機
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 評価中の状態を確認（下部の評価状態表示）
    const evaluationStatus = screen.getAllByTestId('evaluation-status')[0];
    expect(evaluationStatus).toHaveTextContent('評価中...');

    await act(async () => {
      await mockEvaluatePosition();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockEvaluatePosition).toHaveBeenCalledTimes(1);

    // 2回目の手
    await act(async () => {
      fireEvent.click(nextButton);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 評価中の状態を確認
    const secondEvaluationStatus = screen.getAllByTestId('evaluation-status')[0];
    expect(secondEvaluationStatus).toHaveTextContent('評価中...');

    await act(async () => {
      await mockEvaluatePosition();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockEvaluatePosition).toHaveBeenCalledTimes(2);
  });

  test('displays game type and background correctly', async () => {
    render(<App />);
    
    // PGNを入力して読み込み
    const textarea = screen.getByPlaceholderText('ここにPGNをペーストしてください...');
    const testPgn = `[Event "Test Game"]
[Site "Chess.com"]
[Date "2024.02.04"]
[White "test"]
[Black "opponent"]
[Result "1-0"]
[TimeControl "60"]
[Variant "Standard"]

1. e4 e5 *`;
    
    fireEvent.change(textarea, { target: { value: testPgn } });
    
    await act(async () => {
      fireEvent.click(screen.getByText('読み込む'));
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // ゲーム情報の表示を確認
    const dateElement = await screen.findByTestId('game-date');
    expect(dateElement).toHaveTextContent('2024.02.04');

    // 評価状態の表示を確認
    const evaluationStatus = await screen.findByTestId('evaluation-status');
    expect(evaluationStatus).toBeInTheDocument();
    expect(evaluationStatus).toHaveTextContent('');

    // ゲームタイプの表示を確認（Bulletゲーム）
    const gameTypeElement = screen.getByTestId('game-type');
    expect(gameTypeElement).toHaveTextContent('ゲームタイプ: Bullet');
    
    // アイコンの表示を確認
    const bulletIcon = screen.getByTestId('filter-bullet-icon');
    expect(bulletIcon).toBeInTheDocument();
  });
});
