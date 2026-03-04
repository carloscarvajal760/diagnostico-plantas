import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { FaSignOutAlt, FaCamera, FaCheckCircle, FaBrain } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Recuperar usuario de localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/login");
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  // Cerrar sesión
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Error al cerrar sesión");
    } finally {
      setLoading(false);
    }
  };

  // Subir imagen
  const handleChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Enviar imagen para análisis
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult({
        disease: data.class_name.replaceAll("_", " "),
        confidence: Math.round(data.confidence * 100),
      });
    } catch (err) {
      console.error(err);
      setResult({ error: "Error al analizar la imagen" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 p-4">
      {/* Header con perfil */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white mr-3">
            <img
              src={user?.photoURL || "https://via.placeholder.com/150"}
              alt={user?.displayName || "Usuario"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-white">
            <p className="text-sm">Bienvenido</p>
            <p className="font-bold truncate max-w-xs">{user?.displayName || user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center bg-red-500 px-3 py-2 rounded hover:bg-red-600 transition text-white"
        >
          {loading ? "Cerrando..." : <>
            <FaSignOutAlt className="mr-2" /> Cerrar sesión
          </>}
        </button>
      </div>

      {/* Sección de diagnóstico */}
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/30 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Analiza tu Planta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="file"
              onChange={handleChange}
              accept="image/*"
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="block w-full h-64 bg-black/20 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/30 cursor-pointer hover:border-white/50 transition-colors"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="text-center text-white/80">
                  <FaCamera className="text-4xl mb-3 mx-auto" />
                  <p className="text-sm">Haz clic para seleccionar una imagen</p>
                </div>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={!file || isAnalyzing}
            className={`w-full py-2 rounded-lg font-semibold text-white transition-all duration-200 ${
              !file || isAnalyzing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 hover:scale-105"
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center">
                <FaBrain className="animate-pulse mr-2" />
                Analizando...
              </div>
            ) : (
              "Iniciar Diagnóstico"
            )}
          </button>
        </form>
      </div>

      {/* Resultados */}
      {result && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Resultados</h2>
          {result.error ? (
            <div className="text-center text-red-600">
              <p className="text-lg">{result.error}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-3xl text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{result.disease}</h3>
              <p className="text-lg text-gray-600">Confianza: {result.confidence}%</p>
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Recomendaciones:</h4>
                <p className="text-sm text-gray-600">
                  Consulta con un especialista para tratamiento específico.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
