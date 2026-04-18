"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, FileSpreadsheet } from "lucide-react";
import { ImportMapper } from "./ImportMapper";

export function ImportModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors flex items-center gap-2">
          <span>✨ Importar (IA)</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1200px] h-[90vh] flex flex-col rounded-none border-2 border-black p-0 overflow-hidden">
        <div className="p-8 bg-zinc-50 border-b-2 border-zinc-100 flex justify-between items-end flex-shrink-0">
           <div>
             <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Catalog Import</span>
             </div>
             <DialogTitle className="text-4xl font-black uppercase tracking-tighter leading-none">Importación Inteligente</DialogTitle>
             <DialogDescription className="text-zinc-500 font-medium text-xs mt-2">
               Sube tu CSV y deja que Invenza AI mapee tus productos automáticamente.
             </DialogDescription>
           </div>
           <div className="hidden md:block bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em]">
             Lotes de 500 registros
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8">
           <ImportMapper />
        </div>
      </DialogContent>
    </Dialog>
  );
}
