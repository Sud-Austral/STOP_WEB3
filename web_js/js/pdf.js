/**
 * PDF Module - Cover Page Generation
 * Creates a PDF with cover page using the base export functionality
 */

const PDFModule = {
    /**
     * Generate cover page on a jsPDF instance
     * @param {jsPDF} pdf - The jsPDF instance
     */
    generateCoverPage(pdf) {
        const pageWidth = 210;
        const pageHeight = 297;
        const comunaName = window.STATE_DATA?.comunaName || 'Santiago';
        const semanaId = window.STATE_DATA?.semanaId || '';

        // Format date as dd/mm/yyyy
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateFormatted = `${day}/${month}/${year}`;

        // Dark background
        pdf.setFillColor(30, 41, 59);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Left accent bar
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 0, 8, pageHeight, 'F');

        // Top accent line
        pdf.setFillColor(245, 158, 11);
        pdf.rect(8, 85, pageWidth - 8, 3, 'F');

        // STOP Logo circle
        pdf.setFillColor(99, 102, 241);
        pdf.circle(105, 55, 22, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('STOP', 105, 52, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text('SISTEMA', 105, 60, { align: 'center' });

        // Main Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(26);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REPORTE DE INTELIGENCIA', 105, 110, { align: 'center' });
        pdf.text('DELICTUAL', 105, 122, { align: 'center' });

        // Subtitle - Ley 21.332
        pdf.setFontSize(11);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Ley 21.332: Sistema Táctico de Operación Policial', 105, 138, { align: 'center' });

        // Divider line
        pdf.setDrawColor(99, 102, 241);
        pdf.setLineWidth(0.5);
        pdf.line(55, 152, 155, 152);

        // Metadata Box
        pdf.setFillColor(51, 65, 85);
        pdf.roundedRect(35, 170, 140, 65, 5, 5, 'F');

        // Labels
        pdf.setTextColor(156, 163, 175);
        pdf.setFontSize(9);
        pdf.text('COMUNA', 55, 188);
        pdf.text('SEMANA DE ANÁLISIS', 55, 205);
        pdf.text('FECHA DE GENERACIÓN', 55, 222);

        // Values
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(comunaName.toUpperCase(), 140, 188);
        pdf.text(semanaId ? `N° ${semanaId}` : 'ACTUAL', 140, 205);
        pdf.text(dateFormatted, 140, 222);

        // Footer
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text('Documento generado automáticamente por STOP WEB', 105, 260, { align: 'center' });
        pdf.text('Centro de Análisis del Delito • Inteligencia Policial', 105, 268, { align: 'center' });

        // Version
        pdf.setFontSize(7);
        pdf.text('v1.0.0 | Powered by AI', 105, 285, { align: 'center' });
    },

    /**
     * Export PDF with Cover Page
     * Captures all views, then creates PDF with cover + views
     */
    async exportWithCover() {
        if (App.state.isExporting) return;

        // Check if IA analysis is complete
        if (typeof IAModule !== 'undefined' && !IAModule.isLoaded) {
            const proceed = confirm(
                '⚠️ El análisis de IA aún no ha terminado.\n\n' +
                '¿Desea generar el informe sin las interpretaciones de IA?\n\n' +
                'Presione "Aceptar" para continuar o "Cancelar" para esperar.'
            );
            if (!proceed) return;
        }

        App.state.isExporting = true;
        const originalView = App.state.currentView;
        const container = App.elements.viewContainer;
        const btn = document.getElementById('btnExportCover');

        // Update button state
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Capturando...';
        btn.disabled = true;

        // Show professional overlay
        App.showExportOverlay();

        try {
            const pageWidth = 210;
            const pageHeight = 297;

            // STEP 1: Capture all views
            const capturedPages = [];

            for (let i = 0; i < App.config.views.length; i++) {
                const viewName = App.config.views[i];
                const progressText = `Capturando vista ${i + 1} de ${App.config.views.length}...`;

                // Update progress
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i + 1}/${App.config.views.length}`;
                App.updateExportOverlay(progressText);

                // Destroy previous charts
                App.destroyAllCharts();

                // Load view
                await App.loadView(viewName);

                // Wait for charts to render (8 seconds)
                await App.delay(8000);

                // Capture
                const canvas = await html2canvas(container, {
                    scale: App.config.pdfScale,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#f1f5f9',
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgHeight = (canvas.height * pageWidth) / canvas.width;

                // Store captured image
                capturedPages.push({ imgData, imgHeight });
            }

            // STEP 2: Create PDF with cover page first
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
            App.updateExportOverlay('Generando documento PDF final...');

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

            // Add cover page FIRST
            this.generateCoverPage(pdf);

            // STEP 3: Add all captured pages
            for (let i = 0; i < capturedPages.length; i++) {
                const { imgData, imgHeight } = capturedPages[i];

                // Add new page for each view
                pdf.addPage();

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
            pdf.save(`Reporte_RID_Portada_${date}.pdf`);

        } catch (error) {
            console.error('Error exporting PDF with cover:', error);
            alert('Error al exportar PDF. Por favor intente nuevamente.');
        } finally {
            // Restore state
            App.hideExportOverlay();
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            App.state.isExporting = false;
            App.loadView(originalView);
        }
    }
};

// Expose for global access
window.PDFModule = PDFModule;
