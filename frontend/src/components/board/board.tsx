import "./board.css";

type BoardProps = {
  board: Array<Array<string | null>>;
  handleClick: (row: number, col: number) => void;
  winningCells?: [number, number][];
};

export const Board = ({
  board,
  handleClick,
  winningCells = [],
}: BoardProps) => {
  const isWinningCell = (row: number, col: number) =>
    winningCells.some(([r, c]) => r === row && c === col);

  return (
    <div className="board">
      {board.map((rowArr, rowIndex) => (
        <div key={rowIndex} className="board_row">
          {rowArr.map((cell, colIndex) => (
            <button
              key={colIndex}
              className="cell"
              onClick={() => handleClick(rowIndex, colIndex)}
              style={{
                backgroundColor: isWinningCell(rowIndex, colIndex)
                  ? "#61dafb"
                  : "#f8f8f8",
                color: isWinningCell(rowIndex, colIndex) ? "white" : "black",
              }}
            >
              {cell}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
