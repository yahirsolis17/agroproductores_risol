import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Boxes,
  CalendarRange,
  ChevronRight,
  Clock3,
  Coins,
  History,
  Inbox,
  KeyRound,
  Leaf,
  LineChart,
  LockKeyhole,
  Package,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Sprout,
  Trees,
  Truck,
  UserRound,
  Warehouse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getVisibleNavigation, type NavItem } from '../../../global/constants/navItems';
import useDebouncedValue from '../../../global/hooks/useDebouncedValue';
import { useAuth } from '../context/AuthContext';
import dashboardService, {
  type DashboardAlert,
  type DashboardComparison,
  type DashboardMetric,
  type DashboardModule,
  type DashboardOverview,
  type DashboardSearchResult,
  type DashboardTimelineItem,
} from '../services/dashboardService';

type AccessFlags = { admin: boolean; huerta: boolean; finanzas: boolean; bodega: boolean };
type PaletteItem = DashboardSearchResult;

const toneClass: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-900 border-amber-200',
  critical: 'bg-rose-100 text-rose-900 border-rose-200',
  emerald: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  ghost: 'bg-white/70 text-slate-700 border-white/70',
  info: 'bg-sky-100 text-sky-900 border-sky-200',
  neutral: 'bg-slate-100 text-slate-900 border-slate-200',
  positive: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  rose: 'bg-rose-100 text-rose-900 border-rose-200',
  sky: 'bg-sky-100 text-sky-900 border-sky-200',
  slate: 'bg-slate-100 text-slate-900 border-slate-200',
  success: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  violet: 'bg-violet-100 text-violet-900 border-violet-200',
  warning: 'bg-amber-100 text-amber-900 border-amber-200',
};

const iconMap = {
  boxes: Boxes,
  'calendar-range': CalendarRange,
  calendar: CalendarRange,
  'clock-3': Clock3,
  coins: Coins,
  history: History,
  inbox: Inbox,
  'key-round': KeyRound,
  leaf: Leaf,
  'line-chart': LineChart,
  'lock-keyhole': LockKeyhole,
  package: Package,
  shield: Shield,
  'shield-alert': ShieldAlert,
  sparkle: Sparkles,
  sprout: Sprout,
  trees: Trees,
  truck: Truck,
  'user-round': UserRound,
  warehouse: Warehouse,
} as const;

const fadeUp = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0, transition: { duration: 0.32 } } };
const SAFE_ENTRY_ROUTES = new Set([
  '/dashboard',
  '/profile',
  '/users-admin',
  '/register',
  '/activity-log',
  '/huertas',
  '/propietarios',
  '/bodega',
  '/change-password',
]);

const isMetricVisible = (id: string, access: AccessFlags) => {
  if (id.includes('password') || id.includes('users') || id.includes('security')) return access.admin;
  if (id.includes('recepcion') || id.includes('empaque') || id.includes('bodega') || id.includes('stock') || id.includes('weeks')) return access.bodega;
  if (id.includes('sales') || id.includes('invest')) return access.finanzas;
  return access.huerta;
};

const resolveSafeEntryRoute = (to?: string | null) => {
  if (!to) return null;
  const [path] = to.split('?');
  return SAFE_ENTRY_ROUTES.has(path) ? to : null;
};

const toPaletteItem = (item: NavItem): PaletteItem => ({
  id: `action-${item.to}`,
  group: 'Acciones',
  kind: 'action',
  title: item.label,
  subtitle: item.description ?? item.to,
  meta: 'Acceso directo',
  to: item.to,
});

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const Glyph: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => {
  const Icon = iconMap[icon as keyof typeof iconMap] ?? Sparkles;
  return <Icon className={className ?? 'h-5 w-5'} />;
};

const Surface: React.FC<React.PropsWithChildren<{ className?: string; delay?: number }>> = ({ className, delay = 0, children }) => (
  <m.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className={clsx('dashboard-panel rounded-[30px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl', className)}
  >
    {children}
  </m.section>
);

const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden="true"
    className={clsx(
      'animate-pulse rounded-[22px] bg-[linear-gradient(135deg,rgba(226,232,240,0.92),rgba(241,245,249,0.78))]',
      className,
    )}
  />
);

const MetricSkeletonCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={clsx('rounded-[26px] border border-slate-200/70 bg-white/78 p-4 shadow-sm', compact ? 'min-h-[140px]' : 'min-h-[156px]')}>
    <div className="flex items-center justify-between">
      <SkeletonBlock className="h-3.5 w-24 rounded-full" />
      <SkeletonBlock className="h-4 w-4 rounded-full" />
    </div>
    <SkeletonBlock className="mt-5 h-9 w-24" />
    <SkeletonBlock className="mt-3 h-3.5 w-full rounded-full" />
    <SkeletonBlock className="mt-2 h-3.5 w-2/3 rounded-full" />
  </div>
);

const StackSkeleton: React.FC<{ rows?: number; tall?: boolean }> = ({ rows = 3, tall = false }) => (
  <div className="mt-4 grid gap-3">
    {Array.from({ length: rows }).map((_, index) => (
      <SkeletonBlock
        key={index}
        className={clsx('w-full rounded-[24px]', tall ? 'h-32' : 'h-24')}
      />
    ))}
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPerm } = useAuth();
  const role = user?.role ?? 'usuario';
  const access = useMemo<AccessFlags>(() => ({
    admin: role === 'admin',
    huerta: hasPerm('view_huerta') || hasPerm('view_huertarentada') || hasPerm('view_temporada') || hasPerm('view_cosecha'),
    finanzas: hasPerm('view_venta') || hasPerm('view_inversioneshuerta'),
    bodega: hasPerm('view_bodega') || hasPerm('view_temporadabodega') || hasPerm('view_dashboard') || hasPerm('view_recepcion') || hasPerm('view_clasificacionempaque') || hasPerm('view_camionsalida') || hasPerm('view_compramadera') || hasPerm('view_consumible'),
  }), [hasPerm, role]);
  const navigation = useMemo(() => getVisibleNavigation(role, hasPerm), [hasPerm, role]);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 220);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DashboardSearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadOverview = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getOverview(force);
      setOverview(data);
    } catch {
      setError('No se pudo cargar el centro de mando.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOverview(); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setPaletteOpen(true);
      } else if (!typing && event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
        setPaletteOpen(true);
      } else if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    const onClick = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (deferredQuery.length < 2) {
      startTransition(() => setSearchResults([]));
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    dashboardService.search(deferredQuery).then((results) => {
      if (!active) return;
      startTransition(() => setSearchResults(results));
      setSearching(false);
    }).catch(() => {
      if (!active) return;
      startTransition(() => setSearchResults([]));
      setSearching(false);
    });
    return () => { active = false; };
  }, [deferredQuery]);

  const localActions = useMemo(() => {
    const items = [navigation.home, navigation.profile, ...navigation.sections.flatMap((section) => section.items)];
    const results = items.map(toPaletteItem);
    if (!query.trim()) return results.slice(0, 6);
    const term = query.trim().toLowerCase();
    return results.filter((item) => item.title.toLowerCase().includes(term) || item.subtitle.toLowerCase().includes(term)).slice(0, 6);
  }, [navigation, query]);

  const paletteResults = useMemo(() => {
    if (!overview) return localActions;
    if (!deferredQuery) {
      const contextual: PaletteItem[] = [];
      if (overview.contexts.featured_temporada) contextual.push({ id: 'ctx-temporada', group: 'Contexto', kind: 'entity', title: overview.contexts.featured_temporada.label, subtitle: 'Temporada recomendada', meta: 'Contexto activo', to: overview.contexts.featured_temporada.to });
      if (overview.contexts.featured_bodega) contextual.push({ id: 'ctx-bodega', group: 'Contexto', kind: 'entity', title: overview.contexts.featured_bodega.label, subtitle: 'Bodega recomendada', meta: 'Contexto activo', to: overview.contexts.featured_bodega.to });
      return [...localActions, ...contextual];
    }
    return [...localActions, ...searchResults];
  }, [deferredQuery, localActions, overview, searchResults]);

  const visibleModules = useMemo(() => (overview?.modules ?? []).filter((module) => access[module.id as keyof AccessFlags]), [access, overview?.modules]);
  const visibleHeroStats = useMemo(() => (overview?.hero.stats ?? []).filter((item) => isMetricVisible(item.id, access)).slice(0, 4), [access, overview?.hero.stats]);
  const visibleCards = useMemo(() => (overview?.today.cards ?? []).filter((item) => isMetricVisible(item.id, access)).slice(0, 5), [access, overview?.today.cards]);
  const visibleComparisons = useMemo(() => (overview?.comparisons ?? []).filter((item) => isMetricVisible(item.id, access)).slice(0, 4), [access, overview?.comparisons]);
  const visibleAlternatives = useMemo(() => (overview?.next_action.alternatives ?? []).filter((action) => {
    if (!resolveSafeEntryRoute(action.to)) return false;
    if (action.to.includes('/bodega')) return access.bodega;
    if (action.to.includes('/huertas') || action.to.includes('/temporadas') || action.to.includes('/cosechas')) return access.huerta;
    if (action.to.includes('/users-admin') || action.to.includes('/activity-log') || action.to.includes('/register')) return access.admin;
    return true;
  }), [access, overview?.next_action.alternatives]);
  const nextActionTarget = resolveSafeEntryRoute(overview?.next_action.to);
  const hasOverview = Boolean(overview);
  const showShell = !hasOverview;
  const showErrorState = !loading && !hasOverview;
  const heroHeadline = overview?.hero.headline ?? 'Centro de mando inteligente';
  const heroSupport = overview?.hero.support ?? (
    showErrorState
      ? 'No se pudo cargar el centro de mando. Puedes reintentar sin salir del dashboard.'
      : 'Estamos preparando indicadores, alertas y atajos para que el tablero aparezca estable desde el primer render.'
  );
  const heroBadges = overview?.hero.badges ?? ['Contexto activo', 'Indicadores en carga', 'Atajos listos'];
  const todayTitle = overview?.today.title ?? 'En foco hoy';
  const todaySubtitle = overview?.today.subtitle ?? 'Reservando espacio para tus indicadores prioritarios.';

  const goTo = (to: string) => {
    setPaletteOpen(false);
    navigate(to);
  };

  return (
    <div className="dashboard-intelligence mx-auto flex min-h-[calc(100vh-13rem)] w-full max-w-7xl flex-col gap-6 px-4 pb-8 pt-2">
      <m.section {...fadeUp} className="dashboard-hero relative min-h-[26rem] overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.22),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(240,249,255,0.82))] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] lg:p-8">
        <div className="dashboard-grid-lines absolute inset-0 opacity-60" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr,0.85fr]">
          <div>
            <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Centro de mando</span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{user?.nombre ? `Hola, ${user.nombre}.` : 'Hola.'} {heroHeadline}</h1>
            {hasOverview ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{heroSupport}</p>
            ) : (
              <div className="mt-3 max-w-2xl space-y-2">
                <SkeletonBlock className="h-4 w-full rounded-full" />
                <SkeletonBlock className="h-4 w-11/12 rounded-full" />
                <SkeletonBlock className="h-4 w-3/4 rounded-full" />
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">{heroBadges.map((badge) => <span key={badge} className="rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">{badge}</span>)}</div>
            <div ref={searchRef} className="relative mt-6 max-w-2xl">
              <label className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/85 px-4 py-3 shadow-lg backdrop-blur-xl">
                <Search className="h-5 w-5 text-slate-400" />
                <input ref={inputRef} value={query} onFocus={() => hasOverview && setPaletteOpen(true)} onChange={(event) => setQuery(event.target.value)} disabled={!hasOverview} placeholder={hasOverview ? 'Buscar acciones, huertas, temporadas, cosechas o bodegas' : 'Preparando busqueda global...'} className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-wait disabled:text-slate-400" />
                <span className="rounded-xl border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500">Ctrl + K</span>
              </label>
              <AnimatePresence>{hasOverview && paletteOpen ? <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-[24px] border border-white/80 bg-white/95 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">{searching ? <p className="px-3 py-2 text-sm text-slate-500">Buscando...</p> : paletteResults.length ? <div className="space-y-2">{paletteResults.map((item) => <button key={item.id} type="button" onClick={() => goTo(item.to)} className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-slate-100"><div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.group} · {item.subtitle}</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}</div> : <p className="px-3 py-2 text-sm text-slate-500">No hay resultados para esta busqueda.</p>}</m.div> : null}</AnimatePresence>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{showShell ? Array.from({ length: 4 }).map((_, index) => <MetricSkeletonCard key={index} />) : visibleHeroStats.map((metric, index) => <MetricCard key={metric.id} metric={metric} delay={0.06 + index * 0.03} />)}</div>
          </div>

          <Surface className="relative min-h-[22rem] overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.14),_transparent_40%),linear-gradient(160deg,_rgba(255,255,255,0.96),_rgba(241,245,249,0.92))] text-slate-950" delay={0.08}>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.28),_transparent_58%)]" />
            <div className="relative">
              {overview ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/78 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-900"><Sparkles className="h-3.5 w-3.5" /> Siguiente mejor accion</div>
                  <h2 className="mt-4 text-2xl font-semibold leading-tight">{overview.next_action.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{overview.next_action.description}</p>
                  {nextActionTarget ? (
                    <button type="button" onClick={() => goTo(nextActionTarget)} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"><Glyph icon={overview.next_action.icon} className="h-4 w-4" /> Abrir ahora <ArrowRight className="h-4 w-4" /></button>
                  ) : (
                    <p className="mt-6 text-sm font-medium text-slate-500">Este frente se abre desde su flujo natural, no desde un acceso directo global.</p>
                  )}
                  <div className="mt-6 space-y-2">{visibleAlternatives.map((action) => <button key={action.id} type="button" onClick={() => goTo(action.to)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white/76 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"><div><p className="text-sm font-semibold text-slate-900">{action.title}</p><p className="text-xs text-slate-600">{action.description}</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}</div>
                </>
              ) : showErrorState ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/78 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-900"><ShieldAlert className="h-3.5 w-3.5" /> Conexion pendiente</div>
                  <h2 className="mt-4 text-2xl font-semibold leading-tight">No pudimos traer tu resumen operativo.</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{error ?? 'Intenta recargar el dashboard para volver a solicitar los indicadores.'}</p>
                  <button type="button" onClick={() => void loadOverview(true)} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800">
                    Reintentar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/78 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-900"><Sparkles className="h-3.5 w-3.5" /> Preparando foco</div>
                  <SkeletonBlock className="mt-4 h-8 w-3/4" />
                  <div className="mt-3 space-y-2">
                    <SkeletonBlock className="h-4 w-full rounded-full" />
                    <SkeletonBlock className="h-4 w-5/6 rounded-full" />
                    <SkeletonBlock className="h-4 w-2/3 rounded-full" />
                  </div>
                  <SkeletonBlock className="mt-6 h-11 w-40 rounded-2xl" />
                  <div className="mt-6 space-y-2">
                    <SkeletonBlock className="h-16 w-full rounded-[22px]" />
                    <SkeletonBlock className="h-16 w-full rounded-[22px]" />
                    <SkeletonBlock className="h-16 w-full rounded-[22px]" />
                  </div>
                </>
              )}
            </div>
          </Surface>
        </div>
      </m.section>

      <Surface delay={0.12} className="dashboard-section-deferred">
        <SectionTitle title={todayTitle} subtitle={todaySubtitle} />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{showShell ? Array.from({ length: 5 }).map((_, index) => <MetricSkeletonCard key={index} compact />) : visibleCards.map((metric, index) => <MetricCard key={metric.id} metric={metric} delay={0.02 + index * 0.03} compact />)}</div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Surface delay={0.16} className="dashboard-section-deferred">
          <SectionTitle title="Radar" subtitle="Alertas e ideas que valen mas que abrir cinco pantallas." />
          {overview ? <div className="mt-4 grid gap-3">{overview.alerts.map((alert) => <AlertCard key={alert.id} alert={alert} onOpen={goTo} />)}{overview.insights.map((insight) => <InsightCard key={insight.id} insight={insight} onOpen={goTo} />)}</div> : <StackSkeleton rows={4} tall />}
        </Surface>

        <Surface delay={0.2} className="dashboard-section-deferred">
          <SectionTitle title="Comparativos" subtitle="Lectura inmediata de si vas mejor, peor o igual." />
          {overview ? <div className="mt-4 grid gap-3">{visibleComparisons.map((comparison) => <ComparisonCard key={comparison.id} comparison={comparison} onOpen={goTo} />)}</div> : <StackSkeleton rows={4} tall />}
        </Surface>
      </div>

      <Surface delay={0.24} className="dashboard-section-deferred">
        <SectionTitle title="Espacios" subtitle="Cada modulo convertido en frente de trabajo con salida directa." />
        {overview ? <div className="mt-4 grid gap-4 xl:grid-cols-3">{visibleModules.map((module) => <ModuleCard key={module.id} module={module} onOpen={goTo} />)}</div> : <div className="mt-4 grid gap-4 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-[22rem] w-full rounded-[28px]" />)}</div>}
      </Surface>

      <Surface delay={0.28} className="dashboard-section-deferred">
        <SectionTitle title="Linea de tiempo" subtitle="Lo ultimo que realmente paso en el sistema." />
        {overview ? <div className="mt-4 space-y-3">{overview.timeline.map((item) => <TimelineRow key={item.id} item={item} onOpen={goTo} />)}</div> : <StackSkeleton rows={4} />}
      </Surface>
    </div>
  );
};

const SectionTitle: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => <div><h2 className="text-xl font-semibold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>;
const MetricCard: React.FC<{ metric: DashboardMetric; delay?: number; compact?: boolean }> = ({ metric, delay = 0, compact = false }) => <m.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay }} className={clsx('rounded-[26px] border p-4 shadow-sm', toneClass[metric.tone] ?? toneClass.slate, compact ? 'min-h-[140px]' : 'min-h-[156px]')}><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em]">{metric.label}</span><Glyph icon={metric.icon} className="h-4 w-4" /></div><p className="mt-5 text-3xl font-semibold tracking-tight">{metric.display}</p><p className="mt-2 text-sm leading-6 opacity-80">{metric.helper}</p></m.article>;
const AlertCard: React.FC<{ alert: DashboardAlert; onOpen: (to: string) => void }> = ({ alert, onOpen }) => {
  const safeTo = resolveSafeEntryRoute(alert.to);
  const clickable = Boolean(safeTo);

  return (
    <div
      className={clsx(
        'rounded-[24px] border px-4 py-4 text-left',
        toneClass[alert.severity] ?? toneClass.slate,
        clickable && 'transition hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">{alert.source}</p>
          <p className="mt-2 text-base font-semibold">{alert.title}</p>
          <p className="mt-2 text-sm leading-6 opacity-85">{alert.description}</p>
        </div>
        {clickable ? (
          <button type="button" onClick={() => onOpen(safeTo!)} className="mt-1 shrink-0 rounded-full p-1 opacity-60 transition hover:bg-white/40">
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

const InsightCard: React.FC<{ insight: DashboardOverview['insights'][number]; onOpen: (to: string) => void }> = ({ insight, onOpen }) => {
  const safeTo = resolveSafeEntryRoute(insight.to);
  const clickable = Boolean(safeTo);

  return (
    <div className={clsx('rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-left', clickable && 'transition hover:border-emerald-200 hover:bg-emerald-50/50')}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{insight.eyebrow}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{insight.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{insight.description}</p>
      {clickable ? (
        <button type="button" onClick={() => onOpen(safeTo!)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
          Abrir
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

const ComparisonCard: React.FC<{ comparison: DashboardComparison; onOpen: (to: string) => void }> = ({ comparison, onOpen }) => {
  const safeTo = resolveSafeEntryRoute(comparison.to);
  const clickable = Boolean(safeTo);

  return (
    <div className={clsx('rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left', clickable && 'transition hover:border-slate-300 hover:shadow-md')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{comparison.label}</p>
          <p className="mt-1 text-xs text-slate-500">{comparison.helper}</p>
        </div>
        <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', toneClass[comparison.tone] ?? toneClass.slate)}>{comparison.direction === 'up' ? 'Sube' : comparison.direction === 'down' ? 'Baja' : 'Estable'}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{comparison.current_label}</p><p className="mt-2 text-lg font-semibold text-slate-950">{comparison.current_display}</p></div>
        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{comparison.previous_label}</p><p className="mt-2 text-lg font-semibold text-slate-950">{comparison.previous_display}</p></div>
      </div>
      {clickable ? (
        <button type="button" onClick={() => onOpen(safeTo!)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          Abrir
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

const ModuleCard: React.FC<{ module: DashboardModule; onOpen: (to: string) => void }> = ({ module, onOpen }) => {
  const primaryTo = resolveSafeEntryRoute(module.primary_action.to);
  const secondaryActions = module.secondary_actions.filter((action) => resolveSafeEntryRoute(action.to));

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{module.label}</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{module.summary}</p>
      <div className="mt-4 grid gap-3">{module.metrics.map((metric) => <div key={metric.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3"><div><p className="text-xs text-slate-500">{metric.label}</p><p className="text-sm font-semibold text-slate-900">{metric.display}</p></div><Glyph icon={metric.icon} className="h-4 w-4 text-slate-400" /></div>)}</div>
      {primaryTo ? (
        <button type="button" onClick={() => onOpen(primaryTo)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">{module.primary_action.title}<ArrowRight className="h-4 w-4" /></button>
      ) : null}
      {secondaryActions.length ? (
        <div className="mt-3 space-y-2">{secondaryActions.map((action) => <button key={action.id} type="button" onClick={() => onOpen(action.to)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"><span>{action.title}</span><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}</div>
      ) : null}
    </article>
  );
};
const TimelineRow: React.FC<{ item: DashboardTimelineItem; onOpen: (to: string) => void }> = ({ item, onOpen }) => <button type="button" onClick={() => item.to && onOpen(item.to)} className="flex w-full items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"><div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p><p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{item.user_name} · {formatWhen(item.created_at)}</p></div><span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', toneClass[item.severity] ?? toneClass.slate)}>{item.category.split('_').join(' ')}</span></button>;

export default Dashboard;
