import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // URL del logo de Google oficial (Firebase UI)
  const googleIconUrl = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg";

  // Login con Google
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err) {
      setError("Error al conectar con Google");
    }
  };

  // Login o registro con email y contraseña
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      const user = userCredential.user;
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err) {
      setError("Credenciales incorrectas o error de conexión");
    }
  };

  return (
    // FONDO VERDE RESTAURADO: Se aplica a toda la pantalla
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-green-700 p-6 font-sans">
      
      {/* Contenedor tipo Tarjeta Móvil (Se mantiene blanco para contrastar con el fondo) */}
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl shadow-black/20 p-8 border border-gray-100">
        
        {/* Espacio para el Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
            {/* Ícono temporal de planta - Reemplázalo por tu logo real más adelante */}
            <img 
              src="/emaverde.jpg" 
              alt="Logo Vivero" 
              className="w-25 h-25 object-contain"
            />
          </div>
          <h1 className="text-xl font-extrabold text-green-800 text-center uppercase tracking-tight">
            Vivero Municipal <br/> de Aranjuez
          </h1>
          <p className="text-gray-500 text-sm mt-1">Diagnóstico de Plantas</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl text-center mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Inputs con fondo gris muy suave (bg-gray-50) para que resalten sobre el blanco de la tarjeta
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 text-sm transition-all outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 text-sm transition-all outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-600/30 hover:bg-green-700 active:scale-95 transition-all text-sm uppercase tracking-wide"
          >
            {isRegister ? "Crear Cuenta" : "Entrar"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">O continuar con</span></div>
        </div>

        {/* BOTÓN DE GOOGLE CORREGIDO */}
        <button
  onClick={handleGoogleLogin}
  className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-95 transition-all text-sm"
>
  <img 
    src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" 
    alt="Google" 
    className="w-5 h-5" 
  />
  Google
</button>

        <button
          className="w-full mt-6 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo? Regístrate aquí"}
        </button>
      </div>
    </div>
  );
};

export default Login;