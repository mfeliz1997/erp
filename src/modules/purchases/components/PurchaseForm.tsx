"use client";

import { useState } from "react";
import { createPurchaseAction } from "../actions/purchase-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, Plus, Trash2, Package, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  price: number;
}

export function PurchaseForm({ products }: { products: Product[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [isPending, setIsPending] = useState(false);

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_cost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const total = items.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0);

  const handleSubmit = async () => {
    if (!supplier) return toast.error("Nombre del suplidor es obligatorio");
    if (items.length === 0) return toast.error("Añada al menos un producto");
    
    setIsPending(true);
    const result = await createPurchaseAction({
      supplier_name: supplier,
      invoice_number: invoice,
      items,
      total_cost: total
    });

    if (result.success) {
      toast.success("Compra registrada y stock actualizado");
      setItems([]);
      setSupplier("");
      setInvoice("");
    } else {
      toast.error(result.error);
    }
    setIsPending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-none border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black bg-zinc-50">
            <CardTitle className="uppercase tracking-tighter font-black text-2xl flex items-center gap-2">
              <Package className="w-6 h-6" />
              Productos Recibidos
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Añada los items a ingresar al inventario</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="col-span-12 md:col-span-5 space-y-2">
                  <Label className="uppercase text-[9px] font-bold tracking-widest mb-1">Producto</Label>
                  <Select onValueChange={(v) => updateItem(index, "product_id", v)} value={item.product_id}>
                    <SelectTrigger className="rounded-none border-2 border-black h-12 font-bold">
                      <SelectValue placeholder="Seleccione producto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4 md:col-span-2 space-y-2">
                  <Label className="uppercase text-[9px] font-bold tracking-widest mb-1">Cant.</Label>
                  <Input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => updateItem(index, "quantity", e.target.value)} 
                    className="rounded-none border-2 border-black h-12 font-bold text-center"
                  />
                </div>
                <div className="col-span-4 md:col-span-3 space-y-2">
                  <Label className="uppercase text-[9px] font-bold tracking-widest mb-1">Costo Unit.</Label>
                  <Input 
                    type="number" 
                    value={item.unit_cost} 
                    onChange={(e) => updateItem(index, "unit_cost", e.target.value)} 
                    className="rounded-none border-2 border-black h-12 font-bold"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                   <Button variant="destructive" onClick={() => removeItem(index)} className="w-full h-12 rounded-none border-2 border-black">
                      <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              </div>
            ))}

            <Button onClick={addItem} variant="outline" className="w-full h-14 border-2 border-dashed border-zinc-300 rounded-none text-zinc-400 font-bold uppercase tracking-widest hover:border-black hover:text-black transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-none border-2 border-black bg-white sticky top-6">
          <CardHeader className="bg-black text-white">
            <CardTitle className="uppercase tracking-tighter font-black text-xl">Datos de Compra</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="uppercase text-[9px] font-bold tracking-widest text-zinc-400">Suplidor / Proveedor</Label>
              <Input 
                value={supplier} 
                onChange={(e) => setSupplier(e.target.value)} 
                placeholder="Ej. Comercializadora RD" 
                className="rounded-none border-2 border-black h-12 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-[9px] font-bold tracking-widest text-zinc-400">Factura de Compra #</Label>
              <Input 
                value={invoice} 
                onChange={(e) => setInvoice(e.target.value)} 
                placeholder="Ej. FAC-00123" 
                className="rounded-none border-2 border-black h-12 font-bold"
              />
            </div>

            <div className="pt-6 border-t-2 border-black border-dashed mt-6">
               <div className="flex justify-between items-center mb-6">
                  <span className="font-black uppercase tracking-widest text-[10px]">Total Compra</span>
                  <span className="text-3xl font-black">RD$ {total.toLocaleString()}</span>
               </div>
               <Button 
                onClick={handleSubmit} 
                disabled={isPending || items.length === 0}
                className="w-full h-16 bg-black text-white font-black uppercase tracking-[0.2em] rounded-none hover:bg-zinc-800 transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,1),4px_4px_0px_2px_rgba(0,0,0,1)]"
               >
                  {isPending ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-3" />}
                  Finalizar Registro
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
