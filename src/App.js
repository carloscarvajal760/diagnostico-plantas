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

  if (loading) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-[#1b5e20] to-[#2e7d32] flex flex-col items-center justify-center text-white p-6">
        
        {/* Contenedor del Logo con efecto de elevación */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
          <img
            src="/logo.png"
            alt="logo"
            className="w-32 h-32 relative z-10 animate-pulse drop-shadow-2xl"
          />
        </div>

        {/* Textos con tipografía moderna */}
        <div className="text-center space-y-2 animate-in fade-in duration-1000">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">
            Aranjuez<span className="text-yellow-400">Plant</span>
          </h1>
          
          <div className="h-1 w-12 bg-yellow-400 mx-auto rounded-full my-4"></div>
          
          <p className="text-lg font-medium opacity-90 leading-tight">
            Diagnóstico de Plantas
          </p>
          
          <p className="text-xs font-bold opacity-60 uppercase tracking-[0.2em] mt-4">
            Vivero Municipal de Aranjuez
          </p>
        </div>

        {/* Barra de carga estilo Android/iOS */}
        <div className="absolute bottom-16 w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 animate-[loading_4s_ease-in-out]"></div>
        </div>

        {/* Definición de la animación de la barra en el footer */}
        <style>
          {`
            @keyframes loading {
              0% { width: 0%; }
              100% { width: 100%; }
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