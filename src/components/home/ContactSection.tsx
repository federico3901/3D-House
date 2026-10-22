"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { useTenant } from "@/lib/store";

/** Contact form. The project and the message can be pre-filled from elsewhere on the page (see askAbout). */
export function ContactSection({ defaultProject = "" }: { defaultProject?: string }) {
  const { brand, projects } = useTenant();
  const { locale, t } = useLocale();
  const [project, setProject] = useState(defaultProject);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "error" | "sent">("idle");

  useEffect(() => {
    const onAsk = (e: Event) => {
      const { project: p, message: m } = (e as CustomEvent<{ project: string; message: string }>).detail;
      setProject(p);
      setMessage(m);
      setState("idle");
    };
    window.addEventListener("cl:ask", onAsk);
    // A request started on another page (the 3D view) waits in this tab's session storage.
    try {
      const pending = sessionStorage.getItem("cl:ask");
      if (pending) {
        sessionStorage.removeItem("cl:ask");
        onAsk(new CustomEvent("cl:ask", { detail: JSON.parse(pending) }));
      }
    } catch {
      /* nothing pending, or storage blocked */
    }
    return () => window.removeEventListener("cl:ask", onAsk);
  }, []);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!String(f.get("name")).trim() || !String(f.get("email")).includes("@") || !f.get("consent")) {
      setState("error");
      return;
    }
    setState("sent");
  };

  return (
    <section id="contatti" className="scroll-mt-20 border-t border-line bg-board">
      <div className="wrap grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
        <div className="grid content-start gap-6">
          <h2 className="display text-[clamp(2rem,4.2vw,3.4rem)]">{t.contact.title}</h2>
          <p className="lead">{t.contact.lead}</p>
          <div className="sheet text-[0.95rem]">
            <div className="sheet-row">
              <span className="text-mute">{t.contact.office}</span>
              <span>{brand.address}</span>
            </div>
            <div className="sheet-row">
              <span className="flex items-center gap-2 text-mute">
                <Icon name="phone" size={16} /> {t.contact.phone}
              </span>
              <span className="num select-all">{brand.phone}</span>
            </div>
            <div className="sheet-row">
              <span className="flex items-center gap-2 text-mute">
                <Icon name="mail" size={16} /> {t.contact.email}
              </span>
              <span className="select-all break-all">{brand.email}</span>
            </div>
          </div>
        </div>

        <form onSubmit={submit} noValidate className="grid gap-4 rounded-[var(--radius)] border border-line bg-board-2 p-5 sm:grid-cols-2 sm:p-7">
          <label className="field">
            <span>{t.contact.name}</span>
            <input id="contact-name" name="name" className="input" autoComplete="name" required />
          </label>
          <label className="field">
            <span>{t.contact.email}</span>
            <input id="contact-email" name="email" type="email" className="input" autoComplete="email" required />
          </label>
          <label className="field">
            <span>{t.contact.phone}</span>
            <input id="contact-phone" name="phone" type="tel" className="input" autoComplete="tel" />
          </label>
          <label className="field">
            <span>{t.contact.interest}</span>
            <select id="contact-project" name="project" className="input" value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">{t.contact.interestNone}</option>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} · {tr(p.subtitle, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="field sm:col-span-2">
            <span>{t.contact.message}</span>
            <textarea
              id="contact-message"
              name="message"
              className="input"
              placeholder={t.contact.messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-3 text-[0.9rem] text-ink-2 sm:col-span-2">
            <input id="contact-consent" name="consent" type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ink)]" />
            {t.contact.consent}
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <button type="submit" className="btn btn-ink">
              {t.contact.send}
              <Icon name="arrow" size={18} />
            </button>
            <p role="status" className="text-[0.9rem]">
              {state === "error" && <span className="text-warn">{t.contact.required}</span>}
              {state === "sent" && (
                <span className="flex items-start gap-2 text-ok">
                  <Icon name="check" size={18} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{t.contact.sent}</strong> <span className="text-ink-2">{t.contact.sentDemo}</span>
                  </span>
                </span>
              )}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

/** Pre-fills the contact form and scrolls to it. */
export function askAbout(project: string, message: string) {
  window.dispatchEvent(new CustomEvent("cl:ask", { detail: { project, message } }));
  document.getElementById("contatti")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
