"use client";

import { useState } from 'react';
import EscPosEncoder from 'esc-pos-encoder';
import { toast } from 'sonner';

export type PrinterMethod = 'bluetooth' | 'usb' | 'network' | 'none';

interface PrinterConfig {
  method: PrinterMethod;
  ip?: string;
  width: '80mm' | '58mm';
}

export function useThermalPrinter() {
  const [isPrinting, setIsPrinting] = useState(false);

  const connectBluetooth = async () => {
    if (typeof window !== "undefined" && !navigator.bluetooth) {
      toast.error("Tu navegador no soporta Web Bluetooth o está desactivado.");
      return null;
    }
    
    try {
      // @ts-ignore - Web Bluetooth API
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Generic Serial
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      return characteristic;
    } catch (error: any) {
       if (error.name === 'NotFoundError') {
         console.log("Selección Bluetooth cancelada por el usuario o no se encontraron dispositivos.");
         return null;
       }
       if (error.message && error.message.includes("globally disabled")) {
         toast.error("El Bluetooth está desactivado en la configuración o flag del navegador.");
         return null;
       }
       console.error("Bluetooth selection error", error);
       toast.error("Fallo al conectar por Bluetooth");
       return null;
    }
  };

  const connectUSB = async () => {
    if (typeof window !== "undefined" && !navigator.serial) {
      toast.error("Tu navegador no soporta Web Serial (USB) o está desactivado.");
      return null;
    }

    try {
      // @ts-ignore - Web Serial API
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      return port;
    } catch (error: any) {
      // Si el usuario simplemente cancela la selección, no mostramos un error intrusivo
      if (error.name === 'NotFoundError') {
         console.log("Selección USB cancelada por el usuario.");
         return null;
      }
      console.error("USB Serial error", error);
      toast.error("Fallo al conectar por USB");
      return null;
    }
  };

  const print = async (config: PrinterConfig, data: any) => {
    setIsPrinting(true);
    try {
      if (config.method === 'network') {
        // Para red usamos Spooler del sistema vía window.print()
        // El componente PrintTicketButton manejará el renderizado oculto
        window.print();
        return;
      }

      const encoder = new EscPosEncoder();
      const result = encoder
        .initialize()
        .codepage('cp850')
        .align('center')
        .size('double')
        .text('BERAL ERP')
        .newline()
        .size('normal')
        .text('--- TICKET DE VENTA ---')
        .newline()
        .align('left')
        .text(`Factura: ${data.invoice_id}`)
        .newline()
        .text(`Cliente: ${data.customer_name}`)
        .newline()
        .text('------------------------------')
        .newline();

      // Detalles...
      data.items.forEach((item: any) => {
        result.text(`${item.name.substring(0, 18).padEnd(20)} ${item.total}`)
        .newline();
      });

      const bytes = result
        .newline()
        .align('center')
        .text('¡GRACIAS POR SU COMPRA!')
        .newline()
        .cut()
        .encode();

      if (config.method === 'bluetooth') {
        const char = await connectBluetooth();
        if (char) await char.writeValue(bytes);
      } else if (config.method === 'usb') {
        const port = await connectUSB();
        if (port) {
          const writer = port.writable.getWriter();
          await writer.write(bytes);
          writer.releaseLock();
        }
      }

    } catch (error) {
      console.error("Print Error:", error);
      toast.error("Error al imprimir el ticket");
    } finally {
      setIsPrinting(false);
    }
  };

  return { print, isPrinting, connectBluetooth, connectUSB };
}
