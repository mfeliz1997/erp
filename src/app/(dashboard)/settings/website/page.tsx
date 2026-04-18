'use client';

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateWebsiteSettings } from '@/modules/settings/actions';
import { toast } from 'sonner';
import { createBrowserClient } from "@supabase/ssr";
import { Upload, Image as ImageIcon, Loader2, Globe, Palette, Tablet } from "lucide-react";

export default function WebsiteSettingsForm({ tenant }: { tenant: any }) {
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
    <div className="max-w-4xl space-y-10">
      <div className="flex items-center gap-4 border-b-2 border-black pb-6">
        <div className="p-3 bg-black text-white shrink-0">
          <Globe className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">Canal Público</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Identidad visual y catálogo en línea</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-12">
        {/* Subdominio Section */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-black flex items-center gap-2">
            <Tablet className="w-4 h-4" /> 1. Dirección Web
          </h3>
          <div className="p-6 bg-gray-50 border-2 border-black border-dashed space-y-4">
            <Label className="uppercase text-[10px] font-black tracking-widest text-gray-400">URL Personalizada</Label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-gray-400 font-black text-xs uppercase hidden sm:inline">HTTPS://</span>
              <div className="flex-1 flex w-full">
                <input 
                  name="subdomain" 
                  defaultValue={tenant.subdomain} 
                  required
                  placeholder="mi-tienda" 
                  className="flex-1 h-14 px-4 border-2 border-black rounded-none font-black text-lg focus:outline-none placeholder:text-gray-100"
                />
              </div>
              <span className="text-black font-black text-xs uppercase italic">.INVENZA.DO</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Tus clientes usarán este enlace para ver tus productos y hacer pedidos.</p>
          </div>
        </div>

        {/* Visual Identity Section */}
        <div className="space-y-8">
           <h3 className="text-sm font-black uppercase tracking-widest text-black flex items-center gap-2">
            <Palette className="w-4 h-4" /> 2. Estética de Marca
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-4">
                <Label className="uppercase text-[10px] font-black tracking-widest text-gray-400">Logo de Empresa</Label>
                <div className="flex items-center gap-6">
                   <div className="h-24 w-24 border-2 border-black flex items-center justify-center bg-gray-100 overflow-hidden shrink-0">
                      {logoUrl ? (
                         <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                         <div className="bg-black text-white w-full h-full flex items-center justify-center font-black text-3xl italic">
                            {tenant.name.charAt(0).toUpperCase()}
                         </div>
                      )}
                   </div>
                   
                   <div className="space-y-2">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-black hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
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
                      <p className="text-[9px] text-gray-400 font-bold uppercase">PNG o JPG • Máx 2MB</p>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <Label className="uppercase text-[10px] font-black tracking-widest text-gray-400">Color Primario</Label>
                <div className="flex gap-4 items-center p-3 border-2 border-black bg-white h-24">
                  <input 
                    type="color" 
                    name="public_color" 
                    defaultValue={tenant.settings?.public_color || '#000000'} 
                    className="w-16 h-12 p-1 cursor-pointer rounded-none border-2 border-black bg-white" 
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-black tracking-widest">Acento visual</span>
                    <span className="text-[9px] uppercase font-medium text-gray-400">Botones y bordes del catálogo</span>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Whatsapp Pedidos */}
        <div className="space-y-4">
          <Label className="uppercase text-[10px] font-black tracking-widest text-gray-400">Número de Pedidos (WhatsApp)</Label>
          <div className="flex items-center border-2 border-black bg-white h-16">
            <div className="bg-gray-100 px-5 flex items-center justify-center h-full text-lg font-black border-r-2 border-black">+</div>
            <input 
              name="whatsapp_number" 
              type="tel" 
              defaultValue={tenant.settings?.whatsapp_number || ''} 
              placeholder="18091234567" 
              className="flex-1 px-4 border-none focus:outline-none font-black text-lg tracking-widest placeholder:text-gray-100"
            />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Incluye código de país (Ej: 1 para USA/RD, 52 para México) sin el símbolo +</p>
        </div>

        <Button type="submit" disabled={isPending || isUploading} className="w-full h-16 bg-black hover:bg-zinc-800 text-white font-black uppercase tracking-[0.2em] rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "ACTUALIZAR PRESENCIA WEB"}
        </Button>
      </form>
    </div>
  );
}
