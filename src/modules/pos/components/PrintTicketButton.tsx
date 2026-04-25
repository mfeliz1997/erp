"use client";

import { Printer, Loader2 } from "lucide-react";
import { TicketTemplate } from "./TicketTemplate";
import { useState } from "react";

interface PrintTicketButtonProps {
  invoice?: any;
  invoiceData?: any;
  tenant?: any;
}

export function PrintTicketButton({ invoice, invoiceData, tenant }: PrintTicketButtonProps) {
  const data = invoice || invoiceData;
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperWidth, setPaperWidth] = useState<string>('80mm');

  const handlePrint = () => {
    setIsPrinting(true);

    const savedConfig = localStorage.getItem('invenza-printer-config');
    const config = savedConfig ? JSON.parse(savedConfig) : { width: '80mm' };
    const width: string = config.width ?? '80mm';
    setPaperWidth(width);

    // Inyectar @page con el tamaño real — CSS no permite cambiarlo dinámicamente de otra forma
    const style = document.createElement('style');
    style.id = '__ticket-page-size__';
    style.textContent = `@media print { @page { size: ${width} auto; margin: 0; } }`;
    document.head.appendChild(style);

    window.print();

    const cleanup = () => {
      document.getElementById('__ticket-page-size__')?.remove();
      setIsPrinting(false);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
  };

  return (
    <>
      <button
        onClick={handlePrint}
        disabled={isPrinting}
        className="ap-btn-secondary w-full h-10 text-sm disabled:opacity-50"
      >
        {isPrinting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Printer className="w-4 h-4" />}
        Imprimir
      </button>

      {/* Plantilla oculta — solo visible en @media print */}
      <TicketTemplate data={data} tenant={tenant} width={paperWidth} />
    </>
  );
}
