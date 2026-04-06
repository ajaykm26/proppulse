import { useState, useMemo } from 'react';

interface Props {
  priceCents: number;
}

interface Assumptions {
  purchasePrice: number;
  downPaymentPct: number;
  interestRatePct: number;
  loanTermYears: number;
  monthlyRent: number;
  vacancyPct: number;
  propertyTaxPct: number;
  insuranceMonthly: number;
  maintenancePct: number;
  hoaMonthly: number;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
  tooltip?: string;
}

function MetricCard({ label, value, sub, highlight, positive, negative, tooltip }: MetricCardProps) {
  const bg = highlight
    ? positive
      ? 'bg-green-50 border-green-200'
      : negative
      ? 'bg-red-50 border-red-200'
      : 'bg-blue-50 border-blue-200'
    : 'bg-white border-gray-200';
  const valueColor = highlight
    ? positive
      ? 'text-green-700'
      : negative
      ? 'text-red-700'
      : 'text-blue-700'
    : 'text-gray-900';

  return (
    <div className={`rounded-lg border p-4 ${bg}`} title={tooltip}>
      <div className={`text-lg font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
      {tooltip && (
        <div className="text-xs text-gray-400 mt-1 italic leading-tight">{tooltip}</div>
      )}
    </div>
  );
}

function InputRow({
  label,
  hint,
  prefix,
  suffix,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-semibold text-gray-700">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-gray-400" title={hint}>
            ⓘ
          </span>
        )}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-2.5 text-xs text-gray-500 pointer-events-none">{prefix}</span>
        )}
        <input
          type="number"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full rounded-md border border-gray-300 bg-white py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${prefix ? 'pl-6' : 'pl-2.5'} ${suffix ? 'pr-8' : 'pr-2.5'}`}
        />
        {suffix && (
          <span className="absolute right-2.5 text-xs text-gray-500 pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function calcMortgagePayment(principal: number, annualRatePct: number, termYears: number): number {
  if (annualRatePct <= 0) return principal / (termYears * 12);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

function fmt(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, ...opts }).format(n);
}

function fmtCurrency(n: number): string {
  return fmt(n, { style: 'currency', currency: 'USD' });
}

function fmtPct(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`;
}

export function InvestmentCalculator({ priceCents }: Props) {
  const priceUSD = Math.round(priceCents / 100);

  const [assumptions, setAssumptions] = useState<Assumptions>({
    purchasePrice: priceUSD,
    downPaymentPct: 20,
    interestRatePct: 7.0,
    loanTermYears: 30,
    // Rough default rent: ~0.5% of purchase price (NYC-area rule of thumb)
    monthlyRent: Math.max(1000, Math.round((priceUSD * 0.005) / 50) * 50),
    vacancyPct: 5,
    propertyTaxPct: 1.2,
    insuranceMonthly: 150,
    maintenancePct: 10,
    hoaMonthly: 0,
  });

  function set<K extends keyof Assumptions>(key: K, value: Assumptions[K]) {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  }

  const metrics = useMemo(() => {
    const {
      purchasePrice,
      downPaymentPct,
      interestRatePct,
      loanTermYears,
      monthlyRent,
      vacancyPct,
      propertyTaxPct,
      insuranceMonthly,
      maintenancePct,
      hoaMonthly,
    } = assumptions;

    const downPaymentAmt = purchasePrice * (downPaymentPct / 100);
    const loanAmount = purchasePrice - downPaymentAmt;
    const monthlyMortgage = calcMortgagePayment(loanAmount, interestRatePct, loanTermYears);

    const monthlyTax = (purchasePrice * (propertyTaxPct / 100)) / 12;
    const maintenanceMonthly = monthlyRent * (maintenancePct / 100);
    const vacancyLoss = monthlyRent * (vacancyPct / 100);

    // Operating expenses = everything except mortgage
    const opExpensesMonthly = monthlyTax + insuranceMonthly + maintenanceMonthly + hoaMonthly;

    const effectiveIncome = monthlyRent - vacancyLoss;

    // NOI = effective income - operating expenses (no mortgage)
    const noiMonthly = effectiveIncome - opExpensesMonthly;
    const noiAnnual = noiMonthly * 12;

    const cashFlowMonthly = noiMonthly - monthlyMortgage;
    const cashFlowAnnual = cashFlowMonthly * 12;

    const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
    const cocReturn = downPaymentAmt > 0 ? (cashFlowAnnual / downPaymentAmt) * 100 : 0;
    const dscr = monthlyMortgage > 0 ? noiMonthly / monthlyMortgage : 0;

    const totalMonthlyExpenses = opExpensesMonthly + monthlyMortgage + vacancyLoss;

    return {
      downPaymentAmt,
      loanAmount,
      monthlyMortgage,
      monthlyTax,
      maintenanceMonthly,
      vacancyLoss,
      opExpensesMonthly,
      totalMonthlyExpenses,
      effectiveIncome,
      noiMonthly,
      noiAnnual,
      cashFlowMonthly,
      cashFlowAnnual,
      capRate,
      cocReturn,
      dscr,
    };
  }, [assumptions]);

  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <div className="text-sm font-semibold text-gray-800">📐 Investment Calculator</div>
          <p className="text-xs text-gray-500 mt-0.5">
            Model your returns with customizable assumptions — updates live as you type.
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-6">
          {/* Assumptions */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Assumptions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <InputRow
                label="Purchase Price"
                hint="The price you expect to pay for the property."
                prefix="$"
                value={assumptions.purchasePrice}
                min={0}
                step={1000}
                onChange={(v) => set('purchasePrice', v)}
              />
              <InputRow
                label="Down Payment"
                hint="Percentage of the purchase price paid upfront."
                suffix="%"
                value={assumptions.downPaymentPct}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => set('downPaymentPct', v)}
              />
              <InputRow
                label="Interest Rate"
                hint="Annual mortgage interest rate."
                suffix="%"
                value={assumptions.interestRatePct}
                min={0}
                max={30}
                step={0.05}
                onChange={(v) => set('interestRatePct', v)}
              />
              <InputRow
                label="Loan Term"
                hint="Duration of the mortgage in years."
                suffix="yrs"
                value={assumptions.loanTermYears}
                min={1}
                max={40}
                step={1}
                onChange={(v) => set('loanTermYears', v)}
              />
              <InputRow
                label="Monthly Rent"
                hint="Estimated gross monthly rental income."
                prefix="$"
                value={assumptions.monthlyRent}
                min={0}
                step={50}
                onChange={(v) => set('monthlyRent', v)}
              />
              <InputRow
                label="Vacancy"
                hint="Expected vacancy rate as a % of rent (e.g. 5% = ~18 days/year vacant)."
                suffix="%"
                value={assumptions.vacancyPct}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => set('vacancyPct', v)}
              />
              <InputRow
                label="Property Tax"
                hint="Annual property tax as a % of purchase price."
                suffix="% / yr"
                value={assumptions.propertyTaxPct}
                min={0}
                max={10}
                step={0.05}
                onChange={(v) => set('propertyTaxPct', v)}
              />
              <InputRow
                label="Insurance"
                hint="Monthly homeowner's / landlord insurance premium."
                prefix="$"
                suffix="/ mo"
                value={assumptions.insuranceMonthly}
                min={0}
                step={10}
                onChange={(v) => set('insuranceMonthly', v)}
              />
              <InputRow
                label="Maintenance"
                hint="Monthly repairs & maintenance as a % of gross rent."
                suffix="% rent"
                value={assumptions.maintenancePct}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => set('maintenancePct', v)}
              />
              <InputRow
                label="HOA"
                hint="Monthly homeowner association fee (enter 0 if not applicable)."
                prefix="$"
                suffix="/ mo"
                value={assumptions.hoaMonthly}
                min={0}
                step={25}
                onChange={(v) => set('hoaMonthly', v)}
              />
            </div>
          </div>

          {/* Financing summary */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Financing
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard
                label="Down Payment"
                value={fmtCurrency(metrics.downPaymentAmt)}
                tooltip={`${assumptions.downPaymentPct}% of purchase price`}
              />
              <MetricCard
                label="Loan Amount"
                value={fmtCurrency(metrics.loanAmount)}
                tooltip={`${100 - assumptions.downPaymentPct}% financed`}
              />
              <MetricCard
                label="Monthly Mortgage"
                value={fmtCurrency(metrics.monthlyMortgage)}
                tooltip={`P&I at ${assumptions.interestRatePct}% over ${assumptions.loanTermYears} yrs`}
              />
            </div>
          </div>

          {/* Monthly cash flow breakdown */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Monthly Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard
                label="Gross Rent"
                value={fmtCurrency(assumptions.monthlyRent)}
                tooltip="Estimated rent before vacancy"
              />
              <MetricCard
                label="Vacancy Loss"
                value={`−${fmtCurrency(metrics.vacancyLoss)}`}
                tooltip={`${assumptions.vacancyPct}% of gross rent`}
              />
              <MetricCard
                label="Effective Income"
                value={fmtCurrency(metrics.effectiveIncome)}
                tooltip="Gross rent minus vacancy loss"
              />
              <MetricCard
                label="Property Tax"
                value={`−${fmtCurrency(metrics.monthlyTax)}`}
                tooltip={`${assumptions.propertyTaxPct}% annually on purchase price`}
              />
              <MetricCard
                label="Insurance"
                value={`−${fmtCurrency(assumptions.insuranceMonthly)}`}
              />
              <MetricCard
                label="Maintenance"
                value={`−${fmtCurrency(metrics.maintenanceMonthly)}`}
                tooltip={`${assumptions.maintenancePct}% of gross rent`}
              />
              {assumptions.hoaMonthly > 0 && (
                <MetricCard
                  label="HOA"
                  value={`−${fmtCurrency(assumptions.hoaMonthly)}`}
                />
              )}
              <MetricCard
                label="Operating Expenses"
                value={`−${fmtCurrency(metrics.opExpensesMonthly)}`}
                tooltip="Tax + insurance + maintenance + HOA (excl. mortgage)"
              />
              <MetricCard
                label="Total Outflows"
                value={`−${fmtCurrency(metrics.totalMonthlyExpenses)}`}
                tooltip="All expenses including mortgage and vacancy"
              />
            </div>
          </div>

          {/* Key metrics */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Investment Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="NOI (monthly)"
                value={fmtCurrency(metrics.noiMonthly)}
                sub={`${fmtCurrency(metrics.noiAnnual)} / yr`}
                highlight
                positive={metrics.noiMonthly >= 0}
                negative={metrics.noiMonthly < 0}
                tooltip="Net operating income = effective income − operating expenses (excl. mortgage). Measures the property's income-producing ability."
              />
              <MetricCard
                label="Monthly Cash Flow"
                value={fmtCurrency(metrics.cashFlowMonthly)}
                sub={`${fmtCurrency(metrics.cashFlowAnnual)} / yr`}
                highlight
                positive={metrics.cashFlowMonthly >= 0}
                negative={metrics.cashFlowMonthly < 0}
                tooltip="NOI minus monthly mortgage payment. Positive = money in your pocket each month."
              />
              <MetricCard
                label="Cap Rate"
                value={fmtPct(metrics.capRate)}
                highlight
                positive={metrics.capRate >= 5}
                negative={metrics.capRate < 3}
                tooltip="NOI ÷ purchase price. Measures unlevered yield. A cap rate ≥ 5% is generally attractive in many markets."
              />
              <MetricCard
                label="Cash-on-Cash Return"
                value={fmtPct(metrics.cocReturn)}
                highlight
                positive={metrics.cocReturn >= 6}
                negative={metrics.cocReturn < 0}
                tooltip="Annual cash flow ÷ total cash invested (down payment). Measures the return on your actual out-of-pocket investment."
              />
            </div>

            {/* DSCR row */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="DSCR"
                value={metrics.dscr > 0 ? metrics.dscr.toFixed(2) : '—'}
                highlight
                positive={metrics.dscr >= 1.25}
                negative={metrics.dscr > 0 && metrics.dscr < 1.0}
                tooltip="Debt Service Coverage Ratio = NOI ÷ monthly mortgage. Lenders typically require ≥ 1.25. Below 1.0 means the property does not cover its own debt."
              />
              <div className="col-span-1 sm:col-span-3 flex items-center px-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-700">How to read this:</strong> A positive monthly cash flow means the property generates income after all expenses and debt service. Cap rate reflects unlevered yield; cash-on-cash return reflects return on your equity. DSCR ≥ 1.25 is a common lender threshold for investment properties.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            * All figures are estimates based on your inputs. Consult a licensed financial advisor before making investment decisions.
          </p>
        </div>
      )}
    </div>
  );
}
