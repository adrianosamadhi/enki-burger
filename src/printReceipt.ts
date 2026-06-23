export const printReceipt = (htmlContent: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  iframe.style.width = "100%";
  // We need enough height for it to render correctly, but it will print according to content
  iframe.style.height = "100%";
  
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Recibo</title>
        <style>
          @page { margin: 0; size: auto; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, Helvetica, sans-serif; 
            color: #000;
            background: #fff;
            width: 100%;
          }
          .receipt-container {
            width: 100%;
            padding: 2mm;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 5px;
            font-size: 14pt;
            font-weight: bold;
          }
          .delivery-type-container {
            text-align: center;
            margin-bottom: 10px;
          }
          .delivery-type {
            font-weight: bold;
            border: 1px solid #000;
            padding: 2px 5px;
            display: inline-block;
            font-size: 14pt;
          }
          .order-id {
            font-size: 24pt;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
          }
          .client-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .text-sm {
            font-size: 10pt;
            margin-bottom: 2px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 12pt;
          }
          .items-table th {
            border-bottom: 1px dashed #000;
            border-top: 1px dashed #000;
            padding: 4px 0;
            font-weight: bold;
          }
          .items-table td {
            padding: 4px 0;
            vertical-align: top;
          }
          .col-qtd {
            text-align: left;
            width: 15%;
          }
          .col-item {
            text-align: left;
            width: 65%;
          }
          .col-price {
            text-align: right;
            width: 20%;
          }
          .totals {
            font-size: 14pt;
            font-weight: bold;
            margin: 15px 0;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          .footer {
            font-size: 10pt;
            text-align: center;
            margin-top: 20px;
          }
          .thanks {
            font-size: 16pt;
            font-weight: bold;
            text-align: center;
            margin-top: 15px;
            margin-bottom: 20px;
          }
          pre {
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
            padding: 0;
            font-family: inherit;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();
  
  // Wait a tiny bit for the iframe to fully parse and render
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Cleanup after printing dialog is closed
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);
  }, 500);
};
