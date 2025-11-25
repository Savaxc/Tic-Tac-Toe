import "./App.css";
import { TicTacToe } from "./components/tic-tac-toe/tic-tac-toe";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from "./pages/home/home";
import { TicTacToeMulti } from "./components/tic-tac-toe-multiplayer/tic-tac-toe-multi";


function App() {
  return (
		<div className='App'>
			<header className='App-header'>
				<h2>
					Tic-Tac-Toe
				</h2>
			</header>
			<main>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/single-player" element={<TicTacToe />} />
            <Route path="/multiplayer" element={<TicTacToeMulti />} />
          </Routes>
        </Router>
			</main>
		</div>
	);
}

export default App
