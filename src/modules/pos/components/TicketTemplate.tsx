"use client";

import { useMemo } from 'react';

interface TicketTemplateProps {
  data: any;
  tenant: any;
}

export function TicketTemplate({ data, tenant }: TicketTemplateProps) {
  if (!data) return null;
  const itbis = data.total ? data.total * 0.18 : 0;
  const subtotal = data.total ? data.total - itbis : 0;

  return (
    <div id="thermal-ticket" className="print:block hidden w-[80mm] p-4 font-mono text-[12px] leading-tight text-black bg-white">
      <div className="text-center space-y-1 mb-4 border-b pb-2 border-black border-dashed">
        <h1 className="font-bold text-lg uppercase">{tenant?.name || 'BERAL ERP'}</h1>
        <p className="text-[10px] uppercase">{tenant?.address || 'Dominican Republic'}</p>
        <p className="text-[10px]">RNC: {tenant?.rnc || '000-00000-0'}</p>
        <p className="text-[10px]">TEL: {tenant?.phone || '809-000-0000'}</p>
      </div>

      <div className="space-y-1 mb-4 text-[10px]">
        <div className="flex justify-between">
          <span className="font-bold">FACTURA:</span>
          <span>{data.ncf || '00000001'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">FECHA:</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">CLIENTE:</span>
          <span className="uppercase">{data.customer_name || 'Consumidor Final'}</span>
        </div>
      </div>

      <table className="w-full text-left mb-4 border-b border-black border-dashed">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="py-1">Cant.</th>
            <th className="py-1">Desc.</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items?.map((item: any, i: number) => {
            const quantity = item.quantity || item.qty || 1;
            const price = item.price || 0;
            const total = item.total ?? (price * quantity);
            return (
              <tr key={i}>
                <td className="py-1 align-top">{quantity}</td>
                <td className="py-1 uppercase group">
                  {item.name}
                </td>
                <td className="py-1 text-right align-top">
                  {total.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="space-y-1 text-right font-bold">
        {/* 
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>RD$ {subtotal.toLocaleString()}</span>
        </div>
        */}
        {/* 
        <div className="flex justify-between">
          <span>ITBIS (18.00%):</span>
          <span>RD$ {itbis.toLocaleString()}</span>
        </div>
        */}
        <div className="flex justify-between text-lg border-t pt-1 border-black">
          <span>TOTAL:</span>
          <span>RD$ {data.total.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mt-6 pt-6 border-t border-black border-dashed">
        <p className="text-[9px] uppercase font-bold">¡GRACIAS POR PREFERIRNOS!</p>
        <p className="text-[8px] mt-1 italic">Software powered by Beral ERP</p>
      </div>
    </div>
  );
}
