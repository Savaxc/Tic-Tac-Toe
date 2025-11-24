import './board.css';

type BoardProps = {
  board: Array<Array<string | null>>;
  handleClick: (row: number, col: number) => void;
};

export const Board = ({board, handleClick}: BoardProps) => {
  return (
    <div className='board'>
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className='board_row'>
          {row.map((cell, cellIndex) => (
            <button 
            key={cellIndex}
            className='cell'
            onClick={() => handleClick(rowIndex, cellIndex)}> {cell} </button>
          ))}
        </div>
      ))}

    </div>
  )
}

