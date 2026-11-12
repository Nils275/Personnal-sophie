/* PERSONAL OS — CASINO SOPHIE
 * Casino fictif local : blackjack multijoueur et roulette européenne.
 * Aucun argent réel, aucun compte, aucun réseau. Soldes conservés sur cet appareil.
 */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY='po-casino-v1';
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{bankroll:1000,wins:0,losses:0,played:0};}catch{return {bankroll:1000,wins:0,losses:0,played:0};}};
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(account));}catch{}};
  let account=load(), players=[], game=null, turn=0, deck=[], dealer=[], hands=[], roundBets=[], outcomes=[], roundDone=[], lastMessage='', rouletteBet=null, dealerRevealed=false;
  const money=n=>Math.round(n).toLocaleString('fr-FR')+' jetons';
  const suits=['♠','♥','♦','♣'], ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const roasts=[
    'Magnifique. Même le tapis a honte de toi.',
    'Tu viens de faire un don humanitaire à la banque. Quel grand cœur.',
    'C’était pas une stratégie, c’était un appel à l’aide.',
    'La banque te remercie. Elle vient de s’offrir un yacht grâce à toi.',
    'J’ai vu des grille-pains prendre de meilleures décisions.',
    'Tu joues au blackjack ou tu distribues tes jetons par charité ?',
    'Aïe. Ton cerveau a demandé un temps mort et tu as quand même cliqué.',
    'Une performance historique. Dans le mauvais sens, évidemment.'
  ];
  const wins=[
    'Oh ? Une décision intelligente. Je vais finir par être impressionnée.',
    'Bien joué. Ne prends pas trop confiance, ça reste un coup de chance.',
    'Tu gagnes ! Note la date, ce n’est pas tous les jours.',
    'Pas mal du tout. La banque vient de perdre son sourire.'
  ];
  function roast(win){return (win?wins:roasts)[Math.floor(Math.random()*(win?wins:roasts).length)];}
  function say(text){lastMessage=text;$('#casino-announcer')?.replaceChildren(document.createTextNode(text));try{window.dispatchEvent(new CustomEvent('sophie:speak',{detail:{text}}));if(window.speechSynthesis&&$('#casino-voice')?.checked){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=1.03;speechSynthesis.speak(u);}}catch{}return text;}
  function ensure(){
    let root=$('#po-casino');if(root)return root;
    root=document.createElement('div');root.id='po-casino';root.className='casino-shell';root.hidden=true;
    root.innerHTML='<section class="casino-window" role="dialog" aria-modal="true" aria-labelledby="casino-title"><header class="casino-top"><div class="casino-brand"><span class="casino-chip-logo">♠</span><div><small>PERSONAL OS · SOPHIE</small><h2 id="casino-title">THE CASINO</h2></div></div><div class="casino-wallet"><small>PORTEFEUILLE FICTIF</small><strong id="casino-wallet-value">1 000 jetons</strong></div><button class="casino-close" data-casino-close aria-label="Fermer">×</button></header><nav class="casino-nav"><button class="active" data-casino-tab="lobby">Accueil</button><button data-casino-tab="blackjack">Blackjack</button><button data-casino-tab="roulette">Roulette</button><span class="casino-nav-spacer"></span><label class="casino-voice"><input id="casino-voice" type="checkbox" checked> Sophie parle</label></nav><main id="casino-content" class="casino-content"></main><footer class="casino-foot"><span><i></i> CASINO PRIVÉ · JETONS SANS VALEUR RÉELLE</span><span id="casino-record">0 partie · 0 victoire</span></footer></section>';
    root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('submit',onSubmit);
    root.addEventListener('click',e=>{if(e.target===root)close();});
    document.body.appendChild(root);return root;
  }
  function open(tab='lobby'){const r=ensure();r.hidden=false;document.body.classList.add('casino-open');render(tab);say('Bienvenue au casino. Ici, les jetons sont fictifs, mais les humiliations sont offertes.');}
  function close(){const r=$('#po-casino');if(r)r.hidden=true;document.body.classList.remove('casino-open');}
  function updateWallet(){const v=$('#casino-wallet-value');if(v)v.textContent=money(account.bankroll);const rec=$('#casino-record');if(rec)rec.textContent=account.played+' partie(s) · '+account.wins+' victoire(s)';}
  function tabActive(tab){document.querySelectorAll('[data-casino-tab]').forEach(b=>b.classList.toggle('active',b.dataset.casinoTab===tab));}
  function render(tab='lobby'){tabActive(tab);updateWallet();if(tab==='blackjack')renderSetup();else if(tab==='roulette')renderRoulette();else renderLobby();}
  function renderLobby(){
    $('#casino-content').innerHTML='<section class="casino-hero"><div><span class="casino-eyebrow">WELCOME TO THE TABLE</span><h1>Le hasard vous<br><em>va si bien.</em></h1><p>Installe-toi. Sophie tient la banque, distribue les cartes et ne rate aucune occasion de se moquer de tes décisions.</p><button class="casino-gold-btn" data-casino-tab="blackjack">Prendre place au blackjack <b>→</b></button></div><div class="casino-hero-art"><div class="casino-orbit"></div><div class="casino-card-art card-a">A<span>♠</span></div><div class="casino-card-art card-b">K<span>♥</span></div><div class="casino-coin-art">♛</div></div></section><section class="casino-section"><div class="casino-section-head"><div><span class="casino-eyebrow">LES TABLES</span><h3>Choisis ton jeu</h3></div><span class="casino-live">● TABLES OUVERTES</span></div><div class="casino-games"><article class="casino-game-card"><div class="game-symbol">♠</div><span class="casino-tag">CLASSIQUE</span><h4>Blackjack</h4><p>Jusqu’à 6 joueurs contre Sophie. Tire, reste, double ta mise et tente le 21.</p><button data-casino-tab="blackjack">Jouer au blackjack <b>→</b></button></article><article class="casino-game-card"><div class="game-symbol roulette-symbol">◉</div><span class="casino-tag">EUROPÉENNE · 0–36</span><h4>Roulette</h4><p>Mise sur un numéro, une couleur, pair ou impair. La bille décide de ton sort.</p><button data-casino-tab="roulette">Jouer à la roulette <b>→</b></button></article><article class="casino-game-card casino-coming"><div class="game-symbol">🎲</div><span class="casino-tag">BIENTÔT</span><h4>Dés & poker</h4><p>De nouvelles tables viendront enrichir le casino de Sophie.</p><span class="coming-label">PROCHAINEMENT</span></article></div></section><section class="casino-stats"><div><small>PORTEFEUILLE</small><strong>'+money(account.bankroll)+'</strong></div><div><small>PARTIES JOUÉES</small><strong>'+account.played+'</strong></div><div><small>VICTOIRES</small><strong>'+account.wins+'</strong></div><div><small>DÉFAITES</small><strong>'+account.losses+'</strong></div></section><div class="casino-lobby-actions"><button class="casino-quiet-btn" data-casino-reset>Réinitialiser les jetons</button><p>Les jetons sont enregistrés localement dans ce navigateur. Aucun achat, dépôt ou retrait.</p></div>';
  }
  function renderSetup(){
    $('#casino-content').innerHTML='<section class="casino-setup"><div class="casino-setup-intro"><span class="casino-eyebrow">TABLE 01 · 21</span><h1>Blackjack <em>Royal</em></h1><p>Le but : battre la banque sans dépasser 21. Sophie distribue, surveille et commente chaque décision.</p></div><form id="casino-setup-form" class="casino-setup-form"><label>Nombre de joueurs<select id="casino-player-count"><option value="1">1 joueur</option><option value="2" selected>2 joueurs</option><option value="3">3 joueurs</option><option value="4">4 joueurs</option><option value="5">5 joueurs</option><option value="6">6 joueurs</option></select></label><div id="casino-player-fields" class="casino-player-fields"><label>Joueur 1<input name="player1" value="Joueur 1" maxlength="18" required></label><label>Joueur 2<input name="player2" value="Joueur 2" maxlength="18" required></label></div><div class="casino-setup-row"><label>Mise de départ<select id="casino-default-bet"><option value="10">10 jetons</option><option value="25" selected>25 jetons</option><option value="50">50 jetons</option><option value="100">100 jetons</option></select></label><label>Style de Sophie<select id="casino-roast"><option value="spicy" selected>Sans pitié (recommandé)</option><option value="soft">Taquine</option><option value="polite">Élégante</option></select></label></div><button class="casino-gold-btn" type="submit">Lancer la partie <b>→</b></button><p class="casino-fineprint">Blackjack standard · 6 jeux de 52 cartes · blackjack payé 3:2 · croupière reste sur 17 · double autorisé sur les deux premières cartes.</p></form></section>';
    updatePlayerFields();
  }
  function updatePlayerFields(){const count=Number($('#casino-player-count')?.value||2),box=$('#casino-player-fields');if(!box)return;const old=[...box.querySelectorAll('input')].map(x=>x.value);box.innerHTML=Array.from({length:count},(_,i)=>'<label>Joueur '+(i+1)+'<input name="player'+(i+1)+'" value="'+esc(old[i]||('Joueur '+(i+1)))+'" maxlength="18" required></label>').join('');}
  function shuffledDeck(){const d=[];for(let shoe=0;shoe<6;shoe++)for(const s of suits)for(const r of ranks)d.push({s,r});for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
  function draw(){if(deck.length<20)deck=shuffledDeck();return deck.pop();}
  function points(hand){let sum=0,aces=0;for(const c of hand){if(c.r==='A'){sum+=11;aces++;}else sum+=['K','Q','J'].includes(c.r)?10:Number(c.r);}while(sum>21&&aces){sum-=10;aces--;}return sum;}
  function natural(hand){return hand.length===2&&points(hand)===21;}
  function cardHTML(c,back=false){if(back)return '<div class="casino-playing-card card-back"><span>♠</span></div>';const red=c.s==='♥'||c.s==='♦';return '<div class="casino-playing-card '+(red?'red':'')+'"><b>'+c.r+'</b><i>'+c.s+'</i><small>'+c.r+c.s+'</small></div>';}
  function startBlackjack(names,bet){
    dealerRevealed=false;players=names.map(name=>({name,bank:account.bankroll,net:0}));turn=0;deck=shuffledDeck();dealer=[draw(),draw()];hands=players.map(()=>[draw(),draw()]);roundBets=players.map(()=>bet);outcomes=players.map(()=>null);roundDone=players.map(()=>false);game='blackjack';account.played++;save();renderBlackjack();say('Les cartes sont distribuées. '+players[0].name+', à toi. Tu as '+points(hands[0])+' points. Essaie de ne pas te ridiculiser dès la première main.');}
  function renderBlackjack(message=''){
    const hidden=!dealerRevealed;
    const playerCards=players.map((p,i)=>'<article class="casino-player-seat '+(turn===i&&!roundDone[i]?'current':'')+' '+(roundDone[i]?'finished':'')+'"><div class="seat-head"><strong>'+esc(p.name)+'</strong><span>'+ (roundDone[i]?(outcomes[i]||'TERMINÉ'):'À JOUER')+'</span></div><div class="casino-cards">'+hands[i].map(c=>cardHTML(c)).join('')+'</div><div class="seat-foot"><b>'+points(hands[i])+' pts</b><span>Mise : '+money(roundBets[i])+'</span></div></article>').join('');
    $('#casino-content').innerHTML='<div class="casino-table-view"><div class="casino-table-top"><span>♠ TABLE 01 · BLACKJACK ROYAL</span><span>6 PAQUETS · BANQUE RESTE SUR 17</span></div><div class="casino-felt"><div class="dealer-area"><div class="dealer-label"><span>LA BANQUE · SOPHIE</span><b>'+ (hidden?'CARTE CACHÉE':'TOTAL '+points(dealer))+'</b></div><div class="casino-cards">'+cardHTML(dealer[0])+(hidden?cardHTML(null,true):cardHTML(dealer[1]))+(hidden?'':dealer.slice(2).map(c=>cardHTML(c)).join(''))+'</div></div><div class="casino-table-divider"><span>✦</span></div><div class="casino-seats">'+playerCards+'</div><div class="casino-table-message" id="casino-announcer" aria-live="polite">'+esc(message||'La table est à toi. Fais ton choix.')+'</div></div><div class="casino-controls"><div class="casino-turn-info"><small>JOUEUR ACTIF</small><strong>'+(players[turn]?.name||'Partie terminée')+'</strong><span>'+(players[turn]?'Main : '+points(hands[turn])+' · Mise : '+money(roundBets[turn]):'')+'</span></div><div class="casino-actions"><button class="casino-action gold" data-bj="hit" '+(roundDone[turn]||!players.length?'disabled':'')+'>Tirer</button><button class="casino-action" data-bj="stand" '+(roundDone[turn]?'disabled':'')+'>Rester</button><button class="casino-action" data-bj="double" '+(roundDone[turn]||hands[turn]?.length!==2||account.bankroll<roundBets[turn]?'disabled':'')+'>Doubler</button><button class="casino-action" data-bj="next" '+(!roundDone[turn]||turn>=players.length-1?'disabled':'')+'>Joueur suivant →</button><button class="casino-action settle" data-bj="settle" '+(!roundDone.every(Boolean)?'disabled':'')+'>Révéler la banque</button></div></div><div class="casino-rules-strip"><span>21 MAXIMUM</span><span>BLACKJACK 3:2</span><span>ÉGALITÉ = MISE RENDUE</span><span>JETONS FICTIFS</span></div></div>';
    if(!hidden&&outcomes.length)$('#casino-announcer').textContent=message||outcomes.map((o,i)=>players[i].name+' : '+o).join(' · ');
    updateWallet();
  }
  function finishPlayer(i,reason){roundDone[i]=true;outcomes[i]=reason;}
  function hit(){if(roundDone[turn])return;const c=draw();hands[turn].push(c);const t=points(hands[turn]);if(t>21){finishPlayer(turn,'BUST');renderBlackjack(players[turn].name+' dépasse 21. '+roast(false));say(players[turn].name+', '+t+' points. Tu viens de te faire sortir par tes propres cartes. '+roast(false));}else if(t===21){finishPlayer(turn,'21');renderBlackjack('21 ! Tu ne peux pas faire mieux.');say('21 ! '+players[turn].name+', tu t’arrêtes automatiquement. Pour une fois, tu as pris la bonne décision.');}else{renderBlackjack(players[turn].name+' tire '+c.r+c.s+'. Total : '+t+'.');say('Tu as '+t+'. Tu tires encore ou tu restes ?');}}
  function stand(){if(roundDone[turn])return;finishPlayer(turn,'RESTE');const old=turn;advanceTurn();renderBlackjack(players[old].name+' reste à '+points(hands[old])+' points. '+(turn!==old? 'Au tour de '+players[turn].name+'.':'Tout le monde a joué. Révèle la banque.'));say(players[old].name+' reste. '+(turn!==old?'À toi, '+players[turn].name+'.':'La banque va devoir se montrer.'));}
  function advanceTurn(){let next=roundDone.findIndex((v,i)=>!v&&i>turn);if(next<0)next=roundDone.findIndex(v=>!v);if(next>=0)turn=next;}
  function doubleDown(){if(roundDone[turn]||hands[turn].length!==2||account.bankroll<roundBets[turn])return;account.bankroll-=roundBets[turn];roundBets[turn]*=2;const c=draw();hands[turn].push(c);const t=points(hands[turn]);finishPlayer(turn,t>21?'BUST':'DOUBLE');advanceTurn();save();renderBlackjack(players[turn].name+' double. Carte reçue : '+c.r+c.s+'.');say(players[turn].name+' double la mise et reçoit '+c.r+c.s+'. '+(t>21?'Et dépasse 21. Quelle idée brillante.':'Tu joues gros. Voyons si tu sais ce que tu fais.'));}
  function settle(){
    if(!roundDone.every(Boolean))return;
    while(points(dealer)<17)dealer.push(draw());
    dealerRevealed=true;const bank=points(dealer);let lines=[];
    players.forEach((p,i)=>{const t=points(hands[i]),bet=roundBets[i],bust=t>21,playerBJ=natural(hands[i]),dealerBJ=natural(dealer);let result,returned=0;
      if(bust){result='PERDU';returned=0;account.losses++;}
      else if(playerBJ&&!dealerBJ){result='BLACKJACK';returned=Math.floor(bet*2.5);account.wins++;}
      else if(dealerBJ&&!playerBJ){result='PERDU';returned=0;account.losses++;}
      else if(bank>21||t>bank){result='GAGNÉ';returned=bet*2;account.wins++;}
      else if(t===bank){result='ÉGALITÉ';returned=bet; }
      else{result='PERDU';returned=0;account.losses++;}
      account.bankroll+=returned;outcomes[i]=result;lines.push(p.name+' : '+result+' ('+t+' points)'+(returned?' · +'+money(returned):''));});
    save();renderBlackjack('La banque termine à '+bank+'. '+lines.join(' | '));say('La banque fait '+bank+'. '+lines.join('. ')+'. '+roast(lines.some(x=>x.includes('GAGNÉ')||x.includes('BLACKJACK'))));}
  function nextRound(){const bet=Number($('#casino-next-bet')?.value||25);if(account.bankroll<bet){say('Tu n’as pas assez de jetons pour cette mise. Fais faillite avec dignité.');return;}account.bankroll-=bet;startBlackjack(players.map(p=>p.name),bet);}
  function renderRoulette(){
    const reds=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    $('#casino-content').innerHTML='<section class="roulette-view"><div class="roulette-intro"><span class="casino-eyebrow">TABLE 02 · ROULETTE EUROPÉENNE</span><h1>Faites vos jeux.</h1><p>37 cases · un zéro · aucun moyen de négocier avec la bille.</p></div><div class="roulette-wheel-wrap"><div class="roulette-wheel" id="roulette-wheel"><div class="wheel-zero">0</div><div class="wheel-center">♛</div></div><div class="roulette-result" id="roulette-result">?</div></div><div class="roulette-board"><div class="roulette-numbers">'+Array.from({length:37},(_,n)=>'<button class="roulette-number '+(n===0?'zero':reds.includes(n)?'red':'black')+'" data-roulette-pick="'+n+'">'+n+'</button>').join('')+'</div><div class="roulette-bet-types"><button data-roulette-type="red">Rouge <small>1:1</small></button><button data-roulette-type="black">Noir <small>1:1</small></button><button data-roulette-type="even">Pair <small>1:1</small></button><button data-roulette-type="odd">Impair <small>1:1</small></button><button data-roulette-type="low">1–18 <small>1:1</small></button><button data-roulette-type="high">19–36 <small>1:1</small></button></div><div class="roulette-place-bet"><label>Ta mise<select id="roulette-stake"><option>10</option><option selected>25</option><option>50</option><option>100</option></select></label><div id="roulette-choice">Choisis un numéro ou un pari extérieur.</div><button class="casino-gold-btn" data-roulette-spin disabled>Lancer la bille</button></div></div><p class="casino-fineprint">Paiements : numéro plein 35:1 · couleur, pair/impair et douzaine non inclus : 1:1 net. Les gains sont fictifs.</p></section>';
    rouletteBet=null;
  }
  function selectRoulette(type,value){const label=type==='number'?'Numéro '+value:({red:'Rouge',black:'Noir',even:'Pair',odd:'Impair',low:'1–18',high:'19–36'}[type]);rouletteBet={type,value,label};$('#roulette-choice').textContent='Pari sélectionné : '+label;$('#casino-content [data-roulette-spin]').disabled=false;document.querySelectorAll('.roulette-number,.roulette-bet-types button').forEach(b=>b.classList.remove('selected'));if(type==='number')$('[data-roulette-pick="'+value+'"]')?.classList.add('selected');else $('[data-roulette-type="'+type+'"]')?.classList.add('selected');}
  function spinRoulette(){if(!rouletteBet)return;const stake=Number($('#roulette-stake').value);if(stake>account.bankroll){say('Mise impossible : tu n’as pas assez de jetons.');return;}account.bankroll-=stake;const result=Math.floor(Math.random()*37),reds=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],color=result===0?'zero':reds.includes(result)?'red':'black';let won=false,payout=0;const b=rouletteBet;if(b.type==='number'&&result===b.value){won=true;payout=stake*36;}else if(b.type==='red'&&color==='red'||b.type==='black'&&color==='black'||b.type==='even'&&result!==0&&result%2===0||b.type==='odd'&&result%2===1||b.type==='low'&&result>=1&&result<=18||b.type==='high'&&result>=19){won=true;payout=stake*2;}account.bankroll+=payout;account.played++;if(won)account.wins++;else account.losses++;save();$('#roulette-wheel').classList.remove('spinning');void $('#roulette-wheel').offsetWidth;$('#roulette-wheel').classList.add('spinning');$('#roulette-result').textContent=result;$('#roulette-result').className='roulette-result '+color;$('#roulette-choice').textContent='Résultat : '+result+' · '+(color==='zero'?'VERT':color.toUpperCase())+' · '+(won?'GAGNÉ +'+money(payout):'PERDU');$('#casino-content [data-roulette-spin]').disabled=true;updateWallet();say(won?'Incroyable, tu gagnes '+money(payout)+'. '+roast(true):'La bille tombe sur '+result+'. Tu perds '+money(stake)+'. '+roast(false));}
  function onClick(e){
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-casino-close')){close();return;}
    if(b.dataset.casinoTab){render(b.dataset.casinoTab);return;}
    if(b.hasAttribute('data-casino-reset')){if(confirm('Réinitialiser le portefeuille fictif à 1 000 jetons ?')){account={bankroll:1000,wins:0,losses:0,played:0};save();renderLobby();updateWallet();}return;}
    if(b.dataset.bj==='hit'){hit();return;}if(b.dataset.bj==='stand'){stand();return;}if(b.dataset.bj==='double'){doubleDown();return;}
    if(b.dataset.bj==='next'){advanceTurn();renderBlackjack('Au tour de '+players[turn].name+'.');say(players[turn].name+', à toi.');return;}
    if(b.dataset.bj==='settle'){settle();return;}
    if(b.hasAttribute('data-roulette-pick')){selectRoulette('number',Number(b.dataset.roulettePick));return;}
    if(b.dataset.rouletteType){selectRoulette(b.dataset.rouletteType);return;}
    if(b.hasAttribute('data-roulette-spin')){spinRoulette();return;}
    if(b.hasAttribute('data-new-round')){nextRound();return;}
  }
  function onChange(e){if(e.target.id==='casino-player-count')updatePlayerFields();}
  function onSubmit(e){if(e.target.id!=='casino-setup-form')return;e.preventDefault();const count=Number($('#casino-player-count').value),names=Array.from({length:count},(_,i)=>e.target.elements['player'+(i+1)].value.trim()||'Joueur '+(i+1));const bet=Number($('#casino-default-bet').value);if(new Set(names.map(n=>n.toLowerCase())).size!==names.length){say('Deux joueurs portent le même nom. Même au casino, faites un effort.');return;}if(account.bankroll<bet*count){say('Il faut '+money(bet*count)+' pour installer tout le monde à cette table.');return;}account.bankroll-=bet*count;startBlackjack(names,bet); }
  document.addEventListener('click',e=>{if(e.target.closest('[data-casino-open]'))open();});
  const style=document.createElement('style');style.textContent='';document.head.appendChild(style);
  window.PO_CASINO={open,close,say,get account(){return {...account};}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('button');b.className='po-fab-btn casino-fab';b.type='button';b.dataset.casinoOpen='';b.title='Ouvrir le casino';b.textContent='♠';b.setAttribute('aria-label','Ouvrir le casino');let fab=$('#po-fab');if(!fab){fab=document.createElement('div');fab.id='po-fab';fab.className='po-fab';document.body.appendChild(fab);}fab.appendChild(b);});
  else {const b=document.createElement('button');b.className='po-fab-btn casino-fab';b.type='button';b.dataset.casinoOpen='';b.title='Ouvrir le casino';b.textContent='♠';b.setAttribute('aria-label','Ouvrir le casino');let fab=$('#po-fab');if(!fab){fab=document.createElement('div');fab.id='po-fab';fab.className='po-fab';document.body.appendChild(fab);}fab.appendChild(b);}
})();
