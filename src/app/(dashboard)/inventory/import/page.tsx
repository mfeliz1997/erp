import { ImportMapper } from "@/modules/inventory/components/ImportMapper";
import { FileSpreadsheet, Layers } from "lucide-react";

export default function InventoryImportPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-zinc-400">
            <Layers className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] leading-none">Catalog Management</span>
          </div>
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">Importar</h1>
          <p className="text-zinc-500 font-medium text-sm max-w-lg">
            Migra tu inventario desde archivos externos en segundos. Nuestro mapeador inteligente ajusta tus datos automáticamente.
          </p>
        </div>
        
        <div className="flex bg-zinc-100 p-4 rounded-none border-l-4 border-black gap-4 items-center">
           <FileSpreadsheet className="w-8 h-8 text-black" />
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black">Formato Sugerido</p>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">CSV delimitado por comas (,))</p>
           </div>
        </div>
      </div>

      <ImportMapper />
    </div>
  );
}
