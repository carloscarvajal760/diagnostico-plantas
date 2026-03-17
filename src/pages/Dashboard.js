import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig"; 
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, limit } from "firebase/firestore";
import { FaSignOutAlt, FaCamera, FaUpload, FaCheckCircle, FaBrain, FaLeaf, FaSeedling, FaExclamationTriangle, FaFilePdf, FaHistory, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { baseConocimiento } from "../data/tratamientos"; 
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ADMIN_EMAIL = "carloscarvajal760@gmail.com"; 

function Dashboard() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const resultadosRef = useRef(null); // Referencia para el scroll automático

  // Estados
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [reporteUser, setReporteUser] = useState(""); 
  const [fechaDiagnostico, setFechaDiagnostico] = useState(""); 

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/login");
    } else {
      setUser(storedUser);
      if (storedUser.email === ADMIN_EMAIL) cargarHistorial();
    }
  }, [navigate]);

  // --- LÓGICA DE FIRESTORE ---
  const cargarHistorial = async () => {
    try {
      const q = query(collection(db, "diagnosticos"), orderBy("fecha", "desc"), limit(12));
      const querySnapshot = await getDocs(q);
      setHistorial(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error("Error historial:", e); }
  };

  const guardarEnNube = async (dataIA) => {
    try {
      await addDoc(collection(db, "diagnosticos"), {
        enfermedad: dataIA.disease,
        confianza: dataIA.confidence,
        usuario: user.displayName || user.email,
        fecha: serverTimestamp(),
        urgencia: baseConocimiento[dataIA.disease]?.urgencia || "N/A"
      });
      if (user.email === ADMIN_EMAIL) cargarHistorial();
    } catch (e) { console.error("Error Firestore:", e); }
  };

  // --- FUNCIÓN DE SCROLL PARA CELULARES ---
  const ejecutarScroll = () => {
    if (window.innerWidth < 1024) { 
      resultadosRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // --- LÓGICA DE CÁMARA ---
  const startCamera = async () => {
    setCameraActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    videoRef.current.srcObject = stream;
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      setFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
      setImagePreview(URL.createObjectURL(blob));
    }, "image/jpeg");
    video.srcObject.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  // --- ANÁLISIS E IA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("https://carloscarvajal760-diagnostico-plantas-api.hf.space/predict", { method: "POST", body: formData });
      const data = await res.json();
      const nombreLimpio = data.class_name.replaceAll("_", " ");
      const resObj = { disease: nombreLimpio, confidence: Math.round(data.confidence * 100) };
      
      setResult(resObj);
      setReporteUser(user.displayName || user.email);
      setFechaDiagnostico(new Date().toLocaleString());
      guardarEnNube(resObj);
      setTimeout(ejecutarScroll, 300); // Bajar al resultado tras analizar
    } catch (err) { alert("Error de conexión con la IA"); }
    finally { setIsAnalyzing(false); }
  };

  // --- GENERACIÓN DE PDF ---
  const generarPDF = async () => {
    const element = document.getElementById("seccion-reporte");
    await new Promise(resolve => setTimeout(resolve, 600));

    const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    pdf.setFillColor(46, 125, 50); pdf.rect(0, 0, 210, 30, "F");
    pdf.setTextColor(255); pdf.setFontSize(16);
    pdf.text("REPORTE TÉCNICO - VIVERO ARANJUEZ", 15, 18);

    pdf.setTextColor(60); pdf.setFontSize(10);
    pdf.text(`Jardinero responsable: ${reporteUser}`, 15, 40);
    pdf.text(`Fecha del diagnóstico original: ${fechaDiagnostico}`, 15, 45);

    pdf.addImage(imgData, "PNG", 15, 55, 180, 140);
    pdf.save(`Reporte_Aranjuez_${result.disease}.pdf`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-emerald-950 pb-10 font-sans text-white">
      
      {/* HEADER */}
      <div className="px-6 pt-10 pb-6 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={user?.photoURL || "https://via.placeholder.com/150"} alt="u" className="w-10 h-10 rounded-full border-2 border-white/20 shadow-md" />
          <div>
            <p className="text-green-300 text-[10px] font-bold uppercase tracking-widest">AranjuezPlant</p>
            <p className="font-bold text-sm">Hola, {user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Usuario"}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-3 bg-white/10 rounded-2xl border border-white/10 active:scale-90"><FaSignOutAlt size={18} /></button>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LADO IZQUIERDO: SCANNER / HISTORIAL */}
          <div className="space-y-6">
            {user?.email === ADMIN_EMAIL ? (
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-green-400">
                    <FaHistory /> ACTIVIDAD RECIENTE
                  </h2>
                  <button onClick={cargarHistorial} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-[10px] px-3 py-1.5 rounded-full font-bold transition-all active:scale-95">
                    <FaSync /> ACTUALIZAR
                  </button>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {historial.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setResult({disease: item.enfermedad, confidence: item.confianza});
                        setReporteUser(item.usuario);
                        const fecha = item.fecha?.toDate().toLocaleString() || "Sin fecha";
                        setFechaDiagnostico(fecha);
                        setImagePreview(null); 
                        setTimeout(ejecutarScroll, 100); // Bajar al reporte al hacer clic
                      }} 
                      className="bg-white/5 p-4 rounded-2xl border border-transparent hover:border-green-500 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-sm text-green-100 uppercase tracking-tighter">{item.enfermedad}</p>
                        <span className="text-[9px] bg-green-900/50 text-green-300 px-3 py-1 rounded-full tracking-widest uppercase font-black">Ver</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 italic">Realizado por: {item.usuario}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* VISTA JARDINERO (SCANNER) */
              <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-6 border border-white/20">
                <div className="flex items-center justify-center gap-2 mb-6 text-yellow-400">
                  <FaSeedling className="animate-bounce" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-white">Scanner de Campo</h2>
                </div>
                <div className="relative overflow-hidden rounded-[2rem] bg-black/30 aspect-square mb-6 border border-white/10">
                  {cameraActive ? <video ref={videoRef} autoPlay className="w-full h-full object-cover" /> :
                   imagePreview ? <img src={imagePreview} alt="p" className="w-full h-full object-cover animate-in fade-in" /> :
                   <div className="flex flex-col items-center justify-center h-full opacity-20"><FaLeaf size={50} /></div>}
                  {cameraActive && <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-green-700 px-6 py-2 rounded-full font-bold text-xs shadow-2xl">CAPTURAR</button>}
                </div>
                {!cameraActive && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button onClick={startCamera} className="flex flex-col items-center py-4 bg-white text-green-900 rounded-3xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all"><FaCamera size={20} className="mb-1" /> Cámara</button>
                    <label className="flex flex-col items-center py-4 bg-green-500 text-white rounded-3xl font-black text-[10px] uppercase shadow-lg cursor-pointer active:scale-95 transition-all"><FaUpload size={20} className="mb-1" /> Galería<input type="file" accept="image/*" onChange={(e) => { 
                      const f = e.target.files[0]; if(f){setFile(f); setImagePreview(URL.createObjectURL(f));} 
                    }} className="hidden" /></label>
                  </div>
                )}
                <button onClick={handleSubmit} disabled={!file || isAnalyzing} className={`w-full py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all ${!file || isAnalyzing ? "bg-white/5 text-white/20" : "bg-yellow-400 text-green-950 shadow-xl shadow-yellow-400/20"}`}>
                  {isAnalyzing ? "Analizando IA..." : "Iniciar Diagnóstico"}
                </button>
              </div>
            )}
          </div>

          {/* LADO DERECHO: REPORTE DINÁMICO (Con referencia para scroll) */}
          <div className="space-y-6" ref={resultadosRef}>
            {result ? (
              <div className="animate-in slide-in-from-bottom-5 duration-500">
                <div id="seccion-reporte" className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-slate-900 border border-slate-100">
                  {imagePreview && (
                    <div className="mb-6 rounded-2xl overflow-hidden border-4 border-slate-50">
                       <img src={imagePreview} alt="hallazgo" className="w-full h-44 object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-100 p-3 rounded-2xl"><FaCheckCircle className="text-green-600 text-2xl" /></div>
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">IA Confianza</p>
                      <p className="text-green-600 font-black text-2xl">{result.confidence}%</p>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 leading-none mb-2">{result.disease}</h3>
                  <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-widest italic">Responsable: {reporteUser}</p>
                  {baseConocimiento[result.disease] && (
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                        <p className="text-[10px] font-bold text-yellow-700 uppercase mb-2">Tratamiento Técnico</p>
                        <p className="text-sm font-bold text-slate-800 italic leading-tight">"{baseConocimiento[result.disease].tratamiento}"</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÓN PDF SOLO PARA ADMIN */}
                {user?.email === ADMIN_EMAIL && (
                  <button 
                    onClick={generarPDF} 
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
                  >
                    <FaFilePdf size={20}/> Descargar Reporte PDF
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] p-10 opacity-30 text-center">
                <FaLeaf size={40} className="mb-4 text-green-300" />
                <p className="text-xs uppercase font-bold tracking-widest">Escanea una planta o selecciona del historial</p>
              </div>
            )}
          </div>

        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default Dashboard;