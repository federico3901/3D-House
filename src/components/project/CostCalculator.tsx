"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { euro, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { ESTIMATES, RULES, purchaseCosts } from "@/lib/purchase";
import type { Project, Unit } from "@/lib/types";

/* What buying an apartment of the project costs: taxes, notary and bank on top of the price, and the mortgage
   payment. The units table opens it on one apartment with calcFor(). */

const YEARS = [10, 15, 20, 25, 30];
const DEFAULT_PRICE = 300000;

/** Opens the calculator on an apartment: from the units table, the 3D view or the apartment sheet. */
export function calcFor(project: string, unit: string) {
  window.dispatchEvent(new CustomEvent("cl:calc", { detail: { project, unit } }));
  document.getElementById("costi")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CostCalculator({ project, initialUnit }: { project: Project; initialUnit?: string }) {
  const { locale, t } = useLocale();
  const c = t.costs;
  const eur = (n: number) => euro(n, locale);
  const pct = (n: number) => formatNumber(n, locale, 2);

  // The apartments one can still buy, the ones with a price first.
  const forSale = project.units.filter((u) => u.status !== "sold");
  const first =
    forSale.find((u) => u.id === initialUnit) ?? forSale.find((u) => u.price && u.status === "available") ?? forSale.find((u) => u.price) ?? forSale[0];
  const [unitId, setUnitId] = useState(first?.id ?? "");
  const [priceText, setPriceText] = useState(String(first?.price ?? DEFAULT_PRICE));
  const [firstHome, setFirstHome] = useState(true);
  const [withLoan, setWithLoan] = useState(true);
  const [down, setDown] = useState(20);
  const [years, setYears] = useState(25);
  const [rateText, setRateText] = useState("3,1");
  const [notaryText, setNotaryText] = useState<string | null>(null);
  const [bankText, setBankText] = useState(String(ESTIMATES.bankFees));

  const pick = (u: Unit | undefined) => {
    setUnitId(u?.id ?? "");
    if (u?.price) setPriceText(String(u.price));
  };

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ project: string; unit: string }>).detail;
      if (d.project === project.slug) pick(project.units.find((u) => u.id === d.unit));
    };
    window.addEventListener("cl:calc", on);
    return () => window.removeEventListener("cl:calc", on);
  });

  const num = (s: string) =>
    Number(
      s
        .replace(/[^\d,.-]/g, "")
        .replace(/\.(?=\d{3}(\D|$))/g, "")
        .replace(",", "."),
    ) || 0;
  const price = num(priceText);
  const loan = withLoan ? Math.round((price * (100 - down)) / 100) : 0;
  const rate = num(rateText);
  const notary = notaryText === null ? ESTIMATES.notarySale + (loan > 0 ? ESTIMATES.notaryLoan : 0) : num(notaryText);
  const r = purchaseCosts({ price, firstHome, loan, years, rate, notary, bankFees: num(bankText) });
  const unit = project.units.find((u) => u.id === unitId);
  const shares = [
    { key: "price", v: price, color: "var(--ink)" },
    { key: "extras", v: r.extras, color: "var(--brand)" },
    { key: "interest", v: r.interest, color: "var(--line-strong)" },
  ] as const;

  const seg = (on: boolean, set: (v: boolean) => void, label: string) => (
    <div className="flex rounded-[var(--radius)] border border-line-strong bg-board p-0.5" role="group" aria-label={label}>
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={on === v}
          onClick={() => set(v)}
          className={`min-h-9 flex-1 rounded-[2px] px-4 text-[0.9rem] font-semibold ${on === v ? "bg-ink text-board" : "text-ink-2 hover:text-ink"}`}
        >
          {v ? c.yes : c.no}
        </button>
      ))}
    </div>
  );

  const row = (label: React.ReactNode, value: number, strong = false) => (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "border-t border-line pt-2.5 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-ink-2"}>{label}</dt>
      <dd className="num whitespace-nowrap">{eur(value)}</dd>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
      {/* Inputs */}
      <form className="grid content-start gap-5 rounded-[var(--radius)] border border-line bg-board p-5" onSubmit={(e) => e.preventDefault()}>
        {forSale.length > 0 && (
          <label className="grid gap-1.5">
            <span className="label text-mute">{c.unit}</span>
            <select
              id={`calc-unit-${project.slug}`}
              className="input"
              value={unitId}
              onChange={(e) => pick(project.units.find((u) => u.id === e.target.value))}
            >
              {forSale.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {t.rooms(u.rooms)} · {u.area} m² · {u.price ? eur(u.price) : c.onRequest}
                </option>
              ))}
              <option value="">{c.custom}</option>
            </select>
          </label>
        )}

        <label className="grid gap-1.5">
          <span className="label text-mute">{c.price}</span>
          <span className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute">€</span>
            <input
              id={`calc-price-${project.slug}`}
              className="input num pl-8 text-[1.05rem]"
              inputMode="numeric"
              value={price ? formatNumber(price, locale) : priceText}
              onChange={(e) => {
                setPriceText(e.target.value.replace(/\D/g, ""));
                if (unit?.price && num(e.target.value) !== unit.price) setUnitId("");
              }}
            />
          </span>
          {unit && !unit.price && <span className="text-[0.82rem] text-mute">{c.priceHelp}</span>}
        </label>

        <div className="grid gap-1.5">
          <span className="label text-mute">{c.firstHome}</span>
          {seg(firstHome, setFirstHome, c.firstHome)}
          <span className="text-[0.82rem] text-mute">{c.firstHomeHelp}</span>
        </div>

        <div className="grid gap-1.5">
          <span className="label text-mute">{c.loan}</span>
          {seg(withLoan, setWithLoan, c.loan)}
        </div>

        {withLoan && (
          <>
            <label className="grid gap-1.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="label text-mute">{c.down}</span>
                <span className="num text-[0.92rem]">
                  {down}% · {eur(price - loan)}
                </span>
              </span>
              <input id={`calc-down-${project.slug}`} type="range" min={10} max={90} step={5} value={down} onChange={(e) => setDown(Number(e.target.value))} />
              {100 - down > RULES.maxLoanShare * 100 && <span className="text-[0.82rem] text-warn">{c.maxLoan}</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5">
                <span className="label text-mute">{c.years}</span>
                <select id={`calc-years-${project.slug}`} className="input" value={years} onChange={(e) => setYears(Number(e.target.value))}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y} {c.yearsUnit}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="label text-mute">{c.rate}</span>
                <span className="relative">
                  <input
                    id={`calc-rate-${project.slug}`}
                    className="input num pr-8"
                    inputMode="decimal"
                    value={rateText}
                    onChange={(e) => setRateText(e.target.value.replace(/[^\d,.]/g, ""))}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mute">%</span>
                </span>
              </label>
            </div>
            <span className="-mt-3 text-[0.82rem] text-mute">{c.rateHelp}</span>
          </>
        )}

        <details className="group rounded-[var(--radius)] border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[0.9rem] font-semibold">
            {c.estimates}
            <Icon name="plus" size={16} className="transition-transform group-open:rotate-45" />
          </summary>
          <div className="grid grid-cols-2 gap-3 border-t border-line p-3">
            <label className="grid gap-1.5">
              <span className="label text-mute">{c.notary}</span>
              <input
                id={`calc-notary-${project.slug}`}
                className="input num"
                inputMode="numeric"
                value={notaryText ?? String(notary)}
                onChange={(e) => setNotaryText(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="label text-mute">{c.bankFees}</span>
              <input
                id={`calc-bank-${project.slug}`}
                className="input num"
                inputMode="numeric"
                value={bankText}
                disabled={!withLoan}
                onChange={(e) => setBankText(e.target.value.replace(/\D/g, ""))}
              />
            </label>
          </div>
        </details>
      </form>

      {/* Results */}
      <div className="grid content-start gap-5" aria-live="polite">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line">
          <div className="grid gap-1 bg-ink p-5 text-board">
            <span className="label text-[#c9cfcb]">{withLoan ? c.payment : c.total}</span>
            <span className="display text-[clamp(1.8rem,3.4vw,2.6rem)]">
              {withLoan ? eur(r.payment) : eur(r.total)}
              {withLoan && <span className="text-[1rem] font-medium">{c.perMonth}</span>}
            </span>
            {withLoan && (
              <span className="text-[0.82rem] text-[#c9cfcb]">
                {eur(loan)} · {years} {c.yearsUnit} · {pct(rate)}%
              </span>
            )}
          </div>
          <div className="grid gap-1 bg-board p-5">
            <span className="label text-mute">{c.upfront}</span>
            <span className="display text-[clamp(1.8rem,3.4vw,2.6rem)]">{eur(r.upfront)}</span>
            <span className="text-[0.82rem] text-mute">{c.upfrontHelp}</span>
          </div>
        </div>

        {/* Where the money goes */}
        <div className="grid gap-2">
          <div className="flex h-3 overflow-hidden rounded-full bg-line" aria-hidden="true">
            {shares.map((s) => (
              <span key={s.key} style={{ width: `${(s.v / Math.max(1, r.total)) * 100}%`, background: s.color }} />
            ))}
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-ink-2">
            {shares
              .filter((s) => s.v > 0)
              .map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {c.bar[s.key]} <span className="num">{eur(s.v)}</span>
                </span>
              ))}
            <span className="ml-auto font-semibold">
              {c.total} <span className="num">{eur(r.total)}</span>
            </span>
          </p>
        </div>

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div className="text-[0.92rem]">
            <h3 className="label mb-1 text-mute">{c.taxes}</h3>
            <dl>
              {row(c.vat(Math.round(r.vatRate * 100)), r.vat)}
              {row(c.fixed, r.fixedTaxes)}
              {row(c.stamps, r.stamps)}
              {row(c.notary, r.notary)}
              {loan > 0 && row(c.loanTax, r.loanTax)}
              {loan > 0 && row(c.bankFees, r.bankFees)}
              {row(c.extras, r.extras, true)}
            </dl>
          </div>
          {loan > 0 && (
            <div className="text-[0.92rem]">
              <h3 className="label mb-1 text-mute">{c.loan}</h3>
              <dl>
                {row(c.loanAmount, loan)}
                {row(c.interest, r.interest)}
                {firstHome && row(c.deduction, r.deduction)}
                {row(c.income, r.income, true)}
              </dl>
              <p className="mt-1 text-[0.8rem] text-mute">{c.incomeHelp}</p>
            </div>
          )}
        </div>

        <p className="flex items-center gap-2 rounded-[var(--radius)] bg-ok-bg px-3 py-2 text-[0.88rem] text-ok">
          <Icon name="check" size={18} />
          {c.noAgency}
        </p>
        <p className="text-[0.8rem] text-mute">{c.note}</p>
      </div>
    </div>
  );
}
