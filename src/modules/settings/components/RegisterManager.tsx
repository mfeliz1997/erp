"use client";

import { useActionState, useState } from "react";
import { createRegister, toggleRegisterStatus, ActionState } from "../actions/register-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Power, Monitor, HelpCircle, Loader2, Airplay } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function RegisterManager({ registers }: { registers: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const initialState: ActionState = { success: false, error: "" };
  
  const [state, action, isPending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createRegister(prev, formData);
    if (result.success) {
      setIsOpen(false);
      toast.success("Caja registradora añadida");
    }
    return result;
  }, initialState);

  const handleToggle = async (id: string, status: boolean) => {
    const result = await toggleRegisterStatus(id, status);
    if (result.success) {
      toast.success(status ? "Caja desactivada" : "Caja activada");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-black pb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">Puntos de Venta (POS)</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Terminales autorizadas para facturación física</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto bg-black text-white rounded-none hover:bg-zinc-800 font-black uppercase tracking-widest text-[10px] px-8 h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
              <Plus className="w-4 h-4 mr-2" />
              Vincular Nueva Caja
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-none border-4 border-black sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-tighter font-black text-4xl italic">NUEVA CAJA</DialogTitle>
              <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-gray-400">
                Identifica esta terminal para los reportes de cierre.
              </DialogDescription>
            </DialogHeader>
            <form action={action} className="space-y-8 py-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="uppercase text-[10px] font-black tracking-widest text-gray-400">Nombre de la Terminal</Label>
                <input 
                  id="name" 
                  name="name" 
                  placeholder="EJ. PRINCIPAL-01" 
                  autoFocus
                  className="w-full rounded-none border-2 border-black h-14 px-4 font-black text-xl uppercase tracking-widest focus:outline-none placeholder:text-gray-100"
                />
                {state?.error && <p className="text-[10px] text-red-600 font-black uppercase tracking-widest">{state.error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending} className="w-full h-14 bg-black text-white font-black uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-colors">
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "REGISTRAR TERMINAL"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {registers.length === 0 ? (
          <div className="col-span-full py-24 text-center border-4 border-dashed border-gray-100 flex flex-col items-center justify-center space-y-6">
              <Airplay className="w-16 h-16 text-gray-100 stroke-1" />
              <p className="text-[10px] uppercase font-black text-gray-300 tracking-[0.3em]">Esperando vinculación de hardware POS</p>
          </div>
        ) : (
          registers.map((reg) => (
            <div key={reg.id} className="group flex flex-col bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <div className="flex items-center justify-between mb-8">
                 <div className={`p-4 border-2 transition-colors ${reg.is_active ? 'bg-black text-white border-black' : 'bg-white border-gray-100 text-gray-200'}`}>
                    <Monitor className="w-6 h-6" />
                 </div>
                 <div className="text-right">
                    <p className={`text-[8px] font-black uppercase tracking-widest ${reg.is_active ? 'text-green-600' : 'text-gray-300'}`}>
                      {reg.is_active ? "ESTADO: ACTIVO" : "ESTADO: OFF"}
                    </p>
                    <p className="text-[10px] font-black text-gray-400 mt-1 uppercase">ID: {reg.id.slice(0,8)}</p>
                 </div>
              </div>
              
              <div className="space-y-4 flex-1">
                 <h3 className="font-black text-2xl uppercase tracking-tighter italic text-black leading-none truncate">{reg.name}</h3>
                 <div className="flex items-center gap-2 text-gray-400">
                    <HelpCircle className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Autorizada para Facturación</span>
                 </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleToggle(reg.id, reg.is_active)}
                  className={`w-full rounded-none h-12 px-6 font-black text-[10px] uppercase tracking-[0.2em] border-2 transition-all ${reg.is_active ? 'text-red-600 border-red-600 hover:bg-red-50' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
                >
                  {reg.is_active ? (
                    <>
                      <Power className="w-3 h-3 mr-2" />
                      Desvincular Caja
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-2" />
                      Reactivar Caja
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
