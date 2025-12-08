/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./auth.css";

export const LoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      navigate("/multiplayer");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async () => {
    setError("");

    try {
      const res = await axios.post("http://localhost:8080/auth/login", form);

      localStorage.setItem("token", res.data.token);

      // generate new sessionID on login
      const sessionId = crypto.randomUUID();
      localStorage.setItem("sessionId", sessionId);

      navigate("/multiplayer");
    } catch (err: any) {
      if (err.response) setError(err.response.data.message);
      else setError("Server error");
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>

      <input
        name="username"
        placeholder="Username"
        value={form.username}
        onChange={handleChange}
      />

      <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
      />

      <button onClick={handleLogin}>Login</button>

      <button onClick={() => navigate("/register")}>Create new account</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};
