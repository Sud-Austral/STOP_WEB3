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
        const state = window.STATE_DATA || {};
        const comuna = state.comunaName ? (state.comunaName.charAt(0).toUpperCase() + state.comunaName.slice(1).toLowerCase()) : 'Comuna';
        const region = state.regionName ? (state.regionName.charAt(0).toUpperCase() + state.regionName.slice(1).toLowerCase()) : 'Región';
        const semanaFull = state.semanaDetalle || 'Semana --';
        const warning = state.warningZ || 'Nivel --';

        function capitalizeWords(str) { return str.toLowerCase().replace(/(?:^|\s)\S/g, a => a.toUpperCase()); }
        const comunaDisplay = capitalizeWords(state.comunaName || 'Comuna');
        const regionDisplay = capitalizeWords(state.regionName || 'Región');

        let semanaTitle = "Semana --";
        let semanaDates = "--";
        if (semanaFull.includes(' (')) {
            const parts = semanaFull.split(' (');
            semanaTitle = parts[0];
            semanaDates = parts[1].replace(')', '');
        } else { semanaTitle = semanaFull; }

        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('es-ES', dateOptions);
        const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        // 1. Background White
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // 2. Header Dark Blue/Black
        pdf.setFillColor(10, 15, 30);
        pdf.rect(0, 0, pageWidth, 50, 'F');

        // Header Text Left
        pdf.setTextColor(200, 200, 200);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Un producto elaborado por el Instituto', 15, 18);
        pdf.text('Libertad con base en fuentes públicas', 15, 22);
        pdf.text('de información.', 15, 26);

        // Header Center (Logo Text)
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text('INSTITUTO', 105, 20, { align: 'center' });
        pdf.setFontSize(22);
        pdf.text('LIBERTAD', 105, 28, { align: 'center' });

        // Header Right (Last update)
        pdf.setDrawColor(16, 185, 129);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(145, 12, 50, 8, 4, 4, 'D');
        pdf.setFillColor(16, 185, 129);
        pdf.circle(148, 16, 1.5, 'F');
        pdf.setTextColor(16, 185, 129);
        pdf.setFontSize(7);
        pdf.text('Última actualización de datos', 152, 18);

        pdf.setTextColor(156, 163, 175);
        pdf.text(dateCap, 145, 26);

        // 3. Body
        const startY = 80;

        // Badge
        pdf.setFillColor(254, 243, 199);
        pdf.roundedRect(30, startY - 5, 35, 8, 1, 1, 'F');
        pdf.setTextColor(180, 83, 9);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INFORME SEMANAL', 47.5, startY, { align: 'center' });

        // Location Info
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Comuna de ${comunaDisplay}, Región: ${regionDisplay}`, 70, startY);

        // Main Title
        const titleY = startY + 25;
        pdf.setFontSize(28);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('REPORTE DE INTELIGENCIA', 30, titleY);

        pdf.text('DELICTUAL', 30, titleY + 12);
        const delWidth = pdf.getTextWidth('DELICTUAL ');

        // Comuna in Orange
        pdf.setTextColor(249, 115, 22);
        pdf.text(comunaDisplay, 30 + delWidth, titleY + 12);

        // Subtitle
        pdf.setFontSize(12);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Análisis táctico, estratégico y predictivo para la toma de decisiones.', 30, titleY + 30);

        // 4. Info Blocks
        const infoY = titleY + 60;

        // Block 1
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PERIODO ANALIZADO', 32, infoY);

        pdf.setFontSize(18);
        pdf.setTextColor(30, 41, 59);
        pdf.text(semanaTitle, 32, infoY + 8);

        pdf.setFontSize(9);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'normal');
        pdf.text(semanaDates, 32, infoY + 14);

        // Vertical Line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(95, infoY, 95, infoY + 15);

        // Block 2
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ESTADO DE ALERTA IA', 105, infoY);

        pdf.setFontSize(18);
        pdf.setTextColor(30, 41, 59);
        if (warning.includes('Nivel')) {
            pdf.text(warning, 105, infoY + 8);
        } else {
            pdf.text('Nivel ' + warning, 105, infoY + 8);
        }

        pdf.setFontSize(9);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Foco: Robos con Violencia', 105, infoY + 14);

        // 5. Footer
        const footerY = 250;
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Fecha Emisión del Reporte:', 50, footerY);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(dateCap, 100, footerY);
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

            // Filter to include only STOP views (vista1 to vista20)
            const stopViews = App.config.views.filter(view => {
                const match = view.match(/^vista(\d+)$/);
                if (match) {
                    const num = parseInt(match[1]);
                    return num >= 1 && num <= 20;
                }
                return false;
            });

            for (let i = 0; i < stopViews.length; i++) {
                const viewName = stopViews[i];
                const progressText = `Capturando vista ${i + 1} de ${stopViews.length}...`;

                // Update progress
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i + 1}/${stopViews.length}`;
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
    },

    /**
     * Export Full PDF Report (All Views)
     * Captures ALL configured views without filtering
     */
    async exportFullReport() {
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
        const btn = document.getElementById('btnExportFull');

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

            // USE ALL CONFIGURED VIEWS
            const viewsToExport = App.config.views;

            for (let i = 0; i < viewsToExport.length; i++) {
                const viewName = viewsToExport[i];
                const progressText = `Capturando vista ${i + 1} de ${viewsToExport.length}...`;

                // Update progress
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i + 1}/${viewsToExport.length}`;
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
            App.updateExportOverlay('Generando documento PDF completo...');

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
            pdf.save(`Reporte_RID_Completo_${date}.pdf`);

        } catch (error) {
            console.error('Error exporting Full PDF:', error);
            alert('Error al exportar PDF Completo. Por favor intente nuevamente.');
        } finally {
            // Restore state
            App.hideExportOverlay();
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            App.state.isExporting = false;
            App.loadView(originalView);
        }
    },

    /**
     * Export Single Page PDF - Current view only, no cover
     */
    async exportSinglePage() {
        if (App.state.isExporting) return;

        App.state.isExporting = true;
        const btn = document.getElementById('btnExportSingle');
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        try {
            // Wait for charts to render
            await new Promise(r => setTimeout(r, 500));

            const container = document.getElementById('viewContainer');
            if (!container || container.scrollHeight < 10) {
                alert('No hay contenido para exportar.');
                return;
            }

            // Capture current view
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#f1f5f9',
                windowWidth: container.scrollWidth,
                windowHeight: container.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: imgHeight > 270 ? 'portrait' : 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add image
            const pageHeight = 287;
            let yPos = 5;

            if (imgHeight <= pageHeight) {
                pdf.addImage(imgData, 'PNG', 10, yPos, imgWidth, imgHeight);
            } else {
                // Multi-page if content is too tall
                let heightLeft = imgHeight;
                let position = yPos;

                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
            }

            // Save
            const currentView = App.state.currentView || 'vista';
            const comunaName = window.STATE_DATA?.comunaName || 'Santiago';
            pdf.save(`${currentView}_${comunaName}.pdf`);

        } catch (error) {
            console.error('Error exporting single page:', error);
            alert('Error al exportar. Por favor intente nuevamente.');
        } finally {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            App.state.isExporting = false;
        }
    }
};

// Expose for global access
window.PDFModule = PDFModule;
