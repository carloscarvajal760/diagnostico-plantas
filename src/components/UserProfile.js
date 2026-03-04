import React, { useState, useEffect, useRef } from "react";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);

    // Cerrar el menú al hacer clic fuera
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      window.location.reload(); // Redirige al login
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-white/30 transition"
      >
        <FaUserCircle className="text-white text-2xl" />
        <span className="text-white font-semibold">{user.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-gray-800 hover:bg-gray-100 transition"
          >
            <FaSignOutAlt className="mr-2" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
