'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Discount } from '@/types/pos';
import {
  createDiscountAction,
  toggleDiscountAction,
  deleteDiscountAction,
} from '@/modules/discounts/actions';

const fmt = (d: Discount) =>
  d.type === 'percentage' ? `${d.value}%` : `RD$${d.value.toLocaleString()}`;

export function DiscountManager({ initialDiscounts }: { initialDiscounts: Discount[] }) {
  const [discounts, setDiscounts] = useState<Discount[]>(initialDiscounts);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName]   = useState('');
  const [type, setType]   = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');

  const handleCreate = () => {
    const v = parseFloat(value);
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (isNaN(v) || v <= 0) { toast.error('El valor debe ser mayor a 0'); return; }
    if (type === 'percentage' && v > 100) { toast.error('El porcentaje no puede superar 100'); return; }

    const fd = new FormData();
    fd.set('name', name.trim());
    fd.set('type', type);
    fd.set('value', String(v));

    startTransition(async () => {
      const result = await createDiscountAction(fd);
      if (result.success) {
        toast.success('Descuento creado');
        setName(''); setValue('');
        // Refresh list via page revalidation — optimistic update
        const tempId = crypto.randomUUID();
        setDiscounts(prev => [...prev, {
          id: tempId, tenant_id: '', name: name.trim(), type, value: v,
          is_active: true, created_at: new Date().toISOString(),
        }]);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleToggle = (id: string, current: boolean) => {
    startTransition(async () => {
      const result = await toggleDiscountAction(id, !current);
      if (result.success) {
        setDiscounts(prev => prev.map(d => d.id === id ? { ...d, is_active: !current } : d));
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteDiscountAction(id);
      if (result.success) {
        setDiscounts(prev => prev.filter(d => d.id !== id));
        toast.success('Descuento eliminado');
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

      {/* ── Formulario ───────────────────────────────────────────────── */}
      <div className="border border-gray-200 bg-white rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2 bg-primary text-primary-foreground rounded">
            <Plus className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold">Nuevo Descuento</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-500">Nombre del descuento</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Descuento Empleado, Promoción Navideña..."
              className="h-11 rounded-xl border-gray-200 font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-500">Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'percentage', label: 'Porcentaje (%)', icon: Percent },
                { v: 'fixed',      label: 'Monto Fijo (RD$)', icon: DollarSign },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setType(opt.v)}
                  className={`flex items-center gap-2 py-3 px-4 border-2 rounded-xl text-sm font-semibold transition-all ${
                    type === opt.v
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  <opt.icon className="w-4 h-4" /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-500">
              Valor {type === 'percentage' ? '(%)' : '(RD$)'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                {type === 'percentage' ? '%' : 'RD$'}
              </span>
              <Input
                type="number"
                min={0.01}
                max={type === 'percentage' ? 100 : undefined}
                step={0.01}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={type === 'percentage' ? '10' : '500'}
                className="pl-12 h-11 rounded-xl border-gray-200 font-semibold tabular-nums"
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isPending}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {isPending ? 'Guardando...' : 'Crear Descuento'}
          </Button>
        </div>

        {/* Manual siempre disponible — nota informativa */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> El descuento "Manual" siempre está disponible en el POS
          </p>
          <p className="text-[11px] text-blue-600 mt-1">
            Permite al cajero ingresar cualquier % o monto libre. Requiere el mismo permiso que los descuentos predefinidos.
          </p>
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Descuentos configurados ({discounts.length})
        </h3>

        {discounts.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No hay descuentos configurados</p>
            <p className="text-xs mt-1">Crea uno desde el formulario</p>
          </div>
        ) : (
          <div className="space-y-2">
            {discounts.map(d => (
              <div
                key={d.id}
                className={`flex items-center justify-between p-4 border rounded-xl transition-all ${
                  d.is_active
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${d.type === 'percentage' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                    {d.type === 'percentage'
                      ? <Percent className="w-4 h-4 text-blue-600" />
                      : <DollarSign className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{d.name}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5 font-bold">
                      {fmt(d)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(d.id, d.is_active)}
                    disabled={isPending}
                    className="text-gray-400 hover:text-black transition-colors p-1"
                    title={d.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {d.is_active
                      ? <ToggleRight className="w-5 h-5 text-black" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={isPending}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
