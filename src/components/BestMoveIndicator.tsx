import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { ChessMove } from '../App';

interface BestMoveIndicatorProps {
  currentMove: ChessMove;
  evaluation: { bestMove: string; score: number } | null;
}

export function BestMoveIndicator({ currentMove, evaluation }: BestMoveIndicatorProps) {
  if (!evaluation) return null;
  
  const isBestMove = currentMove.san === evaluation.bestMove;
  
  return (
    <div className="flex items-center gap-2">
      {isBestMove ? (
        <FontAwesomeIcon
          icon={faCheck}
          className="text-green-500"
          title="最善手です"
        />
      ) : (
        <FontAwesomeIcon
          icon={faXmark}
          className="text-gray-400"
          title={`最善手: ${evaluation.bestMove}`}
        />
      )}
      <span className="text-sm text-gray-600">
        評価値: {evaluation.score}
      </span>
    </div>
  );
}
