(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CUSTOM_KEY = 'po-casino-custom-games-v1';
  const AUDIO_KEY = 'po-casino-audio-v1';
  const read = (key, fallback) => { try { const v=JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } };
  let customGames = read(CUSTOM_KEY, []);
  let audioPrefs = read(AUDIO_KEY, {music:true,fx:true,voice:true,musicVolume:.24,fxVolume:.45});
  let audio = null, audioNodes = [], audioStarted = false, audioActive = false, musicTimer = null, musicStep = 0;
  let activeExtra = 'lobby';
  let extraState = {};
  let customTimer = null, customSeconds = 0;

  const account = () => window.PO_CASINO?.account || {bankroll:1000};
  const transact = (stake, payout, outcome) => {
    if (!window.PO_CASINO?.transact) return false;
    return window.PO_CASINO.transact(stake, payout, outcome);
  };
  const say = text => window.PO_CASINO?.say(text);
  const playTone = (freq=440, duration=.12, type='triangle', volume=.15) => {
    if (!audioPrefs.fx || audioPrefs.muted || !audio) return;
    try {
      const o=audio.createOscillator(), g=audio.createGain();
      o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(Math.max(.001,volume*audioPrefs.fxVolume),audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration+.02);
    } catch {}
  };
  function suspenseNote(){
    if(!audio||!audioActive||audioPrefs.muted||!audioPrefs.music)return;
    try{const notes=[110,130.81,164.81,146.83,110,98,123.47,130.81],o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.type='sine';o.frequency.value=notes[musicStep++%notes.length];g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.035*audioPrefs.musicVolume,now+.12);g.gain.exponentialRampToValueAtTime(.0001,now+1.15);o.connect(g);g.connect(audio.master);o.start(now);o.stop(now+1.2);}catch{}
  }
  function startAudio() {
    audioActive=true;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    try {
      if(!audio) {
        audio=new AC();
        const master=audio.createGain();master.gain.value=audioPrefs.musicVolume;master.connect(audio.destination);
        const pad1=audio.createOscillator(),pad2=audio.createOscillator(),filter=audio.createBiquadFilter(),padGain=audio.createGain();
        pad1.type='sine';pad2.type='triangle';pad1.frequency.value=55;pad2.frequency.value=82.41;
        filter.type='lowpass';filter.frequency.value=260;padGain.gain.value=.14;
        pad1.connect(filter);pad2.connect(filter);filter.connect(padGain);padGain.connect(master);
        pad1.start();pad2.start();
        const lfo=audio.createOscillator(),lfoGain=audio.createGain();lfo.frequency.value=.08;lfoGain.gain.value=55;lfo.connect(lfoGain);lfoGain.connect(filter.frequency);lfo.start();
        audioNodes=[master,pad1,pad2,lfo,padGain,filter];
        audio.master=master;
        if(!musicTimer)musicTimer=setInterval(suspenseNote,1450);
      }
      audio.resume();audioStarted=true;applyAudio();
    } catch(e){console.warn('[Casino] Audio non disponible',e);}
  }
  function applyAudio(){
    if(audio?.master)audio.master.gain.setTargetAtTime(audioActive&&audioPrefs.music&&!audioPrefs.muted?audioPrefs.musicVolume:0,audio.currentTime,.15);
    const btn=$('[data-audio-toggle]');if(btn){btn.textContent=audioPrefs.muted?'Son coupé':'Son activé';btn.setAttribute('aria-pressed',String(!audioPrefs.muted));}
    const music=$('[data-audio-music]');if(music)music.value=audioPrefs.musicVolume;
    const fx=$('[data-audio-fx]');if(fx)fx.value=audioPrefs.fxVolume;
    const fxBtn=$('[data-audio-fx-toggle]');if(fxBtn)fxBtn.textContent=audioPrefs.fx?'Effets ON':'Effets OFF';
    const voiceBtn=$('[data-audio-voice-toggle]');if(voiceBtn)voiceBtn.textContent=audioPrefs.voice?'Sophie ON':'Sophie OFF';
    const voiceCheck=$('#casino-voice');if(voiceCheck)voiceCheck.checked=audioPrefs.voice;
    try{localStorage.setItem(AUDIO_KEY,JSON.stringify(audioPrefs));}catch{}
  }
  function soundSettings(){
    if($('.casino-audio-bar'))return;
    const nav=$('.casino-nav');if(!nav)return;
    const bar=document.createElement('div');bar.className='casino-audio-bar';
    bar.innerHTML='<div class="casino-audio-title"><span>♫</span><strong>AMBIANCE SONORE</strong><small>JAZZ NOIR · SUSPENSE</small></div><button type="button" data-audio-toggle aria-pressed="true">Son activé</button><label>Musique <input type="range" min="0" max="0.6" step="0.01" value="'+audioPrefs.musicVolume+'" data-audio-music></label><button type="button" data-audio-fx-toggle>Effets ON</button><button type="button" data-audio-voice-toggle>Sophie ON</button>';
    nav.insertAdjacentElement('afterend',bar);applyAudio();
  }
  function injectTabs(){
    const nav=$('.casino-nav');if(!nav||nav.dataset.expanded)return;
    nav.dataset.expanded='1';
    const spacer=nav.querySelector('.casino-nav-spacer');
    const tabs=[['slots','Machines à sous'],['dice','Dés'],['highcard','Bataille'],['creator','Créer un jeu']];
    tabs.forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.dataset.casinoExtra=id;b.textContent=label;spacer?nav.insertBefore(b,spacer):nav.append(b);});
    soundSettings();
  }
  const gameCards = [
    ['slots','🎰','MACHINE À SOUS','Midnight Jackpot','Jackpot, rouleaux animés et gains fictifs.'],
    ['dice','🎲','DÉS CLANDESTINS','Les dés du sous-sol','Défi de dés entre 2 et 6 joueurs.'],
    ['highcard','🂡','BATAILLE','La bataille','Une carte chacun : la plus forte remporte le pot.'],
    ['creator','✎','CRÉER UN JEU','Atelier de création','Conçois tes propres règles, défis et questions.']
  ];
  function addLobbyCards(){
    const content=$('#casino-content');if(!content||content.querySelector('[data-extra-lobby]'))return;
    const section=document.createElement('section');section.className='casino-section casino-extra-lobby';section.dataset.extraLobby='';
    section.innerHTML='<div class="casino-section-head"><div><span class="casino-eyebrow">LES NOUVELLES TABLES</span><h3>La salle clandestine</h3></div><span class="casino-live">● 4 TABLES DISPONIBLES</span></div><div class="casino-games">'+gameCards.map(([id,icon,tag,title,desc])=>'<article class="casino-game-card casino-extra-card"><div class="game-symbol">'+icon+'</div><span class="casino-tag">'+tag+'</span><h4>'+title+'</h4><p>'+desc+'</p><button type="button" data-casino-extra="'+id+'">Entrer à la table <b>→</b></button></article>').join('')+'</div><div class="casino-custom-shortcut"><div><small>ATELIER DU CASINO</small><strong>Les règles sont faites pour être détournées.</strong><p>Crée une partie sur mesure et invite les joueurs autour de l’écran.</p></div><button type="button" data-casino-extra="creator">Créer mon jeu ↗</button></div>';
    content.append(section);
  }
  function setExtraTab(id){
    activeExtra=id;
    document.querySelectorAll('[data-casino-extra]').forEach(b=>b.classList.toggle('active',b.dataset.casinoExtra===id));
    document.querySelectorAll('[data-casino-tab]').forEach(b=>b.classList.remove('active'));
    const content=$('#casino-content');if(!content)return;
    if(id==='slots')renderSlots();
    else if(id==='dice')renderDiceSetup();
    else if(id==='highcard')renderHighCardSetup();
    else if(id==='creator')renderCreator();
    else if(id==='custom')renderCustomList();
  }
  function renderSlots(){
    extraState={reels:['♠','♦','♣'],spinning:false};
    $('#casino-content').innerHTML='<section class="cx-page"><div class="cx-heading"><span class="casino-eyebrow">TABLE 03 · JACKPOT</span><h1>La machine <em>interdite</em></h1><p>Trois rouleaux, une mise fictive et une chance insolente. Le triple 7 paie 20 fois la mise.</p></div><div class="cx-slot-machine"><div class="cx-slot-top">THE MIDNIGHT JACKPOT <span>♛</span></div><div class="cx-reels" aria-live="polite">'+extraState.reels.map(x=>'<div class="cx-reel">'+x+'</div>').join('')+'</div><div class="cx-slot-paytable"><span>7️⃣ 7️⃣ 7️⃣ <b>×20</b></span><span>3 symboles identiques <b>×8</b></span><span>2 symboles identiques <b>×2</b></span></div><div class="cx-slot-controls"><label>Mise<select id="cx-slot-stake"><option>10</option><option selected>25</option><option>50</option><option>100</option></select></label><button class="casino-gold-btn" data-cx="slot-spin">Lancer les rouleaux</button></div><p id="cx-slot-result" class="cx-result">La machine attend ton premier coup.</p></div><button class="casino-action" data-cx="home">← Retour au salon</button></section>';
  }
  const symbols=['♠','♥','♦','♣','7','★','♛'];
  function spinSlots(){
    const stake=Number($('#cx-slot-stake')?.value||25);if(stake>account().bankroll){say('Tu n’as même plus de quoi nourrir la machine. C’est triste.');return;}
    const reels=Array.from({length:3},()=>symbols[Math.floor(Math.random()*symbols.length)]);
    const same=reels[0]===reels[1]&&reels[1]===reels[2],pair=!same&&(reels[0]===reels[1]||reels[1]===reels[2]||reels[0]===reels[2]);
    const payout=same?(reels[0]==='7'?stake*20:stake*8):pair?stake*2:0;
    if(!transact(stake,payout,payout?'win':'loss'))return;
    const root=$('.cx-reels');root.innerHTML=reels.map(x=>'<div class="cx-reel">'+x+'</div>').join('');root.classList.remove('rolling');void root.offsetWidth;root.classList.add('rolling');
    $('#cx-slot-result').textContent=payout?'GAGNÉ · '+(payout-stake)+' jetons nets. '+(same&&reels[0]==='7'?'JACKPOT !':'La machine vient de cracher ses jetons.'):'PERDU · '+stake+' jetons. '+pick(roasts);
    playTone(payout?880:150,.32,payout?'sine':'sawtooth',.2);say(payout?'Jackpot ! '+payout+' jetons te reviennent. '+pick(wins):'Rien du tout. '+pick(roasts));
  }
  const roasts=['Magnifique. Tu viens de financer la retraite de la machine.','Même les rouleaux ont refusé de te donner un symbole.','Tu as le talent d’un distributeur en panne.','La machine te remercie pour ce généreux pourboire.','C’était presque beau. Presque.','Tu joues ou tu fais un don à la ferraille ?','Aïe. Ton portefeuille vient de faire un malaise.'];
  const wins=['Une victoire ! Je vais devoir revoir mon jugement sur toi.','Ça brille ! Essaie de ne pas tout reperdre dans les dix secondes.','Tu as touché le jackpot. Ne prends pas ça pour une compétence.','La maison grimace. Profite de ce moment historique.'];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  function playerNames(raw,min=2,max=6){const names=String(raw||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,max);while(names.length<min)names.push('Joueur '+(names.length+1));return names;}
  function renderDiceSetup(){
    $('#casino-content').innerHTML='<section class="cx-page"><div class="cx-heading"><span class="casino-eyebrow">TABLE 04 · DÉS</span><h1>Les dés <em>du sous-sol</em></h1><p>Chaque joueur lance deux dés. Le meilleur total remporte la manche. Un double six déclenche une annonce spéciale de Sophie.</p></div><div class="cx-panel"><label>Joueurs (séparés par des virgules)<input id="cx-dice-players" value="Joueur 1, Joueur 2" maxlength="150"></label><label>Mise par joueur<select id="cx-dice-stake"><option>10</option><option selected>25</option><option>50</option><option>100</option></select></label><button class="casino-gold-btn" data-cx="dice-start">Installer la table</button></div><div id="cx-dice-game"></div><button class="casino-action" data-cx="home">← Retour au salon</button></section>';
  }
  function startDice(){
    const names=playerNames($('#cx-dice-players').value),stake=Number($('#cx-dice-stake').value);
    if(stake*names.length>account().bankroll){say('Pas assez de jetons pour installer tous les joueurs.');return;}
    extraState={kind:'dice',names,stake,rolls:[],turn:0};
    names.forEach(()=>extraState.rolls.push(null));
    renderDiceGame();
    say('La table de dés est ouverte. '+names[0]+', prépare ton lancer. Et essaie de ne pas faire un double zéro.');
  }
  function renderDiceGame(){
    const root=$('#cx-dice-game');if(!root)return;
    const done=extraState.rolls.every(Boolean),name=extraState.names[extraState.turn];
    root.innerHTML='<div class="cx-dice-table"><div class="cx-dice-player"><small>JOUEUR ACTIF</small><strong>'+esc(name||'Résultats')+'</strong><div class="cx-dice-pair">'+(extraState.rolls[extraState.turn]?extraState.rolls[extraState.turn].map(x=>'<span>'+x+'</span>').join(''):'<span>?</span><span>?</span>')+'</div><button class="casino-gold-btn" data-cx="dice-roll" '+(extraState.rolls[extraState.turn]?'disabled':'')+'>Lancer les dés</button></div><ol class="cx-score">'+extraState.names.map((p,i)=>'<li><span>'+esc(p)+'</span><b>'+(extraState.rolls[i]?extraState.rolls[i].join(' + ')+' = '+extraState.rolls[i].reduce((a,b)=>a+b,0):'En attente')+'</b></li>').join('')+'</ol><div class="cx-turn-actions">'+(extraState.turn<extraState.names.length-1?'<button class="casino-action" data-cx="dice-next" '+(!extraState.rolls[extraState.turn]?'disabled':'')+'>Joueur suivant →</button>':'')+(done?'<button class="casino-gold-btn" data-cx="dice-settle">Révéler le gagnant</button>':'')+'</div></div>';
  }
  function rollDice(){
    if(extraState.rolls[extraState.turn])return;
    const roll=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];extraState.rolls[extraState.turn]=roll;
    playTone(260,.08);setTimeout(()=>playTone(390,.1),100);renderDiceGame();
    say(extraState.names[extraState.turn]+' obtient '+roll.join(' et ')+', soit '+(roll[0]+roll[1])+'. '+(roll[0]===6&&roll[1]===6?'DOUBLE SIX ! Enfin un peu de talent.':'Le prochain joueur, à toi.'));
  }
  function settleDice(){
    const sums=extraState.rolls.map(r=>r.reduce((a,b)=>a+b,0)),best=Math.max(...sums),winners=sums.map((s,i)=>s===best?i:-1).filter(i=>i>=0);
    const total=extraState.stake*extraState.names.length,payout=Math.floor(total/winners.length);
    transact(total,payout*winners.length,winners.length?'win':'loss');
    $('#cx-dice-game').insertAdjacentHTML('beforeend','<div class="cx-result">'+(winners.length===1?'🏆 '+esc(extraState.names[winners[0]])+' remporte la manche !':'ÉGALITÉ : '+winners.map(i=>esc(extraState.names[i])).join(', ')+' se partagent le pot.')+' · '+payout+' jetons chacun.</div><button class="casino-gold-btn" data-cx="dice-replay">Rejouer</button>');
    say(winners.length===1?extraState.names[winners[0]]+' gagne avec '+best+'. '+pick(wins):'Égalité parfaite. Même les dés n’arrivent pas à vous départager.');
  }
  function renderHighCardSetup(){
    $('#casino-content').innerHTML='<section class="cx-page"><div class="cx-heading"><span class="casino-eyebrow">TABLE 05 · CARTES</span><h1>La <em>bataille</em></h1><p>Chaque joueur reçoit une carte. La plus forte gagne le pot. En cas d’égalité, bataille automatique avec une nouvelle carte.</p></div><div class="cx-panel"><label>Joueurs (séparés par des virgules)<input id="cx-high-players" value="Joueur 1, Joueur 2" maxlength="150"></label><label>Mise par joueur<select id="cx-high-stake"><option>10</option><option selected>25</option><option>50</option><option>100</option></select></label><button class="casino-gold-btn" data-cx="high-start">Distribuer</button></div><div id="cx-high-game"></div><button class="casino-action" data-cx="home">← Retour au salon</button></section>';
  }
  function startHigh(){
    const names=playerNames($('#cx-high-players').value,2,6),stake=Number($('#cx-high-stake').value);
    if(stake*names.length>account().bankroll){say('La banque ne prête pas aux joueurs sans jetons.');return;}
    const deck=[];for(const s of ['♠','♥','♦','♣'])for(let n=2;n<=14;n++)deck.push({s,n});
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    extraState={kind:'high',names,stake,cards:names.map(()=>deck.pop()),revealed:false};
    renderHighGame();
    setTimeout(()=>{extraState.revealed=true;renderHighGame();playTone(620,.2);const max=Math.max(...extraState.cards.map(c=>c.n));const winners=extraState.cards.map((c,i)=>c.n===max?i:-1).filter(i=>i>=0);const payout=stake*names.length;transact(stake*names.length,payout,'win');say(winners.length===1?names[winners[0]]+' remporte la bataille avec '+rank(max)+'. '+pick(wins):'Égalité ! Les joueurs devront partager la gloire.');},450);
  }
  const rank=n=>({11:'Valet',12:'Dame',13:'Roi',14:'As'}[n]||String(n));
  function renderHighGame(){
    const root=$('#cx-high-game');if(!root)return;
    const max=Math.max(...(extraState.cards||[]).map(c=>c.n)),winners=(extraState.cards||[]).map((c,i)=>c.n===max?i:-1).filter(i=>i>=0);
    root.innerHTML='<div class="cx-high-cards">'+extraState.names.map((p,i)=>'<article><small>'+esc(p)+'</small><div class="cx-card '+(extraState.revealed?'':'back')+' '+(['♥','♦'].includes(extraState.cards[i].s)?'red':'')+'">'+(extraState.revealed?'<b>'+rank(extraState.cards[i].n)+'</b><span>'+extraState.cards[i].s+'</span>':'♠')+'</div></article>').join('')+'</div><p class="cx-result">'+(extraState.revealed?'🏆 '+winners.map(i=>esc(extraState.names[i])).join(', ')+' remporte(nt) la manche !':'Distribution des cartes…')+'</p>';
  }
  function renderCreator(existing=null){
    const g=existing||{title:'',type:'challenge',min:2,max:6,items:[],points:1};
    $('#casino-content').innerHTML='<section class="cx-page"><div class="cx-heading"><span class="casino-eyebrow">ATELIER · MODE CRÉATION</span><h1>Fabrique <em>ta propre table</em></h1><p>Configure les règles, le rythme, les joueurs, le score et les épreuves. Chaque jeu est personnalisable.</p></div><div class="cx-creator-layout"><form id="cx-create-form" class="cx-panel"><input type="hidden" name="editingId" value="'+esc(existing?.id||'')+'"><label>Nom du jeu<input name="title" maxlength="42" value="'+esc(g.title)+'" placeholder="Ex. Le dernier survivant" required></label><label>Présentation<textarea name="description" rows="2" maxlength="220" placeholder="Décris l’ambiance et le but du jeu…">'+esc(g.description||'')+'</textarea></label><div class="cx-creator-grid"><label>Type de partie<select name="type"><option value="challenge" '+(g.type==='challenge'?'selected':'')+'>Défis / gages</option><option value="quiz" '+(g.type==='quiz'?'selected':'')+'>Quiz / questions</option><option value="dice" '+(g.type==='dice'?'selected':'')+'>Dés / hasard</option></select></label><label>Difficulté<select name="difficulty"><option value="cool" '+((g.difficulty||'medium')==='cool'?'selected':'')+'>Détente</option><option value="medium" '+((g.difficulty||'medium')==='medium'?'selected':'')+'>Intermédiaire</option><option value="hard" '+(g.difficulty==='hard'?'selected':'')+'>Corsé</option></select></label><label>Joueurs minimum<select name="min">'+[1,2,3,4].map(n=>'<option '+(g.min===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><label>Joueurs maximum<select name="max">'+[2,3,6,8].map(n=>'<option '+(g.max===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><label>Manches par joueur<input name="rounds" type="number" min="1" max="20" value="'+(g.rounds||5)+'"></label><label>Temps par épreuve<select name="timer"><option value="0" '+(!g.timer?'selected':'')+'>Sans limite</option><option value="15" '+(g.timer===15?'selected':'')+'>15 secondes</option><option value="30" '+((g.timer||30)===30?'selected':'')+'>30 secondes</option><option value="60" '+(g.timer===60?'selected':'')+'>1 minute</option></select></label><label>Points par réussite<input name="points" type="number" min="1" max="20" value="'+g.points+'"></label></div><label>Questions / défis / événements<textarea name="items" rows="8" placeholder="Une épreuve par ligne. Pour un quiz : question | réponse attendue." required>'+esc(g.items.join('\n'))+'</textarea><small>Astuce : une ligne = une carte du paquet. Le jeu pioche sans répétition avant de remélanger.</small></label><div class="cx-form-actions"><button class="casino-gold-btn" type="submit">'+(existing?'Enregistrer les modifications':'Créer et enregistrer')+'</button><button class="casino-action" type="button" data-cx="custom-list">Ma ludothèque</button></div></form><aside class="cx-creator-preview"><span>APERÇU DE TA TABLE</span><div class="cx-preview-card"><div class="game-symbol">♛</div><h3>Ton jeu, tes règles.</h3><p>Jusqu’à 8 joueurs, score individuel, manches paramétrables et chronomètre facultatif.</p><small>SAUVEGARDE LOCALE</small></div><p class="casino-fineprint">Les jeux sont conservés dans ce navigateur. Export JSON pour les transférer sur un autre appareil.</p></aside></div></section>';
  }
  function saveCustom(form){
    const data=new FormData(form),title=String(data.get('title')||'').trim(),items=String(data.get('items')||'').split('\n').map(x=>x.trim()).filter(Boolean);
    const min=Number(data.get('min')),max=Number(data.get('max'));
    if(!title||items.length<1||max<min){say('Il manque un nom, un contenu ou la configuration des joueurs.');return;}
    const editingId=String(data.get('editingId')||'');
    const game={id:editingId||'cg-'+Date.now(),title,description:String(data.get('description')||'').trim(),type:String(data.get('type')),difficulty:String(data.get('difficulty')||'medium'),min,max,rounds:Math.max(1,Math.min(20,Number(data.get('rounds')||5))),timer:Math.max(0,Number(data.get('timer')||0)),items,points:Math.max(1,Math.min(20,Number(data.get('points')||1))),createdAt:new Date().toISOString()};
    if(editingId){const i=customGames.findIndex(g=>g.id===editingId);if(i>=0)customGames[i]=game;else customGames.unshift(game);}else customGames.unshift(game);
    persistCustom();say('Ton jeu '+title+' est enregistré. Il est disponible dans ta ludothèque.');renderCustomList();
  }
  function persistCustom(){try{localStorage.setItem(CUSTOM_KEY,JSON.stringify(customGames));}catch{say('Stockage local saturé : impossible de sauvegarder ce jeu.');}}
  function renderCustomList(){
    const content=$('#casino-content');if(!content)return;
    content.innerHTML='<section class="cx-page"><div class="cx-heading"><span class="casino-eyebrow">MA LUDOTHÈQUE</span><h1>Jeux <em>personnalisés</em></h1><p>Des règles maison, des défis et des questions créés par les joueurs.</p></div><div class="cx-custom-list">'+(customGames.length?customGames.map(g=>'<article class="cx-custom-card"><div><small>'+esc(g.type.toUpperCase())+' · '+esc(({cool:"DÉTENTE",medium:"INTERMÉDIAIRE",hard:"CORSÉ"})[g.difficulty||"medium"])+' · '+g.items.length+' CARTES</small><h3>'+esc(g.title)+'</h3><p>'+esc(g.description||'')+'</p><p>'+g.min+' à '+g.max+' joueurs · '+(g.rounds||5)+' manches · '+(g.timer?g.timer+" s/épreuve":"sans chrono")+' · '+g.points+' point(s)</p></div><button class="casino-gold-btn" data-cx-play="'+esc(g.id)+'">Jouer</button><button class="casino-action" data-cx-edit="'+esc(g.id)+'">Modifier</button><button class="casino-action" data-cx-duplicate="'+esc(g.id)+'">Dupliquer</button><button class="casino-action" data-cx-export="'+esc(g.id)+'">Exporter</button><button class="casino-action" data-cx-delete="'+esc(g.id)+'">Supprimer</button></article>').join(''):'<div class="cx-panel"><h3>Aucun jeu enregistré</h3><p>Crée ton premier jeu pour remplir cette salle.</p></div>')+'</div><div class="cx-form-actions"><button class="casino-gold-btn" data-cx="creator">Créer un jeu</button><button class="casino-action" data-cx="import">Importer un jeu JSON</button><button class="casino-action" data-cx="home">Retour au salon</button><input type="file" id="cx-import-file" accept=".json,application/json" hidden></div></section>';
  }
  function playCustom(id){
    const game=customGames.find(g=>g.id===id);if(!game)return;
    $('#casino-content').innerHTML='<section class="cx-page"><div class="cx-heading"><span class="casino-eyebrow">INSTALLATION DE LA TABLE</span><h1>'+esc(game.title)+'</h1><p>'+esc(game.description||'Configure les joueurs avant de commencer.')+'</p></div><form id="cx-custom-start-form" class="cx-panel"><label>Joueurs (séparés par des virgules)<input id="cx-custom-players" name="players" value="Joueur 1, Joueur 2" maxlength="180" required></label><small>Entre '+game.min+' à '+game.max+' noms. Les joueurs se relaient sur cet écran.</small><button class="casino-gold-btn" type="submit">Installer la partie</button></form><button class="casino-action" data-cx="custom-list">Retour à la ludothèque</button></section>';
    $('#cx-custom-start-form').dataset.gameId=game.id;
  }
  function startCustomFromForm(form){
    const game=customGames.find(g=>g.id===form.dataset.gameId);if(!game)return;
    const raw=String(new FormData(form).get('players')||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(raw.length<game.min||raw.length>game.max){say('Il faut entre '+game.min+' et '+game.max+' joueurs.');return;}
    if(new Set(raw.map(n=>n.toLowerCase())).size!==raw.length){say('Deux joueurs ont le même nom. Même dans ce casino, on évite les doublons.');return;}
    const names=raw;
    extraState={kind:'custom',game,names,turn:0,scores:Object.fromEntries(names.map(n=>[n,0])),used:[],current:null,round:0,roundsPlayed:Object.fromEntries(names.map(n=>[n,0]))};
    renderCustomGame();say('La partie '+game.title+' commence. '+names[0]+', prépare-toi.');
  }
  function renderCustomGame(message=''){
    const g=extraState.game,p=extraState.names[extraState.turn],done=extraState.names.every(n=>extraState.roundsPlayed[n]>=(g.rounds||5));
    $('#casino-content').innerHTML='<section class="cx-page"><div class="cx-heading"><span class="casino-eyebrow">PARTIE PERSONNALISÉE · '+esc(g.type.toUpperCase())+'</span><h1>'+esc(g.title)+'</h1><p>Tour de '+esc(p)+' · Manche '+(extraState.round+1)+'</p></div><div class="cx-panel cx-custom-round"><div class="cx-current-prompt">'+(extraState.current?esc(extraState.current):'Clique sur « Tirer une épreuve » pour commencer.')+'</div><button class="casino-gold-btn" data-cx="custom-draw" '+(extraState.current?'disabled':'')+'>Tirer une épreuve</button><div class="cx-form-actions"><button class="casino-action" data-cx="custom-good" '+(!extraState.current?'disabled':'')+'>Réussite +'+g.points+'</button><button class="casino-action" data-cx="custom-pass" '+(!extraState.current?'disabled':'')+'>Passer</button><button class="casino-action" data-cx="custom-next">Joueur suivant →</button></div><p class="cx-result">'+esc(message)+'</p><ol class="cx-score">'+extraState.names.map(n=>'<li><span>'+esc(n)+' · '+extraState.roundsPlayed[n]+'/'+(g.rounds||5)+' manche(s)</span><b>'+extraState.scores[n]+' pt(s)</b></li>').join('')+'</ol></div><button class="casino-action" data-cx="custom-list">Quitter la partie</button></section>';
  }
  function drawCustom(){
    clearInterval(customTimer);const g=extraState.game,remaining=g.items.map((v,i)=>({v,i})).filter(x=>!extraState.used.includes(x.i));
    if(!remaining.length)extraState.used=[];
    const pool=g.items.map((v,i)=>({v,i})).filter(x=>!extraState.used.includes(x.i));
    const item=pick(pool);extraState.used.push(item.i);extraState.current=item.v;extraState.round++;
    if(g.type==='quiz'&&item.v.includes('|'))extraState.current=item.v.split('|')[0].trim()+' — Réponse attendue après validation.';
    renderCustomGame();
    if(g.type==='dice'){const roll=1+Math.floor(Math.random()*6);extraState.current='Résultat du dé : '+roll+'. '+(roll>=4?'Réussite !':'Échec !');renderCustomGame();}
    say(extraState.names[extraState.turn]+', voici ton épreuve : '+extraState.current);
    if(g.timer){customSeconds=g.timer;const el=$('[data-cx-timer]');if(el)el.textContent=customSeconds+' s';customTimer=setInterval(()=>{customSeconds--;const timerEl=$('[data-cx-timer]');if(timerEl)timerEl.textContent=customSeconds+' s';if(customSeconds<=0){clearInterval(customTimer);customTimer=null;if(extraState.current){say('Temps écoulé ! Même un escargot aurait répondu plus vite.');nextCustom(false);}}},1000);}
  }
  function nextCustom(success){
    const g=extraState.game,p=extraState.names[extraState.turn];clearInterval(customTimer);customTimer=null;
    if(success)extraState.scores[p]+=g.points;
    extraState.roundsPlayed[p]++;extraState.current=null;extraState.answer=null;extraState.answerRevealed=false;
    let next=extraState.turn;for(let k=1;k<=extraState.names.length;k++){const candidate=(extraState.turn+k)%extraState.names.length;if(extraState.roundsPlayed[extraState.names[candidate]]<(g.rounds||5)){next=candidate;break;}}
    extraState.turn=next;
    const finished=extraState.names.every(n=>extraState.roundsPlayed[n]>=(g.rounds||5));
    renderCustomGame(finished?'Partie terminée ! '+extraState.names.slice().sort((a,b)=>extraState.scores[b]-extraState.scores[a]).map((n,i)=>(i+1)+'. '+n+' ('+extraState.scores[n]+' pts)').join(' · '):success?p+' marque '+g.points+' point(s).':p+' passe son tour.');
    say(finished?'Fin de partie ! '+extraState.names.slice().sort((a,b)=>extraState.scores[b]-extraState.scores[a]).map((n,i)=>(i+1)+', '+n+', '+extraState.scores[n]+' points').join('. '):success?p+' marque des points. '+pick(wins):p+' passe. '+pick(roasts));
  }
  function exportCustom(id){
    const g=customGames.find(x=>x.id===id);if(!g)return;
    const blob=new Blob([JSON.stringify(g,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(g.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'jeu')+'.json';a.click();URL.revokeObjectURL(url);
  }
  function importCustom(file){
    const reader=new FileReader();reader.onload=()=>{try{const g=JSON.parse(reader.result);if(!g.title||!Array.isArray(g.items)||!g.items.length||!['quiz','challenge','dice'].includes(g.type))throw new Error('Format invalide');g.id='cg-'+Date.now();g.min=Math.max(1,Number(g.min)||1);g.max=Math.max(g.min,Math.min(8,Number(g.max)||6));g.points=Math.max(1,Number(g.points)||1);customGames.unshift(g);persistCustom();renderCustomList();say('Jeu importé dans ta ludothèque.');}catch(e){say('Impossible d’importer ce jeu : '+e.message);}};reader.readAsText(file);
  }
  function onExtraClick(e){
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.casinoTab==='lobby'){activeExtra='lobby';return;}
    if(b.dataset.casinoExtra){e.preventDefault();e.stopPropagation();startAudio();setExtraTab(b.dataset.casinoExtra);return;}
    if(b.dataset.cx){
      const a=b.dataset.cx;
      if(a==='home'){activeExtra='lobby';document.querySelectorAll('[data-casino-extra]').forEach(x=>x.classList.remove('active'));window.PO_CASINO?.open('lobby');return;}
      if(a==='slot-spin')spinSlots();
      if(a==='dice-start')startDice();
      if(a==='dice-roll')rollDice();
      if(a==='dice-next'){extraState.turn++;renderDiceGame();}
      if(a==='dice-settle')settleDice();
      if(a==='dice-replay')renderDiceSetup();
      if(a==='high-start')startHigh();
      if(a==='creator')renderCreator();
      if(a==='custom-list')renderCustomList();
      if(a==='custom-draw')drawCustom();
      if(a==='custom-answer'&&extraState.answer){extraState.answerRevealed=true;renderCustomGame();say('La réponse attendue était : '+extraState.answer);}
      if(a==='custom-good')nextCustom(true);
      if(a==='custom-pass')nextCustom(false);
      if(a==='custom-next'){extraState.current=null;extraState.turn=(extraState.turn+1)%extraState.names.length;renderCustomGame();}
      if(a==='import')$('#cx-import-file')?.click();
      return;
    }
    if(b.dataset.cxPlay){playCustom(b.dataset.cxPlay);return;}
    if(b.dataset.cxEdit){const g=customGames.find(x=>x.id===b.dataset.cxEdit);if(g)renderCreator(g);return;}
    if(b.dataset.cxDuplicate){const g=customGames.find(x=>x.id===b.dataset.cxDuplicate);if(g){customGames.unshift({...g,id:'cg-'+Date.now(),title:g.title+' (copie)',createdAt:new Date().toISOString()});persistCustom();renderCustomList();say('Copie créée : '+g.title+'.');}return;}
    if(b.dataset.cxExport){exportCustom(b.dataset.cxExport);return;}
    if(b.dataset.cxDelete){if(confirm('Supprimer ce jeu de la ludothèque ?')){customGames=customGames.filter(g=>g.id!==b.dataset.cxDelete);persistCustom();renderCustomList();}return;}
  }
  function onExtraSubmit(e){if(e.target.id==='cx-create-form'){e.preventDefault();saveCustom(e.target);}if(e.target.id==='cx-custom-start-form'){e.preventDefault();startCustomFromForm(e.target);}}
  function onExtraChange(e){if(e.target.matches('[data-audio-music]')){audioPrefs.musicVolume=Number(e.target.value);startAudio();applyAudio();}if(e.target.id==='cx-import-file'&&e.target.files?.[0])importCustom(e.target.files[0]);}
  function mount(root){
    if(root.dataset.expansionMounted)return;root.dataset.expansionMounted='1';
    injectTabs();root.addEventListener('click',onExtraClick);root.addEventListener('submit',onExtraSubmit);root.addEventListener('change',onExtraChange);
    root.addEventListener('click',e=>{if(e.target.closest('[data-casino-close]')||e.target===root){audioActive=false;applyAudio();}});
    root.addEventListener('click',e=>{if(e.target.matches('[data-audio-toggle]')){audioPrefs.muted=!audioPrefs.muted;startAudio();applyAudio();}if(e.target.matches('[data-audio-fx-toggle]')){audioPrefs.fx=!audioPrefs.fx;applyAudio();}if(e.target.matches('[data-audio-voice-toggle]')){audioPrefs.voice=!audioPrefs.voice;applyAudio();}});
    root.addEventListener('click',e=>{if(!audioActive&&!audioPrefs.muted)startAudio();const target=e.target.closest('[data-bj],[data-roulette-spin]');if(target)playTone(target.dataset.bj==='settle'?520:target.dataset.bj?330:240,.09);},{capture:true});
    const content=$('#casino-content');if(content)new MutationObserver(()=>{if(activeExtra==='lobby')addLobbyCards();}).observe(content,{childList:true});
    addLobbyCards();
  }
  if(window.PO_CASINO&&!window.PO_CASINO.__expanded){
    const originalOpen=window.PO_CASINO.open.bind(window.PO_CASINO);
    window.PO_CASINO.open=(tab='lobby')=>{if(tab==='lobby')activeExtra='lobby';const result=originalOpen(tab);if(tab==='lobby')queueMicrotask(addLobbyCards);return result;};
    window.PO_CASINO.__expanded=true;
  }
  const observer=new MutationObserver(()=>{const root=$('#po-casino');if(root&&!root.dataset.expansionMounted)mount(root);});
  observer.observe(document.body,{childList:true,subtree:true});
  if($('#po-casino'))mount($('#po-casino'));
  document.addEventListener('click',e=>{if(e.target.closest('[data-casino-open]')){startAudio();setTimeout(()=>{const r=$('#po-casino');if(r&&!r.dataset.expansionMounted)mount(r);},0);}},true);
})();
