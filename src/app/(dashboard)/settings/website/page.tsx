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
      <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
        <div className="p-3 bg-primary text-primary-foreground shrink-0">
          <Globe className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold    leading-none">Canal Público</h2>
          <p className="text-xs font-semibold text-gray-400   leading-none">Identidad visual y catálogo en línea</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border border-gray-200 bg-white p-8 shadow-sm rounded-xl space-y-12">
        {/* Subdominio Section */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold   text-black flex items-center gap-2">
            <Tablet className="w-4 h-4" /> 1. Dirección Web
          </h3>
          <div className="p-6 bg-gray-50 border border-gray-200 border-solid space-y-4">
            <Label className=" text-xs font-semibold  text-gray-400">URL Personalizada</Label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-gray-400 font-semibold text-xs  hidden sm:inline">HTTPS://</span>
              <div className="flex-1 flex w-full">
                <input 
                  name="subdomain" 
                  defaultValue={tenant.subdomain} 
                  required
                  placeholder="mi-tienda" 
                  className="flex-1 h-14 px-4 border border-gray-200 rounded-xl font-semibold text-lg focus:outline-none placeholder:text-gray-100"
                />
              </div>
              <span className="text-black font-semibold text-xs  ">.INVENZA.DO</span>
            </div>
            <p className="text-xs text-gray-400 font-bold  tracking-tight">Tus clientes usarán este enlace para ver tus productos y hacer pedidos.</p>
          </div>
        </div>

        {/* Visual Identity Section */}
        <div className="space-y-8">
           <h3 className="text-sm font-semibold   text-black flex items-center gap-2">
            <Palette className="w-4 h-4" /> 2. Estética de Marca
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-4">
                <Label className=" text-xs font-semibold  text-gray-400">Logo de Empresa</Label>
                <div className="flex items-center gap-6">
                   <div className="h-24 w-24 border border-gray-200 flex items-center justify-center bg-gray-100 overflow-hidden shrink-0">
                      {logoUrl ? (
                         <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                         <div className="bg-primary text-primary-foreground w-full h-full flex items-center justify-center font-semibold text-3xl ">
                            {tenant.name.charAt(0).toUpperCase()}
                         </div>
                      )}
                   </div>
                   
                   <div className="space-y-2">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 transition-all font-semibold text-xs   shadow-sm rounded-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
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
                      <p className="text-xs text-gray-400 font-bold ">PNG o JPG • Máx 2MB</p>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <Label className=" text-xs font-semibold  text-gray-400">Color Primario</Label>
                <div className="flex gap-4 items-center p-3 border border-gray-200 bg-white h-24">
                  <input 
                    type="color" 
                    name="public_color" 
                    defaultValue={tenant.settings?.public_color || '#000000'} 
                    className="w-16 h-12 p-1 cursor-pointer rounded-xl border border-gray-200 bg-white" 
                  />
                  <div className="flex flex-col">
                    <span className="text-xs  font-semibold text-black ">Acento visual</span>
                    <span className="text-xs  font-medium text-gray-400">Botones y bordes del catálogo</span>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Whatsapp Pedidos */}
        <div className="space-y-4">
          <Label className=" text-xs font-semibold  text-gray-400">Número de Pedidos (WhatsApp)</Label>
          <div className="flex items-center border border-gray-200 bg-white h-16">
            <div className="bg-gray-100 px-5 flex items-center justify-center h-full text-lg font-semibold border-r border-gray-200">+</div>
            <input 
              name="whatsapp_number" 
              type="tel" 
              defaultValue={tenant.settings?.whatsapp_number || ''} 
              placeholder="18091234567" 
              className="flex-1 px-4 border-none focus:outline-none font-semibold text-lg  placeholder:text-gray-100"
            />
          </div>
          <p className="text-xs text-gray-400 font-bold  tracking-tight">Incluye código de país (Ej: 1 para USA/RD, 52 para México) sin el símbolo +</p>
        </div>

        <Button type="submit" disabled={isPending || isUploading} className="w-full h-16 bg-black hover:bg-zinc-800 text-white font-semibold   rounded-xl shadow-sm rounded-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "ACTUALIZAR PRESENCIA WEB"}
        </Button>
      </form>
    </div>
  );
}
