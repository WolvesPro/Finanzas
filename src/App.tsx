import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Zap, Heart, Home, Flame, ShieldAlert, Plus, Trash2,
  CheckCircle2, ArrowUpRight, Server, FileSpreadsheet, RefreshCw,
  DollarSign, Clock, Banknote, Smartphone, Bus, Dog, Smile, Car, Target
} from 'lucide-react';

// ==========================================
// TIPOS DE DATOS
// ==========================================
type PaymentMethod = 'Efectivo' | 'Digital';
type ExpenseType = 'super_sobrante' | 'pasajes_oficina' | 'fuga_finde' | 'fuga_tienda_app' | 'tanda_terceros';

interface QuincenaChecklistItem {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  category: 'hogar' | 'transporte' | 'salud_mascotas' | 'servicios' | 'ahorro';
  note: string;
}

interface Movement {
  id: string;
  description: string;
  amount: number;
  type: ExpenseType;
  method: PaymentMethod;
  date: string;
}

interface ExtraIncome {
  id: string;
  source: string;
  amount: number;
  date: string;
}

interface DebtItem {
  id: string;
  name: string;
  creditor: string;
  balance: number;
  apr: number;
  minPayment: number;
  quitaDiscount: number; // % de descuento estimado en quita
  alertNote: string;
}

interface GoalItem {
  id: string;
  name: string;
  icon: 'boda' | 'casa' | 'carro' | 'emergencia';
  target: number;
  saved: number;
  deadline: string;
}

interface AppState {
  cashPhysical: number;      // $1,300 efectivo hoy 14 oct
  cashDigital: number;       // $820 digital hoy 14 oct
  quincenaApplied: boolean;  // ¿Ya cayó la quincena de mañana ($15,600)?
  quincenaAmount: number;    // $15,600 por quincena
  luzBillTotal: number;      // $3,000 vence 23 de octubre
  luzAbonoReceived: number;  // $1,500 recibidos
  luzAbonoTaken: number;     // $600 tomados del abono
  luzEnvelopeSaved: number;  // $900 actuales -> sube a $3,000 al aplicar quincena
  checklist: QuincenaChecklistItem[];
  movements: Movement[];
  extraIncomes: ExtraIncome[];
  debts: DebtItem[];
  goals: GoalItem[];
}

// ==========================================
// ESTADO INICIAL CALIBRADO AL 14 DE OCTUBRE 2026
// ==========================================
const INITIAL_STATE: AppState = {
  cashPhysical: 1300,
  cashDigital: 820,
  quincenaApplied: false,
  quincenaAmount: 15600,
  luzBillTotal: 3000,
  luzAbonoReceived: 1500,
  luzAbonoTaken: 600,
  luzEnvelopeSaved: 900, // De tus $2,120 de hoy, $900 son el resto del abono de la luz
  checklist: [
    { id: 'c1', name: 'Comida diaria y gastos de Andrea (De ley)', amount: 4000, paid: false, category: 'hogar', note: 'Transferencia quincenal fija a Nu de Andy' },
    { id: 'c2', name: 'Ahorro Fijo Quincenal', amount: 2400, paid: false, category: 'ahorro', note: 'Directo a Cajita intocable (Boda / Patrimonio)' },
    { id: 'c3', name: 'Completar Recibo de Luz CFE (Vence 23 Oct)', amount: 2100, paid: false, category: 'servicios', note: '$1,500 de tu mitad + $600 para reponer lo tomado del abono' },
    { id: 'c4', name: 'Ortodoncia Valentina', amount: 1300, paid: false, category: 'salud_mascotas', note: 'Pago fijo de tratamiento' },
    { id: 'c5', name: 'Telcel (Pago mensual día 14)', amount: 2000, paid: false, category: 'servicios', note: 'Vence en estas fechas (o $1,000 por quincena)' },
    { id: 'c6', name: 'Pasajes y Comidas Trabajo (2 días/semana)', amount: 1000, paid: false, category: 'transporte', note: '~$250 por día ($170+$28+$14 pasajes + comedor $10 a $100)' },
    { id: 'c7', name: 'Gasolina Carro Mazda ($360/semana x 2)', amount: 720, paid: false, category: 'transporte', note: '$360 por semana ($1,440 al mes)' },
    { id: 'c8', name: 'Costal de Croquetas Perros (Cada 15 días)', amount: 640, paid: false, category: 'salud_mascotas', note: '1 costal quincenal ($630 - $650)' },
    { id: 'c9', name: 'Totalplay Internet (Mensual)', amount: 710, paid: false, category: 'servicios', note: 'Cargo mensual aproximado' },
    { id: 'c10', name: 'Reserva Gas LP ($500 cada 2 meses)', amount: 125, paid: false, category: 'servicios', note: 'Apartado quincenal para cuando toque llenar tanque' },
  ],
  movements: [
    // Historial real detectado en Banamex Octubre para referencia de fugas
    { id: 'm1', description: 'DLO UBER EATS (Estado de cuenta Banamex Oct)', amount: 525.66, type: 'fuga_finde', method: 'Digital', date: '2026-09-14' },
    { id: 'm2', description: 'TELCEL RECARGAS FONY ($150 + $15 Banamex Oct)', amount: 165.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-09-24' },
    { id: 'm3', description: 'Google Mountain View Suscripción', amount: 99.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-10-06' },
    { id: 'm4', description: 'UBR FLEX MEXICO', amount: 78.79, type: 'fuga_tienda_app', method: 'Digital', date: '2026-09-11' },
    { id: 'm5', description: 'METEPEC SAN SEBASTIAN CFR (Tienda)', amount: 55.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-10-02' },
    { id: 'm6', description: 'Comisión Adelanto Nómina MINU ($6,277 vs $6,219)', amount: 58.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-09-30' },
  ],
  extraIncomes: [],
  debts: [
    {
      id: 'd1',
      name: 'Domiciliación Belvo-Recotex / TU PRÉSTAMO',
      creditor: 'RFCs: BTE1912023D6 y BME2211039AA',
      balance: 4800,
      apr: 90,
      minPayment: 741,
      quitaDiscount: 50,
      alertNote: '13 intentos rechazados en Banamex (Corte 8 Oct) por $546, $195 y $234 siempre entre 19:37 y 21:40 hrs. Transfiere tu quincena antes de las 18:00 hrs.',
    },
    {
      id: 'd2',
      name: 'Vertrauen Financiera',
      creditor: 'SPEI Transfer',
      balance: 3500,
      apr: 60,
      minPayment: 392.10,
      quitaDiscount: 35,
      alertNote: 'Pagos registrados en septiembre por $350.50 y $41.60.',
    },
  ],
  goals: [
    { id: 'g1', name: 'Boda 14 de Noviembre 2026', icon: 'boda', target: 10000, saved: 0, deadline: '14 Nov 2026 (31 días)' },
    { id: 'g2', name: 'Fondo de Emergencia Familiar', icon: 'emergencia', target: 45000, saved: 0, deadline: 'Meta Continua' },
    { id: 'g3', name: 'Ampliación / Mejoras Hogar Propio', icon: 'casa', target: 150000, saved: 0, deadline: 'Mediano Plazo' },
    { id: 'g4', name: 'Mantenimiento / Cambio de Auto', icon: 'carro', target: 120000, saved: 0, deadline: 'Mediano Plazo' },
  ],
};

const STORAGE_KEY = 'finanzas_alejandro_andy_v8';

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<'quincena' | 'metas_boda' | 'fugas_nu' | 'deudas_quitas' | 'servidor'>('quincena');

  // Formularios
  const [movDesc, setMovDesc] = useState('');
  const [movAmount, setMovAmount] = useState('');
  const [movType, setMovType] = useState<ExpenseType>('super_sobrante');
  const [movMethod, setMovMethod] = useState<PaymentMethod>('Efectivo');

  const [extraSource, setExtraSource] = useState('');
  const [extraAmount, setExtraAmount] = useState('');

  const [nuText, setNuText] = useState('');
  const [serverUrl, setServerUrl] = useState<string>(import.meta.env.VITE_API_URL || 'http://localhost:3001');
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'error'>('local');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Sincronización con tu Laptop Servidor
  const syncWithLaptop = async (mode: 'push' | 'pull') => {
    setSyncStatus('syncing');
    try {
      if (mode === 'push') {
        const res = await fetch(`${serverUrl}/api/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        });
        if (!res.ok) throw new Error('Error push');
      } else {
        const res = await fetch(`${serverUrl}/api/state`);
        if (!res.ok) throw new Error('Error pull');
        const data = await res.json();
        if (data && data.checklist) setState(data);
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  // Cálculos automáticos
  const metrics = useMemo(() => {
    const totalCashNow = state.cashPhysical + state.cashDigital;
    const totalChecklist = state.checklist.reduce((acc, item) => acc + item.amount, 0);
    const totalPaidChecklist = state.checklist.filter((i) => i.paid).reduce((acc, item) => acc + item.amount, 0);
    const pendingChecklist = totalChecklist - totalPaidChecklist;

    // Si ya se aplicó la quincena ($17,720 totales), cuánto sobra para el Súper que haces tú e imprevistos
    const totalPoolWithQuincena = 1300 + 820 + state.quincenaAmount + state.extraIncomes.reduce((a, b) => a + b.amount, 0);
    const sobranteParaSuper = totalPoolWithQuincena - 900 - totalChecklist; // Restando los $900 que ya eran de la luz

    const fugasTotal = state.movements
      .filter((m) => m.type === 'fuga_finde' || m.type === 'fuga_tienda_app')
      .reduce((a, b) => a + b.amount, 0);

    return {
      totalCashNow,
      totalChecklist,
      totalPaidChecklist,
      pendingChecklist,
      sobranteParaSuper,
      fugasTotal,
    };
  }, [state]);

  // Simular o Aplicar la entrada de la Quincena de Mañana ($15,600)
  const handleToggleQuincena = () => {
    if (!state.quincenaApplied) {
      setState((prev) => ({
        ...prev,
        quincenaApplied: true,
        cashDigital: prev.cashDigital + prev.quincenaAmount,
        luzEnvelopeSaved: 3000, // Queda el recibo de $3,000 del 23 de oct 100% blindado
        goals: prev.goals.map((g) =>
          g.id === 'g1' ? { ...g, saved: g.saved + 2400 } : g // Los $2,400 de ahorro fijo impulsan la Boda
        ),
      }));
    } else {
      setState(INITIAL_STATE);
    }
  };

  // Marcar / Desmarcar un pago fijo de la quincena
  const toggleChecklistItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, paid: !item.paid } : item
      ),
    }));
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(movAmount);
    if (!movDesc.trim() || isNaN(val) || val <= 0) return;

    setState((prev) => ({
      ...prev,
      cashPhysical: movMethod === 'Efectivo' ? Math.max(0, prev.cashPhysical - val) : prev.cashPhysical,
      cashDigital: movMethod === 'Digital' ? Math.max(0, prev.cashDigital - val) : prev.cashDigital,
      movements: [
        {
          id: Date.now().toString(),
          description: movDesc.trim(),
          amount: val,
          type: movType,
          method: movMethod,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev.movements,
      ],
    }));
    setMovDesc('');
    setMovAmount('');
  };

  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(extraAmount);
    if (!extraSource.trim() || isNaN(val) || val <= 0) return;

    setState((prev) => ({
      ...prev,
      cashDigital: prev.cashDigital + val,
      extraIncomes: [
        { id: Date.now().toString(), source: extraSource.trim(), amount: val, date: new Date().toISOString().slice(0, 10) },
        ...prev.extraIncomes,
      ],
      goals: prev.goals.map((g) =>
        g.id === 'g1' ? { ...g, saved: Math.min(g.target, g.saved + val) } : g
      ),
    }));
    setExtraSource('');
    setExtraAmount('');
  };

  const handleImportNu = () => {
    const lines = nuText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: Movement[] = [];
    lines.forEach((line, idx) => {
      const clean = line.replace(/\$/g, '').replace(/,/g, ' ');
      const match = clean.match(/(\d+(?:\.\d{1,2})?)\s*$/);
      if (match) {
        const amount = parseFloat(match[1]);
        const desc = line.slice(0, line.lastIndexOf(match[1])).replace(/[,;\t$]/g, ' ').trim();
        if (amount > 0 && desc.length > 1) {
          parsed.push({
            id: `nu-${Date.now()}-${idx}`,
            description: desc,
            amount,
            type: 'fuga_tienda_app',
            method: 'Digital',
            date: new Date().toISOString().slice(0, 10),
          });
        }
      }
    });
    if (parsed.length > 0) {
      setState((prev) => ({ ...prev, movements: [...parsed, ...prev.movements] }));
      setNuText('');
    }
  };

  const formatMXN = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-10 font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                Finanzas Alejandro & Andy • Hogar Propio
              </h1>
              <p className="text-xs text-slate-400">
                Hoy: $1,300 Efvo + $820 Digital ($2,120) • Quincena: $15,600 • Luz 23 Oct: $3,000
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleQuincena}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                state.quincenaApplied
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {state.quincenaApplied
                ? 'Quincena Aplicada ($17,720) • Volver a Hoy'
                : 'Aplicar Quincena de Mañana (+$15,600)'}
            </button>

            <button
              onClick={() => syncWithLaptop('push')}
              className="px-3 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5"
              title="Guardar en mi Laptop Servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">
                {syncStatus === 'synced' ? 'Laptop OK' : 'Sync Laptop'}
              </span>
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN ESCRITORIO */}
        <nav className="hidden md:flex max-w-7xl mx-auto px-4 gap-1 pt-1 overflow-x-auto">
          {[
            { id: 'quincena', label: '1. Mi Quincena, Luz 23 Oct y Gastos Fijos', icon: Zap },
            { id: 'metas_boda', label: '2. Boda 14 Nov ($10,000), Ahorro y Extras', icon: Heart },
            { id: 'fugas_nu', label: '3. Súper, Pasajes, Fugas y Subir Nu', icon: FileSpreadsheet },
            { id: 'deudas_quitas', label: '4. Alertas Banamex (Belvo) y Quitas', icon: ShieldAlert },
            { id: 'servidor', label: '5. Servidor Laptop & Config', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ==========================================
            PESTAÑA 1: QUINCENA, LUZ 23 OCT Y CHECKLIST DE FIJOS
        ========================================== */}
        {activeTab === 'quincena' && (
          <div className="space-y-6">
            {/* TARJETAS SUPERIORES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Efectivo + Digital</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{formatMXN(metrics.totalCashNow)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Efvo: {formatMXN(state.cashPhysical)} | Dig: {formatMXN(state.cashDigital)}
                  </p>
                </div>
                <Banknote className="w-8 h-8 text-emerald-500/30" />
              </div>

              <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4">
                <div className="flex justify-between">
                  <span className="text-xs text-amber-300 uppercase">Sobre Luz CFE (23 Oct)</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {formatMXN(state.luzEnvelopeSaved)} / $3,000
                </p>
                <p className="text-xs text-amber-200/80 mt-1">
                  {state.luzEnvelopeSaved >= 3000
                    ? '¡$3,000 completos ($900 + $2,100)!'
                    : 'Hoy tienes $900 del abono + mañana sumas $2,100'}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 uppercase">Compromisos Quincena</span>
                <p className="text-2xl font-bold text-sky-400 mt-1">{formatMXN(metrics.totalChecklist)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pagados: {formatMXN(metrics.totalPaidChecklist)} | Faltan: {formatMXN(metrics.pendingChecklist)}
                </p>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
                <span className="text-xs text-emerald-300 uppercase">Sobrante para Súper / Libre</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatMXN(metrics.sobranteParaSuper)}</p>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Libre después de cubrir todos los fijos y ahorro
                </p>
              </div>
            </div>

            {/* CHECKLIST INTERACTIVA DE COMPROMISOS DE LA QUINCENA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-base">
                    Checklist de tus Pagos Fijos de esta Quincena (Palomea conforme los apartes o pagues)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Incluye los $4,000 de comida diaria de Andrea, $1,300 de ortodoncia de Valentina, $2,400 de ahorro fijo, pasajes, gasolina y servicios.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      item.paid
                        ? 'bg-emerald-950/20 border-emerald-500/40 opacity-80'
                        : 'bg-slate-800/50 border-slate-700/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.paid}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 accent-emerald-500"
                      />
                      <div>
                        <p className={`text-sm font-medium ${item.paid ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm whitespace-nowrap ${item.paid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formatMXN(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA 2: BODA 14 NOV, AHORRO Y ENTRADAS EXTRA
        ========================================== */}
        {activeTab === 'metas_boda' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleAddExtra} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-400">
                <ArrowUpRight className="w-4 h-4" /> Registrar Ingreso Extra (Desarrollo / Tandas)
              </h3>
              <p className="text-xs text-slate-400">
                Además de tus <strong>$2,400 quincenales de ahorro fijo</strong>, cualquier entrada extra impulsa directo la meta de los <strong>$10,000 de la Boda del 14 de Noviembre</strong>:
              </p>
              <input
                type="text"
                placeholder="Ej. Proyecto desarrollo, Tanda, Bono..."
                value={extraSource}
                onChange={(e) => setExtraSource(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Monto recibido $"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-xl text-sm font-medium">
                Sumar Dinero Extra
              </button>
            </form>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {state.goals.map((g) => {
                const pct = Math.min(100, (g.saved / g.target) * 100);
                return (
                  <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-emerald-400 font-semibold">{g.deadline}</span>
                        <h4 className="font-bold text-base mt-0.5">{g.name}</h4>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatMXN(g.saved)} <span className="text-sm text-slate-400 font-normal">/ {formatMXN(g.target)}</span>
                    </p>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA 3: SÚPER, PASAJES, FUGAS Y SUBIR NU OCTUBRE
        ========================================== */}
        {activeTab === 'fugas_nu' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <form onSubmit={handleAddMovement} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" /> Registrar Súper, Pasaje o Gasto de Fin de Semana
                </h3>
                <input
                  type="text"
                  placeholder="Ej. Súper despensa, Pasajes jueves, Comida domingo..."
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Monto $"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                  />
                  <select
                    value={movMethod}
                    onChange={(e) => setMovMethod(e.target.value as PaymentMethod)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Digital">Digital</option>
                  </select>
                  <select
                    value={movType}
                    onChange={(e) => setMovType(e.target.value as ExpenseType)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs"
                  >
                    <option value="super_sobrante">Súper (Con mi sobrante)</option>
                    <option value="pasajes_oficina">Pasajes + Comedor</option>
                    <option value="fuga_finde">Comida Fin de Semana</option>
                    <option value="fuga_tienda_app">Tienda / App / Recarga</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-xl text-sm font-medium">
                  Guardar Movimiento
                </button>
              </form>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-400">
                  <FileSpreadsheet className="w-4 h-4" /> Pegar Estado de Cuenta Nu Octubre
                </h3>
                <textarea
                  rows={4}
                  value={nuText}
                  onChange={(e) => setNuText(e.target.value)}
                  placeholder="Cuando te den el estado de cuenta de Nu de Octubre, pega aquí los renglones..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-mono"
                />
                <button
                  onClick={handleImportNu}
                  className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded-xl text-xs font-semibold"
                >
                  Analizar e Importar Nu Octubre
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">Bitácora de Movimientos y Fugas</h3>
                <span className="text-xs text-rose-400 font-bold">Fugas: {formatMXN(metrics.fugasTotal)}</span>
              </div>
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {state.movements.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{m.description}</p>
                      <p className="text-xs text-slate-400">{m.date} • {m.method}</p>
                    </div>
                    <span className="font-bold text-sm text-amber-400">{formatMXN(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA 4: DEUDAS, QUITAS Y ALERTAS BANAMEX
        ========================================== */}
        {activeTab === 'deudas_quitas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.debts.map((d) => {
              const quitaPay = d.balance * (1 - d.quitaDiscount / 100);
              return (
                <div key={d.id} className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 space-y-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                    {d.creditor}
                  </span>
                  <h3 className="font-bold text-base">{d.name}</h3>
                  <p className="text-xs text-slate-300">{d.alertNote}</p>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex justify-between">
                    <span>Liquidación estimada con Quita ({d.quitaDiscount}% desc.):</span>
                    <strong className="text-amber-300">{formatMXN(quitaPay)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==========================================
            PESTAÑA 5: SERVIDOR LAPTOP
        ========================================== */}
        {activeTab === 'servidor' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-xl">
            <h3 className="font-semibold flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              Conexión con tu Laptop Servidor
            </h3>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://tu-tunel.trycloudflare.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => syncWithLaptop('push')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded-xl text-xs font-semibold"
              >
                Guardar en mi Laptop
              </button>
              <button
                onClick={() => syncWithLaptop('pull')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 rounded-xl text-xs font-semibold"
              >
                Cargar desde mi Laptop
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BARRA INFERIOR MÓVIL FULL RESPONSIVE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around py-2 z-40">
        {[
          { id: 'quincena', label: 'Quincena', icon: Zap },
          { id: 'metas_boda', label: 'Boda/Ahorro', icon: Heart },
          { id: 'fugas_nu', label: 'Súper/Fugas', icon: FileSpreadsheet },
          { id: 'deudas_quitas', label: 'Deudas', icon: ShieldAlert },
          { id: 'servidor', label: 'Laptop', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${
                activeTab === tab.id ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}