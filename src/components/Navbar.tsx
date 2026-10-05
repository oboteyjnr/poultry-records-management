import { useState } from "react";
import { useFarm } from "../context/FarmContext";
import { motion, AnimatePresence } from "framer-motion";
import { Bird, ChevronDown, Shield, LogOut, Settings, Sun, Moon, Activity } from "lucide-react";

export function Navbar() {
  const { data, auth, currentFarm, currentRole, switchFarm, switchUser, canManageFarm, signOut, authEmail, isLive } = useFarm();
  const [farmOpen, setFarmOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [dark, setDark] = useState(false);

  function handleSignOut() {
    setUserOpen(false);
    setFarmOpen(false);
    document.documentElement.classList.remove("dark");
    setDark(false);
    void signOut();
  }

  const farmUsers = data.users.filter(u => u.farmId === auth.currentFarmId);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-emerald-200/20 bg-white/80 backdrop-blur-md dark:bg-slate-900/80 dark:border-slate-700/50">
      <div className="flex items-center justify-between px-4 h-16 max-w-[1600px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md">
            <Bird className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white hidden sm:block">
            Purity Farms
          </span>
        </div>

        {/* Center: Farm Switcher */}
        <div className="relative">
          <button
            onClick={() => setFarmOpen(!farmOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 transition-colors text-sm font-medium"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden md:inline">{currentFarm.name}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <AnimatePresence>
            {farmOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-xl p-1.5"
              >
                {data.farms.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { switchFarm(f.id); setFarmOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${f.id === auth.currentFarmId ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"}`}
                  >
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs opacity-60">{f.location}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Role + User + Theme */}
        <div className="flex items-center gap-2">
          {/* Role Badge */}
          <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            currentRole === "owner" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
            currentRole === "manager" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}>
            <Shield className="w-3 h-3" />
            {currentRole}
          </span>

          {/* User Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold">
                {farmUsers.find(u => u.id === auth.currentUserId)?.name.charAt(0) || "?"}
              </div>
              <span className="hidden lg:inline">{farmUsers.find(u => u.id === auth.currentUserId)?.name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {userOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-xl p-1.5"
                >
                  {authEmail && (
                    <div className="px-3 py-2 mb-1 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                        Signed in as
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-200 truncate">{authEmail}</div>
                    </div>
                  )}
                  <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    {isLive ? "Workspace users" : "Switch User"}
                  </div>
                  {farmUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { switchUser(u.id); setUserOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${u.id === auth.currentUserId ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"}`}
                    >
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs capitalize opacity-60">{u.role}</div>
                    </button>
                  ))}
                  <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Data source status */}
          <span
            className={`hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isLive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
            {isLive ? "Supabase live" : "Demo data"}
          </span>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </nav>
  );
}