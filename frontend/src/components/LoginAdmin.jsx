// src/components/LoginAdmin.jsx
import React, { useState, useEffect } from 'react';

export default function LoginAdmin({ onLoginExitoso, onVolverPublica }) {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [recordar, setRecordar] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const guardado = localStorage.getItem('tesoreria_credenciales');
        if (guardado) {
            try {
                const { u, p } = JSON.parse(guardado);
                setUsuario(u);
                setPassword(p);
                setRecordar(true);
            } catch (e) {}
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Clave y usuario por defecto
        if (usuario.trim().toLowerCase() === 'admin' && password === 'admin123') {
            if (recordar) {
                localStorage.setItem('tesoreria_credenciales', JSON.stringify({ u: usuario, p: password }));
            } else {
                localStorage.removeItem('tesoreria_credenciales');
            }
            setError('');
            onLoginExitoso();
        } else {
            setError('Credenciales incorrectas. Verifique usuario o contraseña.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl">
                        <i className="fa-solid fa-lock"></i>
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Acceso a Tesorería</h2>
                    <p className="text-xs text-slate-400">Ingrese sus credenciales de administración del curso</p>
                </div>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">Usuario</label>
                        <input
                            type="text"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            placeholder="admin"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                        <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={recordar}
                                onChange={(e) => setRecordar(e.target.checked)}
                                className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            Recordar credenciales
                        </label>
                        <span className="text-[11px] text-slate-500">Sesión caduca en 3 min</span>
                    </div>

                    <div className="pt-3 space-y-2">
                        <button
                            type="submit"
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/10"
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            type="button"
                            onClick={onVolverPublica}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition"
                        >
                            Volver a Vista Pública
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}