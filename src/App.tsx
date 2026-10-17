import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Zap, Heart, ShieldAlert, Plus, Trash2,
  ArrowUpRight, Server, FileSpreadsheet, RefreshCw,
  DollarSign, Banknote, X, BellRing,
  CheckSquare, Flame, PieChart, Sparkles, Camera, FileText, Eye
} from 'lucide-react';

// ==========================================
// TIPOS DE DATOS
// ==========================================
type PaymentMethod = 'Efectivo' | 'Digital';

type ExpenseType =
  | 'andrea_4000'
  | 'super_sobrante'
  | 'pasajes_oficina'
  | 'gasolina_carro'
  | 'gas_lp'
  | 'fuga_finde'
  | 'fuga_tienda_app';

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
  payMethod: PaymentMethod;
  category: 'hogar' | 'salud_mascotas' | 'servicios' | 'ahorro';
  note: string;
}

interface Movement {
  id: string;
  description: string;
  itemsDetail?: string;    // Qué se compró exactamente (ej. en el súper o comida)
  receiptPhoto?: string;   // Foto del ticket comprimida en Base64
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
  cashPhysical: number;         // Efectivo disponible en cartera
  cashDigital: number;          // Saldo disponible en cuentas digitales (Nu/Banamex)
  quincenaApplied: boolean;
  lastQuincenaAmount: number;
  andreaBudgetLimit: number;    // $4,000 quincenales de Andrea
  variableBudgets: {
    pasajesOficina: number;     // $1,000 sugeridos por quincena (varía según días y comedor)
    gasolinaCarro: number;      // $720 sugeridos por quincena ($360/sem)
    gasLpBimestral: number;     // $500 cada 2 meses (17 Ago -> 17 Oct)
  };
  gasLpLastRefill: string;      // '2026-10-17' (Duró del 17 Ago al 17 Oct)
  luzBillTotal: number;         // $3,000 vence 23 de octubre
  luzEnvelopeSaved: number;     // $900 del abono -> sube a $3,000 al marcar el check de luz
  domiciliacionReminderActive: boolean;
  checklist: QuincenaChecklistItem[];
  movements: Movement[];
  extraIncomes: ExtraIncome[];
  debts: DebtItem[];
  goals: GoalItem[];
}

// ==========================================
// ESTADO INICIAL CALIBRADO AL 17 DE OCTUBRE 2026
// ==========================================
const INITIAL_STATE: AppState = {
  cashPhysical: 1300,
  cashDigital: 820,
  quincenaApplied: false,
  lastQuincenaAmount: 15600,
  andreaBudgetLimit: 4000,
  variableBudgets: {
    pasajesOficina: 1000,
    gasolinaCarro: 720,
    gasLpBimestral: 500,
  },
  gasLpLastRefill: '2026-10-17',
  luzBillTotal: 3000,
  luzEnvelopeSaved: 900,
  domiciliacionReminderActive: true,
  // SOLO PAGOS FIJOS DE UNA SOLA EXHIBICIÓN (AL PALOMEAR SE DESCUENTAN DE TU SALDO)
  checklist: [
    {
      id: 'c1',
      name: 'Transferir $4,000 a Andrea (Comida diaria y sus gastos)',
      amount: 4000,
      paid: false,
      payMethod: 'Digital',
      category: 'hogar',
      note: 'Al marcarlo se descuenta de tu saldo y fondea la bolsa de $4,000 de Andrea',
    },
    {
      id: 'c2',
      name: 'Ahorro Fijo Quincenal (Cascada a Boda / Metas)',
      amount: 2400,
      paid: false,
      payMethod: 'Digital',
      category: 'ahorro',
      note: 'Al marcarlo se descuenta de tu disponible y se suma a la Boda en Pestaña 2',
    },
    {
      id: 'c3',
      name: 'Apartar Resto de Luz CFE (Vence 23 Oct)',
      amount: 2100,
      paid: false,
      payMethod: 'Digital',
      category: 'servicios',
      note: 'Descuenta $2,100 ($1,500 tuyos + $600 tomados) y deja el sobre Luz en $3,000',
    },
    {
      id: 'c4',
      name: 'Ortodoncia Valentina',
      amount: 1300,
      paid: false,
      payMethod: 'Digital',
      category: 'salud_mascotas',
      note: 'Pago fijo quincenal (se descuenta de tu saldo al marcar)',
    },
    {
      id: 'c5',
      name: 'Pago Mensual Telcel (Día 14)',
      amount: 2000,
      paid: false,
      payMethod: 'Digital',
      category: 'servicios',
      note: 'Se descuenta de tu saldo al marcarlo pagado',
    },
    {
      id: 'c6',
      name: 'Costal Croquetas Perros (Quincenal)',
      amount: 640,
      paid: false,
      payMethod: 'Digital',
      category: 'salud_mascotas',
      note: '1 costal cada 15 días ($630 - $650)',
    },
    {
      id: 'c7',
      name: 'Totalplay Internet',
      amount: 710,
      paid: false,
      payMethod: 'Digital',
      category: 'servicios',
      note: 'Mensualidad internet hogar (~$710)',
    },
  ],
  movements: [
    {
      id: 'gas-oct17',
      description: 'Recarga de Gas LP (Duró 2 meses exactos: 17 Ago al 17 Oct)',
      itemsDetail: 'Carga de Gas LP bimestral. Próxima recarga estimada: 17 de diciembre.',
      amount: 500,
      type: 'gas_lp',
      method: 'Digital',
      date: '2026-10-17',
      bank: 'Nu',
    },
    {
      id: 'm1',
      description: 'DLO UBER EATS (Auditoría PDF Banamex Oct)',
      amount: 525.66,
      type: 'fuga_finde',
      method: 'Digital',
      date: '2026-09-14',
      bank: 'Banamex',
    },
    {
      id: 'm2',
      description: 'TELCEL RECARGAS FONY ($150 + $15 Banamex Oct)',
      amount: 165.0,
      type: 'fuga_tienda_app',
      method: 'Digital',
      date: '2026-09-24',
      bank: 'Banamex',
    },
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
      alertNote: 'Recuerda cancelar la domiciliación cada vez que Banamex notifique intentos nocturnos.',
    },
    {
      id: 'd2',
      name: 'Vertrauen Financiera',
      creditor: 'SPEI Transfer',
      balance: 3500,
      apr: 60,
      minPayment: 392.1,
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

const STORAGE_KEY = 'finanzas_alejandro_andy_master_v12';
const SERVER_URL_KEY = 'finanzas_laptop_server_url';

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<'quincena' | 'metas_boda' | 'gastos_graficos' | 'deudas_alertas' | 'servidor_pdf'>('quincena');

  // Modal de Quincena
  const [showQuincenaModal, setShowQuincenaModal] = useState(false);
  const [quincenaInput, setQuincenaInput] = useState<string>('15600');

  // Modal para ver foto de ticket en grande
  const [previewTicketUrl, setPreviewTicketUrl] = useState<string | null>(null);

  // Deudas
  const [debtStrategy, setDebtStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraDebtBudget, setExtraDebtBudget] = useState<number>(1000);

  // Formulario de Gastos (Pasajes, Gasolina, Gas LP, Súper con Ticket, Andrea $4,000)
  const [movDesc, setMovDesc] = useState('');
  const [movItemsDetail, setMovItemsDetail] = useState('');
  const [movReceiptPhoto, setMovReceiptPhoto] = useState<string | undefined>(undefined);
  const [movAmount, setMovAmount] = useState('');
  const [movType, setMovType] = useState<ExpenseType>('super_sobrante');
  const [andreaSubcat, setAndreaSubcat] = useState<AndreaSubcategory>('Comida Diaria / Mandado');
  const [movMethod, setMovMethod] = useState<PaymentMethod>('Digital');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'andrea' | 'super_variables' | 'fugas'>('todos');

  // Entradas extra
  const [extraSource, setExtraSource] = useState('');
  const [extraAmount, setExtraAmount] = useState('');

  // Servidor Laptop y Corte PDF
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
        if (!res.ok) throw new Error('Error push');
      } else {
        const res = await fetch(`${cleanUrl}/api/state`);
        if (!res.ok) throw new Error('Error pull');
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
    const timer = setTimeout(() => syncWithLaptop('push', true), 2500);
    const interval = setInterval(() => syncWithLaptop('push', true), 45000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [state, serverUrl]);

  // ==========================================
  // COMPRESOR DE FOTO DE TICKET (PARA NO SATURAR MEMORIA NI SERVIDOR)
  // ==========================================
  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 700;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
          setMovReceiptPhoto(compressedBase64);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // CASCADA DE METAS
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
  // MÉTRICAS Y CÁLCULOS EXACTOS EN TIEMPO REAL
  // ==========================================
  const metrics = useMemo(() => {
    const totalCashNow = state.cashPhysical + state.cashDigital;
    const totalChecklist = state.checklist.reduce((acc, item) => acc + item.amount, 0);
    const paidChecklist = state.checklist.filter((i) => i.paid).reduce((acc, item) => acc + item.amount, 0);
    const pendingChecklist = totalChecklist - paidChecklist;

    const totalExtras = state.extraIncomes.reduce((acc, item) => acc + item.amount, 0);
    const totalSavedInGoals = state.goals.reduce((acc, g) => acc + g.saved, 0);

    // Bolsa $4,000 Andrea
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

    // Gastos Variables por Categoría (Se descuentan conforme los agregas en Pestaña 3)
    const pasajesSpent = state.movements.filter((m) => m.type === 'pasajes_oficina').reduce((a, b) => a + b.amount, 0);
    const gasolinaSpent = state.movements.filter((m) => m.type === 'gasolina_carro').reduce((a, b) => a + b.amount, 0);
    const gasLpSpent = state.movements.filter((m) => m.type === 'gas_lp').reduce((a, b) => a + b.amount, 0);
    const superSpent = state.movements.filter((m) => m.type === 'super_sobrante').reduce((a, b) => a + b.amount, 0);

    const fugasFinde = state.movements.filter((m) => m.type === 'fuga_finde').reduce((a, b) => a + b.amount, 0);
    const fugasTienda = state.movements.filter((m) => m.type === 'fuga_tienda_app').reduce((a, b) => a + b.amount, 0);
    const totalFugas = fugasFinde + fugasTienda;

    // Lo que te queda realmente libre hoy si pagas todos los fijos pendientes + reservas de pasajes/gasolina restantes
    const pasajesRemainingReserve = Math.max(0, state.variableBudgets.pasajesOficina - pasajesSpent);
    const gasolinaRemainingReserve = Math.max(0, state.variableBudgets.gasolinaCarro - gasolinaSpent);
    const luzInitial900 = state.checklist.find((i) => i.id === 'c3')?.paid ? 0 : 900;

    const sobranteParaTuSuper =
      totalCashNow - pendingChecklist - luzInitial900 - pasajesRemainingReserve - gasolinaRemainingReserve;

    const r = 0.13 / 12;
    const n = 36;
    const fugas3YearsNu = totalFugas * ((Math.pow(1 + r, n) - 1) / r);

    const filteredMovements = state.movements.filter((m) => {
      if (historyFilter === 'andrea') return m.type === 'andrea_4000';
      if (historyFilter === 'super_variables')
        return ['super_sobrante', 'pasajes_oficina', 'gasolina_carro', 'gas_lp'].includes(m.type);
      if (historyFilter === 'fugas') return ['fuga_finde', 'fuga_tienda_app'].includes(m.type);
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
      pasajesSpent,
      gasolinaSpent,
      gasLpSpent,
      superSpent,
      fugasFinde,
      fugasTienda,
      totalFugas,
      sobranteParaTuSuper,
      fugas3YearsNu,
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
    }));
    setShowQuincenaModal(false);
  };

  // Cambiar método de pago (Digital / Efectivo) de un item de la checklist antes de marcarlo
  const changeChecklistItemMethod = (id: string, method: PaymentMethod, e: React.MouseEvent) => {
    e.stopPropagation();
    setState((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id && !item.paid ? { ...item, payMethod: method } : item
      ),
    }));
  };

  // AL MARCAR UN CHECK: SE DESCUENTA REALMENTE DE TU SALDO DIGITAL O EFECTIVO
  const toggleChecklistItem = (id: string) => {
    setState((prev) => {
      const targetItem = prev.checklist.find((i) => i.id === id);
      if (!targetItem) return prev;

      const willBePaid = !targetItem.paid;
      const amount = targetItem.amount;
      const deltaGoals = willBePaid ? amount : -amount;

      let nextDigital = prev.cashDigital;
      let nextPhysical = prev.cashPhysical;

      if (willBePaid) {
        if (targetItem.payMethod === 'Digital') {
          nextDigital -= amount;
        } else {
          nextPhysical -= amount;
        }
      } else {
        if (targetItem.payMethod === 'Digital') {
          nextDigital += amount;
        } else {
          nextPhysical += amount;
        }
      }

      const updatedGoals =
        targetItem.category === 'ahorro'
          ? applyCascadeToGoals(deltaGoals, prev.goals)
          : prev.goals;

      const updatedLuz =
        targetItem.id === 'c3'
          ? willBePaid
            ? 3000
            : 900
          : prev.luzEnvelopeSaved;

      return {
        ...prev,
        cashDigital: nextDigital,
        cashPhysical: nextPhysical,
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
      // Si es un gasto de los $4,000 de Andrea, sale de su bolsa de $4,000 (que ya descontaste al darle el check a sus $4,000)
      cashPhysical:
        movType !== 'andrea_4000' && movMethod === 'Efectivo'
          ? prev.cashPhysical - val
          : prev.cashPhysical,
      cashDigital:
        movType !== 'andrea_4000' && movMethod === 'Digital'
          ? prev.cashDigital - val
          : prev.cashDigital,
      gasLpLastRefill: movType === 'gas_lp' ? new Date().toISOString().slice(0, 10) : prev.gasLpLastRefill,
      movements: [
        {
          id: Date.now().toString(),
          description: movDesc.trim(),
          itemsDetail: movItemsDetail.trim() || undefined,
          receiptPhoto: movReceiptPhoto,
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
    setMovItemsDetail('');
    setMovReceiptPhoto(undefined);
    setMovAmount('');
  };

  const handleDeleteMovement = (mov: Movement) => {
    setState((prev) => ({
      ...prev,
      // Si borras un gasto tuyo, te devuelve el dinero a tu saldo
      cashPhysical:
        mov.type !== 'andrea_4000' && mov.method === 'Efectivo'
          ? prev.cashPhysical + mov.amount
          : prev.cashPhysical,
      cashDigital:
        mov.type !== 'andrea_4000' && mov.method === 'Digital'
          ? prev.cashDigital + mov.amount
          : prev.cashDigital,
      movements: prev.movements.filter((x) => x.id !== mov.id),
    }));
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
      alert('El bloque JSON no es válido.');
    }
  };

  const formatMXN = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const ahorroCheckItem = state.checklist.find((i) => i.category === 'ahorro');
  const andreaProgressPct = Math.min(100, (metrics.andreaSpent / state.andreaBudgetLimit) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-10 font-sans">
      {/* ==========================================
          MODAL VISOR DE FOTO DE TICKET DEL SÚPER
      ========================================== */}
      {previewTicketUrl && (
        <div
          onClick={() => setPreviewTicketUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-lg w-full space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-emerald-400">Foto del Ticket Guardado</h3>
              <button onClick={() => setPreviewTicketUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewTicketUrl}
              alt="Ticket de compra"
              className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-800"
            />
          </div>
        </div>
      )}

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
              Escribe la cantidad exacta que te depositaron. Se sumará a tu Saldo Digital y, conforme vayas marcando los checks de la Pestaña 1 (Andrea $4,000, Telcel, Luz, etc.), <strong>se irá descontando en vivo de tu saldo</strong>.
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
                Sumar a mi Saldo Digital
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
                <strong>RECORDATORIO BANAMEX:</strong> Cuando Banamex te notifique intentos de cobro de <code>Belvo-Recotex (BTE1912023D6)</code> o <code>TU PRESTAMO (BME2211039AA)</code>, recuerda <strong>cancelar la domiciliación en la app</strong>.
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
                Efectivo: <strong className="text-emerald-400">{formatMXN(state.cashPhysical)}</strong> • Digital:{' '}
                <strong className="text-sky-400">{formatMXN(state.cashDigital)}</strong> • Auto-Sync: {lastSyncTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuincenaModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
            >
              <DollarSign className="w-4 h-4" />
              Registrar Quincena
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
            { id: 'quincena', label: '1. Mi Quincena y Pagos Fijos (Descuentan Saldo)', icon: CheckSquare },
            { id: 'metas_boda', label: '2. Boda 14 Nov ($10,000), Cascada y Extras', icon: Heart },
            { id: 'gastos_graficos', label: '3. Súper (Ticket), Pasajes, Gasolina, Gas y $4k Andy', icon: PieChart },
            { id: 'deudas_alertas', label: '4. Deudas, Quitas y Alertas Domiciliación', icon: ShieldAlert },
            { id: 'servidor_pdf', label: '5. Auto-Sync Laptop & Corte PDF', icon: Server },
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
            PESTAÑA 1: QUINCENA Y CHECKLIST QUE SÍ DESCUENTA DE TU SALDO
        ========================================== */}
        {activeTab === 'quincena' && (
          <div className="space-y-6">
            {/* FILA DE TARJETAS KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Tu Dinero Actual en Caja</span>
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
                  Marca el check de Luz abajo para pasar de $900 a $3,000
                </p>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
                <span className="text-xs text-emerald-300 uppercase">Sobrante Libre para Tu Súper</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatMXN(metrics.sobranteParaTuSuper)}</p>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Descontando fijos pendientes y reserva de pasajes/gasolina
                </p>
              </div>
            </div>

            {/* CHECKLIST DE PAGOS DE UNA EXHIBICIÓN (DESCUENTA EN VIVO DE DIGITAL O EFECTIVO) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-base">
                    Pagos Fijos de una Sola Exhibición (Al marcarlos se descuentan de tu Dinero en Caja)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Nota: <strong>Pasajes de oficina, Gasolina del carro y Gas LP</strong> ahora se registran por separado en la <strong>Pestaña 3</strong> porque varían cada vez que los gastas.
                  </p>
                </div>
                {ahorroCheckItem?.paid && (
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
                    ✓ +$2,400 descontados y enviados a Boda (Pestaña 2)
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
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-slate-400">Descontar de:</span>
                          {(['Digital', 'Efectivo'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={(e) => changeChecklistItemMethod(item.id, m, e)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.payMethod === m
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-sm whitespace-nowrap ${item.paid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.paid ? `-${formatMXN(item.amount)}` : formatMXN(item.amount)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.paid ? 'Ya descontado' : 'Pendiente'}
                      </p>
                    </div>
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
                  Todo tu <strong>Ahorro Fijo ($2,400/quincena)</strong> y tus <strong>Entradas Extra</strong> llenan primero la <strong>Meta #1: Boda 14 de Noviembre ($10,000)</strong>. Cuando llega a $10,000, el excedente pasa automáticamente a llenar el <strong>Fondo de Emergencia</strong>, luego <strong>Hogar Propio</strong> y después <strong>Carro</strong>.
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
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            PESTAÑA 3: SÚPER CON TICKET, PASAJES, GASOLINA, GAS LP Y BOLSA $4,000 ANDREA
        ========================================== */}
        {activeTab === 'gastos_graficos' && (
          <div className="space-y-6">
            {/* MEDIDORES DE PRESUPUESTO VARIABLE: PASAJES OFICINA, GASOLINA CARRO Y GAS LP BIMESTRAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-sky-300 font-bold uppercase">Pasajes y Comidas Oficina</span>
                  <span>
                    {formatMXN(metrics.pasajesSpent)} / {formatMXN(state.variableBudgets.pasajesOficina)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500"
                    style={{ width: `${Math.min(100, (metrics.pasajesSpent / state.variableBudgets.pasajesOficina) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Restan {formatMXN(Math.max(0, state.variableBudgets.pasajesOficina - metrics.pasajesSpent))} de tu presupuesto quincenal (~$250/día).
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300 font-bold uppercase">Gasolina Carro Mazda</span>
                  <span>
                    {formatMXN(metrics.gasolinaSpent)} / {formatMXN(state.variableBudgets.gasolinaCarro)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.min(100, (metrics.gasolinaSpent / state.variableBudgets.gasolinaCarro) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Tope quincenal: $720 ($360 por semana). Registra cada carga abajo.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-orange-300 font-bold uppercase">Gas LP (Ciclo 2 Meses)</span>
                  <span>Pagado Hoy: {formatMXN(metrics.gasLpSpent)}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.min(100, (metrics.gasLpSpent / state.variableBudgets.gasLpBimestral) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Duró del <strong>17 Ago al 17 Oct (2 meses)</strong>. Próxima recarga estimada: <strong>17 Dic 2026</strong>.
                </p>
              </div>
            </div>

            {/* BLOQUE EXCLUSIVO PARA ANDREA: RASTREADOR DE SUS $4,000 QUINCENALES */}
            <div className="bg-pink-950/20 border border-pink-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-pink-300 font-bold flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Control Exclusivo de Andrea: ¿En qué se van los $4,000 de la quincena?
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Aquí Andrea puede ver exactamente cuánto lleva gastado de sus $4,000 y en qué subcategorías.
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

              <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 transition-all" style={{ width: `${andreaProgressPct}%` }} />
              </div>

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

            {/* FORMULARIO CON FOTO DE TICKET Y DETALLE DE ARTÍCULOS + BITÁCORA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={handleAddMovement} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 h-fit">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" /> Registrar Gasto (Descuenta en Vivo)
                </h3>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Categoría del Gasto:</label>
                  <select
                    value={movType}
                    onChange={(e) => setMovType(e.target.value as ExpenseType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                  >
                    <option value="super_sobrante">🛒 Súper / Despensa (Con Foto de Ticket / Qué fue)</option>
                    <option value="pasajes_oficina">🚌 Pasajes y Comidas Oficina (Varía por día)</option>
                    <option value="gasolina_carro">⛽ Gasolina Carro Mazda ($360/sem)</option>
                    <option value="gas_lp">🔥 Gas LP ($500 cada 2 meses)</option>
                    <option value="andrea_4000">💖 Bolsa $4,000 de Andrea (Comida diaria / Sus gastos)</option>
                    <option value="fuga_finde">🍕 Fuga Fin de Semana (Restaurantes / Salidas)</option>
                    <option value="fuga_tienda_app">📱 Fuga Tienda / App / Recarga</option>
                  </select>
                </div>

                {movType === 'andrea_4000' && (
                  <div>
                    <label className="text-xs text-pink-300 block mb-1">Subcategoría de Andrea:</label>
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
                    movType === 'super_sobrante'
                      ? 'Ej. Súper Aurrerá / Walmart quincenal...'
                      : movType === 'pasajes_oficina'
                      ? 'Ej. Ida oficina: $212 pasajes + $60 comedor...'
                      : movType === 'gasolina_carro'
                      ? 'Ej. Carga gasolina semana 1...'
                      : 'Descripción del gasto...'
                  }
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                />

                {/* CAMPO PARA PONER QUÉ FUE EXACTAMENTE (ARTÍCULOS DEL SÚPER O DETALLE DE PASAJES) */}
                <div>
                  <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    ¿Qué se compró o qué incluyó? (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Leche, huevo, papel, jabón, verdura... (o $170 autobús + $28 + $14 + $50 comida)"
                    value={movItemsDetail}
                    onChange={(e) => setMovItemsDetail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs"
                  />
                </div>

                {/* BOTÓN PARA SUBIR O TOMAR FOTO DEL TICKET DEL SÚPER */}
                <div>
                  <label className="text-xs text-slate-300 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-sky-400" /> Foto del Ticket (Cámara o Galería):
                    </span>
                    {movReceiptPhoto && (
                      <button
                        type="button"
                        onClick={() => setMovReceiptPhoto(undefined)}
                        className="text-[10px] text-rose-400 underline"
                      >
                        Quitar foto
                      </button>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleReceiptImageUpload}
                    className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-300 hover:file:bg-slate-700 cursor-pointer"
                  />
                  {movReceiptPhoto && (
                    <img
                      src={movReceiptPhoto}
                      alt="Vista previa ticket"
                      className="mt-2 h-24 w-auto rounded-lg border border-slate-700 object-cover"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Monto $"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold"
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
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition"
                >
                  Guardar Gasto y Descontar
                </button>
              </form>

              {/* BITÁCORA CON VISOR DE TICKET Y DETALLE DE ARTÍCULOS */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">Bitácora de Gastos, Tickets de Súper y Variables</h3>
                  <div className="flex flex-wrap gap-1 bg-slate-800 p-1 rounded-lg text-xs">
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'super_variables', label: 'Súper / Pasajes / Gas' },
                      { id: 'andrea', label: 'Bolsa $4k Andrea' },
                      { id: 'fugas', label: 'Fugas' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setHistoryFilter(f.id as typeof historyFilter)}
                        className={`px-2.5 py-1 rounded-md font-semibold ${
                          historyFilter === f.id ? 'bg-emerald-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {metrics.filteredMovements.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border flex justify-between items-start gap-3 ${
                        m.type === 'andrea_4000'
                          ? 'bg-pink-950/20 border-pink-500/30'
                          : m.type === 'super_sobrante'
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-800/50 border-slate-700/60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{m.description}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                            {m.type === 'super_sobrante'
                              ? '🛒 Súper'
                              : m.type === 'pasajes_oficina'
                              ? '🚌 Pasajes/Oficina'
                              : m.type === 'gasolina_carro'
                              ? '⛽ Gasolina'
                              : m.type === 'gas_lp'
                              ? '🔥 Gas LP'
                              : m.type === 'andrea_4000'
                              ? `💖 Andrea (${m.andreaSubcat || 'Comida'})`
                              : '🍕 Fuga'}
                          </span>
                        </div>

                        {m.itemsDetail && (
                          <p className="text-xs text-slate-300 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                            <strong>Qué fue:</strong> {m.itemsDetail}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-0.5">
                          <span className="text-xs text-slate-400">
                            {m.date} • Pagado con: {m.method}
                          </span>
                          {m.receiptPhoto && (
                            <button
                              type="button"
                              onClick={() => setPreviewTicketUrl(m.receiptPhoto || null)}
                              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver Foto del Ticket
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-amber-400 whitespace-nowrap">
                          {formatMXN(m.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteMovement(m)}
                          className="text-slate-500 hover:text-rose-400"
                          title="Eliminar y devolver saldo"
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
            PESTAÑA 4: DEUDAS Y ALERTAS BANAMEX
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
                Recuerda cancelar siempre en tu app Banamex las domiciliaciones de <code>Belvo (BTE1912023D6)</code> y <code>TU PRESTAMO (BME2211039AA)</code> cuando Banamex te notifique.
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
                    Avalancha (Mayor CAT)
                  </button>
                  <button
                    onClick={() => setDebtStrategy('snowball')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      debtStrategy === 'snowball' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Bola de Nieve (Menor Saldo)
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
                  return (
                    <div key={d.id} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                          Prioridad #{idx + 1} • CAT {d.apr}%
                        </span>
                        <span className="text-xs text-rose-300">{d.status}</span>
                      </div>
                      <h4 className="font-bold text-base">{d.name}</h4>
                      <p className="text-2xl font-bold">{formatMXN(d.balance)}</p>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                        <p className="flex justify-between">
                          <span>Liquidación con Quita ({d.quitaDiscount}% desc.):</span>
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
            PESTAÑA 5: AUTO-SYNC LAPTOP + CORTE MENSUAL POR PDF
        ========================================== */}
        {activeTab === 'servidor_pdf' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-emerald-400">
                <Server className="w-5 h-5" />
                Auto-Guardado en tu Laptop Servidor
              </h3>
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
                Última sincronización: <strong className="text-emerald-400">{lastSyncTime}</strong>
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-purple-400">
                <FileSpreadsheet className="w-5 h-5" />
                Actualización Mensual por PDF (Con Gemini)
              </h3>
              <textarea
                rows={4}
                value={monthlyJsonInput}
                onChange={(e) => setMonthlyJsonInput(e.target.value)}
                placeholder="Pega aquí el bloque JSON mensual cuando me compartas tus PDFs de Banamex o Nu..."
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
          { id: 'gastos_graficos', label: 'Súper/Gastos', icon: PieChart },
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