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
  FileText,
  Crosshair
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
  { id: 1, name: "Supply Raid", background: "With Armageddon in sight, supply shortages are reeds voelbaar. Elke krat is cruciaal.", rules: ["Command Phase: 5 VP per objective (max 15)", "Action: Loot Supply (Shooting phase). +5 VP in no-man's land, +8 VP in enemy zone."], reward: "Supply limit +100 & 1 XP per unit." },
  { id: 2, name: "Forward Recon", background: "Scouts verkennen het terrein. Informatie is macht.", rules: ["End of Turn: +5 VP in enemy deployment zone.", "Command Phase: 5 VP per objective."], reward: "+3 XP to one CHARACTER." },
  { id: 3, name: "Secure Landing Zone", background: "Versterkingen hebben een veilige plek nodig om te landen.", rules: ["Control center for +20 VP aan einde battle."], reward: "Winner: +1 RP & +100 Supplies." },
  { id: 4, name: "Sabotage Relay", background: "Vernietig de communicatie van de vijand.", rules: ["Action: Sabotage (+5/+8 VP).", "End of Battle: +3 VP per sabotaged objective."], reward: "+2 XP per sabotaged objective." },
  { id: 5, name: "Ambush Engagement", background: "Een verrassingsaanval in de as-woestijnen.", rules: ["3 VP per destroyed unit (max 15/turn)."], reward: "Token om Out of Action test te negeren." },
  { id: 6, name: "Data Retrieval", background: "Oude data-cores bevatten geheimen van de sector.", rules: ["Action: Extract Data (+5/+8 VP)."], reward: "Next battle: Opponent deploys 3 units first." },
  { id: 7, name: "Patrol Clash", background: "Twee patrouilles botsen onverwacht.", rules: ["Eliminate enemy scout: 10 VP.", "+2 VP per turn dat je eigen scout leeft."], reward: "Winner +1 RP. Surviving units +1 XP." },
  { id: 8, name: "Strategic Cache", background: "Verborgen wapenvoorraden!", rules: ["Willekeurig objective is cache (8 VP), anderen 2 VP."], reward: "Een character krijgt extra weapon mod." },
  { id: 9, name: "Battlefield Salvage", background: "Wrakstukken bevatten kostbare onderdelen.", rules: ["Action: Salvage (+5/+8 VP)."], reward: "One Artificer level Relic." },
  { id: 10, name: "Last Stand", background: "Eén kracht houdt stand terwijl de rest evacueert.", rules: ["Warlord Duel: 15-20 VP voor uitschakelen warlord."], reward: "Warlord krijgt 5 XP." }
];

const RULES_DATA = [
  { title: "Supply & Start", content: "Supply start op 500. De limit mag uitgebreid worden met RP." },
  { title: "Punten & Veld", content: "500pts op 44x30. Daarboven volgens officiële regels." },
  { title: "Upgrades & Scars", content: "Battle traits, mods en scars worden altijd RANDOM gerold." },
  { title: "Toegestane Bronnen", content: "Core Crusade regels en Codexen. Geen specifieke campaign boeken." },
  { title: "Spirit of the Crusade", content: "Lore en fun staan centraal, niet power-gaming." },
  { title: "Voorbereiding", content: "Bouw je battlefield op basis van de lore en gebruik de missie roller." }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loreEntries, setLoreEntries] = useState([]);
  const [battleLogs, setBattleLogs] = useState([]);
  const [crusadeCards, setCrusadeCards] = useState([]);
  const [cardLogs, setCardLogs] = useState([]);
  const [campaignState, setCampaignState] = useState({ aiSummary: "De archieven worden geüpdatet door de Master of Archives...", lastUpdated: null });
  
  // UI States
  const [rolledMission, setRolledMission] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [adminChronicleText, setAdminChronicleText] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  // Form States
  const [newLore, setNewLore] = useState({ title: '', content: '', linkedBattleId: '' });
  const [battleForm, setBattleForm] = useState({ attackerId: '', defenderId: '', winnerId: '', writeLoreNow: false, loreTitle: '', loreContent: '' });
  const [cardForm, setCardForm] = useState({ forceName: '', faction: '', superFaction: 'Imperium', playerName: '', supply: 500, rp: 0, crusadePoints: 0, secretKey: '' });
  const [claimForm, setClaimForm] = useState({ forceName: '', secretKey: '' });
  const [newUnitName, setNewUnitName] = useState('');
  const [editingLore, setEditingLore] = useState(null);

  // States voor het bekijken van andere legers (Read-only)
  const [expandedOtherCard, setExpandedOtherCard] = useState(null);
  const [expandedOtherUnit, setExpandedOtherUnit] = useState(null);

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
        else col.setter(data.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)));
      }, (err) => console.error(err));
    });

    const campaignRef = doc(db, 'artifacts', appId, 'public', 'data', 'state', 'campaign');
    const unsubState = onSnapshot(campaignRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCampaignState(data);
        setAdminChronicleText(data.aiSummary || "");
      }
    });

    return () => { unsubs.forEach(un => un()); unsubState(); };
  }, [user]);

  const showStatus = (text, type = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  };

  // --- MANUAL CHRONICLES LOGIC (Admin) ---
  const handleUpdateChronicles = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'state', 'campaign'), { 
        aiSummary: String(adminChronicleText), 
        lastUpdated: Date.now() 
      });
      showStatus("Chronicles succesvol bijgewerkt!");
    } catch (err) { 
      showStatus("Fout bij opslaan Chronicles.", "error"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // --- DATABASE ACTIONS ---
  const handleUpdateCard = async (cardId, updates, logMsg) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', cardId), updates);
      if (logMsg) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'cardLogs'), { cardId, message: String(logMsg), owner: user.uid, timestamp: Date.now() });
    } catch (e) { showStatus("Update mislukt.", "error"); }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'cards'), { ...cardForm, owner: user.uid, timestamp: Date.now(), units: [] });
      showStatus("Crusade Card geregistreerd!");
    } catch (e) { showStatus("Fout bij aanmaken.", "error"); }
    finally { setIsProcessing(false); }
  };

  const handleClaimForce = async (e) => {
    e.preventDefault();
    const target = crusadeCards.find(c => String(c.forceName).toLowerCase() === claimForm.forceName.toLowerCase() && c.secretKey === claimForm.secretKey);
    if (target) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', target.id), { owner: user.uid });
      showStatus("Beheer hersteld!");
      setIsClaiming(false);
    } else { showStatus("Gegevens onjuist.", "error"); }
  };

  const handleCreateUnit = async (card) => {
    if (!newUnitName.trim()) return;
    const newUnit = { 
      id: Date.now().toString(), name: newUnitName.trim(), xp: 0, modelCount: 1, points: 0, killTally: 0, 
      isWarlord: false, unitType: 'Other', traits: '', mods: '', scars: '', relics: '', enhancements: '', customInfo: '',
      nemesisId: '', nemesisName: '', nemesisForce: '', nemesisReason: ''
    };
    await handleUpdateCard(card.id, { units: [...(card.units || []), newUnit] }, `Unit toegevoegd: ${newUnitName}`);
    setNewUnitName('');
    setIsAddingUnit(false);
  };

  const handleUpdateUnit = async (card, unitId, field, value) => {
    const updatedUnits = card.units.map(u => u.id === unitId ? { ...u, [field]: value } : u);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id), { units: updatedUnits });
  };

  const handleUpdateNemesis = async (card, unitId, targetNemesisId) => {
    let nName = '';
    let nForce = '';
    if (targetNemesisId) {
      crusadeCards.forEach(c => {
        const found = c.units?.find(u => u.id === targetNemesisId);
        if (found) { nName = found.name; nForce = c.forceName; }
      });
      if (!nName) {
        const currentUnit = card.units.find(u => u.id === unitId);
        if (currentUnit && currentUnit.nemesisId === targetNemesisId) {
          nName = currentUnit.nemesisName;
          nForce = currentUnit.nemesisForce;
        }
      }
    }
    const updatedUnits = card.units.map(u => u.id === unitId ? { ...u, nemesisId: targetNemesisId, nemesisName: nName, nemesisForce: nForce } : u);
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
      showStatus("Battle Resultaat opgeslagen!");
      setBattleForm({ attackerId: '', defenderId: '', winnerId: '', writeLoreNow: false, loreTitle: '', loreContent: '' });
    } catch(e) { showStatus("Fout bij opslaan.", "error"); }
    finally { setIsProcessing(false); }
  };

  const handleCreateLore = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'lore'), { 
        ...newLore, author: user.uid, forceName: myCard.forceName, superFaction: myCard.superFaction, timestamp: Date.now() 
      });
      setNewLore({ title: '', content: '', linkedBattleId: '' });
      showStatus("Lore gepubliceerd!");
    } catch(e) { showStatus("Fout bij lore.", "error"); }
    finally { setIsProcessing(false); }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      showStatus("Admin protocol ontgrendeld.");
    } else {
      showStatus("Onjuist wachtwoord.", "error");
    }
  };

  const deleteDocument = async (colName, id) => {
    if (!window.confirm(`Definitief verwijderen?`)) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id));
      showStatus("Document vernietigd.");
    } catch (e) { showStatus("Verwijderen mislukt.", "error"); }
  };

  const myCard = crusadeCards.find(c => c.owner === user?.uid);
  const combinedEvents = [
    ...loreEntries.map(e => ({ ...e, type: 'lore' })),
    ...battleLogs.map(e => ({ ...e, type: 'battle' }))
  ].sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)).slice(0, 3);

  const getFactionTextColor = (fac) => {
    if (fac === 'Imperium') return 'text-blue-400';
    if (fac === 'Chaos') return 'text-red-400';
    if (fac === 'Xenos') return 'text-green-400';
    return 'text-orange-500';
  };

  const factionColors = { 'Imperium': '#3b82f6', 'Chaos': '#ef4444', 'Xenos': '#22c55e' };
  const forceDistribution = [
    { label: 'Imperium', value: crusadeCards.filter(c => c.superFaction === 'Imperium').length, color: factionColors['Imperium'] },
    { label: 'Chaos', value: crusadeCards.filter(c => c.superFaction === 'Chaos').length, color: factionColors['Chaos'] },
    { label: 'Xenos', value: crusadeCards.filter(c => c.superFaction === 'Xenos').length, color: factionColors['Xenos'] }
  ];
  const winDistribution = [
    { label: 'Imperium', value: battleLogs.filter(b => b.winnerSuperFaction === 'Imperium').length, color: factionColors['Imperium'] },
    { label: 'Chaos', value: battleLogs.filter(b => b.winnerSuperFaction === 'Chaos').length, color: factionColors['Chaos'] },
    { label: 'Xenos', value: battleLogs.filter(b => b.winnerSuperFaction === 'Xenos').length, color: factionColors['Xenos'] }
  ];

  // --- NIEUW: Nemesis Helper & Leaderboard Variabelen ---
  const otherForcesUnits = myCard ? crusadeCards.filter(c => c.id !== myCard.id).flatMap(c => (c.units || []).map(u => ({ id: u.id, name: u.name, force: c.forceName }))) : [];

  const nemesisCounts = {};
  crusadeCards.forEach(c => {
     (c.units || []).forEach(u => {
        if (u.nemesisId) {
            if(!nemesisCounts[u.nemesisId]) {
                nemesisCounts[u.nemesisId] = { id: u.nemesisId, name: u.nemesisName, force: u.nemesisForce, count: 0 };
            }
            nemesisCounts[u.nemesisId].count++;
        }
     });
  });
  const hatedList = Object.values(nemesisCounts).sort((a,b) => b.count - a.count).slice(0, 5);

  if (!user) return <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-orange-500 font-mono italic"><Skull size={40} className="animate-pulse mb-4" /> INITIALISEREN...</div>;

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
          { id: 'regels', icon: BookOpen, label: 'Regels' },
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
                  <p className="text-zinc-300 text-sm leading-relaxed italic whitespace-pre-wrap">{String(campaignState.aiSummary || "")}</p>
               </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600"></div>
               <h2 className="text-2xl font-black uppercase italic mb-8 tracking-tighter text-white">De Race naar Armageddon</h2>
               <div className="space-y-10">
                  {['Imperium', 'Chaos', 'Xenos'].map(faction => {
                     const wins = battleLogs.filter(b => b.winnerSuperFaction === faction).length;
                     const progress = Math.min(100, (wins / CAMPAIGN_MAX_WINS) * 100);
                     const textColor = faction === 'Imperium' ? 'text-blue-500' : faction === 'Chaos' ? 'text-red-500' : 'text-green-500';
                     const bgColor = faction === 'Imperium' ? 'bg-blue-600' : faction === 'Chaos' ? 'bg-red-600' : 'bg-green-600';

                     return (
                        <div key={faction} className="relative">
                           <div className="flex justify-between items-end mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>{faction} Vloot</span>
                              <span className="text-[10px] font-mono text-zinc-500">{wins} / {CAMPAIGN_MAX_WINS} Zeges</span>
                           </div>
                           <div className="relative h-2 bg-zinc-950 rounded-full border border-zinc-800">
                              <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${bgColor}`} style={{ width: `${progress}%` }}></div>
                              <div className="absolute -top-[5px] left-0 w-full h-full pointer-events-none">
                                 {WAYPOINTS.map((wp, idx) => (
                                    <div key={idx} className="absolute top-0 flex flex-col items-center" style={{ left: `${wp.percent}%`, transform: wp.percent === 100 ? 'translateX(-100%)' : (wp.percent === 0 ? 'translateX(0)' : 'translateX(-50%)') }}>
                                       <div className={`w-3 h-3 rounded-full border-2 border-zinc-950 ${progress >= wp.percent ? bgColor : 'bg-zinc-800'}`}></div>
                                       <span className={`text-[7px] uppercase font-bold mt-2 whitespace-nowrap ${progress >= wp.percent ? textColor : 'text-zinc-600'}`}>{wp.name}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex flex-col items-center">
                  <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Forces on Armageddon</h3>
                  <div className="w-32 h-32 mb-4"><DonutChart data={forceDistribution} holeColor="#18181b" /></div>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                     <span className="text-blue-500">Imp {forceDistribution[0].value}</span>
                     <span className="text-red-500">Cha {forceDistribution[1].value}</span>
                     <span className="text-green-500">Xen {forceDistribution[2].value}</span>
                  </div>
               </div>
               <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex flex-col items-center">
                  <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Battle Victories</h3>
                  <div className="w-32 h-32 mb-4"><DonutChart data={winDistribution} holeColor="#18181b" /></div>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                     <span className="text-blue-500">Imp {winDistribution[0].value}</span>
                     <span className="text-red-500">Cha {winDistribution[1].value}</span>
                     <span className="text-green-500">Xen {winDistribution[2].value}</span>
                  </div>
               </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem]">
               <h3 className="text-xs font-black uppercase mb-4 text-zinc-500">Recente Gebeurtenissen</h3>
               <div className="space-y-3">
                  {combinedEvents.map((ev, i) => (
                     <div key={i} className="text-xs border-l-2 border-orange-600 pl-3 py-1">
                        <span className="block text-[8px] opacity-30 uppercase">{new Date(ev.timestamp).toLocaleDateString()}</span>
                        <p className="italic text-zinc-400">
                           {ev.type === 'lore' ? `Lore: ${String(ev.title)}` : `Battle: ${String(ev.winner)} zegeviert`}
                        </p>
                     </div>
                  ))}
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
                {!isClaiming ? (
                  <>
                    <h3 className="font-black uppercase text-xl text-orange-500 mb-6">Inloggen</h3>
                    <form onSubmit={handleClaimForce} className="space-y-4 max-w-sm mx-auto text-left">
                       <input type="text" placeholder="Exacte Force Naam" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-sm outline-none focus:border-orange-500" onChange={e => setClaimForm({...claimForm, forceName: e.target.value})} required />
                       <input type="password" placeholder="Paswoord" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-sm outline-none focus:border-orange-500" onChange={e => setClaimForm({...claimForm, secretKey: e.target.value})} required />
                       <button className="w-full bg-zinc-100 text-zinc-950 p-4 rounded-xl font-bold text-xs uppercase hover:bg-white transition-all">Login</button>
                    </form>
                    <button onClick={() => setIsClaiming(true)} className="mt-8 text-zinc-500 text-[10px] uppercase font-black hover:text-white transition-all">Nieuw leger registreren?</button>
                  </>
                ) : (
                  <>
                    <h3 className="font-black uppercase text-xl text-orange-500 mb-6">Registreer je Crusade Force</h3>
                    <form onSubmit={handleCreateCard} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <input type="text" placeholder="Force Naam" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-orange-500" onChange={e => setCardForm({...cardForm, forceName: e.target.value})} required />
                      <input type="text" placeholder="Faction" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-orange-500" onChange={e => setCardForm({...cardForm, faction: e.target.value})} required />
                      <select className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300 outline-none focus:border-orange-500" value={cardForm.superFaction} onChange={e => setCardForm({...cardForm, superFaction: e.target.value})}>
                        <option value="Imperium">Imperium</option>
                        <option value="Chaos">Chaos</option>
                        <option value="Xenos">Xenos</option>
                      </select>
                      <input type="text" placeholder="Naam Commandeur" className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-orange-500" onChange={e => setCardForm({...cardForm, playerName: e.target.value})} required />
                      <input type="password" placeholder="Paswoord" className="md:col-span-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800 outline-none focus:border-orange-500" onChange={e => setCardForm({...cardForm, secretKey: e.target.value})} required />
                      <button className="md:col-span-2 bg-orange-600 p-4 rounded-xl font-black uppercase text-xs hover:bg-orange-500 transition-all">Start Crusade</button>
                    </form>
                    <button onClick={() => setIsClaiming(false)} className="mt-8 text-zinc-500 text-[10px] uppercase font-black hover:text-white transition-all">Heb je al een leger? Inloggen</button>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 border-2 border-orange-600 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 bg-zinc-950/50 border-b border-zinc-800 flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2">{myCard.forceName} <button onClick={() => window.print()} title="Print Roster" className="text-zinc-600 hover:text-white transition-all"><Printer size={16}/></button></h3>
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
                      <button onClick={() => handleUpdateCard(myCard.id, { rp: (myCard.rp || 0) + 1 }, "+1 RP toegevoegd")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700 transition-all">+1 RP</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { rp: Math.max(0, (myCard.rp || 0) - 1) }, "-1 RP gebruikt")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700 transition-all">-1 RP</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { supply: (myCard.supply || 0) + 100 }, "+100 Supply limiet")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700 transition-all">+100 Sup</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { supply: Math.max(0, (myCard.supply || 0) - 100) }, "-100 Supply limiet")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700 transition-all">-100 Sup</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { crusadePoints: (myCard.crusadePoints || 0) + 1 }, "+1 Crusade Point toegevoegd")} className="bg-blue-900/30 p-2 rounded-lg text-[9px] font-black uppercase border border-blue-900/50 hover:bg-blue-900/50 text-blue-400 transition-all">+1 Point</button>
                      <button onClick={() => handleUpdateCard(myCard.id, { crusadePoints: Math.max(0, (myCard.crusadePoints || 0) - 1) }, "-1 Crusade Point verwijderd")} className="bg-blue-900/30 p-2 rounded-lg text-[9px] font-black uppercase border border-blue-900/50 hover:bg-blue-900/50 text-blue-400 transition-all">-1 Point</button>
                   </div>
                   <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-24 overflow-y-auto no-scrollbar">
                      <h4 className="text-[8px] font-black uppercase text-zinc-600 mb-2">History Log</h4>
                      {cardLogs.filter(l => l.cardId === myCard.id).map((l, idx) => (
                         <div key={idx} className="text-[9px] text-zinc-500 italic mb-1 border-l border-orange-500/30 pl-2">{String(l.message)}</div>
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
                      <input type="text" placeholder="Unit Naam..." className="flex-1 bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs outline-none focus:border-orange-500" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} autoFocus />
                      <button onClick={() => handleCreateUnit(myCard)} className="bg-green-600 p-2 rounded-lg transition-all hover:bg-green-500"><Check size={14}/></button>
                      <button onClick={() => setIsAddingUnit(false)} className="bg-zinc-800 p-2 rounded-lg transition-all hover:bg-zinc-700"><X size={14}/></button>
                    </div>
                  )}
                  <div className="space-y-4">
                    {myCard.units?.map(unit => (
                      <div key={unit.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-orange-500/30 transition-all">
                        <div className="p-4 flex justify-between items-center bg-zinc-900/10">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-orange-500 font-black text-xs px-2 py-1 bg-orange-500/5 rounded border border-orange-500/20">{unit.xp} XP</span>
                            <h5 className="font-black uppercase flex items-center gap-2">{String(unit.name)} {unit.isWarlord && <Crown size={14} className="text-yellow-500"/>}</h5>
                            <div className="flex gap-4 text-[9px] text-zinc-600 font-bold uppercase">
                               <span><Skull size={10} className="inline mr-1"/> {unit.killTally || 0} Kills</span>
                               <span><Coins size={10} className="inline mr-1"/> {unit.points || 0} pts</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button onClick={() => handleToggleWarlord(myCard, unit.id)} title="Mark as Warlord" className={`p-2 transition-colors ${unit.isWarlord ? 'text-yellow-500' : 'text-zinc-700 hover:text-yellow-500'}`}><Crown size={16}/></button>
                             <button onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)} className="p-2 text-zinc-500 group-hover:text-white transition-all">
                               {expandedUnit === unit.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                             </button>
                             <button onClick={async () => {
                                if(!window.confirm("Unit verwijderen?")) return;
                                const updated = myCard.units.filter(u => u.id !== unit.id);
                                await handleUpdateCard(myCard.id, { units: updated }, `Unit verwijderd: ${unit.name}`);
                             }} className="p-2 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
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
                               <UnitField label="Weapon Mods" value={unit.mods} onChange={v => handleUpdateUnit(myCard, unit.id, 'mods', v)} />
                            </div>
                            <div className="space-y-4">
                               <UnitField label="Battle Scars" value={unit.scars} onChange={v => handleUpdateUnit(myCard, unit.id, 'scars', v)} />
                               <UnitField label="Relics" value={unit.relics} onChange={v => handleUpdateUnit(myCard, unit.id, 'relics', v)} />
                               <UnitField label="Enhancements" value={unit.enhancements} onChange={v => handleUpdateUnit(myCard, unit.id, 'enhancements', v)} />
                               <UnitField label="Lore / Campaign Records" area value={unit.customInfo} onChange={v => handleUpdateUnit(myCard, unit.id, 'customInfo', v)} />
                            </div>

                            {/* NIEUW: Nemesis Sectie */}
                            <div className="md:col-span-2 pt-4 border-t border-zinc-800/50 mt-2">
                               <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Rivaliteit & Nemesis</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                     <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest ml-1">Kies Nemesis (Andere legers)</label>
                                     <select
                                        className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-[10px] text-zinc-300 outline-none focus:border-orange-500 transition-all shadow-inner"
                                        value={unit.nemesisId || ''}
                                        onChange={e => handleUpdateNemesis(myCard, unit.id, e.target.value)}
                                     >
                                        <option value="">-- Geen Nemesis --</option>
                                        {otherForcesUnits.map(ou => <option key={ou.id} value={ou.id}>{String(ou.force)} - {String(ou.name)}</option>)}
                                        {unit.nemesisId && !otherForcesUnits.find(ou => ou.id === unit.nemesisId) && (
                                           <option value={unit.nemesisId}>{String(unit.nemesisForce)} - {String(unit.nemesisName)} (Legacy)</option>
                                        )}
                                     </select>
                                  </div>
                                  <UnitField label="Achtergrond / Reden voor Rivaliteit" area value={unit.nemesisReason} onChange={v => handleUpdateUnit(myCard, unit.id, 'nemesisReason', v)} />
                               </div>
                            </div>

                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- ANDERE SPELERS (READ ONLY) --- */}
            {crusadeCards.filter(c => c.id !== myCard?.id).length > 0 && (
              <div className="mt-12 space-y-6 animate-in fade-in border-t border-zinc-800/50 pt-8">
                 <div className="flex items-center gap-2 mb-6">
                    <Globe size={20} className="text-zinc-600" />
                    <h3 className="text-xl font-black uppercase tracking-tight text-zinc-400 italic">Archieven: Andere Legers</h3>
                 </div>
                 {crusadeCards.filter(c => c.id !== myCard?.id).map(card => (
                    <div key={card.id} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden transition-all">
                       <div className="p-6 cursor-pointer flex justify-between items-center hover:bg-zinc-800/30" onClick={() => setExpandedOtherCard(expandedOtherCard === card.id ? null : card.id)}>
                          <div>
                             <h4 className="text-lg font-black uppercase italic tracking-tighter text-zinc-300">{String(card.forceName)}</h4>
                             <p className="text-[10px] font-bold uppercase text-zinc-500">{String(card.faction)} | {String(card.playerName)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="hidden md:flex gap-4 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                                <span>Sup: {card.supply}</span>
                                <span>RP: {card.rp}</span>
                                <span>CP: {card.crusadePoints || 0}</span>
                             </div>
                             {expandedOtherCard === card.id ? <ChevronUp size={20} className="text-zinc-500"/> : <ChevronDown size={20} className="text-zinc-500"/>}
                          </div>
                       </div>
                       
                       {expandedOtherCard === card.id && (
                          <div className="p-6 border-t border-zinc-800 bg-zinc-950/30">
                             <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Geregistreerde Eenheden</h5>
                             <div className="space-y-3">
                                {card.units?.length > 0 ? card.units.map(unit => (
                                   <div key={unit.id} className="bg-zinc-950 border border-zinc-800/50 rounded-xl overflow-hidden">
                                      <div className="p-4 flex justify-between items-center bg-zinc-900/10 cursor-pointer hover:bg-zinc-900/40" onClick={() => setExpandedOtherUnit(expandedOtherUnit === unit.id ? null : unit.id)}>
                                         <div className="flex items-center gap-3">
                                            <span className="text-zinc-500 font-black text-xs px-2 py-1 bg-zinc-900 rounded border border-zinc-800/50">{unit.xp} XP</span>
                                            <span className="font-black uppercase text-sm text-zinc-300 flex items-center gap-2">{String(unit.name)} {unit.isWarlord && <Crown size={12} className="text-yellow-600/50"/>}</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                            <div className="flex gap-3 text-[9px] text-zinc-600 font-bold uppercase">
                                               <span><Skull size={10} className="inline mr-1"/>{unit.killTally || 0}</span>
                                               <span><Coins size={10} className="inline mr-1"/>{unit.points || 0}</span>
                                            </div>
                                            {expandedOtherUnit === unit.id ? <ChevronUp size={16} className="text-zinc-600"/> : <ChevronDown size={16} className="text-zinc-600"/>}
                                         </div>
                                      </div>
                                      
                                      {expandedOtherUnit === unit.id && (
                                         <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800/50 bg-zinc-900/5">
                                            <div className="space-y-4">
                                               <div className="grid grid-cols-2 gap-4">
                                                  <ReadOnlyField label="XP Points" value={unit.xp} />
                                                  <ReadOnlyField label="Kill Tally" value={unit.killTally} />
                                                  <ReadOnlyField label="Points (pts)" value={unit.points} />
                                                  <ReadOnlyField label="Models" value={unit.modelCount} />
                                               </div>
                                               <ReadOnlyField label="Battle Traits" value={unit.traits} />
                                               <ReadOnlyField label="Weapon Mods" value={unit.mods} />
                                            </div>
                                            <div className="space-y-4">
                                               <ReadOnlyField label="Battle Scars" value={unit.scars} />
                                               <ReadOnlyField label="Relics" value={unit.relics} />
                                               <ReadOnlyField label="Enhancements" value={unit.enhancements} />
                                               <ReadOnlyField label="Lore / Campaign Records" value={unit.customInfo} />
                                            </div>
                                            <div className="md:col-span-2 pt-4 border-t border-zinc-800/50 mt-2">
                                               <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Rivaliteit & Nemesis</h4>
                                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <ReadOnlyField label="Gekozen Nemesis" value={
                                                     unit.nemesisId 
                                                     ? `${String(unit.nemesisForce)} - ${String(unit.nemesisName)} ${!crusadeCards.some(c => c.units?.some(ex => ex.id === unit.nemesisId)) ? '(Legacy)' : ''}` 
                                                     : '-'
                                                  } />
                                                  <ReadOnlyField label="Achtergrond / Reden" value={unit.nemesisReason} />
                                               </div>
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                )) : (
                                   <p className="text-xs text-zinc-600 italic">Geen eenheden geregistreerd in dit leger.</p>
                                )}
                             </div>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
            )}
          </div>
        )}

        {/* MISSION GENERATOR */}
        {activeTab === 'generator' && (
          <div className="text-center py-6 space-y-8 animate-in zoom-in-95">
            <button onClick={() => setRolledMission(ARMAGEDDON_MISSIONS[Math.floor(Math.random() * ARMAGEDDON_MISSIONS.length)])} className="bg-orange-600 p-5 px-12 rounded-full shadow-2xl uppercase tracking-widest text-xs font-black flex items-center gap-4 mx-auto hover:bg-orange-500 transition-all active:scale-95">
              <Dices size={24} /> Roll Tactical Mission
            </button>
            {rolledMission && (
              <div className="bg-zinc-900 border border-orange-500/20 p-8 rounded-[2.5rem] text-left relative overflow-hidden shadow-2xl space-y-6">
                <div className="absolute top-0 left-0 w-full h-2 bg-orange-600"></div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-orange-500">{rolledMission.name}</h3>
                <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/50"><p className="text-zinc-400 italic text-sm leading-relaxed">{rolledMission.background}</p></div>
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2"><Zap size={14}/> Scoring:</h4>
                   <ul className="space-y-3">{rolledMission.rules.map((r, i) => (<li key={i} className="flex gap-3 text-xs italic leading-relaxed"><span className="text-orange-600 font-black">•</span>{r}</li>))}</ul>
                </div>
                <div className="bg-orange-600/10 border border-orange-500/30 p-5 rounded-2xl"><h4 className="text-[10px] font-black uppercase text-orange-500 mb-2 flex items-center gap-2"><Trophy size={14}/> Reward:</h4><p className="text-white font-bold text-sm italic">{rolledMission.reward}</p></div>
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
                 <input type="text" placeholder="Titel..." className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-sm outline-none focus:border-orange-500" value={newLore.title} onChange={e => setNewLore({...newLore, title: e.target.value})} required />
                 <textarea placeholder="Verslag van de strijd..." className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-sm h-32 outline-none focus:border-orange-500" value={newLore.content} onChange={e => setNewLore({...newLore, content: e.target.value})} required />
                 <button className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase text-xs transition-all hover:bg-orange-500">Publish transmission</button>
               </form>
            )}
            <div className="space-y-4">
              {loreEntries.map(e => (
                <article key={e.id} className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 hover:border-zinc-700 transition-all shadow-md">
                  <h4 className="text-orange-500 font-black uppercase italic text-xl mb-1">{String(e.title || "Zonder Titel")}</h4>
                  <p className={`text-[10px] font-bold uppercase mb-4 ${getFactionTextColor(e.superFaction)}`}>Bron: {String(e.forceName || "Onbekend")} | {new Date(e.timestamp).toLocaleDateString()}</p>
                  <p className="text-zinc-300 text-sm italic border-l-2 border-zinc-800 pl-6 leading-relaxed whitespace-pre-wrap">{String(e.content || "")}</p>
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
                    <select className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300 outline-none focus:border-orange-500" value={battleForm.attackerId} onChange={e => setBattleForm({...battleForm, attackerId: e.target.value})} required>
                       <option value="">Attacker...</option>
                       {crusadeCards.map(c => <option key={c.id} value={c.id}>{String(c.forceName)}</option>)}
                    </select>
                    <select className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-300 outline-none focus:border-orange-500" value={battleForm.defenderId} onChange={e => setBattleForm({...battleForm, defenderId: e.target.value})} required>
                       <option value="">Defender...</option>
                       {crusadeCards.map(c => <option key={c.id} value={c.id}>{String(c.forceName)}</option>)}
                    </select>
                 </div>
                 <select className="w-full bg-orange-950/20 p-4 rounded-xl border border-orange-500/50 text-white font-bold outline-none" value={battleForm.winnerId} onChange={e => setBattleForm({...battleForm, winnerId: e.target.value})} required>
                    <option value="">Select Winnaar...</option>
                    {battleForm.attackerId && <option value={battleForm.attackerId}>{crusadeCards.find(c => c.id === battleForm.attackerId)?.forceName}</option>}
                    {battleForm.defenderId && <option value={battleForm.defenderId}>{crusadeCards.find(c => c.id === battleForm.defenderId)?.forceName}</option>}
                 </select>
                 <button disabled={isProcessing} className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase shadow-lg hover:bg-orange-500 transition-all">Confirm Battle result</button>
               </form>
            )}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-zinc-950 text-zinc-600 font-black uppercase border-b border-zinc-800"><tr><th className="p-5">Slagveld</th><th className="p-5 text-orange-500">Victorious</th></tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {battleLogs.map(l => (
                    <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                       <td className="p-5 font-bold text-zinc-300">{String(l.attacker)} vs {String(l.defender)}</td>
                       <td className="p-5 font-black uppercase italic text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${l.winnerSuperFaction === 'Imperium' ? 'bg-blue-500' : l.winnerSuperFaction === 'Chaos' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                          {String(l.winner)}
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
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800 shadow-inner">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><History size={14}/> Veteranen (Veldslagen)</h3>
                      <div className="space-y-2">
                         {Object.values(crusadeCards.reduce((acc, c) => { acc[c.forceName] = { name: String(c.forceName), count: 0, player: String(c.playerName) }; return acc; }, {})).map(f => {
                            let count = 0; battleLogs.forEach(b => { if(b.attacker === f.name || b.defender === f.name) count++; }); return { ...f, count };
                         }).sort((a, b) => b.count - a.count).filter(f => f.count > 0).slice(0, 5).map((f, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white leading-none">{f.name}</p><p className="text-[8px] uppercase text-zinc-500">{f.player}</p></div>
                               <span className="text-sm font-black text-zinc-300">{f.count}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800 shadow-inner">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><Trophy size={14}/> Overwinnaars (Zeges)</h3>
                      <div className="space-y-2">
                         {crusadeCards.map(c => ({ name: String(c.forceName), player: String(c.playerName), wins: battleLogs.filter(b => b.winner === c.forceName).length }))
                            .sort((a, b) => b.wins - a.wins).filter(x => x.wins > 0).slice(0, 5).map((f, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white leading-none">{f.name}</p><p className="text-[8px] uppercase text-zinc-500">{f.player}</p></div>
                               <span className="text-sm font-black text-orange-500">{f.wins}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800 shadow-inner">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><Zap size={14}/> Elite Helden (XP)</h3>
                      <div className="space-y-2">
                         {crusadeCards.flatMap(c => (c.units || []).map(u => ({...u, force: String(c.forceName)})))
                            .sort((a, b) => (Number(b.xp) || 0) - (Number(a.xp) || 0)).filter(x => (Number(x.xp) || 0) > 0).slice(0, 5).map((u, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white flex items-center gap-1">{String(u.name)} {u.isWarlord && <Crown size={10} className="text-yellow-500"/>}</p><p className="text-[8px] uppercase text-zinc-500">{u.force}</p></div>
                               <span className="text-sm font-black text-blue-400">{u.xp}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800 shadow-inner">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><Skull size={14}/> Dodelijke Units (Kills)</h3>
                      <div className="space-y-2">
                         {crusadeCards.flatMap(c => (c.units || []).map(u => ({...u, force: String(c.forceName)})))
                            .sort((a, b) => (Number(b.killTally) || 0) - (Number(a.killTally) || 0)).filter(x => (Number(x.killTally) || 0) > 0).slice(0, 5).map((u, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50">
                               <div><p className="text-xs font-bold uppercase text-white flex items-center gap-1">{String(u.name)} {u.isWarlord && <Crown size={10} className="text-yellow-500"/>}</p><p className="text-[8px] uppercase text-zinc-500">{u.force}</p></div>
                               <span className="text-sm font-black text-red-500">{u.killTally}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* NIEUW: Meest Gehate Unit */}
                   <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800 shadow-inner md:col-span-2">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2"><Crosshair size={14}/> Meest Gehate Units (Nemesis Tracker)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {hatedList.map((u, i) => {
                            const stillExists = crusadeCards.some(c => c.units?.some(ex => ex.id === u.id));
                            return (
                               <div key={i} className="flex justify-between items-center p-3 bg-zinc-900 rounded-xl border border-zinc-800/50 transition-all hover:border-zinc-700">
                                  <div>
                                     <p className="text-xs font-bold uppercase text-white leading-none">{String(u.name)} {!stillExists && <span className="text-[8px] text-red-500 ml-1">(Legacy)</span>}</p>
                                     <p className="text-[8px] uppercase text-zinc-500">{String(u.force)}</p>
                                  </div>
                                  <span className="text-sm font-black text-red-500">{u.count}x Nemesis</span>
                               </div>
                            );
                         })}
                         {hatedList.length === 0 && <p className="text-[10px] text-zinc-600 italic">Nog geen rivaliteiten geregistreerd.</p>}
                      </div>
                   </div>

                </div>
              </div>
           </div>
        )}

        {/* REGELS */}
        {activeTab === 'regels' && (
          <section className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <BookOpen size={24} className="text-orange-500" />
                <h2 className="text-2xl font-black uppercase tracking-tight text-white italic">Crusade Protocol</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RULES_DATA.map((r, i) => (
                  <div key={i} className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-orange-600 shadow-xl hover:bg-zinc-800/40 transition-colors">
                      <h3 className="font-black uppercase text-orange-500 mb-2 text-xs tracking-tight">{r.title}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed italic">{r.content}</p>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ADMIN VIEW */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!isAdminAuthenticated ? (
              <div className="bg-zinc-900 p-12 rounded-[3rem] text-center border-2 border-red-900/30 max-w-md mx-auto">
                <Lock size={40} className="mx-auto text-zinc-700 mb-4" />
                <h3 className="text-2xl font-black uppercase mb-6">Master Access Required</h3>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="password" placeholder="Password" className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-center outline-none focus:border-red-500" value={adminInput} onChange={(e) => setAdminInput(e.target.value)} />
                  <button className="w-full bg-red-900 p-4 rounded-xl font-black uppercase text-xs hover:bg-red-800 transition-all">Unlock Console</button>
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
                      <button onClick={() => setIsAdminAuthenticated(false)} className="text-[10px] font-black uppercase bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-700">Lock Console</button>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                   {/* MANUAL CHRONICLES EDITOR */}
                   <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <h3 className="font-black uppercase text-zinc-500 mb-4 flex items-center gap-2 text-xs"><FileText size={16}/> Edit Chronicles of the Scribe</h3>
                      <form onSubmit={handleUpdateChronicles} className="space-y-4">
                         <textarea
                            className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-sm outline-none focus:border-orange-500 h-40"
                            value={adminChronicleText}
                            onChange={(e) => setAdminChronicleText(e.target.value)}
                            placeholder="Schrijf hier de handmatige update voor het dashboard..."
                            required
                         />
                         <button disabled={isProcessing} className="w-full bg-orange-600 hover:bg-orange-500 p-4 rounded-xl font-black uppercase text-xs transition-all flex justify-center items-center gap-2">
                            {isProcessing ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} Publish Chronicles Update
                         </button>
                      </form>
                   </div>

                   <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <h3 className="font-black uppercase text-zinc-500 mb-4 flex items-center gap-2 text-xs"><Users size={16}/> Manage Forces</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {crusadeCards.map(c => (
                           <div key={c.id} className="bg-zinc-950 p-4 rounded-2xl flex justify-between items-center border border-zinc-800 hover:border-red-900/50 transition-colors">
                              <div>
                                 <p className="font-black text-xs uppercase">{String(c.forceName)}</p>
                                 <p className="text-[8px] text-zinc-600">{String(c.playerName)}</p>
                                 {c.timestamp && <p className="text-[8px] text-zinc-500 italic mt-1">Toegevoegd: {new Date(c.timestamp).toLocaleString()}</p>}
                              </div>
                              <button onClick={() => deleteDocument('cards', c.id)} className="p-2 bg-red-900/10 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <h3 className="font-black uppercase text-zinc-500 mb-4 flex items-center gap-2 text-xs"><Swords size={16}/> Manage Battles</h3>
                      <div className="space-y-2">
                        {battleLogs.map(b => (
                           <div key={b.id} className="bg-zinc-950 p-3 rounded-xl flex justify-between items-center border border-zinc-800 hover:border-red-900/30 transition-all">
                              <div>
                                 <p className="text-[10px] font-bold uppercase">{String(b.attacker)} vs {String(b.defender)} (Win: {String(b.winner)})</p>
                                 {b.timestamp && <p className="text-[8px] text-zinc-500 italic">{new Date(b.timestamp).toLocaleString()}</p>}
                              </div>
                              <button onClick={() => deleteDocument('battles', b.id)} className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={12}/></button>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                      <h3 className="font-black uppercase text-zinc-500 mb-4 flex items-center gap-2 text-xs"><ScrollText size={16}/> Manage Lore</h3>
                      <div className="space-y-2">
                        {loreEntries.map(e => (
                           <div key={e.id} className="bg-zinc-950 p-3 rounded-xl flex justify-between items-center border border-zinc-800 hover:border-orange-500/20 transition-all">
                              <div>
                                 <p className="text-[10px] font-bold uppercase">{String(e.title)} <span className="opacity-30">by {String(e.forceName)}</span></p>
                                 {e.timestamp && <p className="text-[8px] text-zinc-500 italic">{new Date(e.timestamp).toLocaleString()}</p>}
                              </div>
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
        <p className="text-[7px] text-zinc-700 font-mono tracking-[0.4em] uppercase italic">Purity of Purpose // Imperial Scribe Active // The Emperor Protects</p>
      </footer>
    </div>

    {/* MODAL EDIT LORE */}
    {editingLore && (
      <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
        <div className="bg-zinc-900 border-2 border-orange-900/50 p-8 rounded-[2rem] w-full max-w-2xl space-y-6 shadow-2xl animate-in zoom-in-95">
          <h3 className="text-xl font-black uppercase text-orange-500">Edit Sacred Text</h3>
          <input className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-sm outline-none focus:border-orange-500" value={editingLore.title} onChange={e => setEditingLore({...editingLore, title: e.target.value})} />
          <textarea className="w-full bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-64 text-sm outline-none focus:border-orange-500" value={editingLore.content} onChange={e => setEditingLore({...editingLore, content: e.target.value})} />
          <div className="flex gap-4">
            <button onClick={async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lore', editingLore.id), { title: editingLore.title, content: editingLore.content }); setEditingLore(null); showStatus("Archief bijgewerkt."); }} className="flex-1 bg-green-600 p-4 rounded-xl font-black uppercase transition-all hover:bg-green-500">Opslaan</button>
            <button onClick={() => setEditingLore(null)} className="flex-1 bg-zinc-800 p-4 rounded-xl font-black uppercase transition-all hover:bg-zinc-700">Annuleren</button>
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
        <textarea className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-[10px] text-zinc-300 outline-none focus:border-orange-500 transition-all shadow-inner h-24" value={value || ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <input type={type} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-[10px] text-zinc-300 outline-none focus:border-orange-500 transition-all shadow-inner" value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

function DonutChart({ data, size = 100, holeColor = '#09090b' }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-zinc-800 text-[10px] uppercase font-black">Geen Data</div>;
  let cumulative = 0;
  return (
    <svg viewBox="-1 -1 2 2" style={{ width: size, height: size, transform: 'rotate(-90deg)' }}>
      {data.map(slice => {
        const start = cumulative;
        const end = cumulative + (slice.value / total);
        cumulative = end;
        const x1 = Math.cos(2 * Math.PI * start);
        const y1 = Math.sin(2 * Math.PI * start);
        const x2 = Math.cos(2 * Math.PI * end);
        const y2 = Math.sin(2 * Math.PI * end);
        const flag = (slice.value / total) > 0.5 ? 1 : 0;
        return <path key={slice.label} d={`M ${x1} ${y1} A 1 1 0 ${flag} 1 ${x2} ${y2} L 0 0`} fill={slice.color} />;
      })}
      <circle cx="0" cy="0" r="0.65" fill={holeColor} />
    </svg>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest ml-1">{label}</label>
      <div className="w-full bg-zinc-950 border border-zinc-800/50 p-3 rounded-xl text-[10px] text-zinc-400 min-h-[38px] whitespace-pre-wrap shadow-inner">
         {value || '-'}
      </div>
    </div>
  );
}