import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { FaSignOutAlt, FaCamera, FaUpload, FaCheckCircle, FaBrain } from "react-icons/fa";
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

  // Usuario
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      navigate("/login");
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  // Activar cámara
  const startCamera = async () => {
    setCameraActive(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    videoRef.current.srcObject = stream;
  };

  // Capturar foto
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

    // detener cámara
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());

    setCameraActive(false);
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

  // Analizar imagen
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
        body: formData
      });

      const data = await res.json();

      setResult({
        disease: data.class_name.replaceAll("_", " "),
        confidence: Math.round(data.confidence * 100)
      });

    } catch (err) {

      console.error(err);

      setResult({
        error: "Error al analizar la imagen"
      });

    } finally {
      setIsAnalyzing(false);
    }
  };

  // Logout
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

    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 p-4">

      {/* HEADER */}

      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center">

          <img
            src={user?.photoURL}
            alt="user"
            className="w-12 h-12 rounded-full border-2 border-white mr-3"
          />

          <div className="text-white">

            <p className="text-sm">Bienvenido</p>

            <p className="font-bold">
              {user?.displayName || user?.email}
            </p>

          </div>

        </div>

        <button
          onClick={handleLogout}
          className="flex items-center bg-red-500 px-3 py-2 rounded text-white hover:bg-red-600"
        >
          <FaSignOutAlt className="mr-2" />
          {loading ? "Cerrando..." : "Salir"}
        </button>

      </div>


      {/* DIAGNOSTICO */}

      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 max-w-md mx-auto">

        <h2 className="text-xl font-bold text-white text-center mb-4">
          Diagnóstico de Plantas
        </h2>

        {/* VIDEO CAMARA */}

        {cameraActive && (
          <div className="mb-4">

            <video
              ref={videoRef}
              autoPlay
              className="rounded-xl w-full"
            />

            <button
              onClick={capturePhoto}
              className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg"
            >
              Capturar Foto
            </button>

          </div>
        )}

        {/* PREVIEW */}

        {imagePreview && !cameraActive && (
          <img
            src={imagePreview}
            alt="preview"
            className="rounded-xl mb-4"
          />
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* BOTONES */}

        <div className="grid grid-cols-2 gap-3 mb-4">

          <button
            onClick={startCamera}
            className="flex items-center justify-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            <FaCamera className="mr-2" />
            Cámara
          </button>

          <label className="flex items-center justify-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 cursor-pointer">

            <FaUpload className="mr-2" />

            Subir

            <input
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="hidden"
            />

          </label>

        </div>

        {/* BOTON ANALIZAR */}

        <button
          onClick={handleSubmit}
          disabled={!file || isAnalyzing}
          className="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-800"
        >

          {isAnalyzing ? (
            <span className="flex items-center justify-center">
              <FaBrain className="animate-pulse mr-2" />
              Analizando...
            </span>
          ) : (
            "Analizar Planta"
          )}

        </button>

      </div>


      {/* RESULTADO */}

      {result && (

        <div className="bg-white rounded-2xl p-6 mt-6 max-w-md mx-auto text-center">

          {result.error ? (

            <p className="text-red-600">{result.error}</p>

          ) : (

            <>
              <FaCheckCircle className="text-green-600 text-4xl mx-auto mb-3" />

              <h3 className="text-xl font-bold">{result.disease}</h3>

              <p className="text-gray-600">
                Confianza: {result.confidence}%
              </p>
            </>

          )}

        </div>

      )}

    </div>
  );
}

export default Dashboard;