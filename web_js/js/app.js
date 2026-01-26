
import { PrintWizard } from './utils/PrintWizard.js';
import { renderPortada } from './pages/Portada.js';
import { renderExecutiveSummary } from './pages/ExecutiveSummary.js';

// Mock Pages for testing the wizard migration
const MOCK_PAGES = [
    { id: 'portada', title: 'Portada', render: renderPortada },
    { id: 'executive-summary', title: 'Resumen Ejecutivo', render: renderExecutiveSummary }
];

const initCharts = () => {
    // Initialize Charts for Portal View
    const chartConfigs = [
        { id: 'chart1_portal', type: 'line', label: 'Delitos por Día', data: [12, 19, 3, 5, 2, 3, 7], color: '#1e3a8a' },
        { id: 'chart2_portal', type: 'bar', label: 'Tipos de Delito', data: [45, 25, 15, 30, 10], colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1'] },
        { id: 'chart3_portal', type: 'doughnut', label: 'Recursos', data: [40, 30, 20, 10], colors: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'] },
        { id: 'chart4_portal', type: 'radar', label: 'Performance', data: [85, 70, 90, 65, 80], color: '#f59e0b' }
    ];

    chartConfigs.forEach(conf => {
        const el = document.getElementById(conf.id);
        if (!el) return;
        const ctx = el.getContext('2d');

        const data = {
            labels: conf.type === 'line' ? ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] :
                conf.type === 'bar' ? ['Robo', 'Hurto', 'Asalto', 'Vandalismo', 'Otros'] :
                    conf.type === 'doughnut' ? ['Patrullaje', 'Cámaras', 'Denuncias', 'IA Assist'] :
                        ['Velocidad', 'Eficacia', 'Recursos', 'Cobertura', 'Tecnología'],
            datasets: [{
                label: conf.label,
                data: conf.data,
                backgroundColor: conf.colors || (conf.type === 'radar' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 58, 138, 0.1)'),
                borderColor: conf.color || '#1e3a8a',
                borderWidth: 2,
                tension: 0.3,
                fill: conf.type === 'line' || conf.type === 'radar'
            }]
        };

        new Chart(ctx, {
            type: conf.type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: 'Outfit', size: 12 } }
                    }
                }
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Portal Initialized");

    const portalView = document.getElementById('portalView');
    const dynamicView = document.getElementById('dynamicView');
    const btnBack = document.getElementById('btnBackToPortal');
    const quickExportBtn = document.getElementById('quickExportPdf');

    // Initialize the charts on the main view
    initCharts();

    // Function to switch to portal
    const showPortal = () => {
        portalView.style.display = 'block';
        dynamicView.style.display = 'none';
        btnBack.style.display = 'none';
        quickExportBtn.style.display = 'inline-flex';
        history.pushState("", document.title, window.location.pathname + window.location.search);
    };

    // Function to switch to dynamic view
    const showView = async (renderer) => {
        portalView.style.display = 'none';
        dynamicView.style.display = 'block';
        btnBack.style.display = 'inline-flex';
        quickExportBtn.style.display = 'none';
        dynamicView.innerHTML = '<div class="p-10 text-center">Cargando...</div>';
        await renderer(dynamicView);
    };

    // Setup Wizard Link (Export button in top bars and custom links)
    if (quickExportBtn) {
        quickExportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const wizard = new PrintWizard(MOCK_PAGES);
            wizard.start();
        });
    }

    // Back button logic
    if (btnBack) {
        btnBack.addEventListener('click', (e) => {
            e.preventDefault();
            showPortal();
        });
    }
});
