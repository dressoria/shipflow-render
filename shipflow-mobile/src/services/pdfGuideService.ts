import { cacheDirectory, copyAsync } from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Shipment } from "../types";

function escapeHtml(value: string | number | boolean | undefined | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value: number | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function barcode(trackingNumber: string) {
  return Array.from({ length: 112 }, (_, index) => {
    const charCode = trackingNumber.charCodeAt(index % trackingNumber.length) || index;
    const width = charCode % 5 === 0 ? 3 : charCode % 2 === 0 ? 2 : 1;
    return `<span style="width:${width}px"></span>`;
  }).join("");
}

function row(label: string, value: string | number | boolean | undefined | null) {
  return `
    <div class="row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "No registrado")}</dd>
    </div>
  `;
}

function block(title: string, rows: string) {
  return `
    <section class="block">
      <h2>${escapeHtml(title)}</h2>
      <dl>${rows}</dl>
    </section>
  `;
}

export function buildGuideHtml(shipment: Shipment) {
  const trackingNumber = escapeHtml(shipment.trackingNumber);

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        min-height: 0;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #12182b;
        font-family: Arial, Helvetica, sans-serif;
        overflow: hidden;
      }
      .sheet {
        width: 100%;
        max-height: 281mm;
        overflow: hidden;
        background: #ffffff;
        border: 2px solid #111827;
        page-break-inside: avoid;
      }
      .wrap, dd, dt, h1, h2, p, li {
        min-width: 0;
        overflow-wrap: anywhere;
        white-space: normal;
        word-break: break-word;
      }
      header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(180px, auto);
        gap: 10px;
        align-items: start;
        border-bottom: 2px solid #111827;
        padding: 10px 12px;
        page-break-inside: avoid;
      }
      .brand {
        display: flex;
        min-width: 0;
        gap: 8px;
        align-items: center;
      }
      .icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: #ff1493;
        color: #fff;
        font-size: 18px;
        font-weight: 900;
        flex: 0 0 auto;
      }
      .brand-name {
        font-size: 19px;
        font-weight: 900;
        letter-spacing: .01em;
        line-height: 1.05;
      }
      .brand-name span { color: #ff1493; }
      .eyebrow {
        margin-top: 2px;
        color: #64748b;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .14em;
        line-height: 1.1;
        text-transform: uppercase;
      }
      .guide-number {
        min-width: 0;
        text-align: right;
      }
      .guide-number h1 {
        margin: 1px 0 4px;
        font-size: 24px;
        line-height: 1;
      }
      .badge {
        display: inline-block;
        border: 1px solid #ff1493;
        border-radius: 999px;
        background: #ffeaf6;
        color: #12182b;
        padding: 4px 8px;
        font-size: 9px;
        font-weight: 900;
      }
      main {
        display: grid;
        gap: 7px;
        padding: 9px 12px;
        page-break-inside: avoid;
      }
      .block {
        min-width: 0;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        padding: 7px 8px;
        page-break-inside: avoid;
      }
      .block h2 {
        margin: 0 0 5px;
        color: #64748b;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .13em;
        line-height: 1.1;
        text-transform: uppercase;
      }
      dl {
        display: grid;
        gap: 4px;
        margin: 0;
      }
      .row {
        display: grid;
        grid-template-columns: 118px minmax(0, 1fr);
        gap: 8px;
        min-width: 0;
      }
      dt {
        color: #64748b;
        font-size: 9px;
        font-weight: 800;
        line-height: 1.25;
      }
      dd {
        margin: 0;
        color: #12182b;
        font-size: 10px;
        font-weight: 800;
        line-height: 1.25;
        max-height: 34px;
        overflow: hidden;
      }
      .barcode-section {
        margin-top: 2px;
        padding: 9px 0 8px;
        border-top: 2px solid #111827;
        border-bottom: 2px solid #111827;
        text-align: center;
        page-break-inside: avoid;
      }
      .barcode-title {
        margin: 0;
        color: #64748b;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .16em;
        text-align: center;
        text-transform: uppercase;
      }
      .barcode {
        display: flex;
        width: 100%;
        max-width: 760px;
        height: 58px;
        margin: 8px auto 5px;
        padding: 0 8px;
        align-items: flex-end;
        justify-content: center;
        gap: 1px;
        overflow: hidden;
      }
      .barcode span {
        display: block;
        height: 100%;
        background: #111827;
        flex: 0 0 auto;
      }
      .tracking-code {
        margin: 0;
        color: #12182b;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: .14em;
        line-height: 1.1;
        text-align: center;
      }
      footer {
        border-top: 2px solid #111827;
        padding: 7px 12px 8px;
        page-break-inside: avoid;
      }
      footer h2 {
        margin: 0 0 4px;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .13em;
        text-transform: uppercase;
      }
      footer ul {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px 12px;
        margin: 0;
        padding-left: 14px;
        color: #334155;
        font-size: 8.5px;
        font-weight: 700;
        line-height: 1.2;
      }
      footer li {
        max-height: 22px;
        overflow: hidden;
      }
      @media print {
        html, body, .sheet {
          overflow: hidden !important;
        }
        .sheet, header, main, .block, .barcode-section, footer {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
      @media (max-width: 640px) {
        header { grid-template-columns: 1fr; }
        .guide-number { text-align: left; }
        .row { grid-template-columns: 92px minmax(0, 1fr); }
        footer ul { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <header>
        <div class="brand">
          <div class="icon">G</div>
          <div>
            <div class="brand-name wrap">Ship<span>Flow</span></div>
            <div class="eyebrow wrap">Guia de envio</div>
          </div>
        </div>
        <div class="guide-number">
          <div class="eyebrow wrap">Numero de guia</div>
          <h1 class="wrap">${trackingNumber}</h1>
          <span class="badge">${escapeHtml(shipment.status)}</span>
        </div>
      </header>
      <main>
        ${block("Remitente", [
          row("Nombre", shipment.senderName),
          row("Telefono", shipment.senderPhone),
          row("Ciudad", shipment.originCity),
        ].join(""))}
        ${block("Destinatario", [
          row("Nombre", shipment.recipientName),
          row("Telefono", shipment.recipientPhone),
          row("Ciudad", shipment.destinationCity),
        ].join(""))}
        ${block("Direccion", row("Entrega", shipment.destinationAddress))}
        ${block("Paquete / courier", [
          row("Producto", shipment.productType),
          row("Peso", `${shipment.weight} kg`),
          row("Courier", shipment.courier),
          row("Fecha", formatDate(shipment.date)),
        ].join(""))}
        ${block("Valores", [
          row("Contra entrega", shipment.cashOnDelivery ? "Si" : "No"),
          row("Valor a cobrar", money(shipment.cashAmount)),
          row("Total pagado", money(shipment.total ?? shipment.value)),
        ].join(""))}
        <section class="barcode-section">
          <p class="barcode-title">Codigo de barras</p>
          <div class="barcode">${barcode(shipment.trackingNumber)}</div>
          <p class="tracking-code wrap">${trackingNumber}</p>
        </section>
      </main>
      <footer>
        <h2 class="wrap">Instrucciones</h2>
        <ul>
          <li>Paquete sellado y guia visible.</li>
          <li>Validar datos antes del despacho.</li>
          <li>Cobrar contra entrega si aplica.</li>
          <li>Track updates in ShipFlow.</li>
        </ul>
      </footer>
    </article>
  </body>
</html>
  `;
}

function pdfFileName(shipment: Shipment) {
  return `shipflow-${shipment.trackingNumber.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
}

export async function generateGuidePdf(shipment: Shipment) {
  const { uri } = await Print.printToFileAsync({
    html: buildGuideHtml(shipment),
    base64: false,
  });

  return uri;
}

export async function downloadGuidePdf(shipment: Shipment) {
  const sourceUri = await generateGuidePdf(shipment);
  const destinationUri = `${cacheDirectory ?? ""}${pdfFileName(shipment)}`;

  if (!cacheDirectory) {
    return sourceUri;
  }

  await copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
}

export async function shareGuidePdf(shipment: Shipment) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Este dispositivo no permite compartir archivos desde Expo Go.");
  }

  const uri = await downloadGuidePdf(shipment);
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `Compartir guia ${shipment.trackingNumber}`,
    UTI: "com.adobe.pdf",
  });

  return uri;
}

export async function openGuidePdf(shipment: Shipment) {
  await Print.printAsync({ html: buildGuideHtml(shipment) });
}
