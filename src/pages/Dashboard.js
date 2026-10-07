import React, { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, limit } from "firebase/firestore";
import { FaSignOutAlt, FaCamera, FaUpload, FaCheckCircle, FaBrain, FaLeaf, FaSeedling, FaExclamationTriangle, FaFilePdf, FaHistory, FaSync, FaUserCircle, FaUsers, FaSearch, FaTimes, FaImages, FaTrash, FaPlus, FaLayerGroup, FaLock, FaInfoCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { baseConocimiento } from "../data/tratamientos";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import UsuariosTable from "../components/UsuariosTable";

const ADMIN_EMAIL = "admin@gmail.com";

function Dashboard() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const resultadosRef = useRef(null); // Referencia para el scroll automático

  // Estados
  const [vistaActiva, setVistaActiva] = useState("diagnostico"); // "diagnostico" | "usuarios"
  const [adminTab, setAdminTab] = useState("scanner"); // "scanner" | "historial" (para que admin pueda subir fotos o ver historial)
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imagenes, setImagenes] = useState([]); // Array de 3 fotos: [{ file, preview, id, label }]
  const [fotoActivaIdx, setFotoActivaIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [reporteUser, setReporteUser] = useState("");
  const [fechaDiagnostico, setFechaDiagnostico] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingGlobalPDF, setIsGeneratingGlobalPDF] = useState(false);

  // Estado para Modal de Alerta / Aviso bonito
  const [modalAlerta, setModalAlerta] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "advertencia" // "advertencia" | "error" | "info"
  });

  const mostrarAviso = (mensaje, titulo = "Atención", tipo = "advertencia") => {
    setModalAlerta({ visible: true, titulo, mensaje, tipo });
  };

  const cerrarAviso = () => {
    setModalAlerta(prev => ({ ...prev, visible: false }));
  };

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

  // --- LÓGICA DE CÁMARA (HASTA 3 MUESTRAS) ---
  const startCamera = async () => {
    if (imagenes.length >= 3) {
      mostrarAviso("Ya tienes las 3 fotos requeridas. Si deseas capturar otra, elimina una de las muestras existentes.", "Límite de Muestras", "info");
      return;
    }
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error de cámara:", err);
      mostrarAviso("No se pudo iniciar la cámara. Revisa los permisos o sube fotos desde galería.", "Permiso de Cámara", "error");
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const idx = imagenes.length;
      const etiquetas = ["Muestra 1", "Muestra 2", "Muestra 3"];
      const nuevaFoto = {
        file: new File([blob], `muestra_${idx + 1}.jpg`, { type: "image/jpeg" }),
        preview: URL.createObjectURL(blob),
        id: `cam_${Date.now()}`,
        label: etiquetas[idx] || `Muestra ${idx + 1}`
      };
      const nuevas = [...imagenes, nuevaFoto].slice(0, 3);
      setImagenes(nuevas);
      setFile(nuevas[0].file);
      setImagePreview(nuevas[0].preview);
      setFotoActivaIdx(nuevas.length - 1);
    }, "image/jpeg");
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
    }
    setCameraActive(false);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setCameraActive(false);
  };

  // --- SUBIDA DESDE GALERÍA (HASTA 3 FOTOS) ---
  const handleUploadGaleria = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    const espacioDisponible = 3 - imagenes.length;
    if (espacioDisponible <= 0) {
      mostrarAviso("Ya has cargado las 3 fotos requeridas. Si deseas cambiar alguna, primero elimínala con el botón ✕.", "Límite de Muestras", "info");
      e.target.value = "";
      return;
    }
    const etiquetas = ["Muestra 1", "Muestra 2", "Muestra 3"];
    const nuevas = selectedFiles.slice(0, espacioDisponible).map((f, i) => {
      const idx = imagenes.length + i;
      return {
        file: f,
        preview: URL.createObjectURL(f),
        id: `gal_${Date.now()}_${i}`,
        label: etiquetas[idx] || `Muestra ${idx + 1}`
      };
    });
    const combinadas = [...imagenes, ...nuevas].slice(0, 3);
    setImagenes(combinadas);
    setFile(combinadas[0].file);
    setImagePreview(combinadas[0].preview);
    setFotoActivaIdx(combinadas.length - 1);
    e.target.value = "";
  };

  const eliminarFoto = (idx) => {
    const filtradas = imagenes.filter((_, i) => i !== idx);
    setImagenes(filtradas);
    if (filtradas.length > 0) {
      setFile(filtradas[0].file);
      setImagePreview(filtradas[0].preview);
      setFotoActivaIdx(Math.min(fotoActivaIdx, filtradas.length - 1));
    } else {
      setFile(null);
      setImagePreview(null);
      setFotoActivaIdx(0);
    }
  };

  // --- ANÁLISIS E IA (OBLIGA A 3 FOTOS, ENVÍA 1 A LA API) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imagenes.length < 3) {
      mostrarAviso("Debes subir obligatoriamente 3 fotografías de la planta afectada para que la Inteligencia Artificial realice la triangulación diagnóstica.", "Muestras Incompletas", "advertencia");
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    try {
      const formData = new FormData();
      // Se envía 1 sola imagen como siempre a la IA de Hugging Face
      formData.append("file", imagenes[0].file);
      const res = await fetch("https://carloscarvajal760-diagnostico-plantas-api.hf.space/predict", { method: "POST", body: formData });
      const data = await res.json();
      const nombreLimpio = data.class_name.replaceAll("_", " ");
      const resObj = { disease: nombreLimpio, confidence: Math.round(data.confidence * 100) };

      setResult(resObj);
      setReporteUser(user.displayName || user.email);
      setFechaDiagnostico(new Date().toLocaleString());
      guardarEnNube(resObj);
      setTimeout(ejecutarScroll, 300); // Bajar al resultado tras analizar
    } catch (err) {
      mostrarAviso("Hubo un inconveniente al conectar con el servidor de Inteligencia Artificial. Por favor revisa tu conexión a internet e inténtalo nuevamente.", "Error de Conexión IA", "error");
    }
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
      <div className="px-6 pt-10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl mx-auto">
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

        {/* Conmutador de Vistas / Pestañas (SOLO VISIBLE PARA ADMIN) */}
        {user?.email === ADMIN_EMAIL && (
          <div className="flex items-center justify-center bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
            <button
              onClick={() => setVistaActiva("diagnostico")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${vistaActiva === "diagnostico"
                ? "bg-green-600 text-white shadow-md shadow-green-600/30"
                : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
            >
              <FaLeaf className={vistaActiva === "diagnostico" ? "text-yellow-300" : ""} />
              <span>Diagnóstico</span>
            </button>

            <button
              onClick={() => setVistaActiva("usuarios")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${vistaActiva === "usuarios"
                ? "bg-green-600 text-white shadow-md shadow-green-600/30"
                : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
            >
              <FaUsers className={vistaActiva === "usuarios" ? "text-yellow-300" : ""} />
              <span>Usuarios</span>
            </button>
          </div>
        )}

        <button onClick={handleLogout} className="self-end md:self-auto p-3 bg-white/10 rounded-2xl border border-white/10 active:scale-90" title="Cerrar Sesión">
          <FaSignOutAlt size={18} />
        </button>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {vistaActiva === "usuarios" ? (
          <UsuariosTable currentUser={user} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* LADO IZQUIERDO: SCANNER / HISTORIAL */}
            <div className="space-y-6">
              {/* PESTAÑAS EXCLUSIVAS PARA ADMIN (SCANNER VS HISTORIAL) */}
              {user?.email === ADMIN_EMAIL && (
                <div className="flex bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setAdminTab("scanner")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      adminTab === "scanner"
                        ? "bg-green-600 text-white shadow-md shadow-green-600/30"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <FaCamera /> Scanner IA (3 Fotos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab("historial")}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      adminTab === "historial"
                        ? "bg-green-600 text-white shadow-md shadow-green-600/30"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <FaHistory /> Actividad Reciente
                  </button>
                </div>
              )}

              {/* VISTA 1: ACTIVIDAD RECIENTE (SOLO SI ADMIN LO SELECCIONA) */}
              {user?.email === ADMIN_EMAIL && adminTab === "historial" ? (
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-green-400">
                      <FaHistory /> ACTIVIDAD RECIENTE
                    </h2>
                    <button onClick={cargarHistorial} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-[10px] px-3 py-1.5 rounded-full font-bold transition-all active:scale-95">
                      <FaSync /> ACTUALIZAR
                    </button>
                  </div>

                  {/* BUSCADOR DE HISTORIAL */}
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FaSearch className="text-xs" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por enfermedad o responsable..."
                      value={busquedaHistorial}
                      onChange={(e) => setBusquedaHistorial(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-green-500 focus:bg-white/10 transition-all shadow-inner"
                    />
                    {busquedaHistorial && (
                      <button
                        onClick={() => setBusquedaHistorial("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
                        title="Limpiar búsqueda"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                    {historial
                      .filter((item) => {
                        const q = busquedaHistorial.toLowerCase();
                        return (
                          (item.enfermedad || "").toLowerCase().includes(q) ||
                          (item.usuario || "").toLowerCase().includes(q)
                        );
                      })
                      .map((item) => (
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

                    {historial.filter((item) => {
                      const q = busquedaHistorial.toLowerCase();
                      return (
                        (item.enfermedad || "").toLowerCase().includes(q) ||
                        (item.usuario || "").toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          No se encontraron diagnósticos que coincidan con "{busquedaHistorial}".
                        </div>
                      )}
                  </div>

                  {/* BOTÓN DE DESCARGA GLOBAL (SOLO ADMIN) */}
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
                /* VISTA SCANNER MULTI-MUESTRAS (3 FOTOS) - DISPONIBLE PARA TODOS */
                <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-6 border border-white/20">
                  {/* Encabezado del Scanner */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <FaSeedling className="animate-bounce text-sm" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-white">Scanner de Campo IA</h2>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${
                      imagenes.length === 3
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse shadow-md shadow-emerald-500/20"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}>
                      {imagenes.length}/3 Muestras
                    </span>
                  </div>

                  {/* Barra de progreso de muestras */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      <span>Triangulación Multi-Ángulo</span>
                      <span className={imagenes.length === 3 ? "text-emerald-400" : "text-amber-300"}>
                        {imagenes.length === 3 ? "Completado (100%)" : `${imagenes.length} de 3 fotos cargadas`}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          imagenes.length === 3
                            ? "bg-gradient-to-r from-emerald-500 to-green-400"
                            : imagenes.length === 2
                            ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                            : imagenes.length === 1
                            ? "bg-yellow-500"
                            : "w-0"
                        }`}
                        style={{ width: `${(imagenes.length / 3) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* VISOR PRINCIPAL DINÁMICO (Optimizado para móvil) */}
                  <div className="relative overflow-hidden rounded-[2rem] bg-black/40 aspect-square sm:aspect-[4/3] mb-4 border border-white/10 shadow-inner flex items-center justify-center">
                    {cameraActive ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3 px-4 z-10">
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-black/70 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-full font-bold border border-white/20 active:scale-95"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="bg-yellow-400 text-green-950 px-6 py-2.5 rounded-full font-black text-xs shadow-2xl active:scale-95 flex items-center gap-2 uppercase tracking-wider"
                          >
                            <FaCamera /> Capturar ({imagenes.length + 1}/3)
                          </button>
                        </div>
                      </>
                    ) : imagenes.length > 0 ? (
                      <div className="relative w-full h-full group">
                        <img
                          src={imagenes[fotoActivaIdx]?.preview || imagenes[0].preview}
                          alt="Muestra activa"
                          className="w-full h-full object-cover animate-in fade-in duration-300"
                        />
                        {/* Etiqueta flotante */}
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-green-300 border border-white/10">
                          {imagenes[fotoActivaIdx]?.label || `Muestra ${fotoActivaIdx + 1}`}
                        </div>
                        {/* Botón eliminar la foto activa */}
                        <button
                          type="button"
                          onClick={() => eliminarFoto(fotoActivaIdx)}
                          className="absolute top-3 right-3 p-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full text-xs shadow-lg transition-all active:scale-90"
                          title="Eliminar esta muestra"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center opacity-70">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-green-400 shadow-inner">
                          <FaImages size={28} />
                        </div>
                        <p className="text-xs font-bold text-slate-100">Se requieren 3 fotografías</p>
                        <p className="text-[10px] text-slate-300 mt-1 max-w-xs">
                          Toma o sube 3 muestras de la planta (Muestra 1, 2 y 3) para activar el diagnóstico.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CARRUSEL / PANEL DESLIZANTE DE LAS 3 MUESTRAS (MOBILE FIRST) */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
                      <span className="flex items-center gap-1.5"><FaLayerGroup className="text-green-400 text-xs" /> Muestras requeridas (3):</span>
                      <span className="text-[10px] text-slate-400 italic">Toca para previsualizar</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {[0, 1, 2].map((idx) => {
                        const img = imagenes[idx];
                        const labels = ["Muestra 1", "Muestra 2", "Muestra 3"];
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (img) setFotoActivaIdx(idx);
                            }}
                            className={`relative rounded-2xl p-1.5 border-2 transition-all cursor-pointer ${
                              img
                                ? fotoActivaIdx === idx
                                ? "border-green-400 bg-green-500/15 shadow-lg shadow-green-500/20 scale-[1.02]"
                                : "border-white/15 bg-white/5 hover:border-white/30"
                              : "border-dashed border-white/20 bg-white/[0.03] hover:bg-white/5"
                            }`}
                          >
                            {img ? (
                              <div className="relative aspect-square rounded-xl overflow-hidden shadow-inner">
                                <img src={img.preview} alt={`slot-${idx}`} className="w-full h-full object-cover" />
                                <span className="absolute top-1 left-1 bg-green-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow">
                                  ✓ #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    eliminarFoto(idx);
                                  }}
                                  className="absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow"
                                  title="Quitar"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center aspect-square rounded-xl cursor-pointer transition-all text-slate-400 hover:text-white">
                                <FaPlus className="text-xs mb-1 text-green-400" />
                                <span className="text-[9px] font-bold text-center leading-tight">Muestra {idx + 1}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleUploadGaleria}
                                  className="hidden"
                                />
                              </label>
                            )}
                            <p className="text-[9px] font-bold text-slate-300 text-center mt-1 truncate">
                              {labels[idx]}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTONES DE CAPTURA (CÁMARA Y GALERÍA) */}
                  {!cameraActive && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={imagenes.length >= 3}
                        className={`flex flex-col items-center justify-center py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg active:scale-95 transition-all ${
                          imagenes.length >= 3
                            ? "bg-white/10 text-white/30 cursor-not-allowed"
                            : "bg-white text-green-950 hover:bg-slate-100"
                        }`}
                      >
                        <FaCamera size={18} className="mb-1 text-green-700" />
                        <span>Tomar Foto</span>
                      </button>

                      <label
                        className={`flex flex-col items-center justify-center py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer ${
                          imagenes.length >= 3
                            ? "bg-white/10 text-white/30 cursor-not-allowed pointer-events-none"
                            : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500"
                        }`}
                      >
                        <FaUpload size={18} className="mb-1" />
                        <span>Subir Galería</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={imagenes.length >= 3}
                          onChange={handleUploadGaleria}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {/* BOTÓN PRINCIPAL DE DIAGNÓSTICO (OBLIGA A 3 FOTOS) */}
                  <div className="space-y-2">
                    <button
                      onClick={handleSubmit}
                      disabled={imagenes.length < 3 || isAnalyzing}
                      className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 ${
                        imagenes.length < 3 || isAnalyzing
                          ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/5"
                          : "bg-gradient-to-r from-yellow-400 to-amber-400 text-green-950 shadow-yellow-400/20 hover:scale-[1.02] active:scale-95 animate-pulse"
                      }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <FaSync className="animate-spin text-sm" /> Analizando 3 Muestras con IA...
                        </>
                      ) : imagenes.length < 3 ? (
                        <>
                          <FaLock className="text-xs" /> Subir 3 Fotos para Diagnosticar ({imagenes.length}/3)
                        </>
                      ) : (
                        <>
                          <FaBrain className="text-sm" /> Iniciar Diagnóstico IA (3/3 Listo)
                        </>
                      )}
                    </button>

                    {imagenes.length < 3 && (
                      <p className="text-[10px] text-center text-amber-300/80 font-medium italic">
                        ⚠️ La IA requiere 3 muestras para triangular la salud foliar (Faltan {3 - imagenes.length} fotos)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* LADO DERECHO: REPORTE DINÁMICO (Con referencia para scroll) */}
            <div className="space-y-6" ref={resultadosRef}>
              {result ? (
                <div className="animate-in slide-in-from-bottom-5 duration-500">
                  <div id="seccion-reporte" className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-slate-900 border border-slate-100">
                    {imagePreview && (
                      <div className="mb-6 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-sm">
                        <img src={imagePreview} alt="hallazgo" className="w-full h-48 object-cover" />
                        {imagenes.length > 0 && (
                          <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Muestras Trianguladas (3):
                            </span>
                            <div className="flex gap-2">
                              {imagenes.map((m, i) => (
                                <img
                                  key={i}
                                  src={m.preview}
                                  alt={`muestra-${i}`}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm"
                                  title={`Muestra ${i + 1}: ${m.label}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
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
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${baseConocimiento[result.disease].urgencia === "Critica"
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
        )}
      </div>
      {/* MODAL DE AVISO / ALERTA BONITO (REEMPLAZO DE ALERT NATIVO) */}
      {modalAlerta.visible && (
        <div 
          onClick={cerrarAviso} 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-slate-900 border border-white/20 rounded-[2.5rem] p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200 text-white relative"
          >
            <button
              onClick={cerrarAviso}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Cerrar"
            >
              <FaTimes size={16} />
            </button>

            {/* Ícono según el tipo */}
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
              {modalAlerta.tipo === "error" ? (
                <div className="w-full h-full bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl flex items-center justify-center">
                  <FaExclamationTriangle size={28} />
                </div>
              ) : modalAlerta.tipo === "info" ? (
                <div className="w-full h-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-2xl flex items-center justify-center">
                  <FaInfoCircle size={28} />
                </div>
              ) : (
                <div className="w-full h-full bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-2xl flex items-center justify-center">
                  <FaExclamationTriangle size={28} />
                </div>
              )}
            </div>

            <h3 className="text-xl font-black tracking-tight text-white mb-2">
              {modalAlerta.titulo}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {modalAlerta.mensaje}
            </p>

            <button
              type="button"
              onClick={cerrarAviso}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-green-600/30 uppercase text-xs tracking-wider transition-all active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default Dashboard;