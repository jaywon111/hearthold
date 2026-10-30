import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export const spring = { type: "spring", stiffness: 420, damping: 38 };
export const quiet = { type: "spring", stiffness: 300, damping: 36 };
export const soft = { type: "spring", stiffness: 260, damping: 34 };

export const money = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

export const fmtAgo = (iso) => {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
};

export const TYPES = { house: "House", land: "Land", commercial: "Commercial" };
export const MODES = { rent: "For rent", sale: "For sale" };
export const CITIES = ["Lagos", "Abuja", "Ibadan"];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de] focus-visible:ring-offset-2";

export function Button({ children, variant = "primary", className = "", ...rest }) {
  const reduce = useReducedMotion();
  const styles = {
    primary: "bg-[#0075de] text-white hover:bg-[#005bab]",
    secondary: "bg-white text-black shadow-card hover:bg-[#f6f5f4]",
    ghost: "text-[#0075de] hover:bg-[#0075de]/10",
    danger: "bg-[#793400] text-white hover:bg-[#5c2600]",
  };
  return (
    <motion.button
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={spring}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 min-h-[44px] text-[15px] font-medium transition-colors ${focusRing} disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function Card({ children, className = "", ...rest }) {
  return (
    <div className={`rounded-xl bg-white border border-[#e6e6e6] shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }) {
  return <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-[#615d59]">{children}</p>;
}

export function Simulated({ children = "Simulation only. No real money moves." }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe9d6] px-2.5 py-1 text-[12px] font-medium text-[#793400]">
      <span className="size-1.5 rounded-full bg-[#dd5b00]" aria-hidden="true" />
      {children}
    </span>
  );
}

export const inputCls = `w-full min-h-[44px] rounded-[4px] border border-[#ddd] bg-white px-3 py-2 text-[15px] text-black ${focusRing}`;

export function Field({ label, children, hint }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[14px] font-medium text-[#31302e]">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-[#615d59]">{hint}</span>}
    </label>
  );
}

// A tray emerges from its trigger: it shares layoutId with the button that opened it.
export function Tray({ open, onClose, title, children, layoutId }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-6"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            layoutId={layoutId}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={spring}
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-tray"
          >
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={onClose}
                aria-label="Close"
                className={`size-10 grid place-items-center rounded-full bg-[#f6f5f4] hover:bg-[#e6e6e6] ${focusRing}`}
              >
                <span aria-hidden="true" className="text-[20px] leading-none">×</span>
              </button>
              <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Count-up number: the value rolls to its new amount instead of snapping.
export function Naira({ value, className = "" }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={soft}
        className={`inline-block tabular-nums ${className}`}
      >
        {money.format(value)}
      </motion.span>
    </AnimatePresence>
  );
}

export function Empty({ title, body, action, actionLabel }) {
  return (
    <Card className="p-8 text-center grid gap-3 justify-items-center">
      <p className="font-display text-[22px] font-semibold">{title}</p>
      {body && <p className="text-[#615d59] max-w-sm">{body}</p>}
      {action && <Button onClick={action}>{actionLabel}</Button>}
    </Card>
  );
}

export function SectionTitle({ eyebrow, title, children }) {
  return (
    <header className="grid gap-2">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="font-display text-[clamp(32px,5vw,56px)] leading-[1.02] font-semibold tracking-[-0.02em]">{title}</h1>
      {children && <p className="text-[#31302e] max-w-2xl text-[16px]">{children}</p>}
    </header>
  );
}

export function Toggle({ value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-[#eae8e5] p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`relative min-h-[40px] px-4 rounded-full text-[14px] font-medium ${focusRing}`}
        >
          {value === v && (
            <motion.span layoutId={`toggle-${label}`} transition={spring} className="absolute inset-0 rounded-full bg-white shadow-card" />
          )}
          <span className="relative">{text}</span>
        </button>
      ))}
    </div>
  );
}
