import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, db } from "../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
  FaInfoCircle,
  FaTimes,
  FaSeedling,
  FaCamera,
  FaBrain,
  FaNotesMedical,
  FaCheckCircle,
  FaArrowRight
} from "react-icons/fa";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const navigate = useNavigate();

  // URL del logo de Google oficial (Firebase UI)
  const googleIconUrl = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg";

  // Función auxiliar para registrar usuario en Firestore
  const sincronizarUsuarioFirestore = async (user) => {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const esAdmin = user.email === "admin@gmail.com";
      await setDoc(
        userDocRef,
        {
          id: user.uid,
          email: user.email,
          nombre: user.displayName || user.email.split("@")[0],
          rol: esAdmin ? "Administrador" : "Jardinero / Operador",
          estado: "Activo",
          fechaRegistro: new Date().toISOString().split("T")[0],
          area: esAdmin ? "Dirección de Vivero" : "Mantenimiento General"
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Sincronización con Firestore omitida:", err);
    }
  };

  // Login con Google
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      localStorage.setItem("user", JSON.stringify(user));
      await sincronizarUsuarioFirestore(user);
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
      await sincronizarUsuarioFirestore(user);
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
            Vivero Municipal <br /> de Aranjuez
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

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            className="text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
            onClick={() => {
              if (!isRegister) {
                // Al hacer clic en "¿Eres nuevo?", abre el modal informativo y activa modo registro
                setIsRegister(true);
                setShowInfoModal(true);
              } else {
                setIsRegister(false);
              }
            }}
          >
            {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿Eres nuevo? Regístrate aquí"}
          </button>

          {/* Botón interactivo "Acerca de" */}
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-green-700 bg-gray-50 hover:bg-green-50 px-3.5 py-1.5 rounded-full border border-gray-200 hover:border-green-300 transition-all active:scale-95 shadow-sm"
          >
            <FaInfoCircle className="text-green-600" />
            Acerca de AranjuezPlant
          </button>
        </div>
      </div>

      {/* MODAL INTERACTIVO: ACERCA DE / INFORMACIÓN PARA NUEVOS USUARIOS */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-gray-100 flex items-center justify-between rounded-t-[2.5rem] z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center shadow-inner">
                  <FaSeedling className="text-lg" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-800 tracking-tight leading-tight">
                    ¿Qué es AranjuezPlant?
                  </h3>
                  <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider">
                    Guía de Inducción Fitosanitaria
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors"
                title="Cerrar"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Contenido interactivo */}
            <div className="p-6 space-y-6 text-gray-600 text-sm">
              
              {/* Descripción principal */}
              <div className="bg-green-50/70 border border-green-200/80 rounded-2xl p-4 text-gray-700 leading-relaxed shadow-sm">
                Es una herramienta digital de apoyo fitosanitario desarrollada para el{" "}
                <strong className="text-green-800">Vivero Municipal de Aranjuez</strong>, diseñada para
                identificar enfermedades en las plantas mediante el uso de inteligencia artificial
                (redes neuronales) a partir de <strong>tres fotografías</strong> de la planta afectada.
              </div>

              {/* Propósito Operativo */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-600"></span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    Propósito Operativo
                  </h4>
                </div>
                <div className="grid gap-2.5">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <FaCheckCircle className="text-green-600 text-sm mt-0.5 shrink-0" />
                    <span className="text-xs text-gray-700 leading-snug">
                      Agilizar la detección de las <strong>20 patologías más comunes</strong> que afectan a las especies del vivero.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <FaCheckCircle className="text-green-600 text-sm mt-0.5 shrink-0" />
                    <span className="text-xs text-gray-700 leading-snug">
                      Reducir los tiempos de diagnóstico de horas o días a <strong>pocos segundos</strong> directamente en campo.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <FaCheckCircle className="text-green-600 text-sm mt-0.5 shrink-0" />
                    <span className="text-xs text-gray-700 leading-snug">
                      Consultar de manera inmediata los <strong>tratamientos recomendados</strong> para aislar y cuidar las especies a tiempo.
                    </span>
                  </div>
                </div>
              </div>

              {/* Instrucciones Rápidas de Uso */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    Instrucciones Rápidas de Uso
                  </h4>
                </div>
                <div className="space-y-3">
                  {/* Paso 1 */}
                  <div className="flex gap-3.5 p-3.5 bg-gradient-to-r from-emerald-50/50 to-white rounded-2xl border border-emerald-100/80">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                      <FaCamera />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 mb-0.5">Paso 1: Captura de muestras</div>
                      <p className="text-xs text-gray-600 leading-snug">
                        Selecciona o captura tres fotografías claras de la planta que presenta síntomas de enfermedad usando la cámara del teléfono.
                      </p>
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div className="flex gap-3.5 p-3.5 bg-gradient-to-r from-blue-50/50 to-white rounded-2xl border border-blue-100/80">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                      <FaBrain />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 mb-0.5">Paso 2: Análisis por IA</div>
                      <p className="text-xs text-gray-600 leading-snug">
                        Espera el análisis automático del sistema (menos de 3 segundos) para ver la patología detectada y su nivel de confianza.
                      </p>
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div className="flex gap-3.5 p-3.5 bg-gradient-to-r from-amber-50/50 to-white rounded-2xl border border-amber-100/80">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                      <FaNotesMedical />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 mb-0.5">Paso 3: Ficha y tratamiento</div>
                      <p className="text-xs text-gray-600 leading-snug">
                        Revisa la ficha técnica y aplica la recomendación de tratamiento o el protocolo de aislamiento indicado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identificación y Soporte del Sistema */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 border border-slate-800 shadow-md">
                <div className="text-[10px] font-black uppercase tracking-wider text-green-400">
                  Identificación y Soporte del Sistema
                </div>
                <div className="text-xs space-y-1 text-slate-300">
                  <p>
                    <strong className="text-white">Proyecto:</strong> Tesis de Grado institucional para el Vivero Municipal de Aranjuez.
                  </p>
                  <p>
                    <strong className="text-white">Desarrollador / Responsable:</strong> Carlos Carvajal.
                  </p>
                  <p>
                    <strong className="text-white">Versión de la App:</strong> Versión 1.0.0
                  </p>
                </div>
              </div>

            </div>

            {/* Footer Modal con botón de acción */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-[2.5rem] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-md shadow-green-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>¡Entendido, continuar!</span>
                <FaArrowRight className="text-[10px]" />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Login;