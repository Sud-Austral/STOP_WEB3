
export const renderExecutiveSummary = async (container) => {
    container.innerHTML = `
        <div style="padding: 40px; font-family: 'Outfit', sans-serif; background: white; min-height: 297mm;">
            <h1 style="font-size: 2.2rem; color: #1e3a8a; margin-bottom: 20px; border-bottom: 3px solid #f1f5f9; padding-bottom: 10px;">📊 Reporte Estadístico de Seguridad</h1>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                    <p style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Total Delitos</p>
                    <p style="font-size: 2.2rem; font-weight: 800; color: #1e2k93b; margin: 0;">1,248</p>
                    <p style="color: #ef4444; font-size: 0.85rem; margin-top: 5px;">▲ 12.4%</p>
                </div>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                    <p style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Detenciones</p>
                    <p style="font-size: 2.2rem; font-weight: 800; color: #1e293b; margin: 0;">342</p>
                    <p style="color: #10b981; font-size: 0.85rem; margin-top: 5px;">▼ 5.2%</p>
                </div>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                    <p style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 5px;">Tiempo Respuesta</p>
                    <p style="font-size: 2.2rem; font-weight: 800; color: #1e293b; margin: 0;">8.5m</p>
                    <p style="color: #3b82f6; font-size: 0.85rem; margin-top: 5px;">Promedio Semanal</p>
                </div>
            </div>

            <h2 style="font-size: 1.5rem; color: #334155; margin-bottom: 20px;">Sección 1: Análisis de Delitos</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 40px;">
                <div style="background: #fff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; height: 300px;">
                    <canvas id="chart1"></canvas>
                </div>
                <div style="background: #fff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; height: 300px;">
                    <canvas id="chart2"></canvas>
                </div>
            </div>

            <h2 style="font-size: 1.5rem; color: #334155; margin-bottom: 20px;">Sección 2: Operatividad y Recursos</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                <div style="background: #fff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; height: 300px;">
                    <canvas id="chart3"></canvas>
                </div>
                <div style="background: #fff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; height: 300px;">
                    <canvas id="chart4"></canvas>
                </div>
            </div>
        </div>
    `;

    // Wait for container to be in DOM if needed (PrintWizard does this)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize Charts
    const ctx1 = document.getElementById('chart1').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
            datasets: [{
                label: 'Delitos por Día',
                data: [12, 19, 3, 5, 2, 3, 7],
                borderColor: '#1e3a8a',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(30, 58, 138, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctx2 = document.getElementById('chart2').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Robo', 'Hurto', 'Asalto', 'Vandalismo', 'Otros'],
            datasets: [{
                label: 'Tipos de Delito',
                data: [45, 25, 15, 30, 10],
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctx3 = document.getElementById('chart3').getContext('2d');
    new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: ['Patrullaje', 'Cámaras', 'Denuncias', 'IA Assist'],
            datasets: [{
                data: [40, 30, 20, 10],
                backgroundColor: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctx4 = document.getElementById('chart4').getContext('2d');
    new Chart(ctx4, {
        type: 'radar',
        data: {
            labels: ['Velocidad', 'Eficacia', 'Recursos', 'Cobertura', 'Tecnología'],
            datasets: [{
                label: 'Performance Operativo',
                data: [85, 70, 90, 65, 80],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.2)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};
