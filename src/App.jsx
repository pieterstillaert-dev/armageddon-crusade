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
  Component
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
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'armageddon-crusade-companion';

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

const RULES_DATA = [
  { title: "Supply & Start", content: "Supply start op 500. De Supply limit mag vanaf de start uitgebreid worden met RP." },
  { title: "Punten & Veld", content: "Per spel kom je overeen hoeveel punten je speelt. Games van 500 punten op 44x30. Daarboven volgens officiële regels." },
  { title: "Upgrades & Scars", content: "Battle traits, weapon mods en battle scars worden altijd RANDOM gerold en niet gekozen." },
  { title: "Toegestane Bronnen", content: "Gebruik Core Crusade regels en Codexen. Specifieke crusades (Tyrannic War/Armageddon) zijn niet toegestaan." },
  { title: "Spirit of the Crusade", content: "We spelen voor de lore en fun, niet voor power-gamen. Kies op basis van thema." },
  { title: "Tactische Voorbereiding", content: "Bouw je battlefield en missies voort op de lore. Gebruik de missie roller voor elke battle." }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loreEntries, setLoreEntries] = useState([]);
  const [battleLogs, setBattleLogs] = useState([]);
  const [crusadeCards, setCrusadeCards] = useState([]);
  const [cardLogs, setCardLogs] = useState([]);
  
  const [rolledMission, setRolledMission] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const [newLore, setNewLore] = useState({ title: '', content: '', linkedBattleId: '' });
  const [battleForm, setBattleForm] = useState({ attackerId: '', defenderId: '', winnerId: '', writeLoreNow: false, loreTitle: '', loreContent: '' });
  const [cardForm, setCardForm] = useState({ forceName: '', faction: '', superFaction: 'Imperium', playerName: '', supply: 500, rp: 0, crusadePoints: 0, secretKey: '' });
  const [claimForm, setClaimForm] = useState({ forceName: '', secretKey: '' });
  const [newUnitName, setNewUnitName] = useState('');

  // Auth Initialisatie
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

  // Data Sync
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
      }, (err) => {
         console.error(`Sync error op ${col.name}:`, err);
      });
    });
    return () => unsubs.forEach(un => un());
  }, [user]);

  const showStatus = (text, type = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  };

  const handleUpdateCard = async (cardId, updates, logMsg) => {
    try {
      const cardRef = doc(db, 'artifacts', appId, 'public', 'data', 'cards', cardId);
      await updateDoc(cardRef, updates);
      if (logMsg) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'cardLogs'), { 
          cardId, message: logMsg, owner: user.uid, timestamp: Date.now() 
        });
      }
    } catch (e) { showStatus("Actie mislukt door serverfout.", "error"); }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'cards'), { 
        ...cardForm, forceName: cardForm.forceName.trim(), secretKey: cardForm.secretKey.trim(), owner: user.uid, timestamp: Date.now(), units: [] 
      });
      showStatus("Crusade Card succesvol aangemaakt!");
    } catch (e) { showStatus("Verbindingsfout bij aanmaken. Probeer opnieuw.", "error"); }
    finally { setIsProcessing(false); }
  };

  const handleClaimForce = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    const inputForceName = claimForm.forceName.toLowerCase().trim();
    const inputSecretKey = claimForm.secretKey.trim();

    const target = crusadeCards.find(c => {
      const dbForceName = (c.forceName || '').toLowerCase().trim();
      const dbSecretKey = (c.secretKey || '').trim();
      return dbForceName === inputForceName && (!dbSecretKey || dbSecretKey === inputSecretKey);
    });

    if (target) {
      try {
        const updates = { owner: user.uid };
        if (!target.secretKey && inputSecretKey) updates.secretKey = inputSecretKey;
        const cardRef = doc(db, 'artifacts', appId, 'public', 'data', 'cards', target.id);
        await updateDoc(cardRef, updates);
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'cardLogs'), { cardId: target.id, message: `Account hersteld op dit apparaat.`, owner: user.uid, timestamp: Date.now() });
        setIsClaiming(false);
        setClaimForm({ forceName: '', secretKey: '' });
        showStatus("Account succesvol gekoppeld en hersteld!");
      } catch (err) { showStatus("Koppelen mislukt.", "error"); }
    } else { showStatus("Naam of Toegangscode onjuist.", "error"); }
    setIsProcessing(false);
  };

  const handleCreateUnit = async (card) => {
    if (!newUnitName.trim()) return;
    setIsProcessing(true);
    const newUnit = {
      id: Date.now().toString(), name: newUnitName.trim(), xp: 0, modelCount: 1, points: 0, killTally: 0, isWarlord: false, unitType: 'Other',
      traits: '', mods: '', scars: '', relics: '', enhancements: '', customInfo: ''
    };
    const updatedUnits = [...(card.units || []), newUnit];
    await handleUpdateCard(card.id, { units: updatedUnits }, `Unit ingezet: ${newUnitName}`);
    setNewUnitName('');
    setIsAddingUnit(false);
    setIsProcessing(false);
  };

  const handleUpdateUnit = async (card, unitId, field, value) => {
    const updatedUnits = card.units.map(u => u.id === unitId ? { ...u, [field]: value } : u);
    const cardRef = doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id);
    await updateDoc(cardRef, { units: updatedUnits });
  };

  const handleToggleWarlord = async (card, unitId) => {
    if (!user) return;
    const updatedUnits = (card.units || []).map(u => ({
      ...u,
      isWarlord: u.id === unitId ? !u.isWarlord : false
    }));
    const cardRef = doc(db, 'artifacts', appId, 'public', 'data', 'cards', card.id);
    await updateDoc(cardRef, { units: updatedUnits });
  };

  const handleLogBattle = async (e) => {
    e.preventDefault();
    if (!battleForm.attackerId || !battleForm.defenderId || !battleForm.winnerId) {
      showStatus("Vul alle dropdowns in.", "error"); return;
    }
    
    setIsProcessing(true);
    try {
      const attacker = crusadeCards.find(c => c.id === battleForm.attackerId);
      const defender = crusadeCards.find(c => c.id === battleForm.defenderId);
      const winner = crusadeCards.find(c => c.id === battleForm.winnerId);

      const battleRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'battles'), { 
        attacker: attacker.forceName,
        defender: defender.forceName,
        winner: winner.forceName,
        winnerSuperFaction: winner.superFaction || 'Imperium',
        timestamp: Date.now() 
      });

      if (battleForm.writeLoreNow && battleForm.loreTitle && battleForm.loreContent) {
        const loreRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'lore'), {
          title: battleForm.loreTitle,
          content: battleForm.loreContent,
          linkedBattleId: battleRef.id,
          author: user.uid,
          forceName: myCard.forceName,
          superFaction: myCard.superFaction,
          timestamp: Date.now()
        });
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'battles', battleRef.id);
        await updateDoc(docRef, { linkedLoreId: loreRef.id });
      }

      setBattleForm({ attackerId: '', defenderId: '', winnerId: '', writeLoreNow: false, loreTitle: '', loreContent: '' });
      showStatus("Battle Resultaat succesvol opgeslagen!");
    } catch(e) {
      showStatus("Fout bij opslaan battle.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateLore = async (e) => {
    e.preventDefault();
    if (!myCard) return;
    setIsProcessing(true);
    try {
      const loreRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'lore'), { 
        ...newLore, 
        author: user.uid, 
        forceName: myCard.forceName,
        superFaction: myCard.superFaction,
        timestamp: Date.now() 
      });
      
      if (newLore.linkedBattleId) {
         const battleDoc = doc(db, 'artifacts', appId, 'public', 'data', 'battles', newLore.linkedBattleId);
         await updateDoc(battleDoc, { linkedLoreId: loreRef.id });
      }

      setNewLore({ title: '', content: '', linkedBattleId: '' });
      showStatus("Lore Transmissie Gepubliceerd!");
    } catch(e) {
      showStatus("Fout bij schrijven lore.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const myCard = crusadeCards.find(c => c.owner === user?.uid);

  const combinedEvents = [
    ...loreEntries.map(e => ({ ...e, type: 'lore' })),
    ...battleLogs.map(e => ({ ...e, type: 'battle' })),
    ...cardLogs.map(e => ({ ...e, type: 'log' }))
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 5);

  const factionColors = { 'Imperium': '#3b82f6', 'Chaos': '#ef4444', 'Xenos': '#22c55e' };
  const getFactionTextColor = (fac) => factionColors[fac] ? (fac === 'Imperium' ? 'text-blue-400' : fac === 'Chaos' ? 'text-red-400' : 'text-green-400') : 'text-orange-500';

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

  if (!user) return <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-orange-500 font-mono italic"><Skull size={40} className="animate-pulse mb-4" /> VERBINDEN...</div>;

  return (
    <>
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24 selection:bg-orange-500/30 print:hidden">
      {statusMsg.text && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 font-bold text-xs uppercase tracking-widest ${statusMsg.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {statusMsg.type === 'error' ? <AlertTriangle size={16}/> : <Check size={16}/>}
          {statusMsg.text}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-50 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <Skull size={20} className="text-orange-600" />
          <h1 className="text-sm font-black uppercase tracking-tighter text-orange-500 leading-none">Armageddon<br/><span className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase">Crusade Terminal</span></h1>
        </div>
        <div className="text-[9px] font-mono uppercase text-right leading-tight">
          {myCard ? (
             <div className="flex flex-col items-end">
               <span className="text-zinc-500">Commandeur <span className="text-orange-500 font-bold">{myCard.playerName}</span></span>
               <span className="text-zinc-400 max-w-[120px] truncate">{myCard.forceName}</span>
             </div>
          ) : (
             <div className="flex flex-col items-end">
               <span className="text-zinc-500">Toegang: <span className="text-red-500 font-bold">GUEST</span></span>
               <span className="text-zinc-600">ID: {user.uid.substring(0, 6)}</span>
             </div>
          )}
        </div>
      </header>

      <nav className="bg-zinc-900 border-b border-zinc-800 flex sticky top-[53px] z-40 overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', icon: MapIcon, label: 'Status' },
          { id: 'cards', icon: ClipboardList, label: 'Order of Battle' },
          { id: 'generator', icon: Dices, label: 'Missies' },
          { id: 'lore', icon: ScrollText, label: 'Lore Hub' },
          { id: 'logs', icon: History, label: 'Battles' },
          { id: 'leaderboard', icon: Medal, label: 'Rangen' },
          { id: 'regels', icon: BookOpen, label: 'Regels' }
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
            {!myCard && (
               <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3">
                     <AlertTriangle className="text-red-500" size={24} />
                     <div>
                        <h4 className="text-red-500 font-black text-xs uppercase tracking-widest">Niet ingelogd</h4>
                        <p className="text-zinc-400 text-[10px]">Maak een Force aan of herstel je beheer in 'Order of Battle' om deel te nemen.</p>
                     </div>
                  </div>
                  <button onClick={() => setActiveTab('cards')} className="bg-red-600 text-white text-[10px] font-bold uppercase px-4 py-2 rounded-lg whitespace-nowrap">Go to Order of Battle</button>
               </div>
            )}

            {/* RACE NAAR ARMAGEDDON */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600"></div>
               <h2 className="text-2xl font-black uppercase italic mb-3 tracking-tighter text-white">De Race naar Armageddon</h2>
               <p className="text-zinc-400 text-sm italic leading-relaxed mb-10">
                  De Derde Oorlog bevindt zich nog in de aanvoerfase. De vloten van het Imperium, de invasievloot van Chaos en diverse Xenos stammen vechten zich een weg door de sectoren. Elke slagveldwinst stuwt een factie verder naar voren.
               </p>

               <div className="space-y-10 pl-2 pr-2 md:pl-6 md:pr-6">
                  {['Imperium', 'Chaos', 'Xenos'].map(faction => {
                     const wins = winDistribution.find(d => d.label === faction)?.value || 0;
                     const progress = Math.min(100, (wins / CAMPAIGN_MAX_WINS) * 100);
                     const bgColor = faction === 'Imperium' ? 'bg-blue-600' : faction === 'Chaos' ? 'bg-red-600' : 'bg-green-600';
                     const textColor = faction === 'Imperium' ? 'text-blue-500' : faction === 'Chaos' ? 'text-red-500' : 'text-green-500';
                     const dropColor = faction === 'Imperium' ? 'shadow-[0_0_10px_rgba(37,99,235,0.8)]' : faction === 'Chaos' ? 'shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'shadow-[0_0_10px_rgba(22,163,74,0.8)]';

                     return (
                        <div key={faction} className="relative">
                           <div className="flex justify-between items-end mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>{faction} Vloot</span>
                              <span className="text-[10px] font-mono text-zinc-500">{wins} / {CAMPAIGN_MAX_WINS} Zeges</span>
                           </div>
                           <div className="relative h-2 bg-zinc-950 rounded-full border border-zinc-800">
                              <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${bgColor} ${dropColor}`} style={{ width: `${progress}%` }}></div>
                              <div className="absolute -top-[5px] left-0 w-full h-full pointer-events-none">
                                 {WAYPOINTS.map((wp, idx) => (
                                    <div key={idx} className="absolute top-0 flex flex-col items-center" style={{ left: `${wp.percent}%`, transform: wp.percent === 100 ? 'translateX(-100%)' : (wp.percent === 0 ? 'translateX(0)' : 'translateX(-50%)') }}>
                                       {wp.percent === 100 ? (
                                          <Globe size={18} className={`mt-[-3px] bg-zinc-950 rounded-full ${progress >= 100 ? textColor : 'text-zinc-700'}`} />
                                       ) : (
                                          <div className={`w-3 h-3 rounded-full border-2 border-zinc-950 ${progress >= wp.percent ? bgColor : 'bg-zinc-800'}`}></div>
                                       )}
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

            {/* TAARTDIAGRAMMEN */}
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

            {/* SITUATION REPORT (LORE FEED) */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
              <h2 className="text-2xl font-black uppercase italic mb-5 tracking-tighter text-white">Situation Report</h2>
              <div className="space-y-4">
                {combinedEvents.length > 0 ? combinedEvents.map((ev, i) => {
                  let narrative = "";
                  let factionAuthor = "";
                  if (ev.type === 'lore') {
                     narrative = `[ARCHIEF TRANSMISSIE] Nieuwe data-lei gedecodeerd: "${ev.title}".`;
                     factionAuthor = ev.forceName;
                  }
                  else if (ev.type === 'battle') {
                     narrative = `[BATTLE LOG] Het bloed vloeit in de sectoren. ${ev.winner} heeft gezegevierd in een conflict tussen ${ev.attacker} en ${ev.defender}.`;
                     factionAuthor = "Global Sensoren";
                  }
                  else if (ev.type === 'log') {
                     narrative = `[VOX INTERCEPT] Tactische update: ${ev.message}`;
                     factionAuthor = crusadeCards.find(c => c.id === ev.cardId)?.forceName || "Unknown";
                  }
                  
                  return (
                    <div key={i} className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 border-l-2 border-l-orange-500">
                      <div className="flex justify-between items-start mb-1">
                         <span className="text-[8px] text-zinc-600 font-mono block uppercase tracking-widest">{new Date(ev.timestamp).toLocaleString()}</span>
                         <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Bron: {factionAuthor}</span>
                      </div>
                      <p className="text-zinc-300 text-sm italic leading-relaxed">
                         <span className="text-orange-500 font-black mr-2">&gt;&gt;</span>{narrative}
                      </p>
                    </div>
                  );
                }) : (
                  <p className="text-zinc-500 text-sm italic">De vox-kanalen zijn stil...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ORDER OF BATTLE */}
        {activeTab === 'cards' && (
          <div className="space-y-8">
            {!myCard ? (
              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] shadow-xl overflow-hidden">
                <div className="flex border-b border-zinc-800">
                  <button onClick={() => setIsClaiming(false)} className={`flex-1 p-4 md:p-5 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors ${!isClaiming ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>Nieuwe Force Maken</button>
                  <button onClick={() => setIsClaiming(true)} className={`flex-1 p-4 md:p-5 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors ${isClaiming ? 'bg-zinc-700 text-white border-b-2 border-orange-500' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>Beheer Herstellen</button>
                </div>
                
                <div className="p-6 md:p-8">
                  {!isClaiming ? (
                    <form onSubmit={handleCreateCard} className="space-y-6 text-center animate-in zoom-in-95">
                      <div className="space-y-2">
                        <Skull className="mx-auto text-zinc-700 mb-2" size={32}/>
                        <h3 className="font-black uppercase text-xl text-orange-500 leading-tight">Start je Crusade Force</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <input type="text" placeholder="Force Naam" className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none" onChange={e => setCardForm({...cardForm, forceName: e.target.value})} required />
                        <input type="text" placeholder="Faction" className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none" onChange={e => setCardForm({...cardForm, faction: e.target.value})} required />
                        <select className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none text-zinc-300" value={cardForm.superFaction} onChange={e => setCardForm({...cardForm, superFaction: e.target.value})}>
                          <option value="Imperium">Imperium</option>
                          <option value="Chaos">Chaos</option>
                          <option value="Xenos">Xenos</option>
                        </select>
                        <input type="text" placeholder="Spelersnaam" className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none" onChange={e => setCardForm({...cardForm, playerName: e.target.value})} required />
                        <input type="password" placeholder="Toegangscode" className="md:col-span-2 bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none" onChange={e => setCardForm({...cardForm, secretKey: e.target.value})} required />
                      </div>
                      <button disabled={isProcessing} className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl transition-all hover:bg-orange-500">
                        {isProcessing ? <Loader2 className="animate-spin inline mr-2" size={16}/> : null}
                        Initialiseer Order of Battle
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleClaimForce} className="space-y-6 animate-in zoom-in-95">
                      <div className="text-center">
                        <h3 className="font-black uppercase text-xl">Herstel Account</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Force Naam" className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none" onChange={e => setClaimForm({...claimForm, forceName: e.target.value})} required />
                        <input type="password" placeholder="Jouw Code" className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none" onChange={e => setClaimForm({...claimForm, secretKey: e.target.value})} required />
                      </div>
                      <button disabled={isProcessing} className="w-full bg-zinc-100 text-zinc-950 p-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white">
                        {isProcessing ? <Loader2 className="animate-spin inline mr-2" size={16}/> : null}
                        Herstel Beheer
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-zinc-900 border-2 border-orange-600 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="p-6 md:p-8 bg-zinc-950/50 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start gap-6">
                    <div>
                      <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-1 block">Commanders Terminal</span>
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">{myCard.forceName}</h3>
                      <p className="text-zinc-500 text-xs font-bold uppercase">{myCard.faction} | {myCard.playerName}</p>
                    </div>
                    <div className="flex gap-2 bg-zinc-950 p-3 rounded-2xl border border-zinc-800 shadow-inner">
                      <div className="text-center px-3"><span className="block text-[7px] text-zinc-500 uppercase font-black mb-1">Supply</span><span className="text-xl font-black">{myCard.supply}</span></div>
                      <div className="text-center border-l border-zinc-800 px-3"><span className="block text-[7px] text-orange-900 uppercase font-black mb-1">RP</span><span className="text-xl font-black text-orange-600">{myCard.rp}</span></div>
                      <div className="text-center border-l border-zinc-800 px-3"><span className="block text-[7px] text-blue-500 uppercase font-black mb-1">Points</span><span className="text-xl font-black text-blue-500">{myCard.crusadePoints || 0}</span></div>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-800 bg-zinc-900/20">
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleUpdateCard(myCard.id, { rp: (myCard.rp || 0) + 1 }, "+1 RP added")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700">+1 RP</button>
                        <button onClick={() => handleUpdateCard(myCard.id, { rp: Math.max(0, (myCard.rp || 0) - 1) }, "-1 RP spent")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700">-1 RP</button>
                        <button onClick={() => handleUpdateCard(myCard.id, { supply: (myCard.supply || 0) + 100 }, "+100 Supply added")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700">+100 Sup</button>
                        <button onClick={() => handleUpdateCard(myCard.id, { supply: Math.max(0, (myCard.supply || 0) - 100) }, "-100 Supply removed")} className="bg-zinc-800 p-2 rounded-lg text-[9px] font-black uppercase border border-zinc-700 hover:bg-zinc-700">-100 Sup</button>
                     </div>
                     <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 shadow-inner h-24 overflow-y-auto no-scrollbar">
                        <h4 className="text-[8px] font-black uppercase text-zinc-600 mb-2">History Log</h4>
                        {cardLogs.filter(l => l.cardId === myCard.id).slice(0, 5).map((l, idx) => (
                           <div key={idx} className="text-[9px] text-zinc-500 italic mb-1 border-l border-orange-500/30 pl-2">{l.message}</div>
                        ))}
                     </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black uppercase tracking-widest text-zinc-300">Active Units</h4>
                      <button onClick={() => setIsAddingUnit(true)} className="bg-orange-600 p-2 px-6 rounded-full text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Add Unit</button>
                    </div>
                    {isAddingUnit && (
                      <div className="flex gap-2 animate-in slide-in-from-right-2">
                        <input type="text" placeholder="Unit Naam..." className="flex-1 bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs outline-none focus:border-orange-500" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} autoFocus />
                        <button onClick={() => handleCreateUnit(myCard)} className="bg-green-600 p-2 rounded-lg"><Check size={14}/></button>
                        <button onClick={() => setIsAddingUnit(false)} className="bg-zinc-800 p-2 rounded-lg"><X size={14}/></button>
                      </div>
                    )}
                    <div className="space-y-4">
                      {(myCard.units || []).map(unit => (
                        <div key={unit.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden group">
                          <div className="p-4 flex justify-between items-center bg-zinc-900/20 group-hover:bg-zinc-900/40 transition-colors">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="bg-zinc-900 px-3 py-1.5 rounded-lg text-orange-500 font-black text-xs border border-zinc-800">{unit.xp} XP</div>
                              <h5 className="font-black uppercase tracking-tight flex items-center gap-2">
                                {unit.name}
                                {unit.isWarlord && <Crown size={14} className="text-yellow-500" />}
                              </h5>
                              <div className="flex gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                 <span className="flex items-center gap-1"><Users size={10}/> {unit.modelCount || 1}</span>
                                 <span className="flex items-center gap-1"><Coins size={10}/> {unit.points || 0}pt</span>
                                 <span className="flex items-center gap-1 text-red-500/70"><Skull size={10}/> {unit.killTally || 0}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleToggleWarlord(myCard, unit.id)} className={`p-2 transition-colors ${unit.isWarlord ? 'text-yellow-500' : 'text-zinc-600 hover:text-yellow-500'}`}><Crown size={16}/></button>
                              <button onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)} className="p-2 text-zinc-500 hover:text-white"><ChevronDown size={16}/></button>
                              <button onClick={async () => {
                                 const updatedUnits = myCard.units.filter(u => u.id !== unit.id);
                                 await handleUpdateCard(myCard.id, { units: updatedUnits }, `Unit removed: ${unit.name}`);
                              }} className="p-2 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                            </div>
                          </div>
                          {expandedUnit === unit.id && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800 bg-zinc-900/10">
                               <UnitField label="XP Points" type="number" value={unit.xp} onChange={v => handleUpdateUnit(myCard, unit.id, 'xp', parseInt(v) || 0)} />
                               <UnitField label="Points" type="number" value={unit.points} onChange={v => handleUpdateUnit(myCard, unit.id, 'points', parseInt(v) || 0)} />
                               <UnitField label="Kills" type="number" value={unit.killTally} onChange={v => handleUpdateUnit(myCard, unit.id, 'killTally', parseInt(v) || 0)} />
                               <UnitField label="Models" type="number" value={unit.modelCount} onChange={v => handleUpdateUnit(myCard, unit.id, 'modelCount', parseInt(v) || 1)} />
                               <div className="md:col-span-2">
                                  <UnitField label="Wargear & Traits" area value={unit.customInfo} onChange={v => handleUpdateUnit(myCard, unit.id, 'customInfo', v)} />
                               </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'generator' && (
          <div className="text-center py-6 space-y-8 animate-in zoom-in-95">
            <button onClick={() => setRolledMission(ARMAGEDDON_MISSIONS[Math.floor(Math.random() * ARMAGEDDON_MISSIONS.length)])} className="bg-orange-600 p-5 px-12 rounded-full shadow-2xl uppercase tracking-widest text-xs font-black flex items-center gap-4 mx-auto shadow-orange-900/40 active:scale-95 transition-all">
              <Dices size={24} /> Roll Tactical Mission
            </button>
            {rolledMission && (
              <div className="bg-zinc-900 border border-orange-500/20 p-8 rounded-[2.5rem] text-left relative overflow-hidden shadow-2xl space-y-6">
                <div className="absolute top-0 left-0 w-full h-2 bg-orange-600"></div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-orange-500">{rolledMission.name}</h3>
                <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/50"><p className="text-zinc-400 italic text-sm leading-relaxed">{rolledMission.background}</p></div>
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-zinc-500">Scoring:</h4>
                   <ul className="space-y-3">{rolledMission.rules.map((r, i) => (<li key={i} className="flex gap-3 text-xs italic leading-relaxed"><span className="text-orange-600 font-black">•</span>{r}</li>))}</ul>
                </div>
                <div className="bg-orange-600/10 border border-orange-500/30 p-5 rounded-2xl"><h4 className="text-[10px] font-black uppercase text-orange-500 mb-2">Reward:</h4><p className="text-white font-bold text-sm italic">{rolledMission.reward}</p></div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lore' && (
          <div className="space-y-6">
            {myCard && (
               <form onSubmit={handleCreateLore} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
                 <h3 className="font-black uppercase text-[10px] text-zinc-500 mb-2">New Archive Entry</h3>
                 <input type="text" placeholder="Titel..." className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-sm" value={newLore.title} onChange={e => setNewLore({...newLore, title: e.target.value})} required />
                 <textarea placeholder="Verslag..." className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-sm h-32" value={newLore.content} onChange={e => setNewLore({...newLore, content: e.target.value})} required />
                 <button disabled={isProcessing} className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase text-xs transition-colors hover:bg-orange-500">Publish Transmission</button>
               </form>
            )}
            <div className="space-y-4">
              {loreEntries.map(e => (
                <article key={e.id} className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800/50 shadow-md">
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="text-orange-500 font-black uppercase italic">{e.title}</h4>
                     <span className="text-[8px] font-mono text-zinc-700 uppercase">{new Date(e.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-zinc-300 text-sm italic border-l-2 border-zinc-800 pl-4 whitespace-pre-wrap">{e.content}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            {myCard && (
               <form onSubmit={handleLogBattle} className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 space-y-6 shadow-xl animate-in slide-in-from-top-4">
                 <h3 className="font-black uppercase text-xl text-orange-500 text-center">Log Engagement</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none text-zinc-300" value={battleForm.attackerId} onChange={e => setBattleForm({...battleForm, attackerId: e.target.value})} required>
                       <option value="">Attacker...</option>
                       {crusadeCards.map(c => <option key={c.id} value={c.id}>{c.forceName}</option>)}
                    </select>
                    <select className="bg-zinc-950 p-4 rounded-xl text-sm border border-zinc-800 focus:border-orange-500 outline-none text-zinc-300" value={battleForm.defenderId} onChange={e => setBattleForm({...battleForm, defenderId: e.target.value})} required>
                       <option value="">Defender...</option>
                       {crusadeCards.map(c => <option key={c.id} value={c.id}>{c.forceName}</option>)}
                    </select>
                 </div>
                 <select className="w-full bg-orange-950/20 p-4 rounded-xl text-sm border border-orange-500/50 text-white font-bold" value={battleForm.winnerId} onChange={e => setBattleForm({...battleForm, winnerId: e.target.value})} required>
                    <option value="">Winner...</option>
                    {battleForm.attackerId && <option value={battleForm.attackerId}>{crusadeCards.find(c => c.id === battleForm.attackerId)?.forceName}</option>}
                    {battleForm.defenderId && <option value={battleForm.defenderId}>{crusadeCards.find(c => c.id === battleForm.defenderId)?.forceName}</option>}
                 </select>
                 <button disabled={isProcessing} className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase text-xs shadow-xl hover:bg-orange-500">Record Battle</button>
               </form>
            )}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-zinc-950 text-zinc-600 font-black uppercase border-b border-zinc-800"><tr><th className="p-5">Engagement</th><th className="p-5 text-orange-500">Winner</th></tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {battleLogs.map(l => (
                    <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                       <td className="p-5 font-bold text-zinc-300">{l.attacker} vs {l.defender}</td>
                       <td className="p-5 font-black uppercase italic tracking-tighter text-white">{l.winner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'regels' && (
          <div className="space-y-4">
            {RULES_DATA.map((r, i) => (
              <div key={i} className="bg-zinc-900 p-4 rounded-2xl border-l-4 border-orange-600">
                <h3 className="font-bold text-xs uppercase text-orange-500 mb-1">{r.title}</h3>
                <p className="text-zinc-400 text-sm italic">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <footer className="fixed bottom-0 w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 p-4 text-center">
        <p className="text-[7px] text-zinc-700 font-mono tracking-widest uppercase italic">The Emperor Protects | Armageddon Crusade</p>
      </footer>
    </div>
    </>
  );
}

function UnitField({ label, value, onChange, type = 'text', area = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest ml-1">{label}</label>
      {area ? (
        <textarea className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-[10px] text-zinc-300 outline-none focus:border-orange-500 h-24 transition-all" value={value || ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <input type={type} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-[10px] text-zinc-300 outline-none focus:border-orange-500 transition-all" value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

function DonutChart({ data, size = 100, holeColor = '#09090b' }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-zinc-800 text-[10px] uppercase">Geen data</div>;
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