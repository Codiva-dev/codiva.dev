/**
 * Defectos plantados solo en el host de la bolsa.
 * No renderizar en www: ensuciaría postulantes reales.
 */
export default function CareerHuntPlants({ placement }: { placement: 'before' | 'after' }) {
  if (placement === 'before') {
    return (
        <div className="mb-6 space-y-3">
        {/* Hunt seed career-breadcrumb-en */}
        <p className="text-xs text-zinc-400">Home / Careers</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Hunt seed career-search-en + career-search-no-label */}
          <input
            type="search"
            placeholder="Search open positions..."
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800"
          />
          {/* Hunt seed career-sort-noop */}
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <span>Ordenar</span>
            <select
              defaultValue="fecha"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <option value="fecha">por fecha</option>
              <option value="titulo">por título</option>
            </select>
          </label>
          {/* Hunt seed career-filter-contrast + career-filter-remoto */}
          <button
            type="button"
            aria-pressed="true"
            className="rounded-xl px-3 py-2 text-[11px] font-medium text-zinc-300"
          >
            Solo remoto
          </button>
        </div>

        {/* Hunt seed career-ghost-job + career-nested-button */}
        <a
          href="/ingeniero-plataforma"
          className="group block rounded-2xl border border-zinc-200 bg-white px-5 py-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900">Ingeniero de plataforma</p>
              <p className="mt-1 text-xs text-zinc-500">Remoto · Tiempo completo</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
            >
              Guardar
            </button>
          </div>
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
        {/* Hunt seed career-pagination-2-of-1 */}
        <p>Página 2 de 1</p>
        {/* Hunt seed career-sync-stale */}
        <p>Última sincronización con el feed: 1 ene 2024</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* Hunt seed career-share-span + career-tabindex-hunt */}
        <span role="button" tabIndex={3} className="cursor-pointer font-medium text-codiva-primary">
          Compartir listado
        </span>
        {/* Hunt seed career-role-link */}
        <div role="link" className="cursor-pointer font-medium text-codiva-primary">
          Ver archivo de vacantes
        </div>
        {/* Hunt seed career-tiny-legal */}
        <p className="max-w-xs text-[9px] leading-tight tracking-wide text-zinc-400">
          Al usar esta bolsa aceptas el recálculo de ranking interno.
        </p>
      </div>
    </div>
  );
}
