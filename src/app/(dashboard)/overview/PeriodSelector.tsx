'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';

const PRESETS = [
  { label: '24h', days: 1  },
  { label: '7d',  days: 7  },
  { label: 'Mes', days: 30 },
  { label: 'Año', days: 365 },
] as const;

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDisplay(from: string, to: string) {
  const f = new Date(from + 'T00:00:00');
  const t = new Date(to   + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (from === to) return f.toLocaleDateString('es-DO', opts);
  return `${f.toLocaleDateString('es-DO', opts)} – ${t.toLocaleDateString('es-DO', opts)}`;
}

export default function PeriodSelector({ currentDays, currentFrom, currentTo }: {
  currentDays: number | null;
  currentFrom: string | null;
  currentTo:   string | null;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(
    currentFrom && currentTo
      ? { from: new Date(currentFrom + 'T00:00:00'), to: new Date(currentTo + 'T00:00:00') }
      : undefined
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  const isCustomActive = !!currentFrom && !!currentTo;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('days');
    sp.delete('from');
    sp.delete('to');
    Object.entries(params).forEach(([k, v]) => sp.set(k, v));
    router.push(`?${sp.toString()}`);
  }

  function applyCustom() {
    if (!range?.from || !range?.to) return;
    navigate({ from: toISO(range.from), to: toISO(range.to) });
    setOpen(false);
  }

  function clearCustom(e: React.MouseEvent) {
    e.stopPropagation();
    setRange(undefined);
    navigate({ days: '7' });
  }

  return (
    <div className="relative flex items-center gap-1" ref={popoverRef}>
      <div className="flex border border-border rounded-md overflow-hidden text-sm">
        {PRESETS.map((p, i) => {
          const active = !isCustomActive && currentDays === p.days;
          return (
            <button
              key={p.days}
              onClick={() => navigate({ days: String(p.days) })}
              className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              } ${i > 0 ? 'border-l border-border' : ''}`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Custom button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`px-3 py-1.5 font-medium transition-colors border-l border-border flex items-center gap-1.5 cursor-pointer ${
            isCustomActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">
            {isCustomActive ? formatDisplay(currentFrom, currentTo) : 'Custom'}
          </span>
          {isCustomActive && (
            <span
              role="button"
              onClick={clearCustom}
              className="ml-0.5 rounded-full hover:bg-primary-foreground/20 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden w-auto">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Selecciona el rango
            </p>
            {range?.from && range?.to ? (
              <p className="text-sm font-medium text-foreground mt-0.5">
                {formatDisplay(toISO(range.from), toISO(range.to))}
              </p>
            ) : range?.from ? (
              <p className="text-sm text-muted-foreground mt-0.5">Elige el día final…</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-0.5">Elige el día inicial…</p>
            )}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              captionLayout="dropdown"
              defaultMonth={
                range?.from
                  ? new Date(range.from.getFullYear(), range.from.getMonth() - 1)
                  : new Date(2026, 2)
              }
              startMonth={new Date(2024, 0)}
              endMonth={new Date(2026, 11)}
              locale={es}
              classNames={{
                day: 'cursor-pointer',
                button_previous: 'cursor-pointer',
                button_next: 'cursor-pointer',
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/30">
            <button
              onClick={() => { setRange(undefined); setOpen(false); }}
              className="flex-1 text-sm border border-border rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={applyCustom}
              disabled={!range?.from || !range?.to}
              className="flex-1 text-sm bg-primary text-primary-foreground rounded-lg px-3 py-2 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
