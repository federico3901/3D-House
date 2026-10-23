/* What buying a new home from the builder costs in Italy, and the mortgage on it. The seller is the builder, so the
   sale carries IVA (4% on a first home, 10% otherwise; 22% for luxury categories, not handled), and registro,
   ipotecaria and catastale are a fixed 200 € each. Sources: Agenzia delle Entrate, guide «L'acquisto della casa»;
   Consiglio Nazionale del Notariato. The notary's fee and the bank's costs vary: they are estimates the buyer can
   change. */

export const RULES = {
  vatFirstHome: 0.04,
  vat: 0.1,
  /** Registro, ipotecaria and catastale, 200 € each. */
  fixedTaxes: 600,
  /** Imposta di bollo (230 €), tasse ipotecarie (35 €), voltura catastale (55 €). */
  stamps: 320,
  /** Imposta sostitutiva on the mortgage, on the amount lent. */
  loanTaxFirstHome: 0.0025,
  loanTax: 0.02,
  /** Interest on a first-home mortgage: 19% back from IRPEF, on up to 4,000 € a year. */
  deduction: 0.19,
  deductionCap: 4000,
  /** Banks usually lend up to 80% of the value, and want the payment within a third of the net income. */
  maxLoanShare: 0.8,
  incomeShare: 1 / 3,
} as const;

export const ESTIMATES = {
  /** Notary for the deed of sale, and for the mortgage deed when there is one. */
  notarySale: 2500,
  notaryLoan: 1500,
  /** Bank's arrangement fee and valuation. */
  bankFees: 1000,
};

export interface PurchaseInput {
  price: number;
  firstHome: boolean;
  /** Amount lent; 0 = no mortgage. */
  loan: number;
  years: number;
  /** Nominal annual rate (TAN), in percent. */
  rate: number;
  notary: number;
  bankFees: number;
}

export interface PurchaseCosts {
  vatRate: number;
  vat: number;
  fixedTaxes: number;
  stamps: number;
  loanTax: number;
  bankFees: number;
  notary: number;
  /** Taxes, notary and bank: what the purchase costs beyond its price. */
  extras: number;
  payment: number;
  interest: number;
  firstYearInterest: number;
  /** Tax back on the first year's interest (first home only). */
  deduction: number;
  /** Down payment plus every cost due at the deed. */
  upfront: number;
  /** Price, extras and all the interest. */
  total: number;
  /** Net monthly income the bank usually wants for this payment. */
  income: number;
}

/** Monthly payment of a fixed-rate loan repaid in equal instalments (French amortisation). */
export function monthlyPayment(loan: number, years: number, rate: number): number {
  const n = Math.round(years * 12);
  if (loan <= 0 || n <= 0) return 0;
  const r = rate / 100 / 12;
  return r === 0 ? loan / n : (loan * r) / (1 - (1 + r) ** -n);
}

export function purchaseCosts(i: PurchaseInput): PurchaseCosts {
  const price = Math.max(0, i.price);
  const loan = Math.min(Math.max(0, i.loan), price);
  const vatRate = i.firstHome ? RULES.vatFirstHome : RULES.vat;
  const vat = price * vatRate;
  const loanTax = loan * (i.firstHome ? RULES.loanTaxFirstHome : RULES.loanTax);
  const bankFees = loan > 0 ? i.bankFees : 0;
  const payment = monthlyPayment(loan, i.years, i.rate);
  const n = Math.round(i.years * 12);
  const interest = loan > 0 ? payment * n - loan : 0;

  let balance = loan;
  let firstYearInterest = 0;
  const r = i.rate / 100 / 12;
  for (let k = 0; k < Math.min(12, n) && loan > 0; k++) {
    const due = balance * r;
    firstYearInterest += due;
    balance -= payment - due;
  }

  const extras = vat + RULES.fixedTaxes + RULES.stamps + i.notary + loanTax + bankFees;
  return {
    vatRate,
    vat,
    fixedTaxes: RULES.fixedTaxes,
    stamps: RULES.stamps,
    loanTax,
    bankFees,
    notary: i.notary,
    extras,
    payment,
    interest,
    firstYearInterest,
    deduction: i.firstHome && loan > 0 ? RULES.deduction * Math.min(RULES.deductionCap, firstYearInterest) : 0,
    upfront: price - loan + extras,
    total: price + extras + interest,
    income: payment / RULES.incomeShare,
  };
}
