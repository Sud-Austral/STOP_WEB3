/**
 * RID SIMULATOR - Main Application Module
 * Handles view loading, navigation, and PDF export
 */

const App = {
    // Configuration
    config: {
        defaultView: 'vista1',
        chartRenderDelay: 1500,
        pdfScale: 2,
        views: [
            'vista1', 'vista2', 'vista3', 'vista4', 'vista5',
            'vista6', 'vista7', 'vista8', 'vista9'
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

        // Pre-load AI interpretations in background (after data loads)
        setTimeout(() => {
            if (typeof IAModule !== 'undefined' && window.STATE_DATA?.isLoaded) {
                IAModule.generateAllInterpretations();
            }
        }, 3000);
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            sidebar: document.getElementById('sidebarContainer'),
            viewContainer: document.getElementById('viewContainer'),
            exportBtn: document.getElementById('btnExportPdf')
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

        try {
            const response = await fetch(`vistas/${viewName}.html`);

            if (!response.ok) {
                throw new Error(`View not found: ${viewName}`);
            }

            const html = await response.text();
            container.innerHTML = html;

            // Execute embedded scripts
            this.executeScripts(container);

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

        this.state.isExporting = true;
        const originalView = this.state.currentView;
        const container = this.elements.viewContainer;
        const btn = this.elements.exportBtn;

        // Update button state
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exportando...';
        btn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageWidth = 210;
            const pageHeight = 297;

            for (let i = 0; i < this.config.views.length; i++) {
                const viewName = this.config.views[i];

                // Update progress
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i + 1}/${this.config.views.length}`;

                // Destroy previous charts to prevent conflicts
                this.destroyAllCharts();

                // Load view
                await this.loadView(viewName);

                // Wait for charts to render (2 seconds)
                await this.delay(2000);

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
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            this.state.isExporting = false;
            this.loadView(originalView);
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
