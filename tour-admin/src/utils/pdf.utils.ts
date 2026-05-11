import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Compra } from "@/types/compra.types";

export interface TourVagosPdfRow {
  fullName: string;
  contact: string;
  advance: string;
  complement: string;
  paymentMethods: string;
}

export interface TourVagosPdfFooter {
  totalVagos: number;
  pagadoCompleto: number;
  parcial: number;
  sinPagar: number;
  recaudado: number;
  pendiente: number;
}

export interface TourVagosPdfData {
  tourName: string;
  scheduledDateTime: string;
  guidesLabel: string;
  rows: TourVagosPdfRow[];
  transportDetails: string[];
  footer: TourVagosPdfFooter;
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function generateVagosListPdf(titulo: string, rows: Array<string[]>, columnas?: string[]) {
  const pdf = new jsPDF();
  pdf.setFontSize(14);
  pdf.text(titulo, 14, 18);
  const headRow = columnas ?? ["Vago", "Teléfono", "Pagado", "Saldo", "Estado"];
  autoTable(pdf, {
    startY: 24,
    head: [headRow],
    body: rows,
  });

  return pdf;
}

export interface GenerateTourVagosPdfOptions {
  logoUrl?: string;
  includePurchaseSummary?: boolean;
  comprasTour?: Compra[];
}

export async function generateTourVagosPdf(
  data: TourVagosPdfData,
  options: GenerateTourVagosPdfOptions = {},
): Promise<jsPDF> {
  const pdf = new jsPDF();
  
  // Paleta de colores Premium 2026
  const brandGreen: [number, number, number] = [14, 56, 50];
  const textDark: [number, number, number] = [30, 41, 59]; // Slate 800
  const textMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const borderSoft: [number, number, number] = [226, 232, 240]; // Slate 200
  const cardBg: [number, number, number] = [248, 250, 252]; // Slate 50
  
  const textSuccess: [number, number, number] = [21, 128, 61]; // Green 700
  const textAlert: [number, number, number] = [185, 28, 28]; // Red 700
  const bgAlertSoft: [number, number, number] = [254, 242, 242]; // Rose 50

  const marginX = 14;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let startY = 16;

  // 1. Header & Metadata (Grid Layout)
  if (options.logoUrl) {
    const dataUrl = await loadImageDataUrl(options.logoUrl);
    if (dataUrl) {
      pdf.addImage(dataUrl, "PNG", marginX, startY, 28, 28);
    }
  }

  const metaX = options.logoUrl ? 50 : marginX;
  
  // Título Principal
  pdf.setFontSize(18);
  pdf.setTextColor(...textDark);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.tourName, metaX, startY + 6);
  
  // Retícula de Metadatos
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...textMuted);
  pdf.text("Fecha y hora", metaX, startY + 16);
  pdf.text("Guías encargados", metaX + 65, startY + 16);
  
  pdf.setFontSize(10);
  pdf.setTextColor(...textDark);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.scheduledDateTime, metaX, startY + 21);
  pdf.text(data.guidesLabel, metaX + 65, startY + 21);
  
  startY = Math.max(startY + 32, options.logoUrl ? 52 : 38);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(...textMuted);
  pdf.text("* El participante tiene un saldo pendiente", marginX, startY);
  
  // 2. Tabla Principal de Participantes
  autoTable(pdf, {
    startY: startY + 4,
    head: [["Participante", "Contacto", "Pagado", "Saldo", "Métodos de pago"]],
    body: data.rows.map((row) => [
      row.fullName,
      row.contact,
      row.advance,
      row.complement,
      row.paymentMethods,
    ]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 5,
      textColor: textDark,
    },
    headStyles: {
      fillColor: brandGreen,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: {
      lineWidth: { bottom: 0.5 },
      lineColor: borderSoft,
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const rawRow = hookData.row.raw as string[];
        const participantName = rawRow[0];
        if (typeof participantName === "string" && participantName.trim().startsWith("*")) {
          hookData.cell.styles.fillColor = bgAlertSoft;
          if (hookData.column.index === 3) {
            hookData.cell.styles.textColor = textAlert;
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      }
    },
  });

  let currentY = (pdf as any).lastAutoTable?.finalY ?? startY + 10;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      pdf.addPage();
      currentY = 20;
    }
  };

  // 3. Tarjetas Visuales (Dashboard Cards)
  const summaryWidth = 95;
  const transX = marginX + summaryWidth + 8;
  const transWidth = pageWidth - transX - marginX;
  
  const transLinesCount = data.transportDetails.length;
  const baseTransHeight = 16 + (transLinesCount * 7);
  const baseSummaryHeight = 46;
  const cardHeight = Math.max(baseSummaryHeight, baseTransHeight);
  
  checkPageBreak(cardHeight + 10);
  currentY += 10;
  
  const f = data.footer;
  
  // Tarjeta: Resumen de Pagos
  pdf.setFillColor(...cardBg);
  pdf.setDrawColor(...borderSoft);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(marginX, currentY, summaryWidth, cardHeight, 3, 3, "FD");
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...textDark);
  pdf.text("Resumen de Pagos", marginX + 6, currentY + 8);
  
  let sy = currentY + 16;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...textMuted);
  pdf.text("Total participantes:", marginX + 6, sy);
  
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...textDark);
  pdf.text(`${f.totalVagos} (Completo: ${f.pagadoCompleto} | Parcial: ${f.parcial})`, marginX + 6, sy + 5);
  
  sy += 14;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...textMuted);
  pdf.text("Monto recaudado", marginX + 6, sy);
  pdf.text("Monto pendiente", marginX + 50, sy);
  
  sy += 6;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...textSuccess);
  pdf.text(`$${f.recaudado.toFixed(2)} USD`, marginX + 6, sy);
  
  pdf.setTextColor(...textAlert);
  pdf.text(`$${f.pendiente.toFixed(2)} USD`, marginX + 50, sy);

  // Tarjeta: Detalles del Transporte
  pdf.setFillColor(...cardBg);
  pdf.setDrawColor(...borderSoft);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(transX, currentY, transWidth, cardHeight, 3, 3, "FD");

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...textDark);
  pdf.text("Detalles del Transporte", transX + 6, currentY + 8);

  let ty = currentY + 16;
  data.transportDetails.forEach((line, index) => {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...textDark);
    pdf.text(line, transX + 6, ty);
    
    if (index < transLinesCount - 1) {
      ty += 3;
      pdf.setDrawColor(...borderSoft);
      pdf.setLineWidth(0.2);
      pdf.line(transX + 6, ty, transX + transWidth - 6, ty);
      ty += 4;
    } else {
      ty += 7;
    }
  });

  currentY += cardHeight;

  // Resumen de compras adicionales
  if (options.includePurchaseSummary && options.comprasTour && options.comprasTour.length > 0) {
    checkPageBreak(30);
    currentY += 12;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...textDark);
    pdf.text("Compras del tour (resumen)", marginX, currentY);
    
    autoTable(pdf, {
      startY: currentY + 4,
      head: [["Nombre", "Categoría", "Monto"]],
      body: options.comprasTour.map((c) => [c.nombre, c.categoriaNombreSnapshot, `$${c.monto.toFixed(2)}`]),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 4,
        textColor: textDark,
      },
      headStyles: {
        fillColor: cardBg,
        textColor: textDark,
        fontStyle: "bold",
        lineWidth: { top: 0.5, bottom: 0.5 },
        lineColor: borderSoft,
      },
      bodyStyles: {
        lineWidth: { bottom: 0.5 },
        lineColor: borderSoft,
      },
    });
  }

  // 4. Global Footer: Paginación
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...textMuted);
    pdf.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 10,
      { align: "right" }
    );
  }

  return pdf;
}
