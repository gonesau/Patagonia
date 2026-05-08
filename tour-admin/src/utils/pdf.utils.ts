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
  let startY = 16;
  if (options.logoUrl) {
    const dataUrl = await loadImageDataUrl(options.logoUrl);
    if (dataUrl) {
      pdf.addImage(dataUrl, "PNG", 14, 10, 28, 28);
      startY = 42;
    }
  }
  pdf.setFontSize(16);
  pdf.text("Listado de vagos inscritos", 14, startY);
  pdf.setFontSize(12);
  pdf.text(`Tour: ${data.tourName}`, 14, startY + 9);
  pdf.text(`Fecha y hora: ${data.scheduledDateTime}`, 14, startY + 16);
  pdf.text(`Guías encargados: ${data.guidesLabel}`, 14, startY + 23);
  pdf.setFontSize(9);
  pdf.text("* Indica saldo pendiente", 14, startY + 30);

  autoTable(pdf, {
    startY: startY + 34,
    head: [["Nombre completo", "Contacto", "Pagado", "Saldo", "Método de pago"]],
    body: data.rows.map((row) => [row.fullName, row.contact, row.advance, row.complement, row.paymentMethods]),
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [14, 56, 50],
    },
  });

  let tableFinalY = (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 34;
  const transportTitleY = tableFinalY + 10;
  pdf.setFontSize(12);
  pdf.text("Detalles del transporte", 14, transportTitleY);
  pdf.setFontSize(10);
  data.transportDetails.forEach((line, index) => {
    pdf.text(`- ${line}`, 14, transportTitleY + 7 + index * 6);
  });
  tableFinalY = transportTitleY + 7 + data.transportDetails.length * 6 + 6;

  pdf.setFontSize(11);
  pdf.text("Resumen de pagos", 14, tableFinalY);
  pdf.setFontSize(10);
  const f = data.footer;
  pdf.text(`Total vagos: ${f.totalVagos}`, 14, tableFinalY + 7);
  pdf.text(`Pagado completo: ${f.pagadoCompleto} | Parcial: ${f.parcial} | Sin pagar: ${f.sinPagar}`, 14, tableFinalY + 14);
  pdf.text(`Monto recaudado: ${f.recaudado.toFixed(2)} USD`, 14, tableFinalY + 21);
  pdf.text(`Monto pendiente: ${f.pendiente.toFixed(2)} USD`, 14, tableFinalY + 28);

  if (options.includePurchaseSummary && options.comprasTour && options.comprasTour.length > 0) {
    const y0 = tableFinalY + 38;
    pdf.setFontSize(11);
    pdf.text("Compras del tour (resumen)", 14, y0);
    autoTable(pdf, {
      startY: y0 + 4,
      head: [["Nombre", "Categoría", "Monto"]],
      body: options.comprasTour.map((c) => [c.nombre, c.categoriaNombreSnapshot, `$${c.monto.toFixed(2)}`]),
    });
  }

  return pdf;
}
