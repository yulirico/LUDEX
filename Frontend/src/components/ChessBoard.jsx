import { useMemo } from 'react';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function ChessBoard({ chess, selected, legalTargets = [], lastMove, onSquareClick, orientation = 'white' }) {
  const board = useMemo(() => chess.board(), [chess]);

  const ranks = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'white' ? FILES : [...FILES].reverse();

  return (
    <div className="board">
      {ranks.map(rank =>
        files.map(file => {
          const sq = file + rank;
          const fileIdx = FILES.indexOf(file);
          const rankIdx = 8 - rank;
          const piece = board[rankIdx][fileIdx];
          const dark = (fileIdx + rankIdx) % 2 === 1;
          const isSel = selected === sq;
          const isTarget = legalTargets.includes(sq);
          const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
          const cls = ['sq', dark ? 'd' : 'l', isSel && 'sel', isTarget && 'hi', isLast && 'lastmove']
            .filter(Boolean).join(' ');
          return (
            <div key={sq} className={cls} onClick={() => onSquareClick(sq)}>
              {piece && (
                <span className={piece.color === 'w' ? 'pc-w' : 'pc-b'}>{GLYPH[piece.type]}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}