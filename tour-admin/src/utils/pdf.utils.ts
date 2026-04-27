import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generateVagosListPdf(titulo: string, rows: Array<string[]>) {
  const pdf = new jsPDF();
  pdf.setFontSize(14);
  pdf.text(titulo, 14, 18);
  autoTable(pdf, {
    startY: 24,
    head: [["Vago", "Teléfono", "Pagado", "Saldo", "Estado"]],
    body: rows,
  });

  return pdf;
}
