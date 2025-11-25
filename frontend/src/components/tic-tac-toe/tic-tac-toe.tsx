/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Board } from '../board/board';
import '../board/board.css';
import './tic-tac-toe.css';

type BoardArray = Array<Array<string | null>>;

export const TicTacToe = () => {
  const [board] = useState<BoardArray>(
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => null))  //kreiranje table, 3x3
  );

  return (
    <div className='game'>
      <h1>Tic-Tac-Toe</h1>
      <Board board={board} handleClick={() => ""} />
    </div>
  );
}

