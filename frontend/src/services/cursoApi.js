// frontend/src/services/cursoApi.js
const API_BASE = import.meta.env.VITE_API_URL || '';

export const cursoApi = {
    obtenerDatos: (anio = null) => {
        const url = anio 
            ? `${API_BASE}/api/curso/datos?anio=${anio}` 
            : `${API_BASE}/api/curso/datos`;
        return fetch(url);
    },

    registrarGasto: (formData) =>
        fetch(`${API_BASE}/api/curso/admin/gasto`, {
            method: 'POST',
            body: formData // Envía Multipart FormData directamente con el recibo
        }),

    eliminarGasto: (id, anio) =>
        fetch(`${API_BASE}/api/curso/admin/gasto/${id}?anio=${anio}`, {
            method: 'DELETE'
        }),

    agregarApoderado: (datos) =>
        fetch(`${API_BASE}/api/curso/admin/apoderado/agregar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        }),

    modificarApoderado: (id, datos) =>
        fetch(`${API_BASE}/api/curso/admin/apoderado/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        }),

    cambiarEstadoApoderado: (id, activo, anio) =>
        fetch(`${API_BASE}/api/curso/admin/apoderado/estado/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo, anio })
        }),

    eliminarApoderado: (id, anio) =>
        fetch(`${API_BASE}/api/curso/admin/apoderado/${id}?anio=${anio}`, {
            method: 'DELETE'
        }),

    registrarPagoGlobal: (pago) =>
        fetch(`${API_BASE}/api/curso/admin/pago-global`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pago)
        }),

    eliminarPagoMes: (apoderadoId, mes, anio) =>
        fetch(`${API_BASE}/api/curso/admin/pago/${apoderadoId}/${mes}?anio=${anio}`, {
            method: 'DELETE'
        }),

    exonerarMes: (apoderadoId, mes, anio) =>
        fetch(`${API_BASE}/api/curso/admin/pago/exonerar/${apoderadoId}/${mes}?anio=${anio}`, {
            method: 'PUT'
        }),

    registrarIngresoExtra: (datos) =>
        fetch(`${API_BASE}/api/curso/admin/ingreso-extra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        }),

    eliminarIngresoExtra: (id, anio) =>
        fetch(`${API_BASE}/api/curso/admin/ingreso-extra/${id}?anio=${anio}`, {
            method: 'DELETE'
        }),

    actualizarConfiguracion: (datos) =>
        fetch(`${API_BASE}/api/curso/admin/configuracion`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        }),

    cambiarAnio: (nuevoAnio) =>
        fetch(`${API_BASE}/api/curso/admin/cambiar-anio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevoAnio })
        }),

    cerrarAnio: () =>
        fetch(`${API_BASE}/api/curso/admin/cerrar-anio`, {
            method: 'POST'
        }),

    enviarCorreoMorosos: (apoderadoId, anio) =>
        fetch(`${API_BASE}/api/curso/admin/enviar-correo-morosos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apoderadoId, anio })
        }),

    enviarPdfCorreo: (formData) =>
        fetch(`${API_BASE}/api/curso/admin/enviar-pdf-correo`, {
            method: 'POST',
            body: formData
        }),

    backupUrl: () => `${API_BASE}/api/curso/backup`,

    restaurarBackup: (jsonString) =>
        fetch(`${API_BASE}/api/curso/backup/restaurar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonString
        }),

    resetApp: () =>
        fetch(`${API_BASE}/api/curso/reset`, {
            method: 'DELETE'
        })
};