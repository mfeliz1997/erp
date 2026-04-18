'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateWebsiteSettings } from '@/modules/settings/actions';
import { toast } from 'sonner';
import { createBrowserClient } from "@supabase/ssr";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";

export function WebsiteSettingsForm({ tenant }: { tenant: any }) {
  const [isPending, setIsPending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '');
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setLogoUrl(data.publicUrl);
      toast.success("Logo subido correctamente");
    } catch (error: any) {
      toast.error("Error al subir el logo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    // Agregamos el logoUrl actualizado al formData
    formData.set('logo_url', logoUrl);
    
    const result = await updateWebsiteSettings(formData);
    
    if (result.success) {
      toast.success("Catálogo actualizado");
    } else {
      toast.error(result.error);
    }
    setIsPending(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Tu Catálogo en Línea</CardTitle>
          <CardDescription>
            Personaliza cómo se ve tu tienda para tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Label className="text-slate-900 font-bold uppercase tracking-tighter">Subdominio de tu Web</Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-sm">https://</span>
                <Input 
                  name="subdomain" 
                  defaultValue={tenant.subdomain} 
                  required
                  placeholder="mi-tienda" 
                  className="font-mono h-10 border-slate-300 focus:border-black rounded-none"
                />
                <span className="text-slate-400 font-mono text-sm">.beral.do</span>
              </div>
              <p className="text-[11px] text-slate-500">Este es el enlace público de tu negocio.</p>
            </div>

            <div className="grid gap-4">
              <Label className="uppercase font-bold text-xs tracking-widest text-gray-500">Identidad Visual</Label>
              
              <div className="flex flex-col md:flex-row gap-8 items-start">
                 {/* Preview del Logo */}
                 <div className="flex flex-col gap-2">
                    <Label className="text-xs">Vista Previa Logo</Label>
                    <div className="h-24 w-24 border-2 border-dashed border-gray-200 flex items-center justify-center bg-white overflow-hidden">
                      {logoUrl ? (
                         <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                         <div className="bg-black text-white w-full h-full flex items-center justify-center font-black text-3xl">
                            {tenant.name.charAt(0).toUpperCase()}
                         </div>
                      )}
                    </div>
                 </div>

                 {/* Upload Button */}
                 <div className="flex-1 space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-black hover:bg-gray-50 transition-colors font-bold text-xs uppercase tracking-widest">
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                        </div>
                      </Label>
                      <input 
                        id="logo-upload"
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <p className="text-[10px] text-gray-400">Recomendado: Cuadrado 512x512px (PNG, JPG)</p>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs">Color de Marca</Label>
                      <div className="flex gap-4 items-center">
                        <Input type="color" name="public_color" defaultValue={tenant.settings?.public_color || '#000000'} className="w-16 h-10 p-1 cursor-pointer rounded-none border-black" />
                        <span className="text-[10px] uppercase font-medium text-gray-400">Botones y Bordes</span>
                      </div>
                    </div>
                 </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="uppercase font-bold text-xs tracking-widest text-gray-500">Contacto para Pedidos</Label>
              <div className="flex items-center gap-2 border border-gray-200 bg-white p-1">
                <div className="bg-gray-100 px-3 py-2 text-sm text-gray-500 font-bold border-r border-gray-200">+</div>
                <Input 
                  name="whatsapp_number" 
                  type="tel" 
                  defaultValue={tenant.settings?.whatsapp_number || ''} 
                  placeholder="18091234567" 
                  className="border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-tight">Incluye el código de país sin el símbolo +. Ej: 18091234567</p>
            </div>

            <Button type="submit" disabled={isPending || isUploading} className="w-full h-12 bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-[0.2em] rounded-none shadow-xl">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Actualizar Catálogo Público
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
