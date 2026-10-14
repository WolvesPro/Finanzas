import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Zap, Heart, ShieldAlert, Plus, Trash2,
  ArrowUpRight, Server, FileSpreadsheet, RefreshCw,
  DollarSign, Banknote, X, BellRing,
  CheckSquare, Flame, PieChart, Sparkles
} from 'lucide-react';

// ==========================================
// TIPOS DE DATOS
// ==========================================
type PaymentMethod = 'Efectivo' | 'Digital';
type ExpenseType =
  | 'andrea_4000'
  | 'super_sobrante'
  | 'pasajes_oficina'
  | 'fuga_finde'
  | 'fuga_tienda_app'
  | 'tanda_terceros';

type AndreaSubcategory =
  | 'Comida Diaria / Mandado'
  | 'Antojo / Tienda / Café'
  | 'Gastos Personales'
  | 'Hogar / Otros';

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
  andreaSubcat?: AndreaSubcategory;
  method: PaymentMethod;
  date: string;
  bank: 'Nu' | 'Banamex' | 'Efectivo';
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
  quitaDiscount: number;
  status: string;
  alertNote: string;
}

interface GoalItem {
  id: string;
  name: string;
  priority: number;
  target: number;
  saved: number;
  deadline: string;
  annualYield: number;
}

interface AppState {
  cashPhysical: number;         // $1,300 efectivo hoy
  cashDigital: number;          // $820 digital hoy
  quincenaApplied: boolean;
  lastQuincenaAmount: number;   // Monto real ingresado en el modal
  andreaBudgetLimit: number;    // $4,000 fijos quincenales de Andrea
  luzBillTotal: number;         // $3,000 vence 23 de octubre
  luzAbonoReceived: number;     // $1,500 recibidos
  luzAbonoTaken: number;        // $600 tomados del abono
  luzEnvelopeSaved: number;     // $900 actuales -> sube a $3,000 con quincena
  domiciliacionReminderActive: boolean;
  checklist: QuincenaChecklistItem[];
  movements: Movement[];
  extraIncomes: ExtraIncome[];
  debts: DebtItem[];
  goals: GoalItem[];
}

// ==========================================
// ESTADO INICIAL COMPLETO (CALIBRADO OCTUBRE 2026)
// ==========================================
const INITIAL_STATE: AppState = {
  cashPhysical: 1300,
  cashDigital: 820,
  quincenaApplied: false,
  lastQuincenaAmount: 15600,
  andreaBudgetLimit: 4000,
  luzBillTotal: 3000,
  luzAbonoReceived: 1500,
  luzAbonoTaken: 600,
  luzEnvelopeSaved: 900,
  domiciliacionReminderActive: true,
  checklist: [
    { id: 'c1', name: 'Comida diaria y gastos de Andrea (De ley)', amount: 4000, paid: false, category: 'hogar', note: 'Habilita la bolsa de $4,000 de Andrea en Pestaña 3' },
    { id: 'c2', name: 'Ahorro Fijo Quincenal (Cascada a Boda/Metas)', amount: 2400, paid: false, category: 'ahorro', note: 'Al marcar este check se suma en vivo a la Pestaña 2 (Boda)' },
    { id: 'c3', name: 'Completar Recibo Luz CFE (Vence 23 Oct)', amount: 2100, paid: false, category: 'servicios', note: '$1,500 de tu mitad + $600 tomados del abono (Bimestral, tocó este mes)' },
    { id: 'c4', name: 'Ortodoncia Valentina', amount: 1300, paid: false, category: 'salud_mascotas', note: 'Pago fijo quincenal de tratamiento' },
    { id: 'c5', name: 'Telcel (Pago mensual día 14)', amount: 2000, paid: false, category: 'servicios', note: 'Pago mensual que cae en estas fechas ($2,000/mes)' },
    { id: 'c6', name: 'Pasajes y Comidas Oficina (2 días/semana)', amount: 1000, paid: false, category: 'transporte', note: '~$250 por día ($170+$28+$14 pasajes + comedor $10 a $100)' },
    { id: 'c7', name: 'Gasolina Carro Mazda ($360/sem x 2)', amount: 720, paid: false, category: 'transporte', note: '$360 a la semana ($1,440 al mes)' },
    { id: 'c8', name: 'Costal Croquetas Perros (Cada 15 días)', amount: 640, paid: false, category: 'salud_mascotas', note: '1 costal quincenal ($630 - $650)' },
    { id: 'c9', name: 'Totalplay Internet', amount: 710, paid: false, category: 'servicios', note: 'Cargo mensual aproximado (~$710)' },
    { id: 'c10', name: 'Reserva Gas LP ($500 cada 2 meses)', amount: 125, paid: false, category: 'servicios', note: 'Apartado quincenal ($250/mes)' },
  ],
  movements: [
    { id: 'm1', description: 'DLO UBER EATS (Auditoría PDF Banamex Oct)', amount: 525.66, type: 'fuga_finde', method: 'Digital', date: '2026-09-14', bank: 'Banamex' },
    { id: 'm2', description: 'TELCEL RECARGAS FONY ($150 + $15 Banamex Oct)', amount: 165.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-09-24', bank: 'Banamex' },
    { id: 'm3', description: 'Google Mountain View Suscripción', amount: 99.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-10-06', bank: 'Banamex' },
    { id: 'm4', description: 'UBR FLEX MEXICO', amount: 78.79, type: 'fuga_tienda_app', method: 'Digital', date: '2026-09-11', bank: 'Banamex' },
    { id: 'm5', description: 'METEPEC SAN SEBASTIAN CFR (Tienda)', amount: 55.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-10-02', bank: 'Banamex' },
    { id: 'm6', description: 'Costo Adelanto Nómina MINU ($6,277 vs $6,219)', amount: 58.00, type: 'fuga_tienda_app', method: 'Digital', date: '2026-09-30', bank: 'Banamex' },
  ],
  extraIncomes: [],
  debts: [
    {
      id: 'd1',
      name: 'Domiciliación Belvo-Recotex / TU PRÉSTAMO',
      creditor: 'RFCs: BTE1912023D6 y BME2211039AA',
      balance: 4800,
      apr: 95,
      minPayment: 741,
      quitaDiscount: 55,
      status: '13 Rechazos en Banamex (19:37 - 21:40 hrs)',
      alertNote: 'Banamex notifica intentos de cobro nocturnos de $546, $195 y $234. Cancela la domiciliación cada vez que Banamex notifique o liquídala con quita.',
    },
    {
      id: 'd2',
      name: 'Vertrauen Financiera',
      creditor: 'SPEI Transfer',
      balance: 3500,
      apr: 60,
      minPayment: 392.10,
      quitaDiscount: 35,
      status: 'Activa en Nu',
      alertNote: 'Pagos detectados en PDF de Nu ($350.50 + $41.60).',
    },
  ],
  goals: [
    { id: 'g1', name: 'Boda 14 de Noviembre 2026', priority: 1, target: 10000, saved: 0, deadline: '14 Nov 2026 (Prioridad #1)', annualYield: 13.0 },
    { id: 'g2', name: 'Fondo de Emergencia Familiar', priority: 2, target: 45000, saved: 0, deadline: 'Prioridad #2 (Se llena al completar Boda)', annualYield: 13.0 },
    { id: 'g3', name: 'Mejoras / Ampliación Hogar Propio', priority: 3, target: 150000, saved: 0, deadline: 'Prioridad #3 (Hogar Propio)', annualYield: 10.0 },
    { id: 'g4', name: 'Mantenimiento Mayor / Cambio de Carro', priority: 4, target: 120000, saved: 0, deadline: 'Prioridad #4 (Automóvil)', annualYield: 10.0 },
  ],
};

const STORAGE_KEY = 'finanzas_alejandro_andy_master_v11';
const SERVER_URL_KEY = 'finanzas_laptop_server_url';

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<'quincena' | 'metas_boda' | 'gastos_graficos' | 'deudas_alertas' | 'servidor_pdf'>('quincena');

  // Modal para ingresar Quincena exacta
  const [showQuincenaModal, setShowQuincenaModal] = useState(false);
  const [quincenaInput, setQuincenaInput] = useState<string>('15600');

  // Estrategia de liquidación de deudas
  const [debtStrategy, setDebtStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraDebtBudget, setExtraDebtBudget] = useState<number>(1000);

  // Formulario de gastos diarios (Incluye opción para Andrea $4,000)
  const [movDesc, setMovDesc] = useState('');
  const [movAmount, setMovAmount] = useState('');
  const [movType, setMovType] = useState<ExpenseType>('andrea_4000');
  const [andreaSubcat, setAndreaSubcat] = useState<AndreaSubcategory>('Comida Diaria / Mandado');
  const [movMethod, setMovMethod] = useState<PaymentMethod>('Digital');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'andrea' | 'alejandro'>('todos');

  // Formulario de entradas de dinero extra
  const [extraSource, setExtraSource] = useState('');
  const [extraAmount, setExtraAmount] = useState('');

  // Configuración del Servidor Laptop y JSON de Corte Mensual por PDF
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return localStorage.getItem(SERVER_URL_KEY) || import.meta.env.VITE_API_URL || '';
  });
  const [syncStatus, setSyncStatus] = useState<'local' | 'synced' | 'syncing' | 'error'>('local');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sin sincronizar aún');
  const [monthlyJsonInput, setMonthlyJsonInput] = useState<string>('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(SERVER_URL_KEY, serverUrl);
  }, [serverUrl]);

  const syncWithLaptop = async (mode: 'push' | 'pull', silent = false) => {
    const cleanUrl = serverUrl.trim().replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) return;

    if (!silent) setSyncStatus('syncing');
    try {
      if (mode === 'push') {
        const res = await fetch(`${cleanUrl}/api/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        });
        if (!res.ok) throw new Error('Error al guardar en laptop');
      } else {
        const res = await fetch(`${cleanUrl}/api/state`);
        if (!res.ok) throw new Error('Error al leer de laptop');
        const data = await res.json();
        if (data && data.checklist) setState(data);
      }
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      if (!silent) setSyncStatus('error');
    }
  };

  useEffect(() => {
    const cleanUrl = serverUrl.trim();
    if (!cleanUrl.startsWith('http')) return;

    const timer = setTimeout(() => {
      syncWithLaptop('push', true);
    }, 2500);

    const interval = setInterval(() => {
      syncWithLaptop('push', true);
    }, 45000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [state, serverUrl]);

  // ==========================================
  // MOTOR DE CASCADA PARA METAS (BODA -> EMERGENCIA -> CASA -> CARRO)
  // ==========================================
  const applyCascadeToGoals = (amountDelta: number, currentGoals: GoalItem[]): GoalItem[] => {
    const copy = currentGoals.map((g) => ({ ...g }));

    if (amountDelta > 0) {
      let rem = amountDelta;
      for (let i = 0; i < copy.length; i++) {
        if (rem <= 0) break;
        const room = Math.max(0, copy[i].target - copy[i].saved);
        if (room > 0) {
          const add = Math.min(room, rem);
          copy[i].saved += add;
          rem -= add;
        } else if (i === copy.length - 1) {
          copy[i].saved += rem;
          rem = 0;
        }
      }
    } else if (amountDelta < 0) {
      let toRemove = Math.abs(amountDelta);
      for (let i = copy.length - 1; i >= 0; i--) {
        if (toRemove <= 0) break;
        const removable = Math.min(copy[i].saved, toRemove);
        copy[i].saved -= removable;
        toRemove -= removable;
      }
    }
    return copy;
  };

  // ==========================================
  // MÉTRICAS Y GRÁFICOS CENTRALES (INCLUYE DESGLOSE DE LOS $4,000 DE ANDREA)
  // ==========================================
  const metrics = useMemo(() => {
    const totalCashNow = state.cashPhysical + state.cashDigital;
    const totalChecklist = state.checklist.reduce((acc, item) => acc + item.amount, 0);
    const paidChecklist = state.checklist.filter((i) => i.paid).reduce((acc, item) => acc + item.amount, 0);
    const pendingChecklist = totalChecklist - paidChecklist;

    const totalExtras = state.extraIncomes.reduce((acc, item) => acc + item.amount, 0);
    const totalSavedInGoals = state.goals.reduce((acc, g) => acc + g.saved, 0);

    // Gastos exclusivos de los $4,000 de Andrea
    const andreaMovements = state.movements.filter((m) => m.type === 'andrea_4000');
    const andreaSpent = andreaMovements.reduce((a, b) => a + b.amount, 0);
    const andreaRemaining = Math.max(0, state.andreaBudgetLimit - andreaSpent);

    const andreaComida = andreaMovements
      .filter((m) => (m.andreaSubcat || 'Comida Diaria / Mandado') === 'Comida Diaria / Mandado')
      .reduce((a, b) => a + b.amount, 0);
    const andreaAntojos = andreaMovements
      .filter((m) => m.andreaSubcat === 'Antojo / Tienda / Café')
      .reduce((a, b) => a + b.amount, 0);
    const andreaPersonales = andreaMovements
      .filter((m) => m.andreaSubcat === 'Gastos Personales')
      .reduce((a, b) => a + b.amount, 0);
    const andreaHogar = andreaMovements
      .filter((m) => m.andreaSubcat === 'Hogar / Otros')
      .reduce((a, b) => a + b.amount, 0);

    // Gastos de Alejandro y generales
    const superSpent = state.movements.filter((m) => m.type === 'super_sobrante').reduce((a, b) => a + b.amount, 0);
    const pasajesSpent = state.movements.filter((m) => m.type === 'pasajes_oficina').reduce((a, b) => a + b.amount, 0);
    const fugasFinde = state.movements.filter((m) => m.type === 'fuga_finde').reduce((a, b) => a + b.amount, 0);
    const fugasTienda = state.movements.filter((m) => m.type === 'fuga_tienda_app').reduce((a, b) => a + b.amount, 0);
    const totalFugas = fugasFinde + fugasTienda;

    const basePool = state.quincenaApplied
      ? 1300 + 820 + state.lastQuincenaAmount + totalExtras
      : 1300 + 820 + totalExtras;
    const sobranteParaTuSuper = state.quincenaApplied
      ? basePool - 900 - totalChecklist - superSpent
      : totalCashNow - state.luzEnvelopeSaved;

    const r = 0.13 / 12;
    const n = 36;
    const fugas3YearsNu = totalFugas * ((Math.pow(1 + r, n) - 1) / r);

    const filteredMovements = state.movements.filter((m) => {
      if (historyFilter === 'andrea') return m.type === 'andrea_4000';
      if (historyFilter === 'alejandro') return m.type !== 'andrea_4000';
      return true;
    });

    return {
      totalCashNow,
      totalChecklist,
      paidChecklist,
      pendingChecklist,
      totalExtras,
      totalSavedInGoals,
      andreaSpent,
      andreaRemaining,
      andreaComida,
      andreaAntojos,
      andreaPersonales,
      andreaHogar,
      superSpent,
      pasajesSpent,
      fugasFinde,
      fugasTienda,
      totalFugas,
      sobranteParaTuSuper,
      fugas3YearsNu,
      basePool,
      filteredMovements,
    };
  }, [state, historyFilter]);

  const orderedDebts = useMemo(() => {
    return [...state.debts].sort((a, b) =>
      debtStrategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance
    );
  }, [state.debts, debtStrategy]);

  // ==========================================
  // ACCIONES DE USUARIO
  // ==========================================
  const handleConfirmQuincenaModal = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(quincenaInput);
    if (isNaN(amount) || amount <= 0) return;

    setState((prev) => ({
      ...prev,
      quincenaApplied: true,
      lastQuincenaAmount: amount,
      cashDigital: prev.cashDigital + amount,
      luzEnvelopeSaved: 3000,
    }));
    setShowQuincenaModal(false);
  };

  const toggleChecklistItem = (id: string) => {
    setState((prev) => {
      const targetItem = prev.checklist.find((i) => i.id === id);
      if (!targetItem) return prev;

      const willBePaid = !targetItem.paid;
      const delta = willBePaid ? targetItem.amount : -targetItem.amount;

      const updatedGoals =
        targetItem.category === 'ahorro'
          ? applyCascadeToGoals(delta, prev.goals)
          : prev.goals;

      const updatedLuz =
        targetItem.id === 'c3'
          ? willBePaid
            ? 3000
            : 900
          : prev.luzEnvelopeSaved;

      return {
        ...prev,
        luzEnvelopeSaved: updatedLuz,
        goals: updatedGoals,
        checklist: prev.checklist.map((item) =>
          item.id === id ? { ...item, paid: willBePaid } : item
        ),
      };
    });
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(movAmount);
    if (!movDesc.trim() || isNaN(val) || val <= 0) return;

    setState((prev) => ({
      ...prev,
      // Si es un gasto de los $4,000 de Andrea, se descuenta de su bolsa de $4,000 sin alterar tu sobrante de efectivo
      cashPhysical:
        movType !== 'andrea_4000' && movMethod === 'Efectivo'
          ? Math.max(0, prev.cashPhysical - val)
          : prev.cashPhysical,
      cashDigital:
        movType !== 'andrea_4000' && movMethod === 'Digital'
          ? Math.max(0, prev.cashDigital - val)
          : prev.cashDigital,
      movements: [
        {
          id: Date.now().toString(),
          description: movDesc.trim(),
          amount: val,
          type: movType,
          andreaSubcat: movType === 'andrea_4000' ? andreaSubcat : undefined,
          method: movMethod,
          date: new Date().toISOString().slice(0, 10),
          bank: movMethod === 'Efectivo' ? 'Efectivo' : 'Nu',
        },
        ...prev.movements,
      ],
    }));
    setMovDesc('');
    setMovAmount('');
  };

  const handleAddExtraIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(extraAmount);
    if (!extraSource.trim() || isNaN(val) || val <= 0) return;

    setState((prev) => ({
      ...prev,
      cashDigital: prev.cashDigital + val,
      extraIncomes: [
        {
          id: Date.now().toString(),
          source: extraSource.trim(),
          amount: val,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev.extraIncomes,
      ],
      goals: applyCascadeToGoals(val, prev.goals),
    }));
    setExtraSource('');
    setExtraAmount('');
  };

  const handleApplyMonthlyJsonFromChat = () => {
    try {
      const parsed = JSON.parse(monthlyJsonInput);
      if (parsed && parsed.checklist) {
        setState(parsed);
        setMonthlyJsonInput('');
      }
    } catch {
      alert('El bloque JSON no es válido. Copia el bloque completo que te dé Gemini cuando subas tus PDFs.');
    }
  };

  const formatMXN = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const ahorroCheckItem = state.checklist.find((i) => i.category === 'ahorro');
  const andreaProgressPct = Math.min(100, (metrics.andreaSpent / state.andreaBudgetLimit) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-10 font-sans">
      {/* ==========================================
          MODAL PARA INGRESAR CANTIDAD EXACTA DE QUINCENA
      ========================================== */}
      {showQuincenaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConfirmQuincenaModal}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Ingresar Depósito de Quincena
              </h2>
              <button
                type="button"
                onClick={() => setShowQuincenaModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Escribe la cantidad exacta que te depositaron de quincena. Se sumará a tu Saldo Digital y dejará apartados los <strong>$3,000 del recibo de Luz del 23 de octubre</strong>.
            </p>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Monto depositado ($ MXN):</label>
              <input
                type="number"
                step="any"
                value={quincenaInput}
                onChange={(e) => setQuincenaInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-xl font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuincenaModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Aplicar Quincena
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          BANNER PERMANENTE DE NOTIFICACIÓN: CANCELAR DOMICILIACIONES BANAMEX
      ========================================== */}
      {state.domiciliacionReminderActive && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-200">
              <BellRing className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
              <span>
                <strong>RECORDATORIO DE PROTECCIÓN BANAMEX:</strong> Cuando Banamex te notifique intentos de cobro de <code>Belvo-Recotex (BTE1912023D6)</code> o <code>TU PRESTAMO (BME2211039AA)</code> (19:37 a 21:40 hrs), recuerda <strong>cancelar la domiciliación en la app</strong> y pasar tu quincena a Nu antes de las 18:00 hrs.
              </span>
            </div>
            <button
              onClick={() => setState((prev) => ({ ...prev, domiciliacionReminderActive: false }))}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold whitespace-nowrap"
            >
              Ocultar por hoy
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          HEADER PRINCIPAL
      ========================================== */}
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
                Efectivo: {formatMXN(state.cashPhysical)} • Digital: {formatMXN(state.cashDigital)} • Auto-Sync: {lastSyncTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuincenaModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
            >
              <DollarSign className="w-4 h-4" />
              {state.quincenaApplied
                ? `Quincena: ${formatMXN(state.lastQuincenaAmount)} (Editar)`
                : 'Registrar Quincena (Abrir Modal)'}
            </button>

            <button
              onClick={() => syncWithLaptop('push')}
              className="px-3 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5"
              title="Sincronizar ahora con la Laptop"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">
                {syncStatus === 'synced' ? 'Auto-Sync OK' : syncStatus === 'error' ? 'Offline' : 'Sync Laptop'}
              </span>
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS (ESCRITORIO) */}
        <nav className="hidden md:flex max-w-7xl mx-auto px-4 gap-1 pt-1 overflow-x-auto">
          {[
            { id: 'quincena', label: '1. Mi Quincena, Luz 23 Oct y Checklist Fijos', icon: CheckSquare },
            { id: 'metas_boda', label: '2. Boda 14 Nov ($10,000), Cascada de Metas y Extras', icon: Heart },
            { id: 'gastos_graficos', label: '3. Bolsa $4,000 Andrea, Gráficos, Súper y Fugas', icon: PieChart },
            { id: 'deudas_alertas', label: '4. Deudas, Quitas y Alertas Domiciliación', icon: ShieldAlert },
            { id: 'servidor_pdf', label: '5. Auto-Sync Laptop & Corte Mensual por PDF', icon: Server },
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
            PESTAÑA 1: QUINCENA, LUZ 23 OCT, GRÁFICO DE BARRA Y CHECKLIST
        ========================================== */}
        {activeTab === 'quincena' && (
          <div className="space-y-6">
            {/* FILA DE TARJETAS KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Efectivo + Digital Hoy</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{formatMXN(metrics.totalCashNow)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Efvo: {formatMXN(state.cashPhysical)} | Dig: {formatMXN(state.cashDigital)}
                  </p>
                </div>
                <Banknote className="w-8 h-8 text-emerald-500/30" />
              </div>

              <div className="bg-pink-950/30 border border-pink-500/40 rounded-2xl p-4">
                <div className="flex justify-between">
                  <span className="text-xs text-pink-300 uppercase">Bolsa $4,000 de Andrea</span>
                  <Heart className="w-4 h-4 text-pink-400" />
                </div>
                <p className="text-2xl font-bold text-pink-400 mt-1">
                  {formatMXN(metrics.andreaRemaining)} libres
                </p>
                <p className="text-xs text-pink-200/80 mt-1">
                  Gastado por Andy: {formatMXN(metrics.andreaSpent)} de $4,000
                </p>
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
                  Abono $1,500 (-$600 tomados = $900) + $2,100 quincena
                </p>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
                <span className="text-xs text-emerald-300 uppercase">Sobrante para Tu Súper</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatMXN(metrics.sobranteParaTuSuper)}</p>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Libre después de cubrir todos los fijos
                </p>
              </div>
            </div>

            {/* GRÁFICO MAESTRO: A DÓNDE SE VA CADA PESO DE TU QUINCENA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  Mapa Visual de tu Dinero (Hogar Propio • Sin Renta)
                </h2>
                <span className="text-xs text-slate-400">
                  Base calculada: {formatMXN(metrics.basePool)}
                </span>
              </div>

              <div className="w-full h-5 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${Math.min(100, (4000 / Math.max(1, metrics.basePool)) * 100)}%` }}
                  className="bg-pink-500"
                  title="Andrea Comida Diaria ($4,000)"
                />
                <div
                  style={{ width: `${Math.min(100, (3000 / Math.max(1, metrics.basePool)) * 100)}%` }}
                  className="bg-amber-500"
                  title="Luz CFE 23 Oct ($3,000)"
                />
                <div
                  style={{ width: `${Math.min(100, (2400 / Math.max(1, metrics.basePool)) * 100)}%` }}
                  className="bg-purple-500"
                  title="Ahorro Fijo a Boda/Metas ($2,400)"
                />
                <div
                  style={{ width: `${Math.min(100, (6495 / Math.max(1, metrics.basePool)) * 100)}%` }}
                  className="bg-indigo-500"
                  title="Valentina ($1,300), Telcel ($2,000), Pasajes ($1,000), Gasolina ($720), Perros ($640), Totalplay ($710)"
                />
                <div
                  style={{ width: `${Math.max(5, (Math.max(0, metrics.sobranteParaTuSuper) / Math.max(1, metrics.basePool)) * 100)}%` }}
                  className="bg-emerald-500"
                  title="Sobrante para Súper e Imprevistos"
                />
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-pink-500" /> Andrea ($4,000)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Luz 23 Oct ($3,000)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500" /> Ahorro Boda/Metas ($2,400)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Valentina, Telcel, Pasajes, Gasolina, Perros, Internet ($6,495)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Tu Sobrante para Súper</span>
              </div>
            </div>

            {/* CHECKLIST INTERACTIVA CONECTADA CON LA PESTAÑA 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-base">
                    Checklist de Compromisos Quincenales (Toca cada tarjeta al pagarla o apartarla)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Al palomear <strong>"Ahorro Fijo Quincenal ($2,400)"</strong>, se suma automáticamente a la barra de la <strong>Boda del 14 de Noviembre</strong> en la Pestaña 2.
                  </p>
                </div>
                {ahorroCheckItem?.paid && (
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
                    ✓ +$2,400 reflejados en Pestaña 2 (Boda)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      item.paid
                        ? 'bg-emerald-950/25 border-emerald-500/50'
                        : 'bg-slate-800/50 border-slate-700/70 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.paid}
                        readOnly
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
            PESTAÑA 2: METAS EN CASCADA (BODA 14 NOV -> EMERGENCIA -> CASA -> CARRO)
        ========================================== */}
        {activeTab === 'metas_boda' && (
          <div className="space-y-6">
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Sistema de Llenado en Cascada Activo
                </h3>
                <p className="text-xs text-slate-300">
                  Todo tu <strong>Ahorro Fijo ($2,400/quincena)</strong> y tus <strong>Entradas Extra</strong> llenan primero la <strong>Meta #1: Boda 14 de Noviembre ($10,000)</strong>. En cuanto llega a $10,000, el excedente pasa automáticamente a llenar la <strong>Meta #2 (Fondo de Emergencia)</strong>, luego <strong>Hogar Propio</strong> y después <strong>Carro</strong>.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Acumulado en Metas</span>
                <p className="text-xl font-bold text-emerald-400">{formatMXN(metrics.totalSavedInGoals)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={handleAddExtraIncome} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" /> Registrar Entrada Extra (Desarrollo / Tanda / Aguinaldo)
                </h3>
                <p className="text-xs text-slate-400">
                  Cada peso extra que registres aquí se inyecta directamente a la cascada de metas:
                </p>
                <input
                  type="text"
                  placeholder="Ej. Pago sistema desarrollo, Tanda, Bono..."
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
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-xs font-bold">
                  Inyectar Dinero Extra a la Cascada
                </button>

                {state.extraIncomes.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-300">Extras recibidos:</p>
                    {state.extraIncomes.map((ex) => (
                      <div key={ex.id} className="flex justify-between text-xs bg-slate-800/50 p-2 rounded-lg">
                        <span>{ex.source}</span>
                        <strong className="text-emerald-400">+{formatMXN(ex.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </form>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {state.goals.map((g) => {
                  const pct = Math.min(100, (g.saved / g.target) * 100);
                  const isCompleted = g.saved >= g.target;
                  return (
                    <div
                      key={g.id}
                      className={`bg-slate-900 border rounded-2xl p-5 space-y-3 ${
                        isCompleted ? 'border-emerald-500/60 bg-emerald-950/10' : 'border-slate-800'
                      }`}
                    >
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
                        {formatMXN(g.saved)}{' '}
                        <span className="text-sm text-slate-400 font-normal">/ {formatMXN(g.target)}</span>
                      </p>

                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>

                      <p className="text-xs text-slate-400">
                        {isCompleted
                          ? '¡Meta completada al 100%! El nuevo ahorro ya está pasando a la siguiente meta.'
                          : `Faltan ${formatMXN(g.target - g.saved)} • Rendimiento Cajita: ${g.annualYield}% anual`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA 3: BOLSA $4,000 DE ANDREA + GRÁFICOS DE TODO + BITÁCORA
        ========================================== */}
        {activeTab === 'gastos_graficos' && (
          <div className="space-y-6">
            {/* BLOQUE EXCLUSIVO PARA ANDREA: RASTREADOR DE SUS $4,000 QUINCENALES */}
            <div className="bg-pink-950/20 border border-pink-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-pink-300 font-bold flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Control Exclusivo de Andrea: ¿En qué se van los $4,000 de la quincena?
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Cada vez que Andrea registre una compra de comida diaria o gasto personal, aquí verá cuánto lleva gastado y cuánto le queda disponible.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-pink-200">Disponible de sus $4,000:</span>
                  <p className="text-2xl font-bold text-pink-400">
                    {formatMXN(metrics.andreaRemaining)}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      (Gastado: {formatMXN(metrics.andreaSpent)})
                    </span>
                  </p>
                </div>
              </div>

              {/* Barra general de los $4,000 de Andrea */}
              <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 transition-all"
                  style={{ width: `${andreaProgressPct}%` }}
                />
              </div>

              {/* 4 Subcategorías de los $4,000 de Andrea */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Comida Diaria / Mandado</span>
                  <p className="text-base font-bold text-pink-300 mt-1">{formatMXN(metrics.andreaComida)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Antojo / Tienda / Café</span>
                  <p className="text-base font-bold text-amber-300 mt-1">{formatMXN(metrics.andreaAntojos)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Gastos Personales</span>
                  <p className="text-base font-bold text-purple-300 mt-1">{formatMXN(metrics.andreaPersonales)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Hogar / Otros</span>
                  <p className="text-base font-bold text-sky-300 mt-1">{formatMXN(metrics.andreaHogar)}</p>
                </div>
              </div>
            </div>

            {/* GRÁFICO DE BARRAS GENERAL Y COSTO DE OPORTUNIDAD DE FUGAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-sky-400" />
                  Gráfico General de Gastos Variables y Fugas
                </h3>
                {[
                  { label: 'Gastos de Andrea (De su bolsa de $4,000)', val: metrics.andreaSpent, color: 'bg-pink-500' },
                  { label: 'Fugas Fin de Semana (Comidas/Salidas)', val: metrics.fugasFinde, color: 'bg-rose-500' },
                  { label: 'Fugas Tiendas, Apps y Micro-Recargas', val: metrics.fugasTienda, color: 'bg-amber-500' },
                  { label: 'Súper y Despensa Hogar (Con tu sobrante)', val: metrics.superSpent, color: 'bg-emerald-500' },
                  { label: 'Pasajes y Comedor Trabajo', val: metrics.pasajesSpent, color: 'bg-sky-500' },
                ].map((bar) => {
                  const maxVal = Math.max(
                    4000,
                    metrics.andreaSpent,
                    metrics.fugasFinde,
                    metrics.fugasTienda,
                    metrics.superSpent,
                    metrics.pasajesSpent
                  );
                  const widthPct = Math.min(100, (bar.val / maxVal) * 100);
                  return (
                    <div key={bar.label} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-300">{bar.label}</span>
                        <strong className="text-white">{formatMXN(bar.val)}</strong>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color}`} style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-rose-300 font-semibold">
                    Impacto Anualizado de las Fugas Detectadas
                  </span>
                  <Flame className="w-5 h-5 text-rose-400" />
                </div>
                <p className="text-3xl font-bold text-rose-400">{formatMXN(metrics.totalFugas)} / mes</p>
                <p className="text-xs text-slate-300">
                  • En 1 año representan: <strong>{formatMXN(metrics.totalFugas * 12)}</strong>
                  <br />• En 3 años invertidos en Cajita Nu (13% anual) serían:{' '}
                  <strong className="text-emerald-400">{formatMXN(metrics.fugas3YearsNu)}</strong>
                </p>
              </div>
            </div>

            {/* FORMULARIO DE REGISTRO Y BITÁCORA CON FILTRO ANDREA / ALEJANDRO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={handleAddMovement} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" /> Registrar Gasto (Andrea o Alejandro)
                </h3>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">¿De qué bolsa sale este gasto?</label>
                  <select
                    value={movType}
                    onChange={(e) => setMovType(e.target.value as ExpenseType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                  >
                    <option value="andrea_4000">💖 Bolsa $4,000 de Andrea (Comida diaria / Sus gastos)</option>
                    <option value="super_sobrante">🛒 Súper Hogar (Con sobrante de Alejandro)</option>
                    <option value="pasajes_oficina">🚌 Pasajes y Comedor Oficina (Alejandro)</option>
                    <option value="fuga_finde">🍕 Fuga Fin de Semana (Restaurantes / Salidas)</option>
                    <option value="fuga_tienda_app">📱 Fuga Tienda / App / Recarga</option>
                  </select>
                </div>

                {movType === 'andrea_4000' && (
                  <div>
                    <label className="text-xs text-pink-300 block mb-1">Subcategoría del gasto de Andrea:</label>
                    <select
                      value={andreaSubcat}
                      onChange={(e) => setAndreaSubcat(e.target.value as AndreaSubcategory)}
                      className="w-full bg-pink-950/30 border border-pink-500/40 rounded-xl px-3 py-2 text-xs text-pink-200"
                    >
                      <option value="Comida Diaria / Mandado">Comida Diaria / Mandado</option>
                      <option value="Antojo / Tienda / Café">Antojo / Tienda / Café</option>
                      <option value="Gastos Personales">Gastos Personales</option>
                      <option value="Hogar / Otros">Hogar / Otros</option>
                    </select>
                  </div>
                )}

                <input
                  type="text"
                  placeholder={
                    movType === 'andrea_4000'
                      ? 'Ej. Pollo y verdura, Tortillas, Comida hoy...'
                      : 'Ej. Súper Aurrerá, Pasajes jueves...'
                  }
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                />

                <div className="grid grid-cols-2 gap-2">
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
                    <option value="Digital">Digital (Tarjeta / SPEI)</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                    movType === 'andrea_4000'
                      ? 'bg-pink-600 hover:bg-pink-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {movType === 'andrea_4000'
                    ? 'Guardar en Bolsa de $4,000 de Andrea'
                    : 'Guardar Gasto'}
                </button>
              </form>

              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">Bitácora de Movimientos</h3>
                  <div className="flex gap-1 bg-slate-800 p-1 rounded-lg text-xs">
                    <button
                      onClick={() => setHistoryFilter('todos')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        historyFilter === 'todos' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setHistoryFilter('andrea')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        historyFilter === 'andrea' ? 'bg-pink-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Solo $4,000 Andrea
                    </button>
                    <button
                      onClick={() => setHistoryFilter('alejandro')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${
                        historyFilter === 'alejandro' ? 'bg-sky-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Súper / Otros
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {metrics.filteredMovements.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border flex justify-between items-center gap-2 ${
                        m.type === 'andrea_4000'
                          ? 'bg-pink-950/20 border-pink-500/30'
                          : 'bg-slate-800/50 border-slate-700/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{m.description}</p>
                          {m.type === 'andrea_4000' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-semibold">
                              Andrea • {m.andreaSubcat || 'Comida Diaria'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {m.date} • {m.method} ({m.bank})
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm ${m.type === 'andrea_4000' ? 'text-pink-400' : 'text-amber-400'}`}>
                          {formatMXN(m.amount)}
                        </span>
                        <button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              movements: prev.movements.filter((x) => x.id !== m.id),
                            }))
                          }
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA 4: DEUDAS (AVALANCHA VS BOLA DE NIEVE VS QUITAS) Y ALERTAS BANAMEX
        ========================================== */}
        {activeTab === 'deudas_alertas' && (
          <div className="space-y-6">
            <div className="bg-rose-950/30 border border-rose-500/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-rose-300 flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-rose-400" />
                  Protocolo Permanente: Cancelación de Domiciliaciones en Banamex
                </h2>
                {!state.domiciliacionReminderActive && (
                  <button
                    onClick={() => setState((prev) => ({ ...prev, domiciliacionReminderActive: true }))}
                    className="text-xs underline text-rose-300"
                  >
                    Reactivar banner superior
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300">
                En tu estado de cuenta de octubre aparecieron <strong>13 intentos rechazados</strong> entre las <strong>19:37 y las 21:40 hrs</strong> de <code>Belvo (BTE1912023D6)</code> y <code>TU PRESTAMO (BME2211039AA)</code> por montos de <strong>$546.00, $195.00 y $234.00</strong>. Siempre que Banamex te envíe notificación de domiciliación activa, entra a cancelar la instrucción domiciliada y transfiere tu quincena temprano.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-base">Simulador de Liquidación: Avalancha vs. Bola de Nieve vs. Quita</h3>
                <div className="flex gap-2 bg-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setDebtStrategy('avalanche')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      debtStrategy === 'avalanche' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Avalancha (Mayor CAT Primero)
                  </button>
                  <button
                    onClick={() => setDebtStrategy('snowball')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      debtStrategy === 'snowball' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Bola de Nieve (Menor Saldo Primero)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 flex justify-between mb-1">
                  <span>Presupuesto mensual extra para liquidar deudas:</span>
                  <strong className="text-emerald-400">{formatMXN(extraDebtBudget)}/mes</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="250"
                  value={extraDebtBudget}
                  onChange={(e) => setExtraDebtBudget(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderedDebts.map((d, idx) => {
                  const quitaPay = d.balance * (1 - d.quitaDiscount / 100);
                  const quitaSave = d.balance - quitaPay;
                  const monthsNormal = Math.ceil(d.balance / (d.minPayment + (idx === 0 ? extraDebtBudget : 0)));
                  return (
                    <div key={d.id} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                          Prioridad #{idx + 1} • CAT {d.apr}%
                        </span>
                        <span className="text-xs text-rose-300">{d.status}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-base">{d.name}</h4>
                        <p className="text-2xl font-bold mt-1">{formatMXN(d.balance)}</p>
                      </div>
                      <p className="text-xs text-slate-300">{d.alertNote}</p>
                      <div className="text-xs text-slate-300 flex justify-between border-t border-slate-700 pt-2">
                        <span>Liquidación normal con abono extra:</span>
                        <strong>~{monthsNormal} meses</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                        <p className="flex justify-between">
                          <span>Liquidación en 1 pago con Quita ({d.quitaDiscount}% desc.):</span>
                          <strong className="text-amber-300">{formatMXN(quitaPay)}</strong>
                        </p>
                        <p className="flex justify-between">
                          <span>Ahorro sobre saldo:</span>
                          <strong className="text-emerald-400">{formatMXN(quitaSave)}</strong>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA 5: AUTO-SYNC LAPTOP + ACTUALIZACIÓN MENSUAL POR PDF
        ========================================== */}
        {activeTab === 'servidor_pdf' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-emerald-400">
                <Server className="w-5 h-5" />
                Auto-Guardado en tu Laptop Servidor
              </h3>
              <p className="text-xs text-slate-400">
                Mientras exista una URL activa aquí abajo, la aplicación <strong>guarda todos tus cambios y los de Andrea automáticamente en tu laptop cada 45 segundos y cada vez que registran un gasto</strong>:
              </p>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://counsel-types-kruger-conference.trycloudflare.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => syncWithLaptop('push')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-xs font-bold"
                >
                  Guardar Ahora en Laptop
                </button>
                <button
                  onClick={() => syncWithLaptop('pull')}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 rounded-xl text-xs font-bold"
                >
                  Descargar desde Laptop
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Última sincronización automática: <strong className="text-emerald-400">{lastSyncTime}</strong>
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-purple-400">
                <FileSpreadsheet className="w-5 h-5" />
                Actualización Mensual por PDF (Con Gemini)
              </h3>
              <p className="text-xs text-slate-300">
                Cada mes, cuando te lleguen los <strong>PDFs de Banamex y Nu (ej. Octubre o Noviembre)</strong>, súbelos aquí en nuestro chat. Yo analizaré todas las hojas y te daré un bloque JSON listo para pegar aquí abajo con un clic:
              </p>
              <textarea
                rows={4}
                value={monthlyJsonInput}
                onChange={(e) => setMonthlyJsonInput(e.target.value)}
                placeholder="Pega aquí el bloque JSON mensual que te genere Gemini cuando subas tus nuevos PDFs..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-mono"
              />
              <button
                onClick={handleApplyMonthlyJsonFromChat}
                className="w-full bg-purple-600 hover:bg-purple-500 py-2.5 rounded-xl text-xs font-bold"
              >
                Aplicar Corte Mensual Auditado
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BARRA INFERIOR MÓVIL FULL RESPONSIVE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around py-2 z-40">
        {[
          { id: 'quincena', label: 'Quincena', icon: CheckSquare },
          { id: 'metas_boda', label: 'Boda/Metas', icon: Heart },
          { id: 'gastos_graficos', label: 'Andy/Gastos', icon: PieChart },
          { id: 'deudas_alertas', label: 'Alertas', icon: BellRing },
          { id: 'servidor_pdf', label: 'Sync/PDF', icon: Server },
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