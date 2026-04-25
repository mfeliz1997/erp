"use client";

// Bluetooth via Web Bluetooth API — comentado.
// Solo funciona en Chrome/Edge con flags. No sirve para Brave, Safari, Firefox.
// Ver src/hooks/useThermalPrinter.ts para el razonamiento completo.

/*
import { useState } from "react";

export function useThermalPrinter() {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const connect = async () => {
    try {
      const btDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      });
      setDevice(btDevice);
      return btDevice;
    } catch (error) {
      console.error("Error al conectar impresora:", error);
      return null;
    }
  };

  const print = async (data: Uint8Array) => {
    if (!device) return;
    setIsPrinting(true);
    try {
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
      const characteristic = await service?.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");
      if (!characteristic) throw new Error("No se encontró la característica de impresión");
      const CHUNK_SIZE = 512;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        await characteristic.writeValue(data.slice(i, i + CHUNK_SIZE));
      }
    } catch (error) {
      console.error("Error al imprimir:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  return { connect, print, isPrinting, isConnected: !!device };
}
*/

export function useThermalPrinter() {
  return { connect: async () => null, print: async () => {}, isPrinting: false, isConnected: false };
}
