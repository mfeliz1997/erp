"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateRepairStatus } from "../actions/repair-actions";
import { toast } from "sonner";
import { Monitor, Clock, CheckCircle, PackageCheck, User, Wrench } from "lucide-react";

interface RepairKanbanProps {
  orders: any[];
}

const COLUMNS = [
  { id: "RECEIVED", label: "Recibido", color: "bg-blue-50 border-blue-200 text-blue-700", icon: Clock },
  { id: "IN_DIAGNOSIS", label: "Diagnóstico", color: "bg-amber-50 border-amber-200 text-amber-700", icon: Wrench },
  { id: "REPAIRED", label: "Reparado", color: "bg-green-50 border-green-200 text-green-700", icon: CheckCircle },
  { id: "DELIVERED", label: "Entregado", color: "bg-zinc-100 border-zinc-200 text-zinc-500", icon: PackageCheck },
];

export function RepairKanban({ orders }: RepairKanbanProps) {
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const result = await updateRepairStatus(orderId, newStatus);
    if (result.success) {
      toast.success("Estado actualizado");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px]">
      {COLUMNS.map((col) => {
        const columnOrders = orders.filter((o) => o.status === col.id);
        const Icon = col.icon;

        return (
          <div key={col.id} className="flex flex-col gap-4">
            <div className={`p-4 border-b-4 flex items-center justify-between ${col.color}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-black uppercase tracking-tighter text-sm">{col.label}</span>
              </div>
              <Badge variant="outline" className="rounded-none border-current font-bold">{columnOrders.length}</Badge>
            </div>

            <div className="flex-1 space-y-4">
              {columnOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className="rounded-none border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-grab active:cursor-grabbing bg-white"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start mb-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">#{order.id.substring(0, 6)}</p>
                       <Badge variant="outline" className="text-[9px] rounded-none uppercase font-bold px-1 py-0">{order.device_details?.brand}</Badge>
                    </div>
                    <CardTitle className="text-lg font-black uppercase tracking-tighter leading-tight">
                      {order.device_details?.model}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <p className="text-xs text-zinc-600 line-clamp-2 italic">"{order.issue_description}"</p>
                    
                    <div className="space-y-1 pt-2 border-t border-zinc-100">
                       <div className="flex items-center gap-2 text-zinc-500">
                          <User className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{order.customers?.name}</span>
                       </div>
                       {order.assigned_to_profile && (
                          <div className="flex items-center gap-2 text-zinc-400">
                             <Wrench className="w-3 h-3" />
                             <span className="text-[10px] uppercase font-medium">Téc: {order.assigned_to_profile.name}</span>
                          </div>
                       )}
                    </div>

                    <div className="pt-2">
                      <select 
                        defaultValue={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="w-full h-8 text-[10px] font-black uppercase tracking-widest border-2 border-black bg-zinc-50 rounded-none px-2 focus:ring-0 outline-none"
                      >
                         {COLUMNS.map(c => (
                           <option key={c.id} value={c.id}>{c.label}</option>
                         ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
