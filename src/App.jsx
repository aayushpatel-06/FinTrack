import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, provider } from './firebase'; 
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, addDoc, query, where, onSnapshot, 
  orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc 
} from 'firebase/firestore';
// FIX 1: Added 'FileText', 'Download' to imports
import { LogOut, Wallet, Trash2, Settings, Edit2, TrendingUp, TrendingDown, Plus, X, Flame, ShieldCheck, Zap, PieChart as PieIcon, Coins, Target, CreditCard, PartyPopper, Check, Save, IndianRupee, Egg, Bird, Trophy, Utensils, FileText, Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import confetti from 'canvas-confetti';
// FIX 2: Import jsPDF
import { jsPDF } from "jspdf";

function App() {
  const [description, setDescription] = useState('');
  const [user, setUser] = useState(null);
  const [chartView, setChartView] = useState('Week');
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  
  // --- CATEGORY STATE ---
  const defaultCategories = ['Food', 'Travel', 'Study', 'Fun']; 
  const [category, setCategory] = useState('Food');
  const [customCategories, setCustomCategories] = useState([]); 
  
  // UI STATE FOR MODALS
  const [showManageModal, setShowManageModal] = useState(false); 
  const [showAddModal, setShowAddModal] = useState(false);       
  const [newCatName, setNewCatName] = useState('');              
  
  // --- REPORT STATE ---
  const [showReportModal, setShowReportModal] = useState(false);
  // --------------------

  const [isNeed, setIsNeed] = useState(true); 
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); 
  const [monthlyBudget, setMonthlyBudget] = useState(10000);
  const [editingId, setEditingId] = useState(null);
  
  const hasEntryToday = expenses.some(exp => exp.createdAt?.toDate().toDateString() === new Date().toDateString());

  // 1. AUTH & EXPENSES LISTENER
  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        const budgetRef = doc(db, 'users', currentUser.uid);
        onSnapshot(budgetRef, (docSnap) => {
          if (docSnap.exists()) setMonthlyBudget(docSnap.data().budget || 10000);
        });
        const q = query(collection(db, 'expenses'), where('uid', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. CUSTOM CATEGORIES LISTENER
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'custom_categories'), where('uid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomCategories(cats);
      });
      return () => unsubscribe();
    } else {
      setCustomCategories([]);
    }
  }, [user]);

  const handleLogout = () => signOut(auth);
  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };

  const updateBudget = async (val) => {
    setMonthlyBudget(val);
    const num = parseFloat(val);
    if (user && !isNaN(num) && num >= 1) {
      await setDoc(doc(db, 'users', user.uid), { budget: num }, { merge: true });
    }
  };

  // --- NEW CATEGORY FUNCTIONS ---
  const handleAddCustomCategory = async () => {
    if (!newCatName || defaultCategories.includes(newCatName)) return;
    try {
      await addDoc(collection(db, 'custom_categories'), {
        uid: user.uid,
        name: newCatName
      });
      setCategory(newCatName); 
      setNewCatName('');
      setShowAddModal(false); 
    } catch (e) { console.error(e); }
  };

  const deleteCategory = async (id) => {
    await deleteDoc(doc(db, 'custom_categories', id));
    setCategory(defaultCategories[0]); 
  };

  const updateCategory = async (id, newName) => {
    if(!newName) return;
    await updateDoc(doc(db, 'custom_categories', id), { name: newName });
  };
  // -----------------------------

  // --- REPORT GENERATION & PDF LOGIC ---
  const getMonthlyReport = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Filter only this month's data
    const monthlyExpenses = expenses.filter(e => {
      const d = e.createdAt?.toDate();
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const spent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percent = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
    
    // Calculate Top Category
    const catTotals = {};
    monthlyExpenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });
    const topCategory = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0] || 'None';

    const wantsTotal = monthlyExpenses.filter(e => !e.isNeed).reduce((s, e) => s + e.amount, 0);
    const needsTotal = monthlyExpenses.filter(e => e.isNeed).reduce((s, e) => s + e.amount, 0);

    // Grading Logic
    let grade = 'A';
    let title = 'The Savings Ninja 🥷';
    let advice = 'Keep doing what you are doing!';
    let color = 'text-emerald-500';

    if (percent > 100) {
      grade = 'F';
      title = 'The Deficit Dragon 🐉';
      advice = `You've burned through the budget! Stop spending on ${topCategory}!`;
      color = 'text-rose-600';
    } else if (percent > 85) {
      grade = 'C';
      title = 'Living on the Edge 🧗';
      advice = 'You are dangerously close to the limit. Freeze your "Wants" immediately.';
      color = 'text-orange-500';
    } else if (percent > 50) {
      grade = 'B';
      title = 'Balanced Bear 🐻';
      advice = wantsTotal > needsTotal ? 'Careful! Your "Wants" are higher than your "Needs".' : 'Solid month. You are on track.';
      color = 'text-blue-500';
    } else {
      grade = 'A+';
      title = 'The Wealth Wizard 🧙‍♂️';
      advice = 'Incredible discipline! You should invest the surplus.';
      color = 'text-emerald-600';
    }

    return { 
      month: new Date().toLocaleString('default', { month: 'long' }),
      spent, 
      remaining: monthlyBudget - spent, 
      grade, title, advice, color, topCategory, wantsTotal, needsTotal
    };
  };

  const downloadReportPDF = () => {
    const report = getMonthlyReport();
    const doc = new jsPDF();

    // 1. Remove the emoji from the title for the PDF
    // This splits the string at the space and takes the first part (e.g., "The Savings Ninja")
    // OR you can just hardcode the text without the emoji if preferred.
    const titleWithoutEmoji = report.title.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(`FinTrack Report: ${report.month}`, 20, 20);

    // Grade Section
    doc.setFontSize(16);
    doc.text(`Financial Grade: ${report.grade}`, 20, 40);
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    
    // USE THE CLEAN TITLE HERE
    doc.text(`Status: ${titleWithoutEmoji}`, 20, 50);

    // Stats Line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 60, 190, 60);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Spent: ${report.spent.toLocaleString()}`, 20, 75);
    doc.text(`Remaining Budget: ${report.remaining.toLocaleString()}`, 110, 75);
    
    doc.text(`Highest Spending: ${report.topCategory}`, 20, 85);
    doc.text(`Wants Spending: ${report.wantsTotal.toLocaleString()}`, 110, 85);

    // Advice Section
    doc.setFontSize(14);
    doc.setTextColor(0, 80, 200);
    doc.text(`AI Suggestion:`, 20, 105);
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    const splitAdvice = doc.splitTextToSize(report.advice, 170);
    doc.text(splitAdvice, 20, 115);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by FinTrack", 20, 280);

    doc.save(`FinTrack_Report_${report.month}.pdf`);
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setIsNeed(exp.isNeed);
    setDescription(exp.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        await updateDoc(doc(db, 'expenses', editingId), { amount: numAmount, category, isNeed, description });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'expenses'), { uid: user.uid, amount: numAmount, category, isNeed, description, createdAt: serverTimestamp() });
        // NOTE: Auto-confetti removed (moved to button)
      }
      setAmount('');
      setDescription('');
    } catch (e) { alert(e.message); }
  };

  const deleteExpense = async (id) => { 
    await deleteDoc(doc(db, 'expenses', id)); 
  };

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = (parseFloat(monthlyBudget) || 0) - totalSpent;
  const percentageUsed = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = lastDayOfMonth - today.getDate() + 1;
  const safeToSpendToday = remainingBalance > 0 ? (remainingBalance / daysRemaining).toFixed(0) : 0;

  const getStreak = () => {
    if (expenses.length === 0) return 0;
    
    // Get unique dates
    const uniqueDates = [...new Set(expenses.map(e => e.createdAt?.toDate().toDateString()))];
    // Sort dates descending (newest first)
    const sortedDates = uniqueDates.map(d => new Date(d)).sort((a, b) => b - a);

    if (sortedDates.length === 0) return 0;

    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastEntry = sortedDates[0];
    lastEntry.setHours(0,0,0,0);

    // If last entry is older than yesterday, streak is broken
    if (lastEntry < yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
        const curr = sortedDates[i];
        const next = sortedDates[i+1];
        
        // Calculate difference in days
        const diffTime = Math.abs(curr - next);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
  };

  // --- PET LOGIC ---
  const getPetState = () => {
    const streak = getStreak();
    
    if (streak < 3) return { 
        stage: 'Egg', 
        name: 'Budget Egg', 
        icon: Egg, 
        color: 'text-slate-400', 
        bg: 'bg-slate-50',
        msg: hasEntryToday ? "Warm & Happy!" : "I'm cold! Add expense!",
        desc: "Keep the streak to hatch it."
    };
    
    if (streak < 10) return { 
        stage: 'Chick', 
        name: 'Coin Chick', 
        icon: Bird, 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-50',
        msg: hasEntryToday ? "Yum! Thanks!" : "Feed me data!",
        desc: "Growing stronger everyday."
    };
    
    return { 
        stage: 'Master', 
        name: 'Wealth Eagle', 
        icon: Trophy, 
        color: 'text-indigo-600', 
        bg: 'bg-indigo-50',
        msg: hasEntryToday ? "Excellent work." : "Maintain discipline.",
        desc: "You have mastered the rhythm."
    };
  };
  
  const pet = getPetState();
  const PetIconComponent = pet.icon;
  // -----------------

  const getGraphData = () => {
    const data = [];
    const today = new Date();
    
    if (chartView === 'Week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }); 
        const value = expenses
          .filter(e => e.createdAt?.toDate().toDateString() === d.toDateString())
          .reduce((sum, e) => sum + e.amount, 0);
        data.push({ name: dayStr, value });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(today.getMonth() - i);
        const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
        const value = expenses
          .filter(e => {
            const t = e.createdAt?.toDate();
            return t && t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear();
          })
          .reduce((sum, e) => sum + e.amount, 0);
        data.push({ name: monthStr, value });
      }
    }
    return data;
  };

  const chartData = [
    { name: 'Needs', value: expenses.filter(e => e.isNeed).reduce((s, i) => s + i.amount, 0) || 0 },
    { name: 'Wants', value: expenses.filter(e => !e.isNeed).reduce((s, i) => s + i.amount, 0) || 0 },
  ];
  const COLORS = ['#10b981', '#f43f5e'];

  const allBoardCategories = [...defaultCategories, ...customCategories.map(c => c.name)];

  const randomQuote = useMemo(() => {
    const quotes = [
      "Bringing you on track...", "Finding where the money went...", "Separating your Needs from Wants...",
      "Loading your financial empire...", "Aligning your financial stars...", "Calculating your next big win...",
      "Chasing down every rupee...", "Making every coin count...", "Fueling up your wallet...", "Preparing your success story..."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="relative flex items-center justify-center w-64 h-64">
          <div className="absolute w-full h-full rounded-full border border-emerald-100 animate-[spin_3s_linear_infinite]">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1.5 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          </div>
          <div className="absolute w-48 h-48 rounded-full border border-rose-100 animate-[spin_5s_linear_infinite]">
             <div className="absolute bottom-0 right-1/2 translate-x-1/2 -mb-2 w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.5)]"></div>
          </div>
          <div className="absolute w-32 h-32 rounded-full border border-blue-100 animate-[spin_7s_linear_infinite]">
             <div className="absolute top-1/2 left-0 -translate-x-1/2 -ml-1 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
          </div>
          <div className="relative z-10 bg-white p-6 rounded-full shadow-2xl shadow-blue-100">
             <Wallet size={40} className="text-slate-900" strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-12 text-center space-y-2 z-10">
           <h1 className="text-3xl font-black text-slate-900 tracking-tighter">FinTrack</h1>
           <div className="flex items-center justify-center gap-1">
             <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
             <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
             <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] min-h-[20px]">{randomQuote}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-[0.7]" style={{ backgroundImage: `linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>
        
        {/* --- FLOATING ICONS (Added Rupee Sign) --- */}
        <div className="absolute top-12 left-6 md:top-10 md:left-20 text-blue-200 transform -rotate-12 opacity-100 blur-[1px] animate-blob scale-75 md:scale-100 origin-top-left transition-transform duration-500">
            <PieIcon size={180} md:size={200} strokeWidth={1.5} />
        </div>
        <div className="absolute top-1/2 left-4 md:left-10 -translate-y-1/2 text-indigo-300 transform -rotate-12 opacity-50 blur-[1px] animate-blob animation-delay-1000 scale-75 md:scale-100 transition-transform duration-500">
             <IndianRupee size={140} strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-12 right-6 md:bottom-10 md:right-20 text-emerald-200 transform rotate-6 opacity-100 blur-[1px] animate-blob animation-delay-2000 scale-75 md:scale-100 origin-bottom-right transition-transform duration-500">
            <TrendingUp size={160} md:size={220} strokeWidth={1.5} />
        </div>
        <div className="absolute top-20 right-8 md:top-20 md:right-[10%] text-amber-200 transform rotate-20 opacity-100 blur-[2px] animate-blob animation-delay-4000 scale-50 md:scale-100 origin-top-right transition-transform duration-500">
            <Coins size={160} strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-20 left-8 md:bottom-20 md:left-[10%] text-purple-200 transform -rotate-6 opacity-100 blur-[2px] scale-50 md:scale-100 origin-bottom-left transition-transform duration-500">
            <Target size={170} strokeWidth={1.5} />
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl opacity-60 z-0"></div>

        <div className="relative z-10 w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-[3rem] p-10 sm:p-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] text-center border border-white">
          <div className="inline-flex bg-blue-600 p-6 rounded-[2.2rem] shadow-xl shadow-blue-200 mb-8 text-white transform hover:scale-105 transition-transform">
            <Wallet size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">FinTrack</h1>
          <p className="text-slate-500 font-bold text-lg mb-10 tracking-tight">Smartest way to track your daily expenses.</p>
          <button onClick={handleLogin} className="group relative w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-bold text-xl overflow-hidden active:scale-95 shadow-xl cursor-pointer transition-all hover:shadow-2xl">
            <span className="relative z-10 flex items-center justify-center gap-3">Get Started <Zap size={20} className="text-yellow-400 fill-yellow-400"/></span>
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
          <p className="mt-8 text-slate-500 text-[11px] font-black uppercase tracking-[0.4em]">Powered By Firebase</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#dcfce7] via-white to-[#dcfce7] text-slate-900 relative overflow-hidden font-sans">
      
      {/* 1. DYNAMIC GRID PATTERN */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none"
           style={{ backgroundImage: `linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)`, backgroundSize: '32px 32px' }}>
      </div>

      {/* 2. AMBIENT BREATHING BLOBS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[100px] animate-blob mix-blend-multiply filter"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply filter"></div>
         <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-pink-200/40 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply filter"></div>
      </div>

      {/* --- ADD NEW CATEGORY MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] shadow-2xl border border-white/50 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"><X size={20}/></button>
            <h3 className="text-xl font-black text-slate-800 mb-2">New Category</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Create your own label</p>
            
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Gym, Subscriptions..." 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-lg outline-none focus:border-blue-500 transition-colors mb-4"
            />
            
            <button 
              onClick={handleAddCustomCategory}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
            >
              Create Category
            </button>
          </div>
        </div>
      )}

      {/* --- MANAGE CATEGORIES MODAL --- */}
      {showManageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] shadow-2xl border border-white/50 relative max-h-[80vh] flex flex-col">
            <button onClick={() => setShowManageModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h3 className="text-xl font-black text-slate-800 mb-1">Manage Categories</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Edit or delete your custom tags</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {customCategories.length === 0 ? (
                <div className="text-center py-10 opacity-50 font-bold italic">No custom categories yet.</div>
              ) : (
                customCategories.map((cat) => (
                  <div key={cat.id} className="group flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-transparent hover:border-blue-100 transition-colors">
                     <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500">
                       <CreditCard size={18} />
                     </div>
                     <input 
                       type="text" 
                       defaultValue={cat.name}
                       onBlur={(e) => updateCategory(cat.id, e.target.value)}
                       className="flex-1 bg-transparent font-bold text-slate-700 outline-none"
                     />
                     <button 
                       onClick={() => deleteCategory(cat.id)}
                       className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => { setShowManageModal(false); setShowAddModal(true); }}
              className="mt-6 flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              <Plus size={16} /> Add New
            </button>
          </div>
        </div>
      )}

      {/* --- NEW: REPORT CARD MODAL --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.1]"></div>
               <button onClick={() => setShowReportModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white"><X size={22}/></button>
               {/* FIX: Download Button in Modal */}
               <button onClick={downloadReportPDF} className="absolute top-5 left-5 text-blue-400 hover:text-white flex items-center gap-1 font-bold text-xs"><Download size={22}/></button>
               
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{getMonthlyReport().month} REPORT</p>
               <h1 className={`text-8xl font-black ${getMonthlyReport().color} tracking-tighter drop-shadow-2xl`}>
                 {getMonthlyReport().grade}
               </h1>
               <p className="text-white font-bold text-lg mt-2">{getMonthlyReport().title}</p>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Top Spender</p>
                  <p className="font-black text-slate-800 text-lg">{getMonthlyReport().topCategory}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Wants Spent</p>
                  <p className="font-black text-rose-500 text-lg">₹{getMonthlyReport().wantsTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <div className="flex gap-3">
                  <div className="bg-white p-2 rounded-full h-fit shadow-sm text-blue-500">
                    <Zap size={18} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-400 uppercase tracking-wide mb-1">Suggestion</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      "{getMonthlyReport().advice}"
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowReportModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                Got it, Boss!
              </button>
            </div>
          </div>
        </div>
      )}


      <header className="sticky top-0 z-50 w-full px-6 sm:px-10 py-4 backdrop-blur-lg bg-white/70 border-b border-gray-100 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-black text-blue-600 flex items-center gap-2 tracking-tighter uppercase">
          <Wallet size={28} /> FinTrack
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-100">
             <Flame size={18} fill="currentColor" />
             <span className="font-black text-sm">{getStreak()}</span>
          </div>
          <img src={user?.photoURL} alt="User" className="w-9 h-9 rounded-full border-2 border-blue-600 shadow-sm" />
          <button onClick={handleLogout} className="flex items-center gap-2 font-bold text-10px text-gray-500 hover:text-red-500 transition-all cursor-pointer">
            <LogOut size={19} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-10 py-8 space-y-8 relative z-10">
        <div className="w-full bg-white border border-blue-100 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 mb-8 transition-transform hover:scale-[1.01]">
          <div className="flex items-center gap-5">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-3xl animate-pulse">
              <TrendingDown size={32} strokeWidth={3} />
            </div>
            <div>
              <p className="text-[14px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1 font-mono">Safe To Spend Today</p>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter not-italic">₹{Number(safeToSpendToday).toLocaleString('en-IN')}</h2>
            </div>
          </div>
          <div className="bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100 flex flex-col items-center w-full md:w-auto">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1" >Daily Allowance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-700 not-italic">{daysRemaining}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Days Left</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          <div className={`relative overflow-hidden flex-1 p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] text-white shadow-2xl transition-all duration-700 ${percentageUsed > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            <p className="text-sm font-black uppercase tracking-[0.3em] opacity-90 mb-6 font-mono">Expenditure vs Remaining</p>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col items-center md:items-start gap-2">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter drop-shadow-xl not-italic">₹{totalSpent.toLocaleString('en-IN')}</h2>
                <div className="flex justify-center md:justify-start w-full">
                   {percentageUsed > 80 ? (
                     <TrendingUp size={44} className="animate-bounce text-white drop-shadow-md" strokeWidth={3} />
                   ) : (
                     <TrendingDown size={44} className="text-white opacity-80" strokeWidth={3} />
                   )}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/20 min-w-[170px] w-full md:w-auto text-center md:text-left self-center md:self-end">
                <p className="text-[11px] font-black uppercase tracking-widest opacity-85 mb-1">Remaining</p>
                <p className="text-2xl font-black tracking-tighter not-italic">₹{remainingBalance.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="mt-8">
              <div className="w-full bg-white/20 rounded-full h-4 p-1 shadow-inner">
                <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(percentageUsed, 100)}%` }}></div>
              </div>
              <p className="mt-3 font-black text-xs opacity-90 tracking-widest uppercase text-center md:text-left">{percentageUsed.toFixed(1)}% USED</p>
            </div>
          </div>

          <div className="w-full xl:w-[350px] bg-white p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-gray-100 shadow-lg flex flex-col justify-center">
            {/* FIX: ADDED REPORT BUTTON HERE */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Budget Target</h3>
              <button 
                onClick={() => setShowReportModal(true)}
                className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                <FileText size={12} /> REPORT
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Settings className="text-blue-600" size={28} />
              <input 
                type="number" min="1" value={monthlyBudget} 
                onChange={(e) => updateBudget(e.target.value)} 
                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                onWheel={(e) => e.target.blur()} 
                className="bg-transparent font-black text-3xl w-full outline-none text-gray-900 not-italic" 
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={saveExpense} className="bg-white border border-gray-100 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-xl space-y-6">
            <div className="flex flex-col gap-2">
               <label htmlFor="amount-input" className="text-[11px] font-black text-blue-600 ml-4 uppercase tracking-widest">Amount (₹)</label>
               <input 
                id="amount-input" type="number" min="1" step="0.01" 
                value={amount} onChange={(e) => setAmount(e.target.value)} 
                onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                onWheel={(e) => e.target.blur()} 
                className="w-full p-6 sm:p-8 rounded-[2rem] bg-gray-50 text-3xl sm:text-4xl font-black outline-none text-gray-900 ring-2 ring-gray-100 focus:ring-blue-100 transition-all not-italic" 
               />
            </div>
            
            {/* --- REVISED CATEGORY SECTION --- */}
            <div className="flex flex-col gap-2 relative">
               <div className="flex justify-between items-center px-4">
                 <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                 
                 {/* Manage Button Triggers the Modal */}
                 {user && (
                   <button 
                     type="button"
                     onClick={() => setShowManageModal(true)}
                     className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer flex items-center gap-1"
                   >
                     <Settings size={10}/> Manage Custom
                   </button>
                 )}
               </div>

               <select 
                 value={category} 
                 onChange={(e) => {
                   if(e.target.value === 'ADD_NEW') {
                     setShowAddModal(true); // Open the Modal instead of prompt
                   } else {
                     setCategory(e.target.value);
                   }
                 }} 
                 className="w-full p-6 rounded-[1.5rem] bg-gray-50 font-black text-lg appearance-none outline-none text-gray-900 ring-2 ring-transparent focus:ring-blue-100 transition-all cursor-pointer"
               >
                 <optgroup label="Default">
                    {defaultCategories.map(c => <option key={c} value={c}>{c}</option>)}
                 </optgroup>
                 {customCategories.length > 0 && (
                   <optgroup label="Your Custom Categories">
                      {customCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </optgroup>
                 )}
                 <option value="ADD_NEW" className="font-bold text-blue-600">+ Add New Category...</option>
               </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest px-4">Description (Optional)</label>
              <input 
                type="text" placeholder="e.g. McDonald's, Uber, Semester Fees..." 
                value={description} onChange={(e) => setDescription(e.target.value)} 
                className="w-full p-5 rounded-[1.5rem] bg-gray-50 font-bold outline-none text-gray-900 placeholder:text-gray-300 ring-2 ring-transparent focus:ring-blue-100 transition-all" 
              />
            </div>

            <div className="flex flex-col md:flex-row gap-6 px-4 items-center">
              <div className="flex gap-8 w-full md:w-auto justify-center">
                <label className="flex items-center gap-2 text-base font-bold cursor-pointer text-gray-600">
                  <input type="checkbox" checked={isNeed} onChange={() => setIsNeed(true)} className="w-5 h-5 accent-emerald-500 cursor-pointer" /> Need
                </label>
                <label className="flex items-center gap-2 text-base font-bold cursor-pointer text-gray-600">
                  <input type="checkbox" checked={!isNeed} onChange={() => setIsNeed(false)} className="w-5 h-5 accent-rose-500 cursor-pointer" /> Want
                </label>
              </div>
              
              <div className="flex w-full md:w-auto md:ml-auto gap-3">
                {/* FIX: Celebration Button now ONLY shows if hasEntryToday is true */}
                {hasEntryToday && (
                  <button 
                    type="button" 
                    onClick={() => confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } })} 
                    className="px-5 py-5 bg-blue-50 text-blue-600 rounded-[1.5rem] hover:bg-blue-100 active:scale-95 transition-all shadow-sm"
                  >
                    <PartyPopper size={24} />
                  </button>
                )}

                <button type="submit" className="flex-1 px-8 py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-600 active:scale-95 transition-all cursor-pointer shadow-md uppercase tracking-widest">
                  {editingId ? 'UPDATE' : 'SAVE'}
                </button>
              </div>
            </div>
          </form>

          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-gray-100 flex flex-col items-center shadow-lg">
            <h3 className="text-[15px] font-black text-gray-500 uppercase tracking-widest mb-6">Visual Split</h3>
            <div className="w-full min-h-[300px] flex items-center justify-center">
              {mounted && expenses.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie 
                      data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value"
                    >
                      {chartData.map((e, i) => (
                        <Cell key={i} fill={COLORS[i]} cornerRadius={15} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '15px', fontWeight: '800', border: 'none', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-300 font-bold italic">Add an expense to see chart</div>
              )}
            </div>
            <div className="flex gap-12 mt-2 font-black text-[14px] tracking-widest uppercase">
              <span className="text-emerald-500">● Needs</span>
              <span className="text-rose-500">● Wants</span>
            </div>
          </div>
        </div>  

      <div className="md:col-span-6 bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Spending Rhythm</h3>
              <p className="font-bold text-slate-900 text-lg">{chartView === 'Week' ? 'Last 7 Days' : 'Last 6 Months'}</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Week', 'Year'].map((view) => (
              <button
                key={view} onClick={() => setChartView(view)}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${chartView === view ? 'bg-white text-indigo-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {view === 'Week' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', height: '250px' }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getGraphData()}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                <YAxis hide />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="value" name="Value" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse"></div>
          )}
        </div>
      </div>
        
      {/* --- FIX: PET CARD (Replacing the old Financial Win Banner) --- */}
      <div className={`w-full ${pet.bg} rounded-[2.5rem] p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden mb-8 transition-all hover:scale-[1.01] animate-fade-in-up`}>
        <div className="flex items-center gap-6 z-10">
          <div className={`bg-white p-5 rounded-[1.5rem] shadow-sm ${pet.color} animate-bounce`}>
            <PetIconComponent size={48} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-2xl font-black tracking-tight ${pet.color}`}>{pet.name}</h3>
              <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded-full border border-slate-100 text-slate-400">Lvl {getStreak() < 3 ? '1' : getStreak() < 10 ? '2' : '3'}</span>
            </div>
            <p className="font-bold text-slate-600 opacity-80">{pet.msg}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 z-10">
          {hasEntryToday ? (
             <div className="bg-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-emerald-500 shadow-sm flex items-center gap-2">
               <Utensils size={16}/> Fed & Happy
             </div>
          ) : (
             <div className="bg-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-rose-500 shadow-sm animate-pulse">
               Feed Me (Add Expense)
             </div>
          )}
        </div>
        
        {/* Background decoration */}
        <div className="absolute -right-10 -bottom-10 opacity-10 transform rotate-12">
           <PetIconComponent size={200} />
        </div>
      </div>

      {/* --- RECREATED RECENT ACTIVITY: CATEGORY COLUMNS --- */}
        <div className="space-y-4">
          <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] ml-4">Recent Activity</h3>
          
          {/* Horizontal Scrollable Container */}
          <div className="flex overflow-x-auto gap-6 pb-12 snap-x">
             {allBoardCategories.map(cat => {
               // Filter expenses for this specific category
               const catExpenses = expenses.filter(e => e.category === cat);
               
               // Only show the column if there are expenses (Optional: Remove if you want to show empty columns too)
               // For now, I'll show all columns so users know they exist
               return (
                 <div key={cat} className="min-w-[280px] sm:min-w-[320px] bg-slate-50/50 rounded-[2.5rem] p-6 border border-slate-100 flex-shrink-0 snap-center">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-slate-500 uppercase tracking-widest text-sm">{cat}</h3>
                      <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-100 text-slate-400">
                        {catExpenses.length} Items
                      </span>
                    </div>

                    <div className="space-y-3">
                       {catExpenses.length === 0 ? (
                         <div className="text-center py-10 opacity-30 font-bold italic text-slate-400 text-xs">
                           No {cat} expenses yet.
                         </div>
                       ) : (
                         catExpenses.map(exp => (
                           <div key={exp.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-blue-50 transition-all flex justify-between items-center group">
                              <div className="flex items-center gap-3">
                                 <div className={`w-2 h-2 rounded-full flex-shrink-0 ${exp.isNeed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                 <div className="min-w-0">
                                   <p className="font-black text-slate-800 text-sm truncate max-w-[100px]">{exp.description || 'Expense'}</p>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{exp.createdAt?.toDate().toLocaleDateString('en-GB') || '...'}</p>
                                 </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <p className="font-black text-base text-slate-900 not-italic">₹{exp.amount.toLocaleString('en-IN')}</p>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEdit(exp)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={12}/></button>
                                  <button onClick={() => deleteExpense(exp.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12}/></button>
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
        </div>
      </main>
    </div>
  );
}

export default App;
