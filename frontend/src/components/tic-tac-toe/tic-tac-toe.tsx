/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Board } from '../board/board';
import '../board/board.css';
import './tic-tac-toe.css';

type BoardArray = Array<Array<string | null>>;

//iteracija kroz prazna polja i onda random se bira computerMove u neko od tih
const makeComputerMove = (board: BoardArray): [number, number] => {
  const emptyCells: [number, number] [] = [];
  board.forEach((row, rowIndex) => {
    row.forEach((cell, cellIndex) => {
      if(!cell){
        emptyCells.push([rowIndex, cellIndex])
      }
    })
  })

  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  return emptyCells[randomIndex];

};

const checkWinner = (board: BoardArray): string | null => {
  const lines = [
    //Rows(red)
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],

    //Columns(kolone)
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],

    //Diagonals
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]],
  ];

  //da li je prvo polje prazno, da li su sva 3 ista, true -> x ili o, !true -> null
  for (const line of lines) {
    if (line[0] && line[0] === line[1] && line[1] === line[2]) {
      return line[0];
    }
  }
  return null;
};

export const TicTacToe = () => {
  const [board, setBoard] = useState<BoardArray>(
    Array.from({ length: 3 }, () =>
       Array.from({ length: 3 }, () => null))  //kreiranje table, 3x3
  );
  const [player, setPlayer] = useState<string>('X');
  const [winner, setWinner] = useState<string | null>(null);

  //field taken -> can't click again
  //winner -> no further play
  const handleOnClick = (row: number, col: number) => {
    if (board[row][col] || winner) {
      return;
    }

    //players turn, make new copy of the board(updatedPlayerBoard)
    //iteracija kroz svaki red, zatim iteracija u tom redu za svako polje
    const updatedPlayerBoard = board.map((newRow, rowIndex) => 
      newRow.map((cell, cellIndex) => 
        rowIndex === row && cellIndex === col ? player : cell)
    );
    setBoard(updatedPlayerBoard);

    //checkWinner
    const newWinner = checkWinner(updatedPlayerBoard)
    setWinner(newWinner);
    setPlayer('X');
    
    // setPlayer(player === 'X' ? 'O' : 'X');

    //Computer's move
    if(!newWinner) {
      const [computerRow, computerCol] = makeComputerMove(updatedPlayerBoard);
      const updatedComputerBoard = updatedPlayerBoard.map((newRow, rowIndex) => 
        newRow.map((cell, cellIndex) => 
          rowIndex === computerRow && cellIndex === computerCol ? 'O' : cell));
      
      setTimeout(() => {
				setBoard(updatedComputerBoard);
				setWinner(checkWinner(updatedComputerBoard));
			}, 200); // delay
    }
     
  };

  return (
    <div className='game'>
      <h1>Tic-Tac-Toe</h1>
      <Board board={board} handleClick={handleOnClick} />
    </div>
  );
}

