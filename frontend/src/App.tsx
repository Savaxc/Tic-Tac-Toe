import "./App.css";
import { TicTacToe } from "./components/tic-tac-toe/tic-tac-toe";

function App() {
  return (
		<div className='App'>
			<header className='App-header'>
				<h2>
					Tic-Tac-Toe
				</h2>
			</header>
			<main>
        <TicTacToe/>
			</main>
		</div>
	);
}

export default App
