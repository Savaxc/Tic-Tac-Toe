import { useState } from "react";
import { Board } from "../board/board";


type BoardArray = Array<Array<string | null>>;

const checkWinner = (board: BoardArray): string | null => {
  const lines = [
    // Rows
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],
    // Columns
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    // Diagonals
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]],
  ];

  for (const line of lines) {
    if (line[0] && line[0] === line[1] && line[1] === line[2]) {
      return line[0];
    }
  }
  return null;
};

export const TicTacToeMulti = () => {
  const initialBoard: BoardArray = Array.from({ length: 3 }, () => Array(3).fill(null));
  const [board, setBoard] = useState<BoardArray>(initialBoard);
  const [player, setPlayer] = useState<string>('X');
  const [winner, setWinner] = useState<string | null>(null);
  const [isNoWinner, setIsNoWinner] = useState<boolean>(false);

  const handleOnClick = (row: number, col: number) => {
    if (board[row][col] || winner) return;

    const updatedBoard = board.map((r, rowIndex) =>
      r.map((cell, colIndex) => (rowIndex === row && colIndex === col ? player : cell))
    );
    setBoard(updatedBoard);

    const newWinner = checkWinner(updatedBoard);
    setWinner(newWinner);

    const hasNullValue = updatedBoard.some((r) => r.some((c) => c === null));
    if (!newWinner && !hasNullValue) {
      setIsNoWinner(true);
      return;
    }

    // Switch player
    setPlayer(player === 'X' ? 'O' : 'X');
  };

  const restartGame = () => {
    setBoard(initialBoard);
    setPlayer('X');
    setWinner(null);
    setIsNoWinner(false);
  };

  return (
    <>
      <div className='game'>
        <h1> Tic-Tac-Toe LOCAL Multiplayer</h1>
        <p>Current Turn: {player}</p>
        <Board board={board} handleClick={handleOnClick} />
        {winner && <p>{winner} Wins!</p>}
        {isNoWinner && <p>No one wins</p>}
        <button className='reset' type='button' onClick={restartGame}>
          Restart Game
        </button>
      </div>

      
      <button className='newGame' type='button'>
        Create New Game
      </button>
      <button className='joinGame' type='button'>
        Join Existing Game
      </button>
    </>
  );
};
