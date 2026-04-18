"use client";

import { useActionState, useState } from "react";
import { createRegister, toggleRegisterStatus, ActionState } from "../actions/register-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Power, Monitor, HelpCircle, Loader2 } from "lucide-react";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Puntos de Venta</h2>
          <p className="text-sm text-muted-foreground font-medium">Gestiona las terminales físicas autorizadas para facturación.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white rounded-none hover:bg-zinc-800 font-bold uppercase tracking-widest text-[10px] px-6 h-10 shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 active:translate-y-0">
              <Plus className="w-4 h-4 mr-2" />
              Añadir Caja
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-none border-2 border-black sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-tighter font-black text-3xl">Nueva Terminal</DialogTitle>
              <DialogDescription className="font-medium text-xs">
                Introduce un nombre descriptivo para identificar esta caja en los reportes de cierre.
              </DialogDescription>
            </DialogHeader>
            <form action={action} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="uppercase text-[10px] font-bold tracking-widest text-zinc-400">Identificador / Nombre</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ej. CAJA-01" 
                  autoFocus
                  className="rounded-none border-2 border-black h-12 font-black text-lg focus-visible:ring-black placeholder:text-zinc-200"
                />
                {state?.error && <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">{state.error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending} className="w-full h-12 bg-black text-white font-black uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-colors">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar y Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {registers.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-zinc-100 bg-zinc-50/30 flex flex-col items-center justify-center space-y-4">
              <Monitor className="w-12 h-12 text-zinc-200 stroke-1" />
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">No hay terminales configuradas aún</p>
          </div>
        ) : (
          registers.map((reg) => (
            <div key={reg.id} className="group flex items-center justify-between p-6 bg-white border border-gray-100 hover:border-black transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="flex items-center gap-6">
                 <div className={`p-4 rounded-none transition-colors border ${reg.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                    <Monitor className="w-5 h-5" />
                 </div>
                 
                 <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-black text-lg uppercase tracking-tighter text-zinc-900 leading-none">{reg.name}</h3>
                      <Badge variant="outline" className={`rounded-none border-0 text-[9px] uppercase font-black px-0 ${reg.is_active ? 'text-emerald-500' : 'text-zinc-300'}`}>
                        {reg.is_active ? "● Online" : "● Offline"}
                      </Badge>
                    </div>
                    
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-help">
                             <HelpCircle className="w-3 h-3" />
                             <span className="text-[9px] font-bold uppercase tracking-widest">Control de Acceso</span>
                           </div>
                        </TooltipTrigger>
                        <TooltipContent className="rounded-none border-black border-2 bg-white text-black text-[10px] p-4 max-w-[200px] shadow-xl">
                           Cualquier empleado con rol <strong className="font-black">POS</strong> o <strong className="font-black">ADMIN</strong> podrá abrir turno en esta terminal.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleToggle(reg.id, reg.is_active)}
                  className={`rounded-none h-10 px-6 font-black text-[10px] uppercase tracking-widest border-2 transition-all ${reg.is_active ? 'text-zinc-400 border-zinc-100 hover:bg-zinc-50 hover:border-zinc-200' : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200'}`}
                >
                  {reg.is_active ? (
                    <>
                      <Power className="w-3 h-3 mr-2 text-red-400" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-2" />
                      Reactivar
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
