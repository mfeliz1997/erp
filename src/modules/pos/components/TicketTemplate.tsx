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
      <div className="text-center space-y-1 mb-4 border-b pb-2 border-black border-solid">
        <h1 className="font-bold text-lg ">{tenant?.name || 'INVENZA ERP'}</h1>
        <p className="text-xs ">{tenant?.address || 'Dominican Republic'}</p>
        <p className="text-xs">RNC: {tenant?.rnc || '000-00000-0'}</p>
        <p className="text-xs">TEL: {tenant?.phone || '809-000-0000'}</p>
      </div>

      <div className="space-y-1 mb-4 text-xs">
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
          <span className="">{data.customer_name || 'Consumidor Final'}</span>
        </div>
      </div>

      <table className="w-full text-left mb-4 border-b border-black border-solid">
        <thead>
          <tr className="border-b border-black border-solid">
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
                <td className="py-1  group">
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

      <div className="text-center mt-6 pt-6 border-t border-black border-solid">
        <p className="text-xs  font-bold">¡GRACIAS POR PREFERIRNOS!</p>
        <p className="text-xs mt-1 ">Software powered by Invenza ERP</p>
      </div>
    </div>
  );
}
