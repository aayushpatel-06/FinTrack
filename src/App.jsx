import React, { useEffect, useMemo, useState } from "react";
import { auth, db, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,addDoc,query,where,onSnapshot,orderBy,serverTimestamp,doc,deleteDoc,updateDoc,setDoc,
} from "firebase/firestore";

import {
  LogOut,Wallet,Trash2,Settings,Edit2,TrendingUp,TrendingDown,Plus,X,Flame,PieChart as PieIcon,Coins,CreditCard,PartyPopper,IndianRupee,Egg,Bird,Trophy,Utensils,FileText,Download,ChevronDown
} from "lucide-react";

import {
  PieChart,Pie,Cell,Tooltip,AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip as RechartsTooltip,ResponsiveContainer,
} from "recharts";

import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";

/* -----------------------
Reusable Motion Variants
------------------------ */
const fadeUpTwoWay = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: 18, filter: "blur(6px)" },
};

const MotionSection = ({ children, className = "" }) => (
  <motion.section
    className={className}
    variants={fadeUpTwoWay}
    initial="hidden"
    whileInView="show"
    exit="exit"
    viewport={{
      once: false,
      amount: 0.25,
      margin: "0px 0px -120px 0px",
    }}
    transition={{
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    }}
  >
    {children}
  </motion.section>
);

/* -----------------------
Premium Loading Screen
------------------------ */
function LoadingScreen({ quote, theme }) {
  const bg = theme === "dark" ? "bg-[#05060f] text-white" : "bg-[#f7f8ff] text-slate-900";

  return (
    <div className={`min-h-screen flex items-center justify-center overflow-hidden relative ${bg}`}>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-80 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-indigo-600/20 blur-[120px] rounded-full animate-blob" />
        <div className="absolute -bottom-44 -right-44 w-[560px] h-[560px] bg-emerald-500/15 blur-[120px] rounded-full animate-blob [animation-delay:2000ms]" />
        <div className="absolute top-[30%] right-[25%] w-[320px] h-[320px] bg-fuchsia-500/12 blur-[100px] rounded-full animate-blob [animation-delay:4000ms]" />
      </div>

      {/* Grid overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          theme === "dark" ? "opacity-[0.18]" : "opacity-[0.12]"
        }`}
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Center */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* spinner */}
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-0 rounded-full border-t-2 border-indigo-300 animate-spin" />
          <div className="absolute inset-2 rounded-full border-t-2 border-emerald-300 animate-spin [animation-duration:1.6s]" />
          <div className="absolute inset-4 rounded-full border-t-2 border-fuchsia-300 animate-spin [animation-duration:2.1s]" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 rounded-3xl bg-white/10 border border-white/10 shadow-[0_0_70px_rgba(99,102,241,0.25)]">
              <Wallet size={34} className="text-white" strokeWidth={2.6} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Fin<span className="text-emerald-400">Track</span>
          </h1>
          <p className="mt-2 text-xs font-black tracking-[0.35em] text-white/60 uppercase min-h-[16px]">
            {quote}
          </p>
        </div>

        {/* Tiny loader dots */}
        <div className="flex gap-2">
          <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce [animation-delay:-0.25s]" />
          <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce [animation-delay:-0.1s]" />
          <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce" />
        </div>
      </div>
    </div>
  );
}

function ThemeToggleIOS({ theme, setTheme }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`relative w-[56px] h-[32px] rounded-full border transition-all duration-300 flex items-center px-[3px] active:scale-95 ${
        isDark
          ? "bg-white/10 border-white/15"
          : "bg-black/5 border-slate-300"
      }`}
    >
      {/* Knob */}
      <span
        className={`absolute top-[3px] w-[26px] h-[26px] rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${
          isDark
            ? "left-[27px] bg-white text-black"
            : "left-[3px] bg-slate-900 text-white"
        }`}
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {/* subtle glow */}
      <span
        className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
        style={{
          boxShadow: "0 0 25px rgba(99,102,241,0.18)",
        }}
      />
    </button>
  );
}

export default function App() {
  /* -----------------------
     THEME SWITCH
  ------------------------ */
  const [theme, setTheme] = useState(() => localStorage.getItem("fintrack_theme") || "dark");
  useEffect(() => {
    localStorage.setItem("fintrack_theme", theme);
  }, [theme]);

  const T = {
    page: theme === "dark" ? "bg-[#070A12] text-white" : "bg-[#f7f8ff] text-slate-900",
    pageLogin:
      theme === "dark" ? "bg-[#05060f] text-white" : "bg-[#f7f8ff] text-slate-900",
    header:
      theme === "dark"
        ? "border-b border-white/10 bg-black/35 backdrop-blur-xl"
        : "border-b border-slate-200 bg-white/70 backdrop-blur-xl",
    card:
      theme === "dark"
        ? "bg-white/5 border border-white/10"
        : "bg-white border border-slate-200",
    cardSoft:
      theme === "dark"
        ? "bg-black/30 border border-white/10"
        : "bg-slate-50 border border-slate-200",
    muted: theme === "dark" ? "text-white/60" : "text-slate-500",
    muted2: theme === "dark" ? "text-white/50" : "text-slate-400",
    text70: theme === "dark" ? "text-white/70" : "text-slate-700",
    modal:
      theme === "dark"
        ? "bg-[#0b0f1a] border border-white/10 text-white"
        : "bg-white border border-slate-200 text-slate-900",
    input:
      theme === "dark"
        ? "bg-black/30 border border-white/10 placeholder:text-white/20"
        : "bg-white border border-slate-200 placeholder:text-slate-400",
    select:
      theme === "dark"
        ? "bg-black/30 border border-white/10"
        : "bg-white border border-slate-200",
    chip:
      theme === "dark"
        ? "bg-white/10 border border-white/10"
        : "bg-white border border-slate-200",
    floatingCard:
      theme === "dark"
        ? "border border-white/10 bg-white/5 text-white"
        : "border border-slate-200 bg-white text-slate-900",
    buttonPrimary:
      theme === "dark"
        ? "bg-white text-black"
        : "bg-slate-900 text-white hover:bg-slate-800",
  };

  /* -----------------------
     ORIGINAL APP STATE
  ------------------------ */
  const [description, setDescription] = useState("");
  const [user, setUser] = useState(null);
  const [chartView, setChartView] = useState("Week");
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState("");

  const defaultCategories = ["Food", "Travel", "Study", "Fun"];
  const [category, setCategory] = useState("Food");
  const [customCategories, setCustomCategories] = useState([]);

  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [showReportModal, setShowReportModal] = useState(false);

  const [isNeed, setIsNeed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [monthlyBudget, setMonthlyBudget] = useState(10000);
  const [editingId, setEditingId] = useState(null);

  const allBoardCategories = [...defaultCategories, ...customCategories.map((c) => c.name)];

  const hasEntryToday = expenses.some(
    (exp) => exp.createdAt?.toDate().toDateString() === new Date().toDateString()
  );

  const randomQuote = useMemo(() => {
    const quotes = [
      "Bringing you on track...",
      "Finding where the money went...",
      "Separating your Needs from Wants...",
      "Loading your financial empire...",
      "Aligning your financial stars...",
      "Calculating your next big win...",
      "Chasing down every rupee...",
      "Making every coin count...",
      "Fueling up your wallet...",
      "Preparing your success story...",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  // AUTH + EXPENSES
  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const budgetRef = doc(db, "users", currentUser.uid);

        onSnapshot(budgetRef, (docSnap) => {
          if (docSnap.exists()) setMonthlyBudget(docSnap.data().budget || 10000);
        });

        const q = query(
          collection(db, "expenses"),
          where("uid", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setExpenses(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
        });

        return () => unsubscribeData();
      }
    });

    return () => unsubscribe();
  }, []);

  // CUSTOM CATEGORIES
  useEffect(() => {
    if (!user) {
      setCustomCategories([]);
      return;
    }

    const q = query(collection(db, "custom_categories"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCustomCategories(cats);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => signOut(auth);
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  const updateBudget = async (val) => {
    setMonthlyBudget(val);
    const num = parseFloat(val);
    if (user && !isNaN(num) && num >= 1) {
      await setDoc(doc(db, "users", user.uid), { budget: num }, { merge: true });
    }
  };

  // CATEGORY CRUD
  const handleAddCustomCategory = async () => {
    if (!newCatName || defaultCategories.includes(newCatName)) return;
    try {
      await addDoc(collection(db, "custom_categories"), { uid: user.uid, name: newCatName });
      setCategory(newCatName);
      setNewCatName("");
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCategory = async (id) => {
    await deleteDoc(doc(db, "custom_categories", id));
    setCategory(defaultCategories[0]);
  };

  const updateCategory = async (id, newName) => {
    if (!newName) return;
    await updateDoc(doc(db, "custom_categories", id), { name: newName });
  };

  // REPORT
  const getMonthlyReport = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = expenses.filter((e) => {
      const d = e.createdAt?.toDate();
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const spent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percent = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;

    const catTotals = {};
    monthlyExpenses.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    const topCategory =
      Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0] || "None";

    const wantsTotal = monthlyExpenses.filter((e) => !e.isNeed).reduce((s, e) => s + e.amount, 0);
    const needsTotal = monthlyExpenses.filter((e) => e.isNeed).reduce((s, e) => s + e.amount, 0);

    let grade = "A";
    let title = "The Savings Ninja 🥷";
    let advice = "Keep doing what you are doing!";
    let color = "text-emerald-500";

    if (percent > 100) {
      grade = "F";
      title = "The Deficit Dragon 🐉";
      advice = `You've burned through the budget! Stop spending on ${topCategory}!`;
      color = "text-rose-500";
    } else if (percent > 85) {
      grade = "C";
      title = "Living on the Edge 🧗";
      advice = `You are dangerously close. Freeze your "Wants" immediately.`;
      color = "text-orange-500";
    } else if (percent > 50) {
      grade = "B";
      title = "Balanced Bear 🐻";
      advice =
        wantsTotal > needsTotal
          ? `Careful! Your "Wants" are higher than your "Needs".`
          : `Solid month. You are on track.`;
      color = "text-blue-500";
    } else {
      grade = "A+";
      title = "The Wealth Wizard 🧙‍♂️";
      advice = "Incredible discipline! You should invest the surplus.";
      color = "text-emerald-500";
    }

    return {
      month: new Date().toLocaleString("default", { month: "long" }),
      spent,
      remaining: monthlyBudget - spent,
      grade,
      title,
      advice,
      color,
      topCategory,
      wantsTotal,
      needsTotal,
    };
  };

  const downloadReportPDF = () => {
    const report = getMonthlyReport();
    const docu = new jsPDF();

    const titleWithoutEmoji = report.title.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    );

    docu.setFontSize(22);
    docu.setTextColor(40, 40, 40);
    docu.text(`FinTrack Report: ${report.month}`, 20, 20);

    docu.setFontSize(16);
    docu.text(`Financial Grade: ${report.grade}`, 20, 40);

    docu.setFontSize(14);
    docu.setTextColor(100, 100, 100);
    docu.text(`Status: ${titleWithoutEmoji}`, 20, 50);

    docu.setDrawColor(200, 200, 200);
    docu.line(20, 60, 190, 60);

    docu.setFontSize(12);
    docu.setTextColor(0, 0, 0);

    docu.text(`Total Spent: ${report.spent.toLocaleString()}`, 20, 75);
    docu.text(`Remaining Budget: ${report.remaining.toLocaleString()}`, 110, 75);

    docu.text(`Highest Spending: ${report.topCategory}`, 20, 85);
    docu.text(`Wants Spending: ${report.wantsTotal.toLocaleString()}`, 110, 85);

    docu.setFontSize(14);
    docu.setTextColor(0, 80, 200);
    docu.text(`AI Suggestion:`, 20, 105);

    docu.setFontSize(12);
    docu.setTextColor(60, 60, 60);
    const splitAdvice = docu.splitTextToSize(report.advice, 170);
    docu.text(splitAdvice, 20, 115);

    docu.setFontSize(10);
    docu.setTextColor(150, 150, 150);
    docu.text("Generated by FinTrack", 20, 280);

    docu.save(`FinTrack_Report_${report.month}.pdf`);
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setIsNeed(exp.isNeed);
    setDescription(exp.description || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!amount || numAmount < 1) {
      alert("Please enter a positive amount greater than 1");
      return;
    }
    if (!user) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, "expenses", editingId), {
          amount: numAmount,
          category,
          isNeed,
          description,
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, "expenses"), {
          uid: user.uid,
          amount: numAmount,
          category,
          isNeed,
          description,
          createdAt: serverTimestamp(),
        });
      }

      setAmount("");
      setDescription("");
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteExpense = async (id) => {
    await deleteDoc(doc(db, "expenses", id));
  };

  // Stats
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = (parseFloat(monthlyBudget) || 0) - totalSpent;
  const percentageUsed = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = lastDayOfMonth - today.getDate() + 1;
  const safeToSpendToday =
    remainingBalance > 0 ? (remainingBalance / daysRemaining).toFixed(0) : 0;

  // Streak
  const getStreak = () => {
    if (expenses.length === 0) return 0;
    const uniqueDates = [...new Set(expenses.map((e) => e.createdAt?.toDate().toDateString()))];
    const sortedDates = uniqueDates.map((d) => new Date(d)).sort((a, b) => b - a);

    if (sortedDates.length === 0) return 0;

    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const yesterday = new Date(t);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastEntry = sortedDates[0];
    lastEntry.setHours(0, 0, 0, 0);

    if (lastEntry < yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const curr = sortedDates[i];
      const next = sortedDates[i + 1];
      const diffTime = Math.abs(curr - next);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  };

  // Pet
  const getPetState = () => {
    const streak = getStreak();

    if (streak < 3)
      return {
        stage: "Egg",
        name: "Budget Egg",
        icon: Egg,
        color: theme === "dark" ? "text-slate-200" : "text-slate-700",
        bg: theme === "dark" ? "bg-white/10" : "bg-white border border-slate-200",
        msg: hasEntryToday ? "Warm & happy!" : "I'm cold! Add expense!",
        desc: "Keep the streak to hatch it.",
      };

    if (streak < 10)
      return {
        stage: "Chick",
        name: "Coin Chick",
        icon: Bird,
        color: theme === "dark" ? "text-yellow-300" : "text-yellow-600",
        bg: theme === "dark" ? "bg-yellow-500/10" : "bg-yellow-50 border border-yellow-200",
        msg: hasEntryToday ? "Yum! Thanks!" : "Feed me data!",
        desc: "Growing stronger everyday.",
      };

    return {
      stage: "Master",
      name: "Wealth Eagle",
      icon: Trophy,
      color: theme === "dark" ? "text-indigo-200" : "text-indigo-700",
      bg: theme === "dark" ? "bg-indigo-500/10" : "bg-indigo-50 border border-indigo-200",
      msg: hasEntryToday ? "Excellent work." : "Maintain discipline.",
      desc: "You mastered the rhythm.",
    };
  };

  const pet = getPetState();
  const PetIcon = pet.icon;

  // Charts
  const chartData = [
    {
      name: "Needs",
      value: expenses.filter((e) => e.isNeed).reduce((s, i) => s + i.amount, 0) || 0,
    },
    {
      name: "Wants",
      value: expenses.filter((e) => !e.isNeed).reduce((s, i) => s + i.amount, 0) || 0,
    },
  ];
  const COLORS = ["#10b981", "#f43f5e"];

  const getGraphData = () => {
    const data = [];
    const t = new Date();

    if (chartView === "Week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(t.getDate() - i);
        const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
        const value = expenses
          .filter((e) => e.createdAt?.toDate().toDateString() === d.toDateString())
          .reduce((sum, e) => sum + e.amount, 0);
        data.push({ name: dayStr, value });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(t.getMonth() - i);
        const monthStr = d.toLocaleDateString("en-US", { month: "short" });

        const value = expenses
          .filter((e) => {
            const dt = e.createdAt?.toDate();
            return dt && dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
          })
          .reduce((sum, e) => sum + e.amount, 0);

        data.push({ name: monthStr, value });
      }
    }
    return data;
  };

  /* -----------------------
     RENDER
  ------------------------ */
  if (loading) return <LoadingScreen quote={randomQuote} theme={theme} />;

  // NOT LOGGED IN
  if (!user) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center relative overflow-hidden p-6 ${T.pageLogin}`}
      >
        {/* Animated blob background */}
        <div className="absolute inset-0 opacity-90 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[620px] h-[620px] rounded-full bg-indigo-600/25 blur-[140px] animate-blob" />
          <div className="absolute -bottom-52 -left-52 w-[720px] h-[720px] rounded-full bg-emerald-500/18 blur-[150px] animate-blob [animation-delay:2000ms]" />
          <div className="absolute top-[30%] left-[20%] w-[380px] h-[380px] rounded-full bg-fuchsia-500/14 blur-[120px] animate-blob [animation-delay:4000ms]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.7] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* Floating icons */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          {/* Mobile layout */}
          <div className="block sm:hidden">
            <div className="absolute bottom-10 left-6 -rotate-12 animate-floaty [animation-delay:1200ms]">
              <PieIcon size={95} strokeWidth={1.5} />
            </div>
            <div className="absolute top-10 left-6 rotate-12 animate-floaty">
              <Coins size={80} />
            </div>
            <div className="absolute bottom-12 right-6 -rotate-6 animate-floaty [animation-delay:1600ms]">
              <TrendingUp size={85} />
            </div>
            <div className="absolute top-20 right-8 rotate-6 animate-floaty [animation-delay:2200ms]">
              <IndianRupee size={80} />
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden sm:block">
            <div className="absolute bottom-20 left-28 -rotate-12 animate-floaty [animation-delay:1200ms]">
              <PieIcon size={160} md:size={200} strokeWidth={1.5} />
            </div>
            <div className="absolute top-16 left-16 rotate-12 animate-floaty">
              <Coins size={130} />
            </div>
            <div className="absolute bottom-18 right-20 -rotate-5 animate-floaty [animation-delay:1200ms]">
              <TrendingUp size={130} />
            </div>
            <div className="absolute top-[17%] right-[15%] rotate-6 animate-floaty [animation-delay:2200ms]">
              <IndianRupee size={130} />
            </div>
          </div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`relative z-10 w-full max-w-lg rounded-[2.5rem] ${T.floatingCard} backdrop-blur-2xl shadow-[0_0_120px_rgba(99,102,241,0.18)] p-10 sm:p-12 text-center`}
        >
          <div className="flex justify-end">
            <ThemeToggleIOS theme={theme} setTheme={setTheme} />
          </div>

          {/* Logo */}
          <div className="mt-8 flex justify-center">
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-500/25 via-white/10 to-emerald-500/20 border border-white/10 shadow-[0_0_80px_rgba(16,185,129,0.12)]">
              <Wallet size={52} strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="mt-8 text-5xl sm:text-6xl font-black tracking-tight">
            Fin<span className="text-emerald-400">Track</span>
          </h1>

          <p className={`mt-4 font-bold leading-relaxed ${T.muted}`}>
            Track expenses. Spend smarter like a boss.
          </p>

          <button
            onClick={handleLogin}
            className={`mt-10 w-full rounded-2xl font-black py-4 text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all ${T.buttonPrimary}`}
          >
            Get Started ⚡
          </button>

          <p className={`mt-7 text-[10px] uppercase tracking-[0.4em] font-black ${T.muted2}`}>
            powered by firebase
          </p>
        </motion.div>

        <style>{`
            @keyframes floaty {
              0%,100% { transform: translateY(0px); }
              50% { transform: translateY(-12px); }
            }
            .animate-floaty {
              animation: floaty 5s ease-in-out infinite;
            }

            /* ✅ Premium scrollbar for Recent Activity lists */
            .custom-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scroll::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.12);
              border-radius: 999px;
            }
            .custom-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.20);
            }
          `}
        </style>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className={`min-h-screen relative overflow-hidden ${T.page}`}>
      {/* bg glow */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute top-[-160px] left-[-160px] w-[520px] h-[520px] rounded-full bg-indigo-500/20 blur-[110px]" />
        <div className="absolute bottom-[-160px] right-[-160px] w-[520px] h-[520px] rounded-full bg-emerald-500/15 blur-[110px]" />
      </div>

      {/* header */}
      <header className={`sticky top-0 z-50 ${T.header}`}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black tracking-tight text-xl">
            <div className={`p-2 rounded-xl ${T.chip}`}>
              <Wallet size={22} />
            </div>
            Fin<span className="text-emerald-400">Track</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <ThemeToggleIOS theme={theme} setTheme={setTheme} />

            <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${T.chip}`}>
              <Flame className="text-orange-400" size={16} />
              <span className="font-black text-sm">{getStreak()}</span>
            </div>

            <img
              src={user?.photoURL}
              alt="User"
              className="w-9 h-9 rounded-full border-2 border-emerald-400"
            />

            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 font-black transition-colors ${
                theme === "dark" ? "text-white/70 hover:text-rose-400" : "text-slate-600 hover:text-rose-600"
              }`}
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-5 py-10 space-y-8">
        {/* Safe to Spend */}
        <MotionSection className={`rounded-[2.2rem] shadow-[0_0_70px_rgba(16,185,129,0.08)] overflow-hidden ${T.card}`}>
          <div className="p-7 sm:p-9 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-3xl bg-emerald-500/15 border border-emerald-500/20">
                <TrendingDown size={30} className="text-emerald-300" />
              </div>
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.25em] ${T.muted}`}>
                  Safe To Spend Today
                </p>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight mt-1">
                  ₹{Number(safeToSpendToday).toLocaleString("en-IN")}
                </h2>
              </div>
            </div>

            <div className={`rounded-3xl px-8 py-4 text-center w-full md:w-auto ${T.card}`}>
              <p className={`text-[10px] uppercase tracking-[0.35em] font-black ${T.muted2}`}>
                Daily Allowance
              </p>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-xl font-black">{daysRemaining}</span>
                <span className={`text-[10px] font-black uppercase ${T.muted2}`}>
                  Days left
                </span>
              </div>
            </div>
          </div>
        </MotionSection>

        {/* Expenditure vs Remaining */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <MotionSection
            className={`xl:col-span-2 rounded-[2.2rem] overflow-hidden shadow-[0_0_90px_rgba(99,102,241,0.10)] ${
              theme === "dark"
                ? "border border-white/10 bg-gradient-to-br from-white/10 to-white/5"
                : "border border-slate-200 bg-gradient-to-br from-white to-slate-50"
            }`}
          >
            <div className="p-8 sm:p-10">
              <p className={`text-xs font-black uppercase tracking-[0.35em] ${T.muted}`}>
                Expenditure vs Remaining
              </p>

              <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-5xl font-black tracking-tight">
                    ₹{totalSpent.toLocaleString("en-IN")}
                  </h2>
                </div>

                <div className={`w-full md:w-auto rounded-[1.8rem] px-6 py-4 ${T.cardSoft}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${T.muted2}`}>
                    Remaining
                  </p>
                  <p className="text-2xl font-black mt-1">
                    ₹{remainingBalance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <div className={`h-4 rounded-full overflow-hidden ${theme === "dark" ? "bg-white/10" : "bg-slate-200"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      percentageUsed > 80 ? "bg-rose-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                  />
                </div>
                <p className={`mt-3 text-[11px] font-black uppercase tracking-[0.35em] ${T.muted}`}>
                  {percentageUsed.toFixed(1)}% used
                </p>
              </div>
            </div>
          </MotionSection>

          {/* Budget Target */}
          <MotionSection className={`rounded-[2.2rem] p-8 sm:p-10 shadow-[0_0_70px_rgba(244,63,94,0.06)] ${T.card}`}>
            <div className="flex items-center justify-between">
              <p className={`text-[11px] font-black uppercase tracking-[0.35em] ${T.muted2}`}>
                Budget Target
              </p>
              <button
                onClick={() => setShowReportModal(true)}
                className="text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/20 hover:bg-indigo-500/30 transition-colors flex items-center gap-1"
              >
                <FileText size={12} /> Report
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${T.chip}`}>
                <Settings size={22} />
              </div>

              <input
                type="number"
                min="1"
                value={monthlyBudget}
                onChange={(e) => updateBudget(e.target.value)}
                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                onWheel={(e) => e.target.blur()}
                className="w-full bg-transparent outline-none text-3xl font-black"
              />
            </div>

            <p className={`mt-4 text-xs font-bold ${T.muted2}`}>
              Tip: Keep it realistic — budget is meant to guide you.
            </p>
          </MotionSection>
        </div>

        {/* Add Expense + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MotionSection className={`rounded-[2.2rem] p-7 sm:p-9 shadow-[0_0_90px_rgba(16,185,129,0.06)] ${T.card}`}>
            <form onSubmit={saveExpense} className="space-y-6">
              <div>
                <label className={`text-[10px] uppercase tracking-[0.35em] font-black ml-2 ${T.muted2}`}>
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                  onWheel={(e) => e.target.blur()}
                  className={`mt-2 w-full rounded-3xl px-6 py-5 text-3xl font-black outline-none focus:border-emerald-400 transition-colors ${T.input}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between px-2">
                  <label className={`text-[10px] uppercase tracking-[0.35em] font-black ${T.muted2}`}>
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManageModal(true)}
                    className="text-[13px] font-black text-indigo-500 hover:text-indigo-200 transition-colors flex items-center gap-1"
                  >
                    <Settings size={12} /> Manage
                  </button>
                </div>

                <div className="relative mt-2">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "ADD_NEW") setShowAddModal(true);
                      else setCategory(e.target.value);
                    }}
                    className="w-full appearance-none rounded-3xl bg-black/30 border border-white/10 px-6 py-4 pr-14 font-black outline-none focus:border-indigo-400 transition-colors cursor-pointer"
                  >
                    <optgroup label="Default">
                      {defaultCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>

                    {customCategories.length > 0 && (
                      <optgroup label="Custom">
                        {customCategories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <option value="ADD_NEW" className="font-black text-indigo-500">
                      + Add New Category...
                    </option>
                  </select>

                  {/* ✅ Custom Arrow (you can control position) */}
                  <div className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-white/60">
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>

              <div>
                <label className={`text-[10px] uppercase tracking-[0.35em] font-black ml-2 ${T.muted2}`}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Subway, Uber, Hostel Fees..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`mt-2 w-full rounded-3xl px-6 py-4 font-bold outline-none focus:border-fuchsia-400 transition-colors ${T.input}`}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex gap-6">
                  <label className={`flex items-center gap-2 font-black cursor-pointer ${T.text70}`}>
                    <input
                      type="checkbox"
                      checked={isNeed}
                      onChange={() => setIsNeed(true)}
                      className="w-5 h-5 accent-emerald-400 cursor-pointer"
                    />
                    Need
                  </label>
                  <label className={`flex items-center gap-2 font-black cursor-pointer ${T.text70}`}>
                    <input
                      type="checkbox"
                      checked={!isNeed}
                      onChange={() => setIsNeed(false)}
                      className="w-5 h-5 accent-rose-400 cursor-pointer"
                    />
                    Want
                  </label>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  {hasEntryToday && (
                    <button
                      type="button"
                      onClick={() =>
                        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } })
                      }
                      className="px-5 py-5 rounded-3xl bg-indigo-500/15 border border-indigo-500/20 hover:bg-indigo-500/25 active:scale-95 transition-all"
                    >
                      <PartyPopper size={22} />
                    </button>
                  )}

                  <button
                    type="submit"
                    className={`w-full sm:w-auto flex-1 px-8 py-5 rounded-3xl font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all ${
                      theme === "dark"
                        ? "bg-white text-black"
                        : "bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
                    }`}
                  >
                    {editingId ? "UPDATE" : "SAVE"}
                  </button>
                </div>
              </div>
            </form>
          </MotionSection>

          {/* Pie Split */}
          <MotionSection className={`rounded-[2.2rem] p-7 sm:p-9 ${T.card}`}>
            <h3 className={`text-xs font-black uppercase tracking-[0.35em] ${T.muted}`}>
              Visual Split
            </h3>

            <div className="mt-6 min-h-[320px] flex items-center justify-center">
              {mounted && expenses.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={7}
                      dataKey="value"
                    >
                      {chartData.map((e, i) => (
                        <Cell key={i} fill={COLORS[i]} cornerRadius={18} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "14px",
                        fontWeight: "900",
                        border: "none",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={`${T.muted} font-black italic`}>Add an expense to see chart</div>
              )}
            </div>

            <div className="flex justify-center gap-10 font-black text-xs uppercase tracking-[0.35em] mt-2">
              <span className="text-emerald-400">● Needs</span>
              <span className="text-rose-400">● Wants</span>
            </div>
          </MotionSection>
        </div>

        {/* Spending Rhythm */}
        <MotionSection className={`rounded-[2.2rem] p-7 sm:p-9 ${T.card}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500 border border-indigo-500/20">
                <TrendingUp size={20} className="text-indigo-200" />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${T.muted2}`}>
                  Spending Rhythm
                </p>
                <p className="font-black text-lg">
                  {chartView === "Week" ? "Last 7 Days" : "Last 6 Months"}
                </p>
              </div>
            </div>

            <div className={`flex p-1 rounded-2xl ${T.cardSoft}`}>
              {["Week", "Year"].map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-[0.25em] transition-all ${
                    chartView === view
                      ? "bg-white text-black"
                      : theme === "dark"
                      ? "text-white/60 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {view === "Week" ? "Daily" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: "100%", height: 260 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getGraphData()}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={theme === "dark" ? "#ffffff10" : "#00000010"}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: theme === "dark" ? "#ffffff80" : "#0f172a",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                    dy={10}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Value"]}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "none",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                      backgroundColor: "#0b0f1a",
                      color: "white",
                    }}
                    cursor={{ stroke: "#a5b4fc", strokeWidth: 2, strokeDasharray: "4 4" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#a5b4fc"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`w-full h-full rounded-2xl ${theme === "dark" ? "bg-white/5" : "bg-slate-100"} animate-pulse`} />
            )}
          </div>
        </MotionSection>

        {/* Pet Card */}
        <MotionSection className={`rounded-[2.2rem] p-7 sm:p-9 ${pet.bg}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`p-5 rounded-3xl ${T.cardSoft} ${pet.color}`}>
                <PetIcon size={44} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-2xl font-black ${pet.color}`}>{pet.name}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full ${T.cardSoft} ${T.muted}`}>
                    Lvl {getStreak() < 3 ? "1" : getStreak() < 10 ? "2" : "3"}
                  </span>
                </div>
                <p className={`mt-1 font-bold ${T.text70}`}>{pet.msg}</p>
              </div>
            </div>

            <div>
              {hasEntryToday ? (
                <div className={`px-6 py-3 rounded-2xl ${T.cardSoft} font-black uppercase tracking-[0.25em] text-xs text-emerald-500 flex items-center gap-2`}>
                  <Utensils size={16} /> Fed & Happy
                </div>
              ) : (
                <div className={`px-6 py-3 rounded-2xl ${T.cardSoft} font-black uppercase tracking-[0.25em] text-xs text-rose-500 animate-pulse`}>
                  Feed Me (Add Expense)
                </div>
              )}
            </div>
          </div>
        </MotionSection>

        {/* Recent Activity */}
        <MotionSection className="space-y-4">
          <h3 className={`text-[11px] font-black uppercase tracking-[0.35em] ml-1 ${T.muted2}`}>
            Recent Activity
          </h3>

          <div className="flex overflow-x-auto gap-6 pb-8 snap-x">
            {allBoardCategories.map((cat) => {
              const catExpenses = expenses.filter((e) => e.category === cat);

              return (
                <div
                  key={cat}
                  className="min-w-[290px] sm:min-w-[330px] h-[520px] rounded-[2.2rem] bg-white/5 border border-white/10 p-6 flex-shrink-0 snap-center flex flex-col"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className={`font-black uppercase tracking-[0.25em] text-xs ${T.text70}`}>
                      {cat}
                    </h3>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${T.cardSoft} ${T.muted}`}>
                      {catExpenses.length} items
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scroll">

                    {catExpenses.length === 0 ? (
                      <div className={`text-center py-12 font-black italic text-xs text-center ${theme === "dark" ? "text-white/25" : "text-slate-400"}`}>
                        No {cat} expenses yet.
                      </div>
                    ) : (
                      catExpenses.map((exp) => (
                        <div
                          key={exp.id}
                          className={`group rounded-[1.8rem] p-5 flex items-center justify-between ${T.cardSoft}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                exp.isNeed ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="font-black truncate max-w-[140px]">
                                {exp.description || "Expense"}
                              </p>
                              <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${theme === "dark" ? "text-white/40" : "text-slate-500"}`}>
                                {exp.createdAt?.toDate().toLocaleDateString("en-GB") || "..."}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <p className="font-black">₹{exp.amount.toLocaleString("en-IN")}</p>

                            <div className="flex gap-1 opacity-100">
                              <button
                                onClick={() => startEdit(exp)}
                                className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/15 hover:bg-indigo-500/25 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => deleteExpense(exp.id)}
                                className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/15 hover:bg-rose-500/25 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </MotionSection>
      </main>

      {/* ------------ MODALS ------------ */}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`w-full max-w-sm rounded-[2.2rem] shadow-2xl p-6 relative ${T.modal}`}
          >
            <button
              onClick={() => setShowAddModal(false)}
              className={`${theme === "dark" ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-900"} absolute right-5 top-5`}
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black">New Category</h3>
            <p className={`text-[10px] uppercase tracking-[0.35em] font-black mt-1 ${T.muted2}`}>
              Create your own label
            </p>

            <input
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Gym, Subscriptions..."
              className={`mt-6 w-full rounded-2xl px-5 py-4 font-black outline-none focus:border-indigo-400 transition-colors ${T.input}`}
            />

            <button
              onClick={handleAddCustomCategory}
              className={`mt-4 w-full rounded-2xl font-black py-4 uppercase tracking-[0.25em] hover:scale-[1.02] active:scale-95 transition-all ${T.buttonPrimary}`}
            >
              Create Category
            </button>
          </motion.div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`w-full max-w-sm rounded-[2.2rem] shadow-2xl p-6 relative max-h-[80vh] flex flex-col ${T.modal}`}
          >
            <button
              onClick={() => setShowManageModal(false)}
              className={`${theme === "dark" ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-900"} absolute right-5 top-5`}
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black">Manage Categories</h3>
            <p className={`text-[10px] uppercase tracking-[0.35em] font-black mt-1 ${T.muted2}`}>
              Delete your tags
            </p>

            <div className="mt-6 flex-1 overflow-y-auto space-y-3 pr-1">
              {customCategories.length === 0 ? (
                <div className={`text-center py-10 font-black italic ${theme === "dark" ? "text-white/35" : "text-slate-500"}`}>
                  No custom categories yet.
                </div>
              ) : (
                customCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`rounded-2xl px-2 py-3 flex items-center gap-3 ${T.cardSoft}`}
                  >
                    <div className={`p-2 rounded-xl ${T.chip}`}>
                      <CreditCard size={16} />
                    </div>

                    <input
                      defaultValue={cat.name}
                      onBlur={(e) => updateCategory(cat.id, e.target.value)}
                      className="flex-1 bg-transparent outline-none font-black"
                    />

                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/15 hover:bg-rose-500/25 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setShowManageModal(false);
                setShowAddModal(true);
              }}
              className={`mt-5 w-full rounded-2xl py-3 font-black uppercase tracking-[0.25em] transition-colors flex items-center justify-center gap-2 ${
                theme === "dark"
                  ? "bg-white/10 border border-white/10 hover:bg-white/15"
                  : "bg-slate-100 border border-slate-200 hover:bg-slate-200"
              }`}
            >
              <Plus size={18} /> Add New
            </button>
          </motion.div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`w-full max-w-sm rounded-[2.2rem] shadow-2xl overflow-hidden relative ${T.modal}`}
          >
            <button
              onClick={() => setShowReportModal(false)}
              className={`${theme === "dark" ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-900"} absolute right-5 top-5 z-10`}
            >
              <X size={22} />
            </button>

            <button
              onClick={downloadReportPDF}
              className="absolute left-5 top-5 text-indigo-500 z-10"
            >
              <Download size={22} />
            </button>

            <div
              className={`p-7 text-center border-b relative ${
                theme === "dark" ? "bg-black/40 border-white/10" : "bg-slate-50 border-slate-200"
              }`}
            >
              <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${T.muted2}`}>
                {getMonthlyReport().month} Report
              </p>

              <h1 className={`text-7xl font-black mt-2 ${getMonthlyReport().color}`}>
                {getMonthlyReport().grade}
              </h1>

              <p className="mt-2 font-black">{getMonthlyReport().title}</p>
            </div>

            <div className="p-7 space-y-5">
              <div className="flex justify-between gap-6">
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.35em] font-black ${T.muted2}`}>
                    Top Spender
                  </p>
                  <p className="font-black text-lg">{getMonthlyReport().topCategory}</p>
                </div>

                <div className="text-right">
                  <p className={`text-[10px] uppercase tracking-[0.35em] font-black ${T.muted2}`}>
                    Wants Spent
                  </p>
                  <p className="font-black text-rose-400 text-lg">
                    ₹{getMonthlyReport().wantsTotal.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/15 p-5">
                <p className="text-[10px] uppercase tracking-[0.35em] font-black text-indigo-400">
                  Suggestion
                </p>
                <p className={`mt-1 font-bold ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
                  “{getMonthlyReport().advice}”
                </p>
              </div>

              <button
                onClick={() => setShowReportModal(false)}
                className={`w-full rounded-2xl font-black py-4 uppercase tracking-[0.25em] hover:scale-[1.02] active:scale-95 transition-all ${T.buttonPrimary}`}
              >
                Got it, Boss!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
