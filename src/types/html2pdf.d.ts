declare module 'html2pdf.js' {
  // Minimal typings for html2pdf.js used in InvoiceGenerator
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: { scale?: number } & Record<string, unknown>;
    jsPDF?: { unit?: string; format?: string | string[]; orientation?: string } & Record<string, unknown>;
  }

  interface Html2PdfInstance {
    set: (options: Html2PdfOptions) => Html2PdfInstance;
    from: (element: HTMLElement | string) => Html2PdfInstance;
    save: () => Promise<void> | void;
  }

  type Html2PdfFactory = (options?: Html2PdfOptions) => Html2PdfInstance & {
    set: (options: Html2PdfOptions) => Html2PdfInstance;
    from: (element: HTMLElement | string) => Html2PdfInstance;
    save: () => Promise<void> | void;
  };

  const html2pdf: Html2PdfFactory & (() => Html2PdfInstance);

  export default html2pdf;
}
