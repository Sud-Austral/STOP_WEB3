
export const renderPortada = async (container) => {
    container.innerHTML = `
        <div style="text-align: center; padding: 50px; font-family: 'Outfit', sans-serif;">
            <h1 style="font-size: 3rem; color: #1e3a8a; margin-bottom: 20px;">Reporte de Seguridad</h1>
            <h2 style="font-size: 1.5rem; color: #64748b;">Comuna de Algarrobo</h2>
            <div style="margin-top: 50px; padding: 20px; border: 1px solid #1e3a8a; display: inline-block;">
                <p style="font-size: 1.2rem;">Fecha de Emisión: ${new Date().toLocaleDateString()}</p>
                <p style="font-size: 1rem; color: #f57c00; font-bold: 700;">LIVE DATA FEED</p>
            </div>
            <div style="margin-top: 100px;">
                <img src="https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 12px;">
            </div>
        </div>
    `;
};
