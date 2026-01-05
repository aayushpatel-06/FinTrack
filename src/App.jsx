import React, { useState, useEffect } from 'react';
import { auth, db, provider } from './firebase'; 
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, addDoc, query, where, onSnapshot, 
  orderBy, serverTimestamp, doc, deleteDoc, updateDoc, setDoc 
} from 'firebase/firestore';
import { LogOut, Wallet, Trash2, Settings, Edit2, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function App() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [categories, setCategories] = useState(['Food', 'Travel', 'Study', 'Fun']);
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
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

  const handleLogout = () => signOut(auth);
  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };

  const updateBudget = async (val) => {
    setMonthlyBudget(val);
    const num = parseFloat(val);
    if (user && !isNaN(num) && num > 0) {
      await setDoc(doc(db, 'users', user.uid), { budget: num }, { merge: true });
    }
  };

  const addCustomCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setCategory(newCategory);
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setIsNeed(exp.isNeed);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveExpense = async (e) => {
    e.preventDefault(); 
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      alert("Please enter a positive amount");
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

  const deleteExpense = async (id) => { if (window.confirm("Delete record?")) await deleteDoc(doc(db, 'expenses', id)); };

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = (parseFloat(monthlyBudget) || 0) - totalSpent;
  const percentageUsed = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  
  const chartData = [
    { name: 'Needs', value: expenses.filter(e => e.isNeed).reduce((s, i) => s + i.amount, 0) || 0.1 },
    { name: 'Wants', value: expenses.filter(e => !e.isNeed).reduce((s, i) => s + i.amount, 0) || 0.1 },
  ];
  const COLORS = ['#10b981', '#f43f5e'];

  if (loading) return <div className="h-screen w-full flex items-center justify-center font-black text-blue-600 text-2xl animate-pulse tracking-tighter">FINTRACK...</div>;

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-6">
        <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[3rem] p-10 sm:p-16 shadow-2xl text-center border border-white/20">
          <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-500 p-6 rounded-[2rem] shadow-2xl mb-8 text-white">
            <Wallet size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-8 tracking-tighter italic">FinTrack</h1>
          <button onClick={handleLogin} className="group relative w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-bold text-xl overflow-hidden active:scale-95 shadow-2xl cursor-pointer transition-all">
            <span className="relative z-10">Sign Up/Login</span>
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-50 w-full px-6 sm:px-10 py-4 backdrop-blur-lg bg-white/70 border-b border-gray-100 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-black text-blue-600 flex items-center gap-2 tracking-tighter">
          <Wallet size={28} /> FinTrack
        </h1>
        <div className="flex items-center gap-4">
          <img src={user?.photoURL} alt="User" className="w-8 h-8 rounded-full border-2 border-blue-600 shadow-sm" />
          <button onClick={handleLogout} className="flex items-center gap-2 font-bold text-gray-500 hover:text-red-500 transition-all text-sm cursor-pointer">
            <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-6 sm:px-10 py-8 space-y-8">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className={`relative overflow-hidden flex-1 p-10 rounded-[3rem] text-white shadow-2xl transition-all duration-700 ${percentageUsed > 80 ? 'bg-rose-500' : 'bg-blue-600'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-70 mb-3 font-mono">Expenditure vs Remaining</p>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-8">
              <h2 className="text-5xl sm:text-6xl font-black tracking-tighter drop-shadow-xl">₹{totalSpent.toLocaleString('en-IN')}</h2>
              <div className="flex flex-col items-center gap-2">
                 {percentageUsed > 80 ? <TrendingUp size={40} className="animate-bounce" /> : <TrendingDown size={40} />}
                 <div className="bg-white/10 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/20 min-w-[170px]">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Remaining</p>
                    <p className="text-2xl font-black tracking-tighter">₹{remainingBalance.toLocaleString('en-IN')}</p>
                 </div>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-4 p-1 shadow-inner">
              <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(percentageUsed, 100)}%` }}></div>
            </div>
            <p className="mt-3 font-black text-xs opacity-90 tracking-widest uppercase">{percentageUsed.toFixed(1)}% USED</p>
          </div>

          <div className="w-full xl:w-[350px] bg-white p-8 rounded-[3rem] border border-gray-100 shadow-lg flex flex-col justify-center">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Budget Target</h3>
            <div className="flex items-center gap-3">
              <Settings className="text-blue-600" size={28} />
              <input type="number" min="1" value={monthlyBudget} onChange={(e) => updateBudget(e.target.value)} onWheel={(e) => e.target.blur()} className="bg-transparent font-black text-3xl w-full outline-none text-gray-900" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={saveExpense} className="bg-white border border-gray-100 p-8 sm:p-10 rounded-[3.5rem] shadow-xl space-y-6">
            <div className="flex flex-col gap-2">
               <label htmlFor="amount-input" className="text-[10px] font-black text-blue-600 ml-4 uppercase tracking-widest">Amount (₹)</label>
               <input id="amount-input" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.target.blur()} className="w-full p-8 rounded-[2rem] bg-gray-50 text-4xl font-black outline-none text-gray-900 border-none ring-2 ring-gray-100 focus:ring-blue-100 transition-all" />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-4">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 cursor-pointer hover:underline">
                  {showAddCategory ? <><X size={10}/> Cancel</> : <><Plus size={10}/> Custom</>}
                </button>
              </div>

              {showAddCategory ? (
                <div className="flex gap-2">
                  <input type="text" placeholder="New Cat..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 p-5 rounded-2xl bg-gray-50 font-bold outline-none border-2 border-blue-100 text-sm" />
                  <button type="button" onClick={addCustomCategory} className="bg-blue-600 text-white px-6 rounded-2xl font-black text-xs cursor-pointer">ADD</button>
                </div>
              ) : (
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-6 rounded-[1.5rem] bg-gray-50 font-black text-lg appearance-none outline-none ring-2 ring-transparent focus:ring-blue-50 text-gray-900 cursor-pointer">
                  {categories.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-6 px-4 items-center">
              <div className="flex gap-8 w-full md:w-auto">
                <label className="flex items-center gap-2 text-base font-bold cursor-pointer text-gray-600">
                  <input type="checkbox" checked={isNeed} onChange={() => setIsNeed(true)} className="w-5 h-5 accent-emerald-500 cursor-pointer" /> Need
                </label>
                <label className="flex items-center gap-2 text-base font-bold cursor-pointer text-gray-600">
                  <input type="checkbox" checked={!isNeed} onChange={() => setIsNeed(false)} className="w-5 h-5 accent-rose-500 cursor-pointer" /> Want
                </label>
              </div>
              <button type="submit" className="w-full md:w-auto md:ml-auto px-12 py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-600 active:scale-95 transition-all cursor-pointer shadow-md mt-2 md:mt-0 uppercase tracking-widest">
                {editingId ? 'UPDATE' : 'SAVE'}
              </button>
            </div>
          </form>

          <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 flex flex-col items-center shadow-lg">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Visual Split</h3>
            <div style={{ width: '100%', height: '300px' }}>
              {mounted && (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                      {chartData.map((e, i) => <Cell key={i} fill={COLORS[i]} cornerRadius={15} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '15px', fontWeight: '800', border: 'none', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex gap-12 mt-2 font-black text-[10px] tracking-widest uppercase">
              <span className="text-emerald-500">● Needs</span>
              <span className="text-rose-500">● Wants</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-4">Recent Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 pb-16">
            {expenses.map(exp => (
              <div key={exp.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm flex justify-between items-center group border border-transparent hover:border-blue-50 transition-all">
                <div className="flex items-center gap-4 text-left">
                  <div className={`w-2.5 h-2.5 rounded-full ${exp.isNeed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <div>
                    <p className="font-black text-lg text-gray-800 tracking-tighter">{exp.category}</p>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                      {exp.createdAt?.toDate().toLocaleDateString() || '...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-black text-xl tracking-tighter">₹{exp.amount.toLocaleString('en-IN')}</p>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(exp)} className="p-2 text-gray-300 hover:text-blue-600 transition-colors cursor-pointer">
                      <Edit2 size={16}/>
                    </button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors cursor-pointer">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
