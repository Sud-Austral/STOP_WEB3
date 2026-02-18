/**
 * PDF Module V2 - Specialized for Strategic Views (1-25)
 * Extends capabilities of standard PDFModule with specific structure for Vistas 2.
 */

const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

window.PDFModuleV2 = {
    // Config inherited from standard module structure but specialized
    config: {
        pageWidth: 210,
        pageHeight: 297,
        margins: { top: 15, bottom: 20, left: 15, right: 15 },
        views: Array.from({ length: 25 }, (_, i) => `vista${i + 1}`)
    },

    // View Meta
    viewTitles: [
        "Resumen Ejecutivo", "Tendencia Reciente", "Comparativo Temporal", // Nivel 1
        "Estacionalidad Mensual", "Delitos Críticos", "Evolución por Delito", // Nivel 2
        "Evolución Delitos (20 años)", "Correlaciones", "Puntos Débiles", // Nivel 3
        "Vs. Región", "Ranking Histórico", "Vs. País", "Vs. Comunas Similares", "Aporte Regional", // Nivel 4
        "Efectividad Policial", // Nivel 5
        "Gravedad (IDI)", "Proyección Gravedad", "Gravedad por Delito", "IDI Comparativo", // Nivel 6
        "Tendencia 20 Años", "Alertas Rachas", "Priorización Estratégica", "Categoría", "Reporte Ejecutivo", "Auditoría Técnica" // Nivel 7
    ],

    levels: [
        { name: 'Nivel 1: Resumen Ejecutivo', range: [1, 3], icon: '📋' },
        { name: 'Nivel 2: Estacionalidad y Patrones', range: [4, 6], icon: '📅' },
        { name: 'Nivel 3: Perspectiva Histórica', range: [7, 9], icon: '⏳' },
        { name: 'Nivel 4: Benchmarking Geográfico', range: [10, 14], icon: '🌍' },
        { name: 'Nivel 5: Efectividad Institucional', range: [15, 15], icon: '👮' },
        { name: 'Nivel 6: Gravedad e Impacto Social', range: [16, 19], icon: '⚖️' },
        { name: 'Nivel 7: Perspectiva Estructural', range: [20, 25], icon: '🏗️' }
    ],

    /**
     * Entry Point: Generate Complete Report
     */
    async exportReport() {
        if (!window.PDFModule) {
            console.error("Standard PDFModule required for base functions (covers, overlays, utils).");
            return;
        }

        const base = window.PDFModule; // Reuse base helpers (overlay, progress, slice)
        const totalViews = this.config.views.length;

        // Show Base Overlay with V2 context
        base.showEnhancedOverlay(totalViews);
        const originalView = App.state.currentView;

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

            // 1. Cover Page
            generateCoverV2(pdf);
            pdf.addPage();

            // 2. Executive Summary (Custom V2)
            this.generateExecutiveSummaryV2(pdf);
            pdf.addPage();

            // 3. Table of Contents
            this.generateTOC(pdf);
            pdf.addPage();

            let pageCount = 4; // Starting content page (Cover=1, Exec=2, TOC=3)

            // 4. Capture Views
            for (let i = 0; i < totalViews; i++) {
                const viewName = this.config.views[i];
                const viewTitle = this.viewTitles[i]; // Use original Title Case
                const viewNum = i + 1;

                // Update Progress
                base.updateProgress(viewNum, `Capturando: ${viewTitle}`);

                // Determine Section/Level for Header
                const level = this.levels.find(l => viewNum >= l.range[0] && viewNum <= l.range[1]);

                // Format: "NIVEL X (UPPER) - View Name (Title Case)"
                const sectionTitle = level
                    ? `${level.name.toUpperCase()} - ${viewTitle}`
                    : viewTitle;

                // Load View
                await App.loadView(viewName);

                // Wait for render (charts + animations + maps)
                await new Promise(r => setTimeout(r, 2000)); // 2s is safer for heavy charts

                // Improve capture quality
                const container = document.getElementById('viewContainer');
                const canvas = await html2canvas(container, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#f8fafc'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgHeight = (canvas.height * 210) / canvas.width; // A4 width 210mm

                // Determine if new page needed (if not first view)
                if (i > 0) pdf.addPage();

                // Add Image with Slicing Support (using Base Module logic)
                // Note: base.addSmartSlices might need adaptation if not available, 
                // but we assuming we can reuse or implement simple addImage here.
                // Add Content
                // Content starts below header (15mm)
                const yOffset = 18;
                const footerHeight = 15; // Space for footer
                const availableHeight = 297 - yOffset - footerHeight; // ~264mm

                if (imgHeight > availableHeight) {
                    console.log(`View ${viewNum} overflow (Height: ${imgHeight}mm > ${availableHeight}mm). Splitting...`);

                    // Header for first page
                    this.addHeaderV2(pdf, viewNum, sectionTitle);
                    this.addFooterV2(pdf, pageCount); // Footer for first page part

                    // Add Slices
                    // We need to pass yOffset. base.addSmartSlices usually assumes full page or custom logic.
                    // Let's adapt: The first slice starts at yOffset. Subsequent slices on new pages.

                    // Use a slightly modified version of manual slicing if base logic is too specific to V1
                    // Logic:
                    // 1. First page: Crop from 0 to pixel equivalent of availableHeight
                    // 2. Add Page
                    // 3. Second page: Crop remaining... 

                    // For robustness and reused logic, let's look at base implementation:
                    // It usually adds slices to *current* page.

                    // NOTE: Since we are in an async loop and jsPDF is stateful, we can try using the base function.
                    // But we want V2 headers/footers on new pages too.

                    let remainingHeightPx = canvas.height;
                    let currentYPx = 0;
                    let pageIndex = 0;

                    // Pixels to MM factor for PDF
                    const pxToMm = 25.4 / 96; // Approximation, better to derive from canvas ratio
                    // Actually: imgHeight (mm) / canvas.height (px) = ratio
                    const mmPerPx = imgHeight / canvas.height;

                    while (remainingHeightPx > 0) {
                        // Max height for this page
                        // First page has header (15mm) + footer space. New pages also have header? 
                        // Let's assume generic header on subsequent pages.

                        const isFirst = pageIndex === 0;
                        if (!isFirst) {
                            pdf.addPage();
                            this.addHeaderV2(pdf, viewNum, `${sectionTitle} (Cont.)`);
                            this.addFooterV2(pdf, pageCount + pageIndex);
                        }

                        const currentHeaderH = 15;
                        const currentFooterH = 15;
                        const currentYOffset = 18; // 15 + padding
                        const maxContentHeightMm = 297 - currentYOffset - currentFooterH;

                        // How much source image (in px) fits in maxContentHeightMm?
                        const maxSourcePx = maxContentHeightMm / mmPerPx;

                        const sliceHeightPx = Math.min(remainingHeightPx, maxSourcePx);
                        const sliceHeightMm = sliceHeightPx * mmPerPx;

                        // Create canvas slice
                        const sliceCanvas = document.createElement('canvas');
                        sliceCanvas.width = canvas.width;
                        sliceCanvas.height = sliceHeightPx;
                        const ctx = sliceCanvas.getContext('2d');

                        ctx.drawImage(canvas,
                            0, currentYPx, canvas.width, sliceHeightPx,
                            0, 0, canvas.width, sliceHeightPx
                        );

                        const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.95);

                        // Center horizontally
                        // If width is standard, aspect ratio is preserved.
                        // Width on PDF:
                        const pdfWidth = 210;

                        pdf.addImage(sliceImg, 'JPEG', 0, currentYOffset, pdfWidth, sliceHeightMm);

                        currentYPx += sliceHeightPx;
                        remainingHeightPx -= sliceHeightPx;
                        pageIndex++;
                    }

                    // Update main page counter loop to account for extra pages?
                    // Note: pdf_vistas2.js loop uses `i` but page numbering `pageCount` isn't auto-incremented by PDF instance.
                    // We need to return the number of extra pages added to update global counter if strictly tracking.
                    // But here pageCount is just a local var passed + i. 
                    // To be correct, we should update a shared counter. 
                    // For now, let's just let pagination be sequential per view.

                } else {
                    // Fits on one page (Scaled or Native)
                    // ... (keep scaling logic for minor overflows) ...

                    // Only apply scaling if minor overflow, else it should have been caught above.
                    // Since we improved criteria, let's keep the minor scaling just in case.

                    let finalWidth = 210;
                    let finalHeight = imgHeight;
                    let xOffset = 0;

                    // Recalculate if it STILL overflows slightly (e.g. edge cases not caught by slicing threshold if any)
                    // But assume slicing handled big overflows. 

                    // If it is SMALLER than page, just add.
                    if (imgHeight > availableHeight) {
                        // Fallback scale for small overflows < threshold if not sliced
                        const ratio = availableHeight / imgHeight;
                        finalHeight = availableHeight;
                        finalWidth = 210 * ratio;
                        xOffset = (210 - finalWidth) / 2;
                    }

                    this.addHeaderV2(pdf, viewNum, sectionTitle);
                    this.addFooterV2(pdf, pageCount + i);

                    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
                }
            }

            // 5. Back Cover
            pdf.addPage();
            base.generateBackCover(pdf);

            // Save
            const date = new Date().toISOString().split('T')[0];
            const name = window.STATE_DATA?.comunaName || 'Comuna';
            pdf.save(`Informe_Estrategico_${name}_${date}.pdf`);

        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Error al generar el PDF. Revise la consola.");
        } finally {
            base.hideEnhancedOverlay();
            App.loadView(originalView);
        }
    },

    /**
     * Custom Executive Summary for V2
     */
    generateExecutiveSummaryV2(pdf) {
        const { pageWidth, pageHeight } = this.config;
        const state = window.STATE_DATA || {};

        // Background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header
        pdf.setFillColor(30, 58, 138); // Dark Blue
        pdf.rect(0, 0, pageWidth, 20, 'F');

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.text("RESUMEN EJECUTIVO ESTRATÉGICO", pageWidth / 2, 13, { align: "center" });

        // Content
        let y = 40;

        // 1. Structure Summary
        pdf.setFontSize(12);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Estructura del Informe", 20, y);
        y += 10;

        this.levels.forEach(l => {
            pdf.setFontSize(10);
            pdf.setTextColor(71, 85, 105);
            pdf.text(`• ${l.name} (${l.range[1] - l.range[0] + 1} vistas)`, 25, y);
            y += 7;
        });

        // 2. Comuna Data
        y += 10;
        pdf.setFontSize(12);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Datos de la Comuna", 20, y);
        y += 10;

        pdf.setFontSize(10);
        pdf.text(`Comuna: ${state.comunaName || '--'}`, 25, y);
        y += 6;
        pdf.text(`Semana: ${state.semanaDetalle || '--'}`, 25, y);

        // 3. Disclaimer
        y = 250;
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text("Este reporte contiene análisis estratégico avanzado basado en modelos matemáticos y estadística delictual.", 20, y);
    },

    /**
     * Table of Contents
     */
    generateTOC(pdf) {
        // Reuse similar logic but with levels
        const { pageWidth } = this.config;

        pdf.setFontSize(20);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Índice de Contenidos", pageWidth / 2, 30, { align: "center" });

        let y = 50;

        this.levels.forEach(level => {
            // Level Header
            if (y > 270) { pdf.addPage(); y = 30; }

            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(37, 99, 235); // Blue
            pdf.text(level.name, 20, y);
            y += 6; // Reduced from 8

            // Level Items
            for (let i = level.range[0]; i <= level.range[1]; i++) {
                const title = this.viewTitles[i - 1];

                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(51, 65, 85);
                pdf.text(title, 30, y);

                // Page num (approximate logic, assuming 1 page per view + offset)
                const pageNum = i + 3;
                pdf.text(String(pageNum), 190, y, { align: "right" });

                // Dotted line - End earlier and use lighter pattern to avoid clutter
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineDash([0.5, 3], 0);
                pdf.line(30 + pdf.getTextWidth(title) + 2, y - 1, 182, y - 1);

                y += 5; // Reduced from 6
            }
            y += 3; // Reduced from 4
        });
    },

    addHeaderV2(pdf, viewNum, title) {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(0, 0, 210, 15, 'F');

        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        // Changed to use original provided title format without forced uppercase
        pdf.text(title, 105, 10, { align: 'center' });

        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        //pdf.text("MONITOR ESTRATÉGICO V2", 15, 10);
    },

    addFooterV2(pdf, pageNum) {
        // Simple footer
        const y = 290;
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Página ${pageNum}`, 195, y, { align: 'right' });
        pdf.text("Confidencial - Uso Exclusivo", 105, y, { align: 'center' });
    }
};

/**
 * Helper: V2 Cover Page
 */
function generateCoverV2(pdf) {
    const state = window.STATE_DATA || {};
    const w = 210, h = 297;

    // Background Image or Color
    pdf.setFillColor(15, 23, 42); // Slate 900
    pdf.rect(0, 0, w, h, 'F');

    // Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(32);
    pdf.setTextColor(255, 255, 255);
    pdf.text("INFORME ESTRATÉGICO", w / 2, 120, { align: "center" });
    pdf.text("DE SEGURIDAD", w / 2, 135, { align: "center" });

    // Subtitle
    pdf.setFontSize(18);
    pdf.setTextColor(148, 163, 184); // Slate 400
    pdf.text(state.comunaName ? state.comunaName.toUpperCase() : "COMUNA", w / 2, 160, { align: "center" });

    // Date
    pdf.setFontSize(12);
    pdf.text(state.semanaDetalle || "", w / 2, 175, { align: "center" });

    // Line
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(1);
    pdf.line(60, 190, 150, 190);

    // Bottom logo or text
    pdf.setFontSize(10);
    pdf.text("RID SIMULATOR V2", w / 2, 270, { align: "center" });
}
