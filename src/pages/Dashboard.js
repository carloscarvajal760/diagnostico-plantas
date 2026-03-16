import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { FaSignOutAlt, FaCamera, FaUpload, FaCheckCircle, FaBrain, FaLeaf, FaSeedling } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/login");
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  const startCamera = async () => {
    setCameraActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    videoRef.current.srcObject = stream;
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const imageFile = new File([blob], "photo.jpg", { type: "image/jpeg" });
      setFile(imageFile);
      setImagePreview(URL.createObjectURL(blob));
    }, "image/jpeg");
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    setCameraActive(false);
  };

  const handleChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("https://carloscarvajal760-diagnostico-plantas-api.hf.space/predict", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setResult({
        disease: data.class_name.replaceAll("_", " "),
        confidence: Math.round(data.confidence * 100)
      });
    } catch (err) {
      setResult({ error: "Error al analizar la imagen" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      navigate("/login");
    } catch (err) {
      alert("Error al cerrar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    // FONDO VERDE VIBRANTE (Gradiente de naturaleza)
    <div className="min-h-screen bg-gradient-to-b from-green-600 via-green-700 to-emerald-900 pb-10 font-sans text-white">
      
      {/* HEADER TIPO APP NATIVA */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={user?.photoURL || "https://via.placeholder.com/150"}
              alt="user"
              className="w-12 h-12 rounded-full border-2 border-white/50 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 w-4 h-4 rounded-full border-2 border-green-700"></div>
          </div>
          <div>
            <p className="text-green-200 text-xs font-bold uppercase tracking-widest">Vivero Aranjuez</p>
            <p className="font-extrabold text-xl leading-none">
              Hola, {user?.displayName?.split(" ")[0] || "Cultivador"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition-transform border border-white/20"
        >
          <FaSignOutAlt size={20} className="text-white" />
        </button>
      </div>

      <div className="p-5 max-w-md mx-auto space-y-6">
        
        {/* PANEL PRINCIPAL (Glassmorphism) */}
        <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-6 border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-6">
            <FaSeedling className="text-yellow-400 animate-bounce" />
            <h2 className="text-lg font-black uppercase tracking-tighter">Diagnostico de Plantas</h2>
          </div>

          {/* ÁREA DE IMAGEN / CÁMARA */}
          <div className="relative overflow-hidden rounded-[2rem] bg-black/20 aspect-square mb-6 shadow-inner border border-white/10">
            {cameraActive ? (
              <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
            ) : imagePreview ? (
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover scale-105" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-green-100/40">
                <FaLeaf size={60} className="mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest">Sin imagen cargada</p>
              </div>
            )}
            
            {cameraActive && (
              <button
                onClick={capturePhoto}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-1 rounded-full shadow-2xl active:scale-95 transition-transform"
              >
                <div className="w-14 h-14 border-4 border-green-600 rounded-full flex items-center justify-center font-bold text-green-800">OK</div>
              </button>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* BOTONES PRINCIPALES */}
          {!cameraActive && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center bg-white text-green-800 py-4 rounded-3xl shadow-lg active:scale-95 transition-all font-black text-sm uppercase tracking-tighter"
              >
                <FaCamera className="mb-1 text-2xl" />
                Usar Cámara
              </button>
              <label className="flex flex-col items-center justify-center bg-green-500 text-white py-4 rounded-3xl shadow-lg active:scale-95 transition-all font-black text-sm uppercase tracking-tighter cursor-pointer border border-green-400">
                <FaUpload className="mb-1 text-2xl" />
                Galería
                <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
              </label>
            </div>
          )}

          {/* BOTÓN DE ACCIÓN FINAL */}
          <button
            onClick={handleSubmit}
            disabled={!file || isAnalyzing}
            className={`w-full py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-widest transition-all active:scale-95 shadow-xl ${
              !file || isAnalyzing 
                ? "bg-white/5 text-white/20 cursor-not-allowed" 
                : "bg-yellow-400 text-green-900 shadow-yellow-400/20"
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-3">
                <FaBrain className="animate-spin" /> Escaneando...
              </span>
            ) : (
              "Diagnosticar ahora"
            )}
          </button>
        </div>

        {/* RESULTADO (Estilo Alerta Nativa) */}
        {result && (
          <div className="bg-white rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            {result.error ? (
              <p className="text-red-500 font-black text-center">{result.error}</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="bg-green-100 p-4 rounded-full mb-3">
                  <FaCheckCircle className="text-green-600 text-3xl" />
                </div>
                <h3 className="text-green-900 font-black text-2xl text-center leading-tight uppercase tracking-tighter">
                  {result.disease}
                </h3>
                
                <div className="w-full bg-gray-100 h-4 rounded-full mt-4 overflow-hidden border border-gray-200">
                  <div 
                    className="bg-green-500 h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${result.confidence}%` }}
                  ></div>
                </div>
                <p className="text-gray-500 text-xs font-black mt-2 uppercase">
                  Precisión: {result.confidence}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;