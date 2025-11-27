import "./App.css";
import { TicTacToe } from "./components/tic-tac-toe/tic-tac-toe";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from "./pages/home/home";
import { TicTacToeMulti } from "./components/tic-tac-toe-multiplayer/tic-tac-toe-multi";
import { useEffect, useState } from "react";
import axios from "axios";


function App() {
	const [array, setArray] = useState([]);

	useEffect(() => {
  const fetchAPI = async () => {
    const response = await axios.get("http://localhost:8080/api");
    setArray(response.data.fruits);
    console.log(response.data.fruits);
  };

  fetchAPI();
}, []);


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

				{array.map((fruit, index) => (
          <div key={index}>
            <p>{fruit}</p>
            <br></br>
          </div>
        ))}
			</main>
		</div>
	);
}

export default App
