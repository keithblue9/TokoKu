import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { defaultConfig, defaultCredentials } from "./defaultConfig";

const CONFIG_KEY = "tokoku_config_v1";
const CREDS_KEY = "tokoku_credentials_v1";
const SESSION_KEY = "tokoku_session_v1";

// Deep merge default and stored config so newly added fields show up
function mergeDefaults(base, stored) {
  if (!stored || typeof stored !== "object") return base;
  if (Array.isArray(base)) return stored;
  const out = { ...base };
  for (const k of Object.keys(stored)) {
    if (
      stored[k] &&
      typeof stored[k] === "object" &&
      !Array.isArray(stored[k]) &&
      base[k] &&
      typeof base[k] === "object" &&
      !Array.isArray(base[k])
    ) {
      out[k] = mergeDefaults(base[k], stored[k]);
    } else {
      out[k] = stored[k];
    }
  }
  return out;
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    return mergeDefaults(defaultConfig, parsed);
  } catch {
    return defaultConfig;
  }
}

export function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function resetConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

// Credentials
export function loadCredentials() {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) {
      localStorage.setItem(CREDS_KEY, JSON.stringify(defaultCredentials));
      return defaultCredentials;
    }
    return JSON.parse(raw);
  } catch {
    return defaultCredentials;
  }
}

export function saveCredentials(creds) {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

// Session (7 days)
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function createSession(email) {
  const session = { email, expiresAt: Date.now() + SESSION_DURATION_MS };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Pricing computation
export function computePackagePrices(pkg) {
  const calcSell = (modal, marginPct) => {
    const m = Number(marginPct) || 0;
    if (m >= 100) return Number(modal) || 0;
    return Math.round((Number(modal) || 0) / (1 - m / 100));
  };
  const setup = pkg.price_setup_override ?? calcSell(pkg.modal_setup, pkg.margin_setup);
  const monthly =
    pkg.price_domain_monthly_override ??
    calcSell(pkg.modal_domain_monthly, pkg.margin_domain);
  const yearly =
    pkg.price_domain_yearly_override ?? Math.round(monthly * 12 * 0.85); // default 15% off when yearly
  const twoYear =
    pkg.price_domain_2year_override ?? Math.round(monthly * 24 * 0.75); // default 25% off when 2-year

  const monthlyYearTotal = monthly * 12;
  const monthlyTwoYearTotal = monthly * 24;

  const yearlySavingsPct = monthlyYearTotal > 0
    ? Math.round(((monthlyYearTotal - yearly) / monthlyYearTotal) * 100)
    : 0;
  const twoYearSavingsPct = monthlyTwoYearTotal > 0
    ? Math.round(((monthlyTwoYearTotal - twoYear) / monthlyTwoYearTotal) * 100)
    : 0;

  return {
    setup,
    monthly,
    yearly,
    twoYear,
    yearlySavingsPct,
    twoYearSavingsPct,
    yearlySavingsRp: monthlyYearTotal - yearly,
    twoYearSavingsRp: monthlyTwoYearTotal - twoYear,
    totalFirstYearMonthly: setup + monthly * 12,
    totalFirstYearYearly: setup + yearly,
    totalFirstYearTwoYear: setup + twoYear,
    marginSetupRp: setup - (Number(pkg.modal_setup) || 0),
    marginDomainYearlyRp: yearly - (Number(pkg.modal_domain_monthly) || 0) * 12,
  };
}

// React context
const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(() => loadConfig());

  useEffect(() => {
    // Persist whenever config changes
    saveConfig(config);
  }, [config]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CONFIG_KEY && e.newValue) {
        try { setConfig(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSection = useCallback((section, data) => {
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], ...data } }));
  }, []);

  const setSection = useCallback((section, value) => {
    setConfig((prev) => ({ ...prev, [section]: value }));
  }, []);

  const resetAll = useCallback(() => {
    resetConfig();
    setConfig(defaultConfig);
  }, []);

  return (
    <ConfigContext.Provider value={{ config, setConfig, updateSection, setSection, resetAll }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used inside ConfigProvider");
  return ctx;
}

export function formatRupiah(n) {
  const num = Number(n) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

export function waLink(number, message) {
  const clean = (number || "").replace(/[^0-9]/g, "");
  const msg = encodeURIComponent(message || "");
  // If number is just a placeholder (too short), don't generate a real wa.me URL
  if (clean.length < 9) return `https://wa.me/?text=${msg}`;
  return `https://wa.me/${clean}?text=${msg}`;
}

export function isWhatsappConfigured(number) {
  const clean = (number || "").replace(/[^0-9]/g, "");
  return clean.length >= 9;
}
