"use client";

// ─── Métodos alternativos comentados ────────────────────────────────────────
// Bluetooth (Web Bluetooth API) y USB (Web Serial API) solo funcionan en
// Chrome/Edge con flags específicos — no sirven para Brave, Safari, Firefox.
// QZ Tray funciona en cualquier browser pero requiere que el usuario instale
// un programa extra, lo cual no es viable para cajeros.
//
// Solución adoptada: window.print() + @media print bien configurado.
// El navegador abre el diálogo del OS, el usuario elige su impresora térmica
// una vez, y el OS se encarga. Funciona en cualquier browser sin instalar nada.
// ────────────────────────────────────────────────────────────────────────────

export type PrinterMethod = 'network';

export function useThermalPrinter() {
  // Hook mantenido para compatibilidad con PrintTicketButton.
  // La lógica real de impresión (inyección de @page, window.print)
  // vive en PrintTicketButton directamente.
  return {};
}
