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

  // RESTORED: Edit logic to populate the form
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
        await updateDoc(doc(db, 'expenses', editingId), { 
          amount: numAmount, 
          category, 
          isNeed 
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'expenses'), { 
          uid: user.uid, 
          amount: numAmount, 
          category, 
          isNeed, 
          createdAt: serverTimestamp() 
        });
      }
      setAmount('');
    } catch (e) { alert(e.message); }
  };

  const deleteExpense = async (id) => { if (window.confirm("Delete record?")) await deleteDoc(doc(db, 'expenses', id)); };

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = (parseFloat(monthlyBudget) || 0) - totalSpent;
  
  // RESTORED: Percentage logic for progress bar and color switching
  const percentageUsed = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  
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
            <span className="relative z-10">Continue with Google</span>
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-50 w-full px-6 sm:px-12 py-5 backdrop-blur-lg bg-white/70 border-b border-gray-100 flex justify-between items-center shadow-sm">
        <h1 className="text-3xl font-black text-blue-600 flex items-center gap-3 tracking-tighter">
          <Wallet size={32} /> FinTrack
        </h1>
        <div className="flex items-center gap-4">
          <img src={user?.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-blue-600 shadow-sm" />
          <button onClick={handleLogout} className="flex items-center gap-2 font-bold text-gray-500 hover:text-red-500 transition-all cursor-pointer">
            <LogOut size={20} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-6 sm:px-12 py-10 space-y-10">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Card with Percentage Color Logic */}
          <div className={`relative overflow-hidden flex-1 p-12 rounded-[4rem] text-white shadow-2xl transition-all duration-700 ${percentageUsed > 80 ? 'bg-rose-500' : 'bg-blue-600'}`}>
            <p className="text-xs font-bold uppercase tracking-[0.4em] opacity-70 mb-4 font-mono">Expenditure vs Remaining</p>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
              <h2 className="text-7xl sm:text-8xl font-black tracking-tighter drop-shadow-2xl">₹{totalSpent.toLocaleString('en-IN')}</h2>
              <div className="flex flex-col items-center gap-2">
                 {percentageUsed > 80 ? <TrendingUp size={48} className="animate-bounce" /> : <TrendingDown size={48} />}
                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 min-w-[200px]">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Remaining Balance</p>
                    <p className="text-3xl font-black tracking-tighter">₹{remainingBalance.toLocaleString('en-IN')}</p>
                 </div>
              </div>
            </div>
            {/* Real-time Percentage Bar */}
            <div className="w-full bg-white/20 rounded-full h-5 p-1 shadow-inner">
              <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(percentageUsed, 100)}%` }}></div>
            </div>
            <p className="mt-4 font-black text-sm opacity-90 tracking-widest uppercase">{percentageUsed.toFixed(1)}% OF BUDGET USED</p>
          </div>

          <div className="w-full xl:w-[400px] bg-white p-10 rounded-[4rem] border border-gray-100 shadow-xl flex flex-col justify-center">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Budget Target</h3>
            <div className="flex items-center gap-4">
              <Settings className="text-blue-600" size={32} />
              <input type="number" min="1" value={monthlyBudget} onChange={(e) => updateBudget(e.target.value)} onWheel={(e) => e.target.blur()} className="bg-transparent font-black text-5xl w-full outline-none text-gray-900" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={saveExpense} className="bg-white border border-gray-100 p-10 sm:p-14 rounded-[4.5rem] shadow-2xl space-y-8">
            <div className="flex flex-col gap-3">
               <label htmlFor="amount-input" className="text-xs font-black text-blue-600 ml-6 uppercase tracking-[0.4em]">Amount (₹)</label>
               <input id="amount-input" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.target.blur()} className="w-full p-10 rounded-[3rem] bg-gray-50 text-6xl font-black outline-none text-gray-900" />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 cursor-pointer hover:underline">
                  {showAddCategory ? <><X size={12}/> Cancel</> : <><Plus size={12}/> Custom</>}
                </button>
              </div>

              {showAddCategory ? (
                <div className="flex gap-2">
                  <input type="text" placeholder="New Category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 p-6 rounded-3xl bg-gray-50 font-black outline-none border-2 border-blue-100 text-gray-900" />
                  <button type="button" onClick={addCustomCategory} className="bg-blue-600 text-white px-8 rounded-3xl font-black cursor-pointer">ADD</button>
                </div>
              ) : (
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-8 rounded-[2.5rem] bg-gray-50 font-black text-2xl appearance-none outline-none ring-4 ring-transparent focus:ring-blue-50 text-gray-900 cursor-pointer">
                  {categories.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 px-6 items-center">
              <div className="flex gap-12 w-full md:w-auto">
                <label className="flex items-center gap-3 text-xl font-bold cursor-pointer text-gray-600">
                  <input type="checkbox" checked={isNeed} onChange={() => setIsNeed(true)} className="w-6 h-6 accent-emerald-500 cursor-pointer" /> Need
                </label>
                <label className="flex items-center gap-3 text-xl font-bold cursor-pointer text-gray-600">
                  <input type="checkbox" checked={!isNeed} onChange={() => setIsNeed(false)} className="w-6 h-6 accent-rose-500 cursor-pointer" /> Want
                </label>
              </div>
              <button type="submit" className="w-full md:w-auto md:ml-auto px-16 py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl hover:bg-blue-600 active:scale-95 transition-all cursor-pointer shadow-lg mt-4 md:mt-0">
                {editingId ? 'UPDATE' : 'SAVE'}
              </button>
            </div>
          </form>

          <div className="bg-white p-12 rounded-[4.5rem] border border-gray-100 flex flex-col items-center shadow-xl">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Visual Split</h3>
            <div style={{ width: '100%', height: '350px' }}>
              {mounted && (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={10} dataKey="value">
                      {chartData.map((e, i) => <Cell key={i} fill={COLORS[i]} cornerRadius={20} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', fontWeight: '900', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex gap-16 mt-4 font-black text-xs tracking-[0.3em] uppercase">
              <span className="text-emerald-500">● Needs</span>
              <span className="text-rose-500">● Wants</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] ml-6">Recent Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 pb-20">
            {expenses.map(exp => (
              <div key={exp.id} className="bg-white p-8 rounded-[3rem] shadow-md flex justify-between items-center group border border-transparent hover:border-blue-100 transition-all">
                <div className="flex items-center gap-5">
                  <div className={`w-3 h-3 rounded-full ${exp.isNeed ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <div>
                    <p className="font-black text-2xl text-gray-800 tracking-tighter italic">{exp.category}</p>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      {exp.createdAt?.toDate().toLocaleDateString() || 'Saving...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="font-black text-3xl tracking-tighter">₹{exp.amount.toLocaleString('en-IN')}</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => startEdit(exp)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white cursor-pointer transition-all">
                      <Edit2 size={18}/>
                    </button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-2 bg-red-50 text-red-200 hover:bg-red-500 hover:text-white cursor-pointer transition-all">
                      <Trash2 size={18}/>
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
