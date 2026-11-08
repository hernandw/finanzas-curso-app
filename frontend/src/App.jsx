// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import VistaPublica from './components/VistaPublica';
import VistaAdmin from './components/VistaAdmin';
import LoginAdmin from './components/LoginAdmin';

const BACKEND_RENDER_URL = 'https://finanzas-curso-app.onrender.com'; // Pon tu URL real de Render
const API_BASE = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') 
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
    : BACKEND_RENDER_URL;

export default function App() {
    const [datos, setDatos] = useState(null);
    const [vistaActual, setVistaActual] = useState('publica'); // 'publica', 'login', 'admin'
    const [autenticado, setAutenticado] = useState(false);
    
    // Modo Dark / Light (Dark por defecto)
    const [modoOscuro, setModoOscuro] = useState(() => {
        const guardado = localStorage.getItem('tesoreria_tema');
        return guardado !== null ? guardado === 'dark' : true;
    });

    const timerInactividadRef = useRef(null);

    // Conmutar tema
    useEffect(() => {
        localStorage.setItem('tesoreria_tema', modoOscuro ? 'dark' : 'light');
        if (modoOscuro) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [modoOscuro]);

    // Cierre de sesión automático tras 3 minutos de inactividad
    const resetearTimerInactividad = () => {
        if (!autenticado) return;
        if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
        
        // 3 minutos = 180.000 ms
        timerInactividadRef.current = setTimeout(() => {
            setAutenticado(false);
            setVistaActual('publica');
            alert("⏰ Su sesión ha expirado por 3 minutos de inactividad.");
        }, 3 * 60 * 1000);
    };

    useEffect(() => {
        if (autenticado) {
            const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            eventos.forEach(ev => window.addEventListener(ev, resetearTimerInactividad));
            resetearTimerInactividad();

            return () => {
                eventos.forEach(ev => window.removeEventListener(ev, resetearTimerInactividad));
                if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
            };
        }
    }, [autenticado]);



const cargarDatos = async (anioDeseado = null) => {
    try {
        const ruta = anioDeseado ? `/api/curso/datos?anio=${anioDeseado}` : '/api/curso/datos';
        // Anteponer API_BASE para traer los datos reales de Render
        const res = await fetch(`${API_BASE}${ruta}`);
        const json = await res.json();
        setDatos(json);
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
};

    useEffect(() => {
        cargarDatos();
    }, []);

    const cerrarSesion = () => {
        if (timerInactividadRef.current) clearTimeout(timerInactividadRef.current);
        setAutenticado(false);
        setVistaActual('publica');
    };

    if (!datos) {
        return (
            <div className={`flex items-center justify-center min-h-screen ${modoOscuro ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600'} text-xs font-sans`}>
                <i className="fa-solid fa-spinner animate-spin mr-2 text-emerald-500 text-sm"></i> Cargando tesorería...
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${modoOscuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} p-4 sm:p-8 font-sans transition-colors duration-200`}>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Cabecera Principal */}
                <header className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white shadow-md">
  {/* Título o Logo a la izquierda */}
  <div className="flex items-center gap-3">
    <h1 className="text-lg font-bold">Finanzas Curso</h1>
  </div>

  {/* Sección derecha: Identificación Admin + Botón Cerrar Sesión */}
  {esAdmin && (
    <div className="flex items-center gap-3">
      <span className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
        Admin
      </span>
      <button
        onClick={cerrarSesion}
        className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
      >
        <span>Cerrar sesión</span>
      </button>
    </div>
  )}
</header>

                <main>
                    {vistaActual === 'publica' && (
                        <VistaPublica datos={datos} onCambiarAnio={cargarDatos} />
                    )}

                    {vistaActual === 'login' && !autenticado && (
                        <LoginAdmin
                            onLoginExitoso={() => {
                                setAutenticado(true);
                                setVistaActual('admin');
                            }}
                            onVolverPublica={() => setVistaActual('publica')}
                        />
                    )}

                    {vistaActual === 'admin' && autenticado && (
                        <VistaAdmin
                            datos={datos}
                            onActualizar={cargarDatos}
                            onCerrarSesion={cerrarSesion}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}