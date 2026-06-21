export const printReceipt = (htmlContent: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  iframe.style.width = "80mm";
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
            padding: 2mm; 
            font-family: 'Courier New', Courier, monospace, sans-serif; 
            font-size: 11px;
            font-weight: bold;
            color: #000;
            background: #fff;
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
