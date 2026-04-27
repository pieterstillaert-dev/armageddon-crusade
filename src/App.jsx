import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query,
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  deleteDoc 
} from 'firebase/firestore';
import { 
  Shield, 
  Swords, 
  BookOpen, 
  ScrollText, 
  Dices, 
  PlusCircle, 
  Map as MapIcon,
  Skull,
  History,
  AlertTriangle,
  Trophy,
  Zap,
  User,
  ClipboardList,
  Edit3,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  Check,
  Link,
  Loader2,
  Coins,
  Users,
  PieChart,
  Globe,
  Medal,
  Crown,
  Printer,
  Component,
  Lock,
  Unlock,
  Sparkles,
  FileText
} from 'lucide-react';

// --- CONFIGURATIE ---
// VERVANG DIT BLOK MET JOUW EIGEN FIREBASE CONFIG!
const firebaseConfig = {
  apiKey: "AIzaSyDPElu2Z_ktdfHCrmvONBcG2fDjH7aiAlM",
  authDomain: "crusade-armageddon.firebaseapp.com",
  projectId: "crusade-armageddon",
  storageBucket: "crusade-armageddon.firebasestorage.app",
  messagingSenderId: "726265348764",
  appId: "1:726265348764:web:f81af74ec1238cdf6ea359",
  measurementId: "G-M2520W5RH8"
  /* PLAK HIER JOUW EIGEN FIREBASE CONFIG */
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'armageddon-crusade-companion';
const apiKey = ""; // Gemini API key

// --- ADMIN SETTINGS ---
const ADMIN_PASSWORD = "admin123"; 

// --- CAMPAGNE DATA ---
const CAMPAIGN_MAX_WINS = 30;
const WAYPOINTS = [
  { name: "Warp Jump", percent: 0 },
  { name: "Mandeville Point", percent: 33.33 },
  { name: "Inner System", percent: 66.66 },
  { name: "Armageddon", percent: 100 }
];

const ARMAGEDDON_MISSIONS = [
  { id: 1, name: "Supply Raid", background: "With Armageddon in sight, supply shortages are already crippling war efforts. Every recovered crate could decide a future battle.", rules: ["Command Phase (BR 2+): Gain 5 VP per objective (max 15 VP per turn)", "Action - Loot Supply: Shooting Phase. One unit per objective. +5 VP in no-man’s land, +8 VP in enemy deployment zone.", "Action completes at end of turn. Unit cannot shoot/charge."], reward: "Increase supply limit by 100 and 1 XP per unit that looted an objective" },
  { id: 2, name: "Forward Recon", background: "Scouts push ahead to map terrain and locate enemy forces. Intelligence gained here will shape the coming war.", rules: ["Command Phase (BR 2+): 5 VP per objective (max 15). Home objectives 0 VP.", "End of Your Turn: +5 VP if units are in enemy deployment zone.", "End of Battle: +5 VP if units are in enemy deployment zone."], reward: "+3 XP to one CHARACTER. Next battle: 2 units gain Scout 6\"" },
  { id: 3, name: "Secure Landing Zone", background: "Reinforcements depend on securing a stable landing zone.", rules: ["Command Phase (BR 2+): 5 VP per objective (max 15). +5VP for center.", "End of Battle: Control center for +20 VP."], reward: "Winner: +1 RP & +100 Supplies." },
  { id: 4, name: "Sabotage Relay", background: "Communication relays coordinate entire fleets. Destroying them cripples an invasion.", rules: ["Action - Sabotage: Shooting phase. +5 VP / +8 VP. Each objective once.", "End of Battle: +3 VP per sabotaged objective control."], reward: "+2 XP per sabotaged objective (max 6XP total)." },
  { id: 5, name: "Ambush Engagement", background: "A force is caught off guard and must react instantly.", rules: ["3 VP for each unit destroyed (max 15VP per turn)."], reward: "Token to ignore one Out of Action test. +3XP to unit with most kills." },
  { id: 6, name: "Data Retrieval", background: "Ancient data cores hold secrets that shape the war.", rules: ["Action - Extract Data: +5 VP in no-mansland, +8VP in enemy zone."], reward: "Next battle: Opponent deploys 3 units first. One unit gains +2 XP." },
  { id: 7, name: "Patrol Clash", background: "Two patrols collide unexpectedly. Survival decides the outcome.", rules: ["Eliminate opponent scout for 10VP. +2VP/turn if your scout lives.", "Monsters/Vehicles cannot be scouts."], reward: "Winner +1 RP. All surviving units: +1 XP." },
  { id: 8, name: "Strategic Cache", background: "Hidden caches of weapons might contain a special weapon!", rules: ["Determine random objective in nomansland as cache.", "8 VP for cache, 2 VP for others."], reward: "One character gains an additional weapon modification." },
  { id: 9, name: "Battlefield Salvage", background: "Wreckage still holds valuable wargear.", rules: ["Action – Salvage: Shooting phase. +5 VP / +8 VP.", "End of Battle: +2 VP per salvaged objective."], reward: "One Artificer level Relic." },
  { id: 10, name: "Last Stand", background: "One force holds the line while others depart.", rules: ["Warlord Duel: 15 VP for enemy warlord, 20 VP for kill by own warlord."], reward: "Your warlord gains 5 XP." }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loreEntries, setLoreEntries] = useState([]);
  const [battleLogs, setBattleLogs] = useState([]);
  const [crusadeCards, setCrusadeCards] = useState([]);
  const [cardLogs, setCardLogs] = useState([]);
  const [campaignState, setCampaignState] = useState({ aiSummary: "De archieven worden gescand door de Scribes van de Administratum...", lastUpdated: null });
  
  // UI States
  const [rolledMission, setRolledMission] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminInput, setAdminInput] = useState("");

  // Form States
  const [newLore, setNewLore] = useState({ title: '', content: '', linkedBattleId: '' });
  const [battleForm, setBattleForm] = useState({ attackerId: '', defenderId: '', winnerId: '', writeLoreNow: false, loreTitle: '', loreContent: '' });
  const [cardForm, setCardForm] = useState({ forceName: '', faction: '', superFaction: 'Imperium', playerName: '', supply: 500, rp: 0, crusadePoints: 0, secretKey: '' });
  const [claimForm, setClaimForm] = useState({ forceName: '', secretKey: '' });
  const [newUnitName, setNewUnitName] = useState('');

  // Editing States (Admin)
  const [editingLore, setEditingLore] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const collections = [
      { name: 'lore', setter: setLoreEntries },
      { name: 'battles', setter: setBattleLogs },
      { name: 'cards', setter: setCrusadeCards },
      { name: 'cardLogs', setter: setCardLogs }
    ];
    const unsubs = collections.map(col => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', col.name));
      return onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (col.name === 'cards') col.setter(data);
        else col.setter(data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      }, (err) => console.error(err));
    });

    const campaignRef = doc(db, 'artifacts', appId, 'public', 'data', 'state', 'campaign');
    const unsubState = onSnapshot(campaignRef, (doc) => {
      if (doc.exists()) setCampaignState(doc.data());
    });

    return () => {
      unsubs.forEach(un => un());
      unsubState();
    };
  }, [user]);

  const showStatus = (text, type = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  };

  // --- AI LOGIC ---
  const callGeminiWithRetry = async (prompt, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: "Je bent een keizerlijke scribe van de Administratum in het 41e millennium. Jouw taak is om een sfeervol, duister en heroïsch samenvattend verslag te schrijven van de huidige status van de Armageddon Crusade. Schrijf uitsluitend in het Nederlands. Gebruik termen als 'Vox-transmissies', 'Gezegend zij de Keizer', 'Het bloed van martelaren' etc. Houd het onder de 250 woorden." }] }
          })
        });
        if (!response.ok) throw new Error('API error');
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
  };

  const handleGenerateAISummary = async () => {
    setIsProcessing(true);
    showStatus("De Scribes raadplegen de data-taps...");
    try {
      const recentBattles = battleLogs.slice(0, 10).map(b => `${b.attacker} vs ${b.defender} (Winnaar: ${b.winner})`).join(', ');
      const recentLore = loreEntries.slice(0, 5).map(l => `${l.title}: ${l.content.substring(0, 100)}...`).join(' | ');
      const factions = crusadeCards.map(c => `${c.forceName} (${c.superFaction})`).join(', ');
      const prompt = `Schrijf een campagne-update. Actieve legers: ${factions}. Recente veldslagen: ${recentBattles}. Belangrijke lore: ${recentLore}. Wie wint terrein? Welke duisternis dreigt?`;
      const aiText = await callGeminiWithRetry(prompt);
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'state', 'campaign'), { aiSummary: aiText, lastUpdated: Date.now() });
      showStatus("Chronicles bijgewerkt!");
    } catch (err) { showStatus("AI Vox-storing.", "error"); }
    finally { setIsProcessing(false); }
  };

  // --- DATABASE ACTIONS ---
  const handleUpdateCard = async (cardId, updates, logMsg) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', cardId), updates);
      if (logMsg) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'cardLogs'), { cardId, message: logMsg, owner: user.uid, timestamp: Date.now() });
    } catch (e) { showStatus("Update mislukt.", "error"); }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'cards'), { ...cardForm, owner: user.uid, timestamp: Date.now(), units: [] });
      showStatus("Crusade Card aangemaakt!");
    } catch (e) { showStatus("Fout bij aanmaken.", "error"); }
    finally { setIsProcessing(false); }
  };

  const handleClaimForce = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const target = crusadeCards.find(c => c.forceName.toLowerCase() === claimForm.forceName.toLowerCase() && c.secretKey === claimForm.secretKey);
    if (target) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', target.id), { owner: user.uid });
      showStatus("Beheer hersteld!");
      setActiveTab('cards');
    } else { showStatus("Onjuiste data.", "error"); }
    setIsProcessing(false);
  };

  const handleCreateUnit = async (card) => {
    if (!newUnitName.trim()) return;
    const newUnit = { 
      id: Date.now().toString(), name: newUnitName.trim(), xp: 0, modelCount: 1, points: 0, killTally: 0, 
      isWarlord: false, unitType: 'Other', traits: '', mods: '', scars: '', relics: '', enhancements: '', customInfo: '' 
    };
    await handleUpdateCard(card.id, { units: [...(card.units || []), newUnit] }, `Unit toegevoegd: ${newUnitName}`);
    setNewUnitName('');
    setIsAddingUnit(false);
  };

  const handleUpdateUnit = async (card, unitId, field, value) => {
    const updatedUnits = card.units.map(u => u.id === unitId ? { ...u, [field]: value } : u);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id), { units: updatedUnits });
  };

  const handleToggleWarlord = async (card, unitId) => {
    const updatedUnits = card.units.map(u => ({ ...u, isWarlord: u.id === unitId ? !u.isWarlord : false }));
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id), { units: updatedUnits });
  };

  const handleLogBattle = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const winner = crusadeCards.find(c => c.id === battleForm.winnerId);
      const attacker = crusadeCards.find(c => c.id === battleForm.attackerId);
      const defender = crusadeCards.find(c => c.id === battleForm.defenderId);
      const battleRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'battles'), {
        attacker: attacker.forceName, defender: defender.forceName, winner: winner.forceName,
        winnerSuperFaction: winner.superFaction, timestamp: Date.now()
      });
      if (battleForm.writeLoreNow) {
        const loreRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'lore'), {
          title: battleForm.loreTitle, content: battleForm.loreContent, linkedBattleId: battleRef.id,
          author: user.uid, forceName: myCard.forceName, superFaction: myCard.superFaction, timestamp: Date.now()
        });
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'battles', battleRef.id), { linkedLoreId: loreRef.id });
      }
      showStatus("Engagement gelogd!");
      setBattleForm({ attackerId: '', defenderId: '', winnerId: '', writeLoreNow: false, loreTitle: '', loreContent: '' });
    } catch(e) { showStatus("Fout bij loggen.", "error"); }
    finally { setIsProcessing(false); }
  };

  // --- ADMIN ACTIONS ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminInput === ADMIN_PASSWORD) { setIsAdminAuthenticated(true); showStatus("Admin-modus actief."); }
    else { showStatus("Wachtwoord onjuist.", "error"); }
  };

  const deleteDocument = async (colName, id) => {
    if (!window.confirm(`Definitief verwijderen?`)) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id));
      showStatus("Verwijderd.");
    } catch (e) { showStatus("Fout.", "error"); }
  };

  const myCard = crusadeCards.find(c => c.owner === user?.uid);
  const combinedEvents = [
    ...loreEntries.map(e => ({ ...e, type: 'lore' })),
    ...battleLogs.map(e => ({ ...e, type: 'battle' }))
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 3);

  if (!user) return <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-orange-500 font-mono italic"><Skull size={40} className="animate-pulse mb-4" /> VERBINDEN...</div>;

  return (
    <>
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24 selection:bg-orange-500/30 print:hidden">
      {statusMsg.text && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 font-bold text-xs uppercase tracking-widest ${statusMsg.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-50 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <Swords size={24} className="text-orange-600" />
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-tighter text-white leading-none">Hageland Wargaming</h1>
            <span className="text-[9px] text-orange-500 font-mono tracking-widest uppercase font-bold">Armageddon Crusade</span>
          </div>
        </div>
        <div className="text-[9px] font-mono uppercase text-right leading-tight">
          {myCard ? (
             <div className="flex flex-col items-end">
               <span className="text-zinc-500">Commandeur <span className="text-orange-500 font-bold">{myCard.playerName}</span></span>
               <span className="text-zinc-400 max-w-[120px] truncate">{myCard.forceName}</span>
             </div>
          ) : (
             <div className="flex flex-col items-end text-zinc-500 italic">Gasten Toegang</div>
          )}
        </div>
      </header>

      {/* NAVIGATION */}
      <nav className="bg-zinc-900 border-b border-zinc-800 flex sticky top-[53px] z-40 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', icon: MapIcon, label: 'Status' },
          { id: 'cards', icon: ClipboardList, label: 'Order of Battle' },
          { id: 'generator', icon: Dices, label: 'Missies' },
          { id: 'lore', icon: ScrollText, label: 'Lore Hub' },
          { id: 'logs', icon: History, label: 'Battles' },
          { id: 'leaderboard', icon: Medal, label: 'Rangen' },
          { id: 'admin', icon: isAdminAuthenticated ? Unlock : Lock, label: 'Admin' }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 min-w-[80px] py-3 flex flex-col items-center justify-center transition-all ${activeTab === t.id ? 'text-orange-500 bg-orange-500/5 border-b-2 border-orange-500' : 'text-zinc-600 border-b-2 border-transparent hover:text-zinc-400'}`}>
            <t.icon size={16} className="mb-1" />
            <span className="text-[8px] font-black uppercase tracking-tighter">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-orange-900/30 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity"><Sparkles size={160} /></div>
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><FileText size={20} /></div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Chronicles of the Scribe</h2>
               </div>
               <div className="bg-zinc-950/80 p-6 rounded-2xl border border-zinc-800 relative shadow-inner">
                  <div className="absolute top-2 right-4 text-[7px] font-mono text-zinc-600 uppercase">Vox: {campaignState.lastUpdated ? new Date(campaignState.lastUpdated).toLocaleString() : 'Antieke Data'}</div>
                  <p className="text-zinc-300 text-sm leading-relaxed italic whitespace-pre-wrap">{campaignState.aiSummary}</p>
               </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600"></div>
               <h2 className="text-2xl font-black uppercase italic mb-3 tracking-tighter text-white">De Race naar Armageddon</h2>
               <div className="space-y-10 mt-8">
                  {['Imperium', 'Chaos', 'Xenos'].map(faction => {
                     const wins = battleLogs.filter(b => b.winnerSuperFaction === faction).length;
                     const progress = Math.min(100, (wins / CAMPAIGN_MAX_WINS) * 100);
                     return (
                        <div key={faction} className="relative">
                           <div className="flex justify-between items-end mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${faction === 'Imperium' ? 'text-blue-500' : faction === 'Chaos' ? 'text-red-500' : 'text-green-500'}`}>{faction} Vloot</span>
                              <span className="text-[10px] font-mono text-zinc-500">{wins} / {CAMPAIGN_MAX_WINS} Zeges</span>
                           </div>
                           <div className="relative h-2 bg-zinc-950 rounded-full border border-zinc-800">
                              <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${faction === 'Imperium' ? 'bg-blue-600' : faction === 'Chaos' ? 'bg-red-600' : 'bg-green-600'}`} style={{ width: `${progress}%` }}></div>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
          </div>
        )}

        {/* ORDER OF BATTLE */}
        {activeTab === 'cards' && (
          <div className="space-y-8">
            {!myCard ? (
              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] p-8 text-center">
                <Skull className="mx-auto mb-4 text-zinc-700" size={40}/>
                <h3 className="font-black uppercase text-xl text-orange-500 mb-6">Registreer je Crusade Force</h3>
                <form onSubmit={handleCreateCard} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <input type="text" placeholder="Force Naam" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800" onChange={e => setCardForm({...cardForm, forceName: e.target.value})} required />
                  <input type="text" placeholder="Faction" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800" onChange={e => setCardForm({...cardForm, faction: e.target.value})} required />
                  <select className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300" value={cardForm.superFaction} onChange={e => setCardForm({...cardForm, superFaction: e.target.value})}>
                    <option value="Imperium">Imperium</option>
                    <option value="Chaos">Chaos</option>
                    <option value="Xenos">Xenos</option>
                  </select>
                  <input type="text" placeholder="Naam Commandeur" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800" onChange={e => setCardForm({...cardForm, playerName: e.target.value})} required />
                  <input type="password" placeholder="Toegangscode" className="md:col-span-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800" onChange={e => setCardForm({...cardForm, secretKey: e.target.value})} required />
                  <button className="md:col-span-2 bg-orange-600 p-4 rounded-xl font-black uppercase text-xs">Start Crusade</button>
                </form>
                <div className="mt-8 pt-8 border-t border-zinc-800">
                   <p className="text-zinc-500 text-xs mb-4">Reeds een leger? Herstel toegang:</p>
                   <div className="flex gap-2 max-w-sm mx-auto">
                      <input type="text" placeholder="Exacte Force Naam" className="flex-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs" onChange={e => setClaimForm({...claimForm, forceName: e.target.value})}/>
                      <input type="password" placeholder="Code" className="w-24 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs" onChange={e => setClaimForm({...claimForm, secretKey: e.target.value})}/>
                      <button onClick={handleClaimForce} className="bg-zinc-100 text-zinc-950 px-4 rounded-xl font-bold text-[10px]">HERSTEL</button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border-2 border-orange-600 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 bg-zinc-950/50 border-b border-zinc-800 flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2">{myCard.forceName} <button onClick={() => window.print()} title="Print Roster" className="text-zinc-600 hover:text-white"><Printer size={16}/></button></h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase">{myCard.faction} | {myCard.playerName}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center px-4 border-l border-zinc-800"><span className="block text-[7px] text-zinc-500 uppercase font-black">Supply</span><span className="text-xl font-black">{myCard.supply}</span></div>
                    <div className="text-center border-l border-zinc-800 px-4"><span className="block text-[7px] text-orange-900 uppercase font-black">RP</span><span className="text-xl font-black text-orange-600">{myCard.rp}</span></div>
                    <div className="text-center border-l border-zinc-800 px-4"><span className="block text-[7px] text-blue-500 uppercase font-black">CP</span><span className="text-xl font-black text-blue-500">{myCard.crusadePoints || 0}</span></div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-800 bg-zinc-900/20">
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleUpdateCard(myCard.id, { rp: (myCard.rp || 0) + 1 }, "+1 RP added")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700">+1 RP</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { rp: Math.max(0, (myCard.rp || 0) - 1) }, "-1 RP spent")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700">-1 RP</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { supply: (myCard.supply || 0) + 100 }, "+100 Supply")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700">+100 Sup</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { supply: Math.max(0, (myCard.supply || 0) - 100) }, "-100 Supply")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700">-100 Sup</button>
                   </div>
                   <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-24 overflow-y-auto no-scrollbar">
                      <h4 className="text-[8px] font-black uppercase text-zinc-600 mb-2">History Log</h4>
                      {cardLogs.filter(l => l.cardId === myCard.id).map((l, idx) => (
                         <div key={idx} className="text-[9px] text-zinc-500 italic mb-1 border-l border-orange-500/30 pl-2">{l.message}</div>
                      ))}
                   </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase tracking-widest">Active Units</h4>
                    <button onClick={() => setIsAddingUnit(true)} className="bg-orange-600 px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all hover:scale-105">+ Unit</button>
                  </div>
                  {isAddingUnit && (
                    <div className="flex gap-2 animate-in slide-in-from-right-2">
                      <input type="text" placeholder="Unit Naam..." className="flex-1 bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} autoFocus />
                      <button onClick={() => handleCreateUnit(myCard)} className="bg-green-600 p-2 rounded-lg"><Check size={14}/></button>
                      <button onClick={() => setIsAddingUnit(false)} className="bg-zinc-800 p-2 rounded-lg"><X size={14}/></button>
                    </div>
                  )}
                  <div className="space-y-4">
                    {myCard.units?.map(unit => (
                      <div key={unit.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-orange-500/30 transition-all">
                        <div className="p-4 flex justify-between items-center bg-zinc-900/10">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-orange-500 font-black text-xs px-2 py-1 bg-orange-500/5 rounded border border-orange-500/20">{unit.xp} XP</span>
                            <h5 className="font-black uppercase flex items-center gap-2">{unit.name} {unit.isWarlord && <Crown size={14} className="text-yellow-500"/>}</h5>
                            <div className="flex gap-4 text-[9px] text-zinc-600 font-bold uppercase">
                               <span><Skull size={10} className="inline mr-1"/> {unit.killTally || 0} Kills</span>
                               <span><Coins size={10} className="inline mr-1"/> {unit.points || 0} pts</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button onClick={() => handleToggleWarlord(myCard, unit.id)} className={`p-2 transition-colors ${unit.isWarlord ? 'text-yellow-500' : 'text-zinc-700 hover:text-yellow-500'}`}><Crown size={16}/></button>
                             <button onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)} className="p-2 text-zinc-500 group-hover:text-white transition-all"><ChevronDown size={16}/></button>
                          </div>
                        </div>
                        {expandedUnit === unit.id && (
                          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800 bg-zinc-900/10 animate-in slide-in-from-top-2">
                            <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                  <UnitField label="XP Points" type="number" value={unit.xp} onChange={v => handleUpdateUnit(myCard, unit.id, 'xp', parseInt(v) || 0)} />
                                  <UnitField label="Kill Tally" type="number" value={unit.killTally} onChange={v => handleUpdateUnit(myCard, unit.id, 'killTally', parseInt(v) || 0)} />
                                  <UnitField label="Points (pts)" type="number" value={unit.points} onChange={v => handleUpdateUnit(myCard, unit.id, 'points', parseInt(v) || 0)} />
                                  <UnitField label="Models" type="number" value={unit.modelCount} onChange={v => handleUpdateUnit(myCard, unit.id, 'modelCount', parseInt(v) || 1)} />
                               </div>
                               <UnitField label="Battle Traits" value={unit.traits} onChange={v => handleUpdateUnit(myCard, unit.id, 'traits', v)} />
                               <UnitField label="Weapon Modifications" value={unit.mods} onChange={v => handleUpdateUnit(myCard, unit.id, 'mods', v)} />
                            </div>
                            <div className="space-y-4">
                               <UnitField label="Battle Scars" value={unit.scars} onChange={v => handleUpdateUnit(myCard, unit.id, 'scars', v)} />
                               <UnitField label="Relics" value={unit.relics} onChange={v => handleUpdateUnit(myCard, unit.id, 'relics', v)} />
                               <UnitField label="Enhancements" value={unit.enhancements} onChange={v => handleUpdateUnit(myCard, unit.id, 'enhancements', v)} />
                               <UnitField label="Unit Records / Lore" area value={unit.customInfo} onChange={v => handleUpdateUnit(myCard, unit.id, 'customInfo', v)} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LORE HUB */}
        {activeTab === 'lore' && (
          <div className="space-y-6 animate-in fade-in">
            {myCard && (
               <form onSubmit={handleCreateLore} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
                 <h3 className="font-black uppercase text-[10px] text-zinc-500 flex items-center gap-2"><ScrollText size={14} className="text-orange-500"/> Nieuwe Transmissie</h3>
                 <input type="text" placeholder="Titel..." className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-sm" value={newLore.title} onChange={e => setNewLore({...newLore, title: e.target.value})} required />
                 <textarea placeholder="Verslag..." className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-sm h-32" value={newLore.content} onChange={e => setNewLore({...newLore, content: e.target.value})} required />
                 <button className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase text-xs">Publish transmission</button>
               </form>
            )}
            <div className="space-y-4">
              {loreEntries.map(e => (
                <article key={e.id} className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 hover:border-zinc-700 transition-all">
                  <h4 className="text-orange-500 font-black uppercase italic text-xl mb-1">{e.title}</h4>
                  <p className="text-[10px] font-bold uppercase mb-4 text-zinc-500">Bron: {e.forceName} | {new Date(e.timestamp).toLocaleDateString()}</p>
                  <p className="text-zinc-300 text-sm italic border-l-2 border-zinc-800 pl-6 leading-relaxed whitespace-pre-wrap">{e.content}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* BATTLE LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-in fade-in">
            {myCard && (
               <form onSubmit={handleLogBattle} className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 space-y-6 shadow-xl">
                 <h3 className="font-black uppercase text-xl text-orange-500 text-center flex items-center justify-center gap-3"><Swords size={24}/> Log Engagement</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300" value={battleForm.attackerId} onChange={e => setBattleForm({...battleForm, attackerId: e.target.value})} required>
                       <option value="">Attacker...</option>
                       {crusadeCards.map(c => <option key={c.id} value={c.id}>{c.forceName}</option>)}
                    </select>
                    <select className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300" value={battleForm.defenderId} onChange={e => setBattleForm({...battleForm, defenderId: e.target.value})} required>
                       <option value="">Defender...</option>
                       {crusadeCards.map(c => <option key={c.id} value={c.id}>{c.forceName}</option>)}
                    </select>
                 </div>
                 <select className="w-full bg-orange-950/20 p-4 rounded-xl border border-orange-500/50 text-white font-bold" value={battleForm.winnerId} onChange={e => setBattleForm({...battleForm, winnerId: e.target.value})} required>
                    <option value="">Select Winnaar...</option>
                    {battleForm.attackerId && <option value={battleForm.attackerId}>{crusadeCards.find(c => c.id === battleForm.attackerId)?.forceName}</option>}
                    {battleForm.defenderId && <option value={battleForm.defenderId}>{crusadeCards.find(c => c.id === battleForm.defenderId)?.forceName}</option>}
                 </select>
                 <button disabled={isProcessing} className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase shadow-lg">Confirm Battle result</button>
               </form>
            )}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-zinc-950 text-zinc-600 font-black uppercase border-b border-zinc-800"><tr><th className="p-5">Slagveld</th><th className="p-5 text-orange-500">Victorious</th></tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {battleLogs.map(l => (
                    <tr key={l.id} className="hover:bg-zinc-800/30">
                       <td className="p-5 font-bold text-zinc-300">{l.attacker} vs {l.defender}</td>
                       <td className="p-5 font-black uppercase italic text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${l.winnerSuperFaction === 'Imperium' ? 'bg-blue-500' : l.winnerSuperFaction === 'Chaos' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                          {l.winner}
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {activeTab === 'leaderboard' && (
           <div className="space-y-8 animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600"></div>
                <h2 className="text-2xl font-black uppercase italic mb-3 tracking-tighter text-white">Hall of Heroes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                   
                   {/* Veterans: Most Battles */}
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><History size={14}/> Veteranen (Veldslagen)</h3>
                      <div className="space-y-2">
                         {Object.values(crusadeCards.reduce((acc, c) => { acc[c.forceName] = { name: c.forceName, count: 0, player: c.playerName }; return acc; }, {})).map(f => {
                            let count = 0; battleLogs.forEach(b => { if(b.attacker === f.name || b.defender === f.name) count++; }); return { ...f, count };
                         }).sort((a, b) => b.count - a.count).filter(f => f.count > 0).slice(0, 5).map((f, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white leading-none">{f.name}</p><p className="text-[8px] uppercase text-zinc-500">{f.player}</p></div>
                               <span className="text-sm font-black text-zinc-300">{f.count}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Winners: Most Zeges */}
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><Trophy size={14}/> Overwinnaars (Zeges)</h3>
                      <div className="space-y-2">
                         {crusadeCards.map(c => ({ name: c.forceName, player: c.playerName, wins: battleLogs.filter(b => b.winner === c.forceName).length }))
                            .sort((a, b) => b.wins - a.wins).filter(x => x.wins > 0).slice(0, 5).map((f, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white leading-none">{f.name}</p><p className="text-[8px] uppercase text-zinc-500">{f.player}</p></div>
                               <span className="text-sm font-black text-orange-500">{f.wins}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Elite: Highest XP */}
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><Zap size={14}/> Elite Helden (XP)</h3>
                      <div className="space-y-2">
                         {crusadeCards.flatMap(c => (c.units || []).map(u => ({...u, force: c.forceName})))
                            .sort((a, b) => (b.xp || 0) - (a.xp || 0)).filter(x => (x.xp || 0) > 0).slice(0, 5).map((u, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white flex items-center gap-1">{u.name} {u.isWarlord && <Crown size={10} className="text-yellow-500"/>}</p><p className="text-[8px] uppercase text-zinc-500">{u.force}</p></div>
                               <span className="text-sm font-black text-blue-400">{u.xp}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Deadly: Kill Tally */}
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><Skull size={14}/> Dodelijke Units (Kills)</h3>
                      <div className="space-y-2">
                         {crusadeCards.flatMap(c => (c.units || []).map(u => ({...u, force: c.forceName})))
                            .sort((a, b) => (b.killTally || 0) - (a.killTally || 0)).filter(x => (x.killTally || 0) > 0).slice(0, 5).map((u, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white flex items-center gap-1">{u.name} {u.isWarlord && <Crown size={10} className="text-yellow-500"/>}</p><p className="text-[8px] uppercase text-zinc-500">{u.force}</p></div>
                               <span className="text-sm font-black text-red-500">{u.killTally}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                </div>
              </div>
           </div>
        )}

        {/* ADMIN VIEW */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!isAdminAuthenticated ? (
              <div className="bg-zinc-900 p-12 rounded-[3rem] text-center border-2 border-red-900/30 max-w-md mx-auto">
                <Lock size={40} className="mx-auto text-zinc-700 mb-4" />
                <h3 className="text-2xl font-black uppercase mb-6">Master Access Required</h3>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="password" placeholder="Password" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center" value={adminInput} onChange={(e) => setAdminInput(e.target.value)} />
                  <button className="w-full bg-red-900 p-4 rounded-xl font-black uppercase text-xs">Unlock Console</button>
                </form>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-red-900/20 p-8 rounded-3xl border border-red-900/50">
                   <div className="flex items-center gap-3">
                      <Unlock className="text-red-500" size={32} />
                      <h2 className="text-xl font-black uppercase tracking-widest text-red-500 italic">Campaign Commander Console</h2>
                   </div>
                   <div className="flex gap-2">
                      <button disabled={isProcessing} onClick={handleGenerateAISummary} className="bg-orange-600 hover:bg-orange-500 p-4 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all">
                        {isProcessing ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Update AI Chronicles
                      </button>
                      <button onClick={() => setIsAdminAuthenticated(false)} className="text-[10px] font-black uppercase bg-zinc-800 px-4 py-2 rounded-xl">Lock Console</button>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                   <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <h3 className="font-black uppercase text-zinc-500 mb-4 flex items-center gap-2 text-xs"><Users size={16}/> Manage Forces</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {crusadeCards.map(c => (
                           <div key={c.id} className="bg-zinc-950 p-4 rounded-2xl flex justify-between items-center border border-zinc-800">
                              <div><p className="font-black text-xs uppercase">{c.forceName}</p><p className="text-[8px] text-zinc-600">{c.playerName}</p></div>
                              <button onClick={() => deleteDocument('cards', c.id)} className="p-2 bg-red-900/10 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <h3 className="font-black uppercase text-zinc-500 mb-4 flex items-center gap-2 text-xs"><Swords size={16}/> Manage Battles</h3>
                      <div className="space-y-2">
                        {battleLogs.map(b => (
                           <div key={b.id} className="bg-zinc-950 p-3 rounded-xl flex justify-between items-center border border-zinc-800">
                              <p className="text-[10px] font-bold uppercase">{b.attacker} vs {b.defender} (Win: {b.winner})</p>
                              <button onClick={() => deleteDocument('battles', b.id)} className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={12}/></button>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <h3 className="font-black uppercase text-zinc-500 mb-4 flex items-center gap-2 text-xs"><ScrollText size={16}/> Manage Lore</h3>
                      <div className="space-y-2">
                        {loreEntries.map(e => (
                           <div key={e.id} className="bg-zinc-950 p-3 rounded-xl flex justify-between items-center border border-zinc-800">
                              <p className="text-[10px] font-bold uppercase">{e.title} <span className="opacity-30">by {e.forceName}</span></p>
                              <div className="flex gap-2">
                                 <button onClick={() => setEditingLore(e)} className="p-2 text-orange-500 hover:bg-orange-900/20 rounded-lg"><Edit3 size={12}/></button>
                                 <button onClick={() => deleteDocument('lore', e.id)} className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={12}/></button>
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 w-full bg-zinc-950/95 border-t border-zinc-800 p-4 text-center z-50 print:hidden backdrop-blur-md">
        <p className="text-[7px] text-zinc-700 font-mono tracking-[0.4em] uppercase italic">Purity of Purpose // AI Scribe Active // The Emperor Protects</p>
      </footer>
    </div>

    {/* MODAL EDIT LORE */}
    {editingLore && (
      <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
        <div className="bg-zinc-900 border-2 border-orange-900/50 p-8 rounded-[2rem] w-full max-w-2xl space-y-6 shadow-2xl">
          <h3 className="text-xl font-black uppercase text-orange-500">Edit Sacred Text</h3>
          <input className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800" value={editingLore.title} onChange={e => setEditingLore({...editingLore, title: e.target.value})} />
          <textarea className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-64" value={editingLore.content} onChange={e => setEditingLore({...editingLore, content: e.target.value})} />
          <div className="flex gap-4">
            <button onClick={async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lore', editingLore.id), { title: editingLore.title, content: editingLore.content }); setEditingLore(null); showStatus("Archief bijgewerkt."); }} className="flex-1 bg-green-600 p-4 rounded-xl font-black uppercase">Opslaan</button>
            <button onClick={() => setEditingLore(null)} className="flex-1 bg-zinc-800 p-4 rounded-xl font-black uppercase">Annuleren</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function UnitField({ label, value, onChange, type = 'text', area = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest ml-1">{label}</label>
      {area ? (
        <textarea className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-[10px] text-zinc-300 outline-none focus:border-orange-500 transition-all shadow-inner" value={value || ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <input type={type} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-[10px] text-zinc-300 outline-none focus:border-orange-500 transition-all shadow-inner" value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}