import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, limit } from "firebase/firestore";
import { FaSignOutAlt, FaCamera, FaUpload, FaCheckCircle, FaBrain, FaLeaf, FaSeedling, FaExclamationTriangle, FaFilePdf, FaHistory, FaSync, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { baseConocimiento } from "../data/tratamientos";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const ADMIN_EMAIL = "admin@gmail.com";

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingGlobalPDF, setIsGeneratingGlobalPDF] = useState(false);

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
    setIsGeneratingPDF(true);
    try {
      // Usamos jsPDF para dibujar el texto, cajas y colores de manera nativa sin html2canvas (Garantizado rápido y en alta resolución).
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Cargar el Logo asíncronamente con esquinas redondeadas ("/logo.png")
      const logoBase64 = await new Promise((resolve) => {
        const img = new Image();
        img.src = "/logo.png";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");

          // Crear ruta para esquinas redondeadas (15% de radio de borde)
          const radius = Math.min(img.width, img.height) * 0.15;
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(canvas.width - radius, 0);
          ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
          ctx.lineTo(canvas.width, canvas.height - radius);
          ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
          ctx.lineTo(radius, canvas.height);
          ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null); // Continúa aunque falle
      });

      // Configuración de Colores
      const mainGreen = [21, 128, 61]; // Color Verde bandera
      const darkText = [30, 41, 59]; // Texto oscuro grisáceo

      // 1. ENCABEZADO (Header)
      pdf.setFillColor(...mainGreen);
      pdf.rect(0, 0, pageWidth, 40, "F");

      // Logo a la DERECHA
      if (logoBase64) {
        // pageWidth - 15 (margen) - 28 (ancho imagen) = Alineado a la derecha
        const logoX = pageWidth - 43;
        pdf.addImage(logoBase64, "PNG", logoX, 6, 28, 28);
      }

      // Textos a la IZQUIERDA
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("REPORTE FITOSANITARIO OFICIAL", 15, 20);

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Vivero Municipal de Aranjuez", 15, 28);

      // 2. METADATA DEL DIAGNÓSTICO (Bloque izquierdo)
      let yPos = 55;
      pdf.setTextColor(...darkText);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("DATOS DEL ANÁLISIS:", 15, yPos);

      yPos += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Fecha del Análisis: ${fechaDiagnostico}`, 15, yPos);
      pdf.text(`Jardinero responsable: ${reporteUser}`, 15, yPos + 6);

      // 3. IA CONFIANZA (Bloque derecho)
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(pageWidth - 65, 50, 50, 20, 2, 2, "FD"); // Caja gris clara

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...mainGreen);
      pdf.text("NIVEL DE CONFIANZA IA", pageWidth - 40, 56, { align: "center" });

      pdf.setFontSize(18);
      pdf.setTextColor(...darkText);
      pdf.text(`${result.confidence}%`, pageWidth - 40, 65, { align: "center" });

      // 4. RESULTADO PRINCIPAL DE LA ENFERMEDAD
      yPos += 30;
      pdf.setDrawColor(...mainGreen);
      pdf.setLineWidth(1);
      pdf.line(15, yPos, pageWidth - 15, yPos);

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...mainGreen);
      pdf.text("HALLAZGO DEL DIAGNÓSTICO:", 15, yPos + 10);

      pdf.setFontSize(22);
      pdf.setTextColor(...darkText);
      pdf.text(result.disease.toUpperCase(), 15, yPos + 20);

      // 5. BASE DE CONOCIMIENTO (Causas, urgencia y tratamiento)
      yPos += 35;
      const info = baseConocimiento[result.disease];

      if (info) {
        // Cuadro de fondo para el tratamiento
        pdf.setFillColor(243, 244, 246); // gris muy claro
        pdf.roundedRect(15, yPos, pageWidth - 30, 85, 3, 3, "F");

        let txtY = yPos + 12;

        // Causa
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...darkText);
        pdf.text("Descripción y Causa:", 22, txtY);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const descArr = pdf.splitTextToSize(`${info.descripcion || ""} ${info.causa || ""}`, pageWidth - 45);
        pdf.text(descArr, 22, txtY + 6);

        txtY += 12 + (descArr.length * 5); // espaciado dinámico

        // Urgencia
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(220, 38, 38); // rojo suave
        pdf.text(`Urgencia recomendada: `, 22, txtY);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...darkText);
        pdf.text(info.urgencia.toUpperCase(), 65, txtY);

        txtY += 12;

        // Tratamiento Técnico
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...mainGreen);
        pdf.text("Plan de Tratamiento Técnico:", 22, txtY);

        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(10);
        pdf.setTextColor(...darkText);
        const tratArr = pdf.splitTextToSize(`"${info.tratamiento || "Mantener observación."}"`, pageWidth - 45);
        pdf.text(tratArr, 22, txtY + 6);
      }

      // 6. FOOTER (Pie de página profesional)
      const footerY = pageHeight - 20;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(15, footerY, pageWidth - 15, footerY);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150, 150, 150);
      pdf.text("Este es un reporte oficial digital emitido automáticamente por la Inteligencia Artificial del Vivero Aranjuez.", pageWidth / 2, footerY + 5, { align: "center" });
      pdf.text("Para revisiones puntuales o confirmaciones, por favor contacte al agronómo jefe.", pageWidth / 2, footerY + 9, { align: "center" });

      // Guardar (el nombre tendrá guiones bajos en los espacios)
      pdf.save(`Reporte_Aranjuez_${result.disease.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // --- GENERACIÓN DE REPORTE GLOBAL (ADMIN) ---
  const generarReporteGlobal = async () => {
    setIsGeneratingGlobalPDF(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const logoBase64 = await new Promise((resolve) => {
        const img = new Image();
        img.src = "/logo.png";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");

          const radius = Math.min(img.width, img.height) * 0.15;
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(canvas.width - radius, 0);
          ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
          ctx.lineTo(canvas.width, canvas.height - radius);
          ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
          ctx.lineTo(radius, canvas.height);
          ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
      });

      const mainGreen = [21, 128, 61];
      const darkText = [30, 41, 59];

      // 1. Header Global
      pdf.setFillColor(...mainGreen);
      pdf.rect(0, 0, pageWidth, 40, "F");

      if (logoBase64) {
        const logoX = pageWidth - 43;
        pdf.addImage(logoBase64, "PNG", logoX, 6, 28, 28);
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("REPORTE GLOBAL DE ACTIVIDADES", 15, 20); // Achicado y sin center
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Vivero Municipal Aranjuez - ${new Date().toLocaleDateString()}`, 15, 28);

      // 2. Resumen Estratégico
      let yPos = 55;
      pdf.setTextColor(...darkText);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("RESUMEN GENERAL", 15, yPos);

      yPos += 8;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Total de registros en este informe: ${historial.length}`, 15, yPos);
      pdf.text(`Generado por: Administrador`, 15, yPos + 6);

      yPos += 20;

      // 3. Tabla / Listado de Historial
      pdf.setFillColor(243, 244, 246);
      pdf.rect(15, yPos, pageWidth - 30, 10, "F");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(100, 100, 100);
      pdf.text("FECHA", 20, yPos + 6.5);
      pdf.text("JARDINERO", 60, yPos + 6.5);
      pdf.text("ENFERMEDAD DETECTADA", 110, yPos + 6.5);
      pdf.text("CONF.", 180, yPos + 6.5);

      yPos += 16;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...darkText);

      historial.forEach((item, index) => {
        // Paginación si se llena la página
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 20;
        }

        const fecha = item.fecha?.toDate().toLocaleDateString() || "S/F";
        // Limitar nombre de usuario para que no descuadre
        const nom = (item.usuario || "").split(" ")[0].substring(0, 12);
        // Limitar enfermedad
        const enf = (item.enfermedad || "").substring(0, 28);

        pdf.text(fecha, 20, yPos);
        pdf.text(nom, 60, yPos);
        pdf.text(enf, 110, yPos);
        pdf.text(`${item.confianza}%`, 180, yPos);

        // Línea separadora
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.line(15, yPos + 3, pageWidth - 15, yPos + 3);

        yPos += 10;
      });

      // 4. Footer
      const footerY = pageHeight - 20;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(15, footerY, pageWidth - 15, footerY);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150, 150, 150);
      pdf.text("Este reporte representa el último consolidado de diagnósticos registrados en la base de datos.", pageWidth / 2, footerY + 5, { align: "center" });

      pdf.save(`Reporte_Global_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingGlobalPDF(false);
    }
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
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Usuario" className="w-10 h-10 rounded-full border-2 border-white/20 shadow-md object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white/20 shadow-md bg-white/10 flex items-center justify-center">
              <FaUserCircle className="text-white/80 text-2xl" />
            </div>
          )}
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
                        setResult({ disease: item.enfermedad, confidence: item.confianza });
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

                {/* NUEVO BOTÓN DE DESCARGA GLOBAL (SOLO ADMIN) */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={generarReporteGlobal}
                    disabled={isGeneratingGlobalPDF || historial.length === 0}
                    className={`w-full py-3 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${isGeneratingGlobalPDF || historial.length === 0 ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl hover:scale-105'}`}
                  >
                    {isGeneratingGlobalPDF ? (
                      <><FaSync className="animate-spin text-lg" /> Generando Consolidado...</>
                    ) : (
                      <><FaFilePdf className="text-lg" /> Descargar Consolidado Global</>
                    )}
                  </button>
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
                      const f = e.target.files[0]; if (f) { setFile(f); setImagePreview(URL.createObjectURL(f)); }
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
    {/* Encabezado con Nivel de Urgencia */}
    <div className="flex items-center justify-between">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Ficha Técnica
      </h4>
      <span
        className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
          baseConocimiento[result.disease].urgencia === "Critica"
            ? "bg-red-100 text-red-700 border border-red-200"
            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
        }`}
      >
        Urgencia: {baseConocimiento[result.disease].urgencia}
      </span>
    </div>

    {/* Causa y Descripción */}
    <div className="space-y-1">
      <p className="text-xs text-slate-500">
        <strong className="text-slate-700">Causa:</strong>{" "}
        <span className="italic">{baseConocimiento[result.disease].causa}</span>
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">
        {baseConocimiento[result.disease].descripcion}
      </p>
    </div>

    {/* Tarjeta de Tratamiento */}
    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/60 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-amber-600">💡</span>
        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
          Tratamiento Recomendado
        </p>
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-snug">
        "{baseConocimiento[result.disease].tratamiento}"
      </p>
    </div>
  </div>
)}
                </div>

                {/* BOTÓN PDF SOLO PARA ADMIN */}
                {user?.email === ADMIN_EMAIL && (
                  <button
                    onClick={generarPDF}
                    disabled={isGeneratingPDF}
                    className={`w-full mt-6 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all ${isGeneratingPDF ? 'bg-blue-400 text-white/70 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'}`}
                  >
                    {isGeneratingPDF ? (
                      <><FaSync className="animate-spin" size={20} /> Generando Documento...</>
                    ) : (
                      <><FaFilePdf size={20} /> Descargar Reporte PDF</>
                    )}
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