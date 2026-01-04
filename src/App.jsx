import React, { useState, useEffect } from 'react';
import { auth, db, provider } from './firebase'; 
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, addDoc, query, where, onSnapshot, 
  orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc 
} from 'firebase/firestore';
import { LogOut, Wallet, Trash2, Settings, Edit2, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function App() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [isNeed, setIsNeed] = useState(true); 
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); 
  const [monthlyBudget, setMonthlyBudget] = useState(10000);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        // FETCH PERSISTENT BUDGET
        const budgetRef = doc(db, 'users', currentUser.uid);
        onSnapshot(budgetRef, (docSnap) => {
          if (docSnap.exists()) setMonthlyBudget(docSnap.data().budget || 10000);
        });

        // FETCH EXPENSES
        const q = query(collection(db, 'expenses'), where('uid', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
          setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });
        return () => unsubscribeData();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };
  const handleLogout = () => signOut(auth);

  const updateBudget = async (val) => {
  // 1. Allow state to hold the string so the user can erase/type freely
  setMonthlyBudget(val); 

  const num = parseFloat(val);

  // 2. VALIDATION: Only sync with Firebase if the value is greater than 0
  if (user && !isNaN(num) && num > 0) {
    try {
      await setDoc(doc(db, 'users', user.uid), { budget: num }, { merge: true });
    } catch (e) {
      console.error("Error syncing budget:", e);
    }
  }
};

  const saveExpense = async (e) => {
    e.preventDefault(); 
    const numAmount = parseFloat(amount);
    // VALIDATION: POSITIVE VALUES ONLY
    if (!amount || numAmount <= 0) {
      alert("Please enter a positive amount greater than zero.");
      return;
    }
    if (!user) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'expenses', editingId), { amount: numAmount, category, isNeed });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'expenses'), { uid: user.uid, amount: numAmount, category, isNeed, createdAt: serverTimestamp() });
      }
      setAmount('');
    } catch (e) { alert(e.message); }
  };

  const startEdit = (exp) => {
    setEditingId(exp.id); setAmount(exp.amount); setCategory(exp.category); setIsNeed(exp.isNeed);
  };

  const deleteExpense = async (id) => { if (window.confirm("Delete this record?")) await deleteDoc(doc(db, 'expenses', id)); };

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  // Add a fallback so percentageUsed doesn't become "Infinity"
  const percentageUsed = (monthlyBudget && parseFloat(monthlyBudget) > 0) 
  ? (totalSpent / parseFloat(monthlyBudget)) * 100 
  : 0;
  
  const chartData = [
    { name: 'Needs', value: expenses.filter(e => e.isNeed).reduce((s, i) => s + i.amount, 0) || 0.1 },
    { name: 'Wants', value: expenses.filter(e => !e.isNeed).reduce((s, i) => s + i.amount, 0) || 0.1 },
  ];
  const COLORS = ['#10b981', '#f43f5e'];

  if (loading) return <div className="h-screen w-full flex items-center justify-center font-black text-blue-600 text-3xl animate-pulse tracking-tighter">FINTRACK...</div>;

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-6">
        <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-[4rem] p-12 sm:p-20 shadow-2xl text-center border border-white/20">
          <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-500 p-7 rounded-[2.5rem] shadow-2xl mb-10 text-white">
            <Wallet size={60} strokeWidth={2.5} />
          </div>
          <h1 className="text-7xl font-black text-gray-900 mb-12 tracking-tighter italic">FinTrack</h1>
          <button onClick={handleLogin} className="group relative w-full bg-gray-900 text-white py-6 rounded-[2rem] font-bold text-2xl overflow-hidden active:scale-95 shadow-2xl cursor-pointer transition-all">
            <span className="relative z-10">Login/Sign Up with Google</span>
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="sticky top-0 z-50 w-full px-6 sm:px-12 py-5 backdrop-blur-lg bg-white/70 border-b border-white/20 flex justify-between items-center shadow-sm">
        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3 tracking-tighter">
          <Wallet size={32} className="text-blue-600" /> FinTrack
        </h1>
        <button onClick={handleLogout} className="group flex items-center gap-2 bg-white px-6 py-3 rounded-2xl font-bold text-gray-500 hover:text-red-500 transition-all border border-gray-100 cursor-pointer">
          <LogOut size={20} /> Logout
        </button>
      </header>

      <main className="flex-1 w-full px-6 sm:px-12 py-10 space-y-10">
        <div className="flex flex-col xl:flex-row gap-8">
          <div className={`relative overflow-hidden flex-1 p-12 rounded-[4rem] text-white shadow-2xl transition-all duration-700 ${percentageUsed > 80 ? 'bg-rose-500' : 'bg-blue-600'}`}>
            <p className="text-xs font-bold uppercase tracking-[0.4em] opacity-70 mb-4 font-mono">Real-time Expenditure</p>
            <h2 className="text-7xl sm:text-9xl font-black tracking-tighter mb-10 drop-shadow-2xl">₹{totalSpent.toLocaleString('en-IN')}</h2>
            <div className="w-full bg-white/20 rounded-full h-5 p-1.5 shadow-inner">
              <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(percentageUsed, 100)}%` }}></div>
            </div>
            <div className="flex justify-between mt-8 items-center">
               <span className="font-black text-xl bg-black/10 px-6 py-2 rounded-2xl uppercase text-xs tracking-[0.2em]">{percentageUsed.toFixed(1)}% Limit Used</span>
               {percentageUsed > 80 ? <TrendingUp size={48} className="animate-bounce" /> : <TrendingDown size={48} />}
            </div>
          </div>

          <div className="w-full xl:w-[450px] bg-white/60 backdrop-blur-md p-10 rounded-[4rem] border border-white flex flex-col justify-center shadow-xl">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Budget Target</h3>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-5">
                <label htmlFor="budget-input"><Settings size={32} className="text-blue-600" /></label>
                <div className="flex-1">
  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Monthly Limit</p>
  <input 
    id="budget-input" 
    type="number" 
    min="1" // Browser-level protection: value must be greater than or equal to 1
    value={monthlyBudget} 
    onChange={(e) => updateBudget(e.target.value)}
    onWheel={(e) => e.target.blur()} // Disable mouse-wheel scrolling
    placeholder="Enter limit"
    className="bg-transparent font-black text-4xl w-full focus:outline-none text-gray-900" 
  />
  {/* Optional: Show a small warning if the value is invalid */}
  {monthlyBudget !== '' && parseFloat(monthlyBudget) <= 0 && (
    <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">Value must be greater than 0</p>
  )}
</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={saveExpense} className="bg-white/80 backdrop-blur-xl border border-white p-10 sm:p-14 rounded-[4.5rem] shadow-2xl space-y-10">
            <div className="flex flex-col gap-3">
               <label htmlFor="amount-input" className="text-xs font-black text-blue-600 ml-6 uppercase tracking-[0.4em]">Transaction Amount</label>
               <input 
                 id="amount-input"
                 name="amount"
                 type="number" 
                 min="1"
                 step="0.01"
                 placeholder="0.00" 
                 value={amount} 
                 onChange={(e) => setAmount(e.target.value)}
                 onWheel={(e) => e.target.blur()} // DISABLE SCROLL
                 className="w-full p-10 rounded-[3rem] bg-gray-50 border-none ring-4 ring-gray-100 text-6xl font-black outline-none text-gray-900" 
               />
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor="cat-select" className="text-[10px] font-black text-gray-400 ml-6 uppercase tracking-widest">Category</label>
                <select id="cat-select" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-8 rounded-[2.5rem] bg-gray-50 border-none ring-4 ring-gray-100 font-black text-2xl cursor-pointer outline-none appearance-none">
                  <option>Food</option><option>Travel</option><option>Study</option><option>Fun</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <button type="submit" className={`px-16 py-8 rounded-[2.5rem] font-black text-2xl text-white shadow-2xl active:scale-95 cursor-pointer ${editingId ? 'bg-orange-500' : 'bg-gray-900'}`}>
                  {editingId ? 'UPDATE' : 'ADD'}
                </button>
              </div>
            </div>

            <div className="flex gap-12 px-6">
              <label className="flex items-center gap-4 text-xl font-bold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isNeed === true} onChange={() => setIsNeed(true)} className="w-8 h-8 rounded-full text-emerald-500 border-gray-200 cursor-pointer" />
                <span className={isNeed ? "text-emerald-600" : ""}>Need</span>
              </label>
              <label className="flex items-center gap-4 text-xl font-bold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isNeed === false} onChange={() => setIsNeed(false)} className="w-8 h-8 rounded-full text-rose-500 border-gray-200 cursor-pointer" />
                <span className={!isNeed ? "text-rose-600" : ""}>Want</span>
              </label>
            </div>
          </form>

          <div className="bg-white/40 backdrop-blur-sm p-12 rounded-[4.5rem] border border-white flex flex-col items-center shadow-xl">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Visual Breakdown</h3>
            <div style={{ width: '100%', height: '350px' }}>
              {mounted && (
                <ResponsiveContainer key={mounted ? 'active' : 'idle'}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={90} outerRadius={125} paddingAngle={12} dataKey="value" isAnimationActive={true}>
                      {chartData.map((e, i) => <Cell key={i} fill={COLORS[i]} cornerRadius={25} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '30px', border: 'none', fontWeight: '900' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex gap-16 mt-6 font-black text-xs tracking-[0.3em]">
              <span className="text-emerald-500">● NEEDS</span>
              <span className="text-rose-500">● WANTS</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-8 pb-10">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white/80 backdrop-blur-md border border-white p-10 rounded-[3.5rem] shadow-lg flex justify-between items-center">
              <div className="flex items-center gap-6 text-left">
                <div className={`w-3 h-3 rounded-full ${exp.isNeed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <div>
                  <p className="font-black text-2xl text-gray-800 tracking-tighter">{exp.category}</p>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{exp.createdAt?.toDate().toLocaleDateString() || 'Saving...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-black text-3xl tracking-tighter">₹{exp.amount}</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => startEdit(exp)} className="p-2 bg-blue-50 text-blue-600 rounded-xl cursor-pointer"><Edit2 size={16}/></button>
                  <button onClick={() => deleteExpense(exp.id)} className="p-2 bg-red-50 text-red-300 rounded-xl cursor-pointer"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
