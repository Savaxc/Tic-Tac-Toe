/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";

export const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    try {
      const res = await axios.post("http://localhost:8080/auth/register", form);

      localStorage.setItem("token", res.data.token);
      setSuccess("Registration successful!");
      setTimeout(() => navigate("/multiplayer"), 1000);
    } catch (err: any) {
      if (err.response) setError(err.response.data.message);
      else setError("Server error");
    }
  };

  return (
    <div className="form-container">
      <h2>Register</h2>

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

      <button onClick={handleRegister}>Create Account</button>

      <button onClick={() => navigate("/login")}>Already registered?</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
};