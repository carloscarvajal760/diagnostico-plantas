import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Pantalla de carga
  if (loading) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #2e7d32, #1b5e20)",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "white",
        fontFamily: "Segoe UI, sans-serif",
        textAlign: "center"
      }}>

        {/* Logo */}
        <img
          src="/logo.png"
          alt="logo"
          style={{
            width: "120px",
            marginBottom: "20px",
            animation: "pulse 1.5s infinite"
          }}
        />

        {/* Nombre App */}
        <h1 style={{
          fontSize: "32px",
          marginBottom: "5px",
          letterSpacing: "1px"
        }}>
          AranjuezPlant
        </h1>

        {/* Subtitulo */}
        <p style={{
          fontSize: "16px",
          opacity: 0.9,
          marginBottom: "8px"
        }}>
          Diagnóstico de Enfermedades en Plantas
        </p>

        {/* Lugar */}
        <p style={{
          fontSize: "14px",
          opacity: 0.7
        }}>
          Vivero Municipal de Aranjuez
        </p>

        {/* Animación */}
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.08); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}
        </style>

      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;