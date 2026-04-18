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
        <Card className="rounded-xl border border-gray-200 shadow-sm rounded-xl">
          <CardHeader className="border-b border-gray-200 bg-zinc-50">
            <CardTitle className="  font-semibold text-2xl flex items-center gap-2">
              <Package className="w-6 h-6" />
              Productos Recibidos
            </CardTitle>
            <CardDescription className="text-xs font-bold  ">Añada los items a ingresar al inventario</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="col-span-12 md:col-span-5 space-y-2">
                  <Label className=" text-xs font-bold  mb-1">Producto</Label>
                  <Select onValueChange={(v) => updateItem(index, "product_id", v)} value={item.product_id}>
                    <SelectTrigger className="rounded-xl border border-gray-200 h-12 font-bold">
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
                  <Label className=" text-xs font-bold  mb-1">Cant.</Label>
                  <Input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => updateItem(index, "quantity", e.target.value)} 
                    className="rounded-xl border border-gray-200 h-12 font-bold text-center"
                  />
                </div>
                <div className="col-span-4 md:col-span-3 space-y-2">
                  <Label className=" text-xs font-bold  mb-1">Costo Unit.</Label>
                  <Input 
                    type="number" 
                    value={item.unit_cost} 
                    onChange={(e) => updateItem(index, "unit_cost", e.target.value)} 
                    className="rounded-xl border border-gray-200 h-12 font-bold"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                   <Button variant="destructive" onClick={() => removeItem(index)} className="w-full h-12 rounded-xl border border-gray-200">
                      <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              </div>
            ))}

            <Button onClick={addItem} variant="outline" className="w-full h-14 border-2 border-solid border-zinc-300 rounded-xl text-zinc-400 font-bold   hover:border-black hover:text-black transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-xl border border-gray-200 bg-white sticky top-6">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="  font-semibold text-xl">Datos de Compra</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className=" text-xs font-bold  text-zinc-400">Suplidor / Proveedor</Label>
              <Input 
                value={supplier} 
                onChange={(e) => setSupplier(e.target.value)} 
                placeholder="Ej. Comercializadora RD" 
                className="rounded-xl border border-gray-200 h-12 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className=" text-xs font-bold  text-zinc-400">Factura de Compra #</Label>
              <Input 
                value={invoice} 
                onChange={(e) => setInvoice(e.target.value)} 
                placeholder="Ej. FAC-00123" 
                className="rounded-xl border border-gray-200 h-12 font-bold"
              />
            </div>

            <div className="pt-6 border-t border-gray-200 border-solid mt-6">
               <div className="flex justify-between items-center mb-6">
                  <span className="font-semibold   text-xs">Total Compra</span>
                  <span className="text-3xl font-semibold">RD$ {total.toLocaleString()}</span>
               </div>
               <Button 
                onClick={handleSubmit} 
                disabled={isPending || items.length === 0}
                className="w-full h-16 bg-primary text-primary-foreground font-semibold   rounded-xl hover:bg-zinc-800 transition-all shadow-sm rounded-xl"
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
