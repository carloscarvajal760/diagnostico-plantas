import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  FaUsers,
  FaUserEdit,
  FaUserPlus,
  FaSearch,
  FaTimes,
  FaCheck,
  FaShieldAlt,
  FaSeedling,
  FaUserTie,
  FaSyncAlt,
  FaEnvelope,
  FaPhone
} from "react-icons/fa";

// Usuarios de demostración en caso de colección vacía o desconexión
const USUARIOS_DEMO = [
  {
    id: "user-admin-01",
    email: "admin@gmail.com",
    nombre: "Carlos Carvajal (Administrador)",
    rol: "Administrador",
    estado: "Activo",
    telefono: "+591 76543210",
    area: "Dirección de Vivero",
    fechaRegistro: "2026-01-15"
  },
  {
    id: "user-agronomo-02",
    email: "m.rodriguez@vivero.bo",
    nombre: "Ing. Mariana Rodríguez",
    rol: "Técnico Agrónomo",
    estado: "Activo",
    telefono: "+591 71234567",
    area: "Diagnóstico e Invernaderos",
    fechaRegistro: "2026-02-10"
  },
  {
    id: "user-jardinero-03",
    email: "j.mamani@vivero.bo",
    nombre: "Juan Mamani",
    rol: "Jardinero / Operador",
    estado: "Activo",
    telefono: "+591 78901234",
    area: "Sector Floral y Plantas Ornamentales",
    fechaRegistro: "2026-03-01"
  },
  {
    id: "user-jardinero-04",
    email: "r.quispe@vivero.bo",
    nombre: "Rosa Quispe",
    rol: "Jardinero / Operador",
    estado: "Inactivo",
    telefono: "+591 77654321",
    area: "Área de Riego",
    fechaRegistro: "2026-03-12"
  }
];

export default function UsuariosTable({ currentUser }) {
  const esAdmin = currentUser?.email === "admin@gmail.com";
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // Formulario nuevo usuario
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    rol: "Jardinero / Operador",
    estado: "Activo",
    telefono: "",
    area: "Mantenimiento General"
  });

  // Cargar usuarios de Firestore (colección usuarios + diagnosticos) o localStorage
  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const mapaUsuarios = new Map();

      // 1. Obtener los que ya estén guardados en la colección 'usuarios'
      try {
        const snapshot = await getDocs(collection(db, "usuarios"));
        if (!snapshot.empty) {
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const clave = (data.email || docSnap.id).toLowerCase();
            mapaUsuarios.set(clave, {
              id: docSnap.id,
              ...data
            });
          });
        }
      } catch (errUsuarios) {
        console.warn("Lectura de colección 'usuarios':", errUsuarios);
      }

      // 2. Extraer usuarios históricos que hayan realizado diagnósticos
      try {
        const diagSnapshot = await getDocs(collection(db, "diagnosticos"));
        diagSnapshot.docs.forEach((d) => {
          const data = d.data();
          const usu = data.usuario;
          if (usu && typeof usu === "string") {
            const email = usu.includes("@")
              ? usu.toLowerCase()
              : `${usu.toLowerCase().replace(/\s+/g, ".")}@vivero.bo`;

            if (!mapaUsuarios.has(email)) {
              const idGenerado = `user-diag-${Math.abs(
                email.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
              )}`;
              const fechaIso = data.fecha?.toDate
                ? data.fecha.toDate().toISOString().split("T")[0]
                : "2026-03-01";

              const nuevoUser = {
                id: idGenerado,
                email: email,
                nombre: usu.includes("@") ? usu.split("@")[0] : usu,
                rol: email === "admin@gmail.com" ? "Administrador" : "Jardinero / Operador",
                estado: "Activo",
                area: "Campo / Diagnóstico",
                telefono: "",
                fechaRegistro: fechaIso
              };
              mapaUsuarios.set(email, nuevoUser);

              // Guardar en Firestore para persistirlo de ahora en adelante
              setDoc(doc(db, "usuarios", idGenerado), nuevoUser, { merge: true }).catch(() => { });
            }
          }
        });
      } catch (errDiag) {
        console.warn("Extracción de usuarios desde diagnosticos:", errDiag);
      }

      // 3. Si no hay ningún usuario aún, usar los demo
      if (mapaUsuarios.size === 0) {
        USUARIOS_DEMO.forEach((u) => mapaUsuarios.set(u.email.toLowerCase(), u));
      }

      const listaFinal = Array.from(mapaUsuarios.values());
      setUsuarios(listaFinal);
      localStorage.setItem("aranjuez_usuarios_cache", JSON.stringify(listaFinal));
    } catch (err) {
      console.warn("Error leyendo Firestore, usando datos en caché:", err);
      const cache = localStorage.getItem("aranjuez_usuarios_cache");
      setUsuarios(cache ? JSON.parse(cache) : USUARIOS_DEMO);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Mostrar mensaje temporal
  const notificar = (msg) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(""), 4000);
  };

  // Guardar edición
  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    try {
      const ref = doc(db, "usuarios", usuarioEditando.id);
      await updateDoc(ref, {
        nombre: usuarioEditando.nombre,
        rol: usuarioEditando.rol,
        estado: usuarioEditando.estado,
        telefono: usuarioEditando.telefono || "",
        area: usuarioEditando.area || ""
      });
    } catch (err) {
      console.warn("Guardado local fallback por Firestore:", err);
    }

    const actualizados = usuarios.map((u) =>
      u.id === usuarioEditando.id ? { ...usuarioEditando } : u
    );
    setUsuarios(actualizados);
    localStorage.setItem("aranjuez_usuarios_cache", JSON.stringify(actualizados));
    setUsuarioEditando(null);
    notificar("¡Usuario actualizado correctamente!");
  };

  // Crear nuevo usuario
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!nuevoUsuario.email || !nuevoUsuario.nombre) return;

    const id = `user-${Date.now()}`;
    const userToSave = {
      ...nuevoUsuario,
      id,
      fechaRegistro: new Date().toISOString().split("T")[0]
    };

    try {
      await setDoc(doc(db, "usuarios", id), userToSave);
    } catch (err) {
      console.warn("Guardado en Firestore omitido, guardando local:", err);
    }

    const actualizados = [userToSave, ...usuarios];
    setUsuarios(actualizados);
    localStorage.setItem("aranjuez_usuarios_cache", JSON.stringify(actualizados));
    setNuevoUsuario({
      nombre: "",
      email: "",
      rol: "Jardinero / Operador",
      estado: "Activo",
      telefono: "",
      area: "Mantenimiento General"
    });
    setMostrarModalNuevo(false);
    notificar("¡Nuevo usuario registrado con éxito!");
  };

  // Filtros
  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideTexto =
      u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.area?.toLowerCase().includes(busqueda.toLowerCase());

    const coincideRol =
      filtroRol === "todos" ? true : u.rol?.toLowerCase().includes(filtroRol.toLowerCase());

    return coincideTexto && coincideRol;
  });

  // Badge de Rol
  const renderBadgeRol = (rol) => {
    if (rol === "Administrador") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <FaShieldAlt className="text-[10px]" /> Administrador
        </span>
      );
    }
    if (rol === "Técnico Agrónomo") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          <FaUserTie className="text-[10px]" /> Agrónomo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        <FaSeedling className="text-[10px]" /> Jardinero / Campo
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alerta de notificación */}
      {mensajeExito && (
        <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-5 py-3 rounded-2xl flex items-center justify-between text-sm backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2">
            <FaCheck className="text-emerald-400" />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito("")} className="text-white/60 hover:text-white">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Tarjeta Principal de Gestión */}
      <div className="bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] p-6 lg:p-8 border border-white/10 shadow-2xl">
        {/* Cabecera superior con estadísticas y botón de acción */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <FaUsers className="text-xl" />
              <span className="text-xs font-black uppercase tracking-widest">
                Gestión de Personal
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Usuarios Registrados
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Control de acceso, roles y asignación de personal del Vivero Municipal de Aranjuez.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cargarUsuarios}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white/80 hover:text-white transition-all active:scale-95 flex items-center gap-2 text-xs font-bold"
              title="Refrescar lista"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
            </button>

            {esAdmin && (
              <button
                onClick={() => setMostrarModalNuevo(true)}
                className="py-3 px-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-green-600/30 transition-all active:scale-95"
              >
                <FaUserPlus /> Nuevo Usuario
              </button>
            )}
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 pb-6">
          {/* Buscador */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, correo o área..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-green-500 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Selector de Rol */}
          <div>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all [&>option]:bg-slate-900 [&>option]:text-white"
            >
              <option value="todos">Todos los Roles</option>
              <option value="Administrador">Solo Administradores</option>
              <option value="Agrónomo">Solo Técnicos Agrónomos</option>
              <option value="Jardinero">Solo Jardineros / Campo</option>
            </select>
          </div>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-4 px-5">Usuario / Personal</th>
                <th className="py-4 px-4">Rol en Vivero</th>
                <th className="py-4 px-4 hidden md:table-cell">Área / Sección</th>
                <th className="py-4 px-4">Estado</th>
                {esAdmin && <th className="py-4 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={esAdmin ? 5 : 4} className="py-12 text-center text-slate-400">
                    <FaSyncAlt className="animate-spin text-2xl mx-auto mb-2 text-green-400" />
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin ? 5 : 4} className="py-12 text-center text-slate-400">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-white/[0.04] transition-colors group"
                  >
                    {/* Nombre y Correo */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-green-700 to-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0">
                          {u.nombre ? u.nombre.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm leading-snug">
                            {u.nombre || "Sin Nombre"}
                          </p>
                          <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                            <FaEnvelope className="text-[10px] text-slate-500" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {renderBadgeRol(u.rol)}
                    </td>

                    {/* Área */}
                    <td className="py-4 px-4 text-slate-300 text-xs hidden md:table-cell">
                      <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        {u.area || "General"}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${u.estado === "Activo"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-slate-400 bg-white/5"
                          }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${u.estado === "Activo"
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-slate-500"
                            }`}
                        ></span>
                        {u.estado || "Activo"}
                      </span>
                    </td>

                    {/* Acciones */}
                    {esAdmin && (
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setUsuarioEditando({ ...u })}
                          className="p-2.5 bg-white/10 hover:bg-green-600 hover:text-white rounded-xl text-green-300 transition-all active:scale-95 inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
                          title="Editar Usuario"
                        >
                          <FaUserEdit />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla con conteo */}
        <div className="flex items-center justify-between mt-4 text-xs text-slate-400 px-2">
          <span>Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios</span>
          <span className="text-[11px] italic text-green-400/80">Sincronizado con AranjuezCloud</span>
        </div>
      </div>

      {/* MODAL: EDITAR USUARIO */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-[2.5rem] w-full max-w-lg p-6 lg:p-8 shadow-2xl text-white animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-600/20 text-green-400 rounded-2xl border border-green-500/20">
                  <FaUserEdit size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Editar Usuario</h3>
                  <p className="text-xs text-slate-400">{usuarioEditando.email}</p>
                </div>
              </div>
              <button
                onClick={() => setUsuarioEditando(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarEdicion} className="space-y-4 mt-6">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={usuarioEditando.nombre || ""}
                  onChange={(e) =>
                    setUsuarioEditando({ ...usuarioEditando, nombre: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Rol en el Sistema
                </label>
                <select
                  value={usuarioEditando.rol || "Jardinero / Operador"}
                  onChange={(e) =>
                    setUsuarioEditando({ ...usuarioEditando, rol: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all [&>option]:bg-slate-900"
                >
                  <option value="Administrador">Administrador (Acceso Total y Reportes)</option>
                  <option value="Técnico Agrónomo">Técnico Agrónomo (Diagnóstico y Fichas)</option>
                  <option value="Jardinero / Operador">Jardinero / Operador (Scanner de Campo)</option>
                </select>
              </div>

              {/* Área / Sección */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Área o Sector
                  </label>
                  <input
                    type="text"
                    value={usuarioEditando.area || ""}
                    onChange={(e) =>
                      setUsuarioEditando({ ...usuarioEditando, area: e.target.value })
                    }
                    placeholder="Ej. Invernadero 2"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={usuarioEditando.telefono || ""}
                    onChange={(e) =>
                      setUsuarioEditando({ ...usuarioEditando, telefono: e.target.value })
                    }
                    placeholder="+591 ..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Estado de Cuenta
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 flex-1 hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="estado"
                      value="Activo"
                      checked={usuarioEditando.estado === "Activo"}
                      onChange={(e) =>
                        setUsuarioEditando({ ...usuarioEditando, estado: e.target.value })
                      }
                      className="accent-green-500"
                    />
                    <span className="text-sm font-semibold text-emerald-300">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 flex-1 hover:bg-white/10 transition-colors">
                    <input
                      type="radio"
                      name="estado"
                      value="Inactivo"
                      checked={usuarioEditando.estado === "Inactivo"}
                      onChange={(e) =>
                        setUsuarioEditando({ ...usuarioEditando, estado: e.target.value })
                      }
                      className="accent-slate-500"
                    />
                    <span className="text-sm font-semibold text-slate-400">Inactivo</span>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUsuarioEditando(null)}
                  className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-green-600/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  <FaCheck /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO USUARIO */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-[2.5rem] w-full max-w-lg p-6 lg:p-8 shadow-2xl text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-600/20 text-green-400 rounded-2xl border border-green-500/20">
                  <FaUserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Registrar Personal</h3>
                  <p className="text-xs text-slate-400">Añadir nuevo miembro al vivero</p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalNuevo(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={nuevoUsuario.nombre}
                  onChange={(e) =>
                    setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  placeholder="personal@vivero.bo"
                  value={nuevoUsuario.email}
                  onChange={(e) =>
                    setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Rol Asignado
                </label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={(e) =>
                    setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all [&>option]:bg-slate-900"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Técnico Agrónomo">Técnico Agrónomo</option>
                  <option value="Jardinero / Operador">Jardinero / Operador</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Área o Sección
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Plantas Medicinales"
                    value={nuevoUsuario.area}
                    onChange={(e) =>
                      setNuevoUsuario({ ...nuevoUsuario, area: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="+591 ..."
                    value={nuevoUsuario.telefono}
                    onChange={(e) =>
                      setNuevoUsuario({ ...nuevoUsuario, telefono: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevo(false)}
                  className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-green-600/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  <FaUserPlus /> Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

