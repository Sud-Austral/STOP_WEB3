/**
 * RID SIMULATOR - Main Application Module
 * Handles view loading, navigation, and PDF export
 */

// Global function for Sidebar Tab Switching
window.switchSidebarTab = function (tabId) {
    // Hide all contents
    document.querySelectorAll('.sidebar-tab-content').forEach(el => el.style.display = 'none');
    // Show target
    document.getElementById(tabId).style.display = 'block';

    // Update buttons
    document.querySelectorAll('.btn-tab').forEach(btn => {
        if (btn.dataset.target === tabId) {
            btn.classList.add('active');
            btn.style.background = 'var(--color-primary-light)';
            btn.style.borderColor = 'var(--color-primary)';
            btn.style.color = 'var(--color-primary)';
            btn.style.fontWeight = '700';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'var(--color-bg)';
            btn.style.borderColor = 'var(--color-border)';
            btn.style.color = 'var(--color-text-muted)';
            btn.style.fontWeight = '400';
        }
    });
};

const App = {
    // Configuration
    config: {
        defaultView: 'vista1',
        chartRenderDelay: 1500,
        pdfScale: 2,
        views: [
            'vista1', 'vista2', 'vista3', 'vista4', 'vista5',
            'vista6', 'vista7', 'vista8', 'vista9', 'vista14', 'vista15',
            'vista16', 'vista17', 'vista18', 'vista19', 'vista20',
            'vista21', 'vista22', 'vista23', 'vista24', 'vista25',
            'vista26', 'vista27', 'vista28', 'vista29', 'vista30',
            'vista31', 'vista32', 'vista33', 'vista34', 'vista35',
            'vista36', 'vista37', 'vista38', 'vista39', 'vista40',
            'vista41', 'vista42', 'vista43', 'vista44', 'vista45'
        ]
    },

    // State
    state: {
        currentView: null,
        isExporting: false
    },

    // DOM Elements
    elements: {
        sidebar: null,
        viewContainer: null,
        exportBtn: null
    },

    /**
     * Initialize the application
     */
    async init() {
        this.cacheElements();
        await this.loadSidebar();
        this.bindEvents();
        this.loadView(this.config.defaultView);

        // Pre-load AI interpretations in background (delay 30s to avoid rate-limiting)
        setTimeout(() => {
            if (typeof IAModule !== 'undefined' && window.STATE_DATA?.isLoaded) {
                IAModule.generateAllInterpretations();
            }
        }, 30000);
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            sidebar: document.getElementById('sidebarContainer'),
            viewContainer: document.getElementById('viewContainer'),
            exportBtn: document.getElementById('btnExportPdf'),
            coverBtn: document.getElementById('btnExportCover')
        };
    },

    /**
     * Load sidebar component
     */
    async loadSidebar() {
        try {
            const response = await fetch('sidebar.html');
            const html = await response.text();
            this.elements.sidebar.innerHTML = html;
            this.initNavigation();
            // Init tabs
            if (window.switchSidebarTab) window.switchSidebarTab('tab-stop');
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    },

    /**
     * Initialize sidebar navigation
     */
    initNavigation() {
        const navLinks = document.querySelectorAll('[data-view]');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = link.dataset.view;

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                // Load view
                this.loadView(viewName);
            });
        });
    },

    /**
     * Bind global events
     */
    bindEvents() {
        this.elements.exportBtn?.addEventListener('click', () => this.exportPdf());
    },

    /**
     * Load a view into the container
     * @param {string} viewName - Name of the view to load
     */
    async loadView(viewName) {
        const container = this.elements.viewContainer;

        // Show loading state
        container.innerHTML = '<div class="loading"></div>';
        this.state.currentView = viewName;

        // Toggle PDF button visibility (STOP Views 1-20 only)
        if (this.elements.coverBtn) {
            const match = viewName.match(/^vista(\d+)$/);
            if (match) {
                const viewNum = parseInt(match[1]);
                this.elements.coverBtn.style.display = (viewNum >= 1 && viewNum <= 20) ? 'inline-flex' : 'none';
            } else {
                this.elements.coverBtn.style.display = 'none';
            }
        }

        try {
            const response = await fetch(`vistas/${viewName}.html`);

            if (!response.ok) {
                throw new Error(`View not found: ${viewName}`);
            }

            const html = await response.text();
            container.innerHTML = html;

            // Inject report header and source badge into the first card element
            const firstCard = container.querySelector('.card');
            if (firstCard) {
                // Inject report header at the beginning
                const reportHeaderHtml = this.getReportHeaderHtml(viewName);
                firstCard.insertAdjacentHTML('afterbegin', reportHeaderHtml);

                // Inject source badge into the container (if exists)
                const sourceBadgeContainer = container.querySelector('#sourceBadgeContainer');
                if (sourceBadgeContainer) {
                    sourceBadgeContainer.innerHTML = this.getSourceBadgeHtml(viewName);
                }
            }

            // Update Source Badge visibility
            this.updateSourceBadge(viewName);

            // Execute embedded scripts
            this.executeScripts(container);

            // Apply chart enhancements after scripts execute
            setTimeout(() => {
                if (typeof ChartEnhancer !== 'undefined') {
                    const source = ChartEnhancer.getSourceForView(viewName);
                    ChartEnhancer.applyTableStyling();
                    ChartEnhancer.addSourceFooters(source);
                    ChartEnhancer.formatViewNumbers();
                    ChartEnhancer.applyVariationColors();
                }
            }, 500);

        } catch (error) {
            console.error('Error loading view:', error);
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <i class="fa-solid fa-exclamation-triangle" style="font-size: 3rem; color: var(--color-danger); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Error al cargar vista</h3>
                    <p class="text-muted">${viewName}</p>
                </div>
            `;
        }
    },

    /**
     * Generate report header HTML based on view type
     */
    getReportHeaderHtml(viewName) {
        const match = viewName.match(/^vista(\d+)$/);
        if (!match) return '';

        const viewNum = parseInt(match[1]);
        let title = 'Reporte de Inteligencia Delictual';
        let icon = 'fa-shield-halved';

        // CEAD views (21-40) have a different title
        if (viewNum >= 21 && viewNum <= 40) {
            title = 'Reporte CEAD';
            icon = 'fa-chart-line';
        } else if (viewNum >= 41 && viewNum <= 45) {
            title = 'Reporte Integrado STOP-CEAD';
            icon = 'fa-layer-group';
        }

        return `
            <div class="report-header-row" style="margin-bottom: 0.5rem;">
                <h1 class="header-title" style="margin: 0; font-size: 1.3rem;">
                    <i class="fa-solid ${icon}" style="color: var(--color-primary); margin-right: 8px;"></i>
                    ${title}
                </h1>
            </div>
        `;
    },

    /**
          * Generate source badge HTML based on view
          */
    getSourceBadgeHtml(viewName) {
        const match = viewName.match(/^vista(\d+)$/);
        if (!match) return '';

        const viewNum = parseInt(match[1]);
        const sources = [];

        // Determine sources based on view number
        if (viewNum >= 1 && viewNum <= 20) {
            sources.push({ name: 'STOP (Sistema Táctico de Operación Policial)', class: 'stop' });
        } else if (viewNum >= 21 && viewNum <= 40) {
            sources.push({ name: 'CEAD (Centro de Análisis del Delito)', class: 'cead' });
        } else if (viewNum >= 41 && viewNum <= 45) {
            sources.push({ name: 'STOP (Sistema Táctico de Operación Policial)', class: 'stop' });
            sources.push({ name: 'CEAD (Centro de Análisis del Delito)', class: 'cead' });
        }

        // Add INE for views that use population data
        const ineViews = [1, 16, 17, 21, 26, 34, 41];
        if (ineViews.includes(viewNum)) {
            sources.push({ name: 'INE (Instituto Nacional de Estadísticas)', class: 'ine' });
        }

        if (sources.length === 0) return '';

        const itemsHtml = sources.map(s =>
            `<div class="source-badge-item source-badge-item--${s.class}">${s.name}</div>`
        ).join('');

        return `
            <div class="source-badge" id="sourceBadge" style="text-align: right;">
                <div class="source-badge-label">FUENTE OFICIAL:</div>
                <div class="source-badge-items" id="sourceBadgeItems">${itemsHtml}</div>
            </div>
        `;
    },

    /**
     * Update source badge based on current view
     */
    updateSourceBadge(viewName) {
        // Badge is now injected via getSourceBadgeHtml, this just ensures visibility
        const badge = document.getElementById('sourceBadge');
        if (badge) {
            badge.style.display = 'block';
        }
    },

    /**
     * Execute scripts in loaded view
     * @param {HTMLElement} container - Container element
     */
    executeScripts(container) {
        const scripts = container.querySelectorAll('script');

        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
            // Clean up after execution
            setTimeout(() => newScript.remove(), 100);
        });
    },

    /**
     * Destroy all existing Chart.js instances
     * Prevents memory leaks and conflicts between views
     */
    destroyAllCharts() {
        // Get all Chart.js instances and destroy them
        if (typeof Chart !== 'undefined') {
            const charts = Object.values(Chart.instances || {});
            charts.forEach(chart => {
                try {
                    chart.destroy();
                } catch (e) {
                    console.warn('Error destroying chart:', e);
                }
            });
        }
    },

    /**
     * Export all views to PDF
     */
    async exportPdf() {
        if (this.state.isExporting) return;

        // Check if IA analysis is complete
        if (typeof IAModule !== 'undefined' && !IAModule.isLoaded) {
            const proceed = confirm(
                '⚠️ El análisis de IA aún no ha terminado.\n\n' +
                '¿Desea generar el informe sin las interpretaciones de IA?\n\n' +
                'Presione "Aceptar" para continuar o "Cancelar" para esperar.'
            );
            if (!proceed) return;
        }

        this.state.isExporting = true;
        const originalView = this.state.currentView;
        const container = this.elements.viewContainer;
        const btn = this.elements.exportBtn;

        // Update button state
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exportando...';
        btn.disabled = true;

        // Show professional overlay
        this.showExportOverlay();

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageWidth = 210;
            const pageHeight = 297;

            for (let i = 0; i < this.config.views.length; i++) {
                const viewName = this.config.views[i];
                const progressText = `Procesando vista ${i + 1} de ${this.config.views.length}...`;

                // Update button and overlay
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i + 1}/${this.config.views.length}`;
                this.updateExportOverlay(progressText);

                // Destroy previous charts to prevent conflicts
                this.destroyAllCharts();

                // Load view
                await this.loadView(viewName);

                // Wait for charts to render (8 seconds)
                await this.delay(8000);

                // Capture
                const canvas = await html2canvas(container, {
                    scale: this.config.pdfScale,
                    useCORS: true,
                    backgroundColor: '#f1f5f9',
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgHeight = (canvas.height * pageWidth) / canvas.width;

                // Add page if not first
                if (i > 0) pdf.addPage();

                // Handle multi-page content
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
            }

            // Save PDF
            const date = new Date().toISOString().split('T')[0];
            pdf.save(`Reporte_RID_${date}.pdf`);

        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Error al exportar PDF. Por favor intente nuevamente.');
        } finally {
            // Restore state
            this.hideExportOverlay();
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            this.state.isExporting = false;
            this.loadView(originalView);
        }
    },

    /**
     * Show Export Overlay
     */
    showExportOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'exportOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.9);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        overlay.innerHTML = `
            <div style="background: white; padding: 2.5rem; border-radius: 16px; max-width: 500px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                <div style="width: 64px; height: 64px; background: #e0e7ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 24px;">
                    <i class="fa-solid fa-file-pdf fa-beat-fade"></i>
                </div>
                <h3 style="margin: 0 0 0.5rem; color: #1e293b; font-size: 1.25rem; font-weight: 700;">Generando Reporte Oficial</h3>
                <p id="exportStatus" style="margin: 0 0 1.5rem; color: #64748b; font-size: 0.95rem;">Preparando documentos...</p>
                
                <div style="padding: 1rem; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; text-align: left; display: flex; gap: 0.75rem;">
                    <i class="fa-solid fa-lightbulb" style="color: #f59e0b; margin-top: 3px;"></i>
                    <div>
                        <strong style="display: block; color: #9a3412; font-size: 0.9rem; margin-bottom: 2px;">Importante</strong>
                        <span style="color: #c2410c; font-size: 0.85rem; line-height: 1.4;">Por favor, mantenga esta pestaña activa y <strong>no cambie de ventana</strong>. Esto asegura que los gráficos se capturen con la máxima calidad.</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        // Trigger reflow for transition
        overlay.offsetHeight;
        overlay.style.opacity = '1';
    },

    /**
     * Update Export Status
     * @param {string} text 
     */
    updateExportOverlay(text) {
        const el = document.getElementById('exportStatus');
        if (el) el.textContent = text;
    },

    /**
     * Hide Export Overlay
     */
    hideExportOverlay() {
        const overlay = document.getElementById('exportOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    },

    /**
     * Utility: Delay promise
     * @param {number} ms - Milliseconds to wait
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Expose for global access if needed
window.App = App;
