"use client";

import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { TicketTemplate } from "./TicketTemplate";
import { useState } from "react";

interface PrintTicketButtonProps {
  invoice?: any;
  invoiceData?: any;
  tenant?: any;
}

export function PrintTicketButton({ invoice, invoiceData, tenant }: PrintTicketButtonProps) {
  const data = invoice || invoiceData;
  const { print, isPrinting } = useThermalPrinter();
  
  const handlePrint = async () => {
    // Obtenemos la config de localStorage (donde Settings la guardó)
    const savedConfig = localStorage.getItem('invenza-printer-config');
    const config = savedConfig ? JSON.parse(savedConfig) : { method: 'network', width: '80mm' };

    await print(config, data);
  };

  return (
    <>
      {/* Botón Principal */}
      <Button 
        onClick={handlePrint}
        disabled={isPrinting}
        className="w-full h-14 bg-primary text-primary-foreground font-semibold   rounded-xl hover:bg-zinc-800"
      >
        {isPrinting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Printer className="w-5 h-5 mr-3" />}
        Imprimir Ticket
      </Button>

      {/* Template oculto para window.print() */}
      <TicketTemplate data={data} tenant={tenant} />
    </>
  );
}