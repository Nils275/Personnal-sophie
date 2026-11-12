(() => {
  'use strict';
  if (window.__PO_COLONEL__) return;
  window.__PO_COLONEL__ = true;
  const $ = (s, r=document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY='po-colonel-campaign-v1', read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{wins:0,plays:0,best:0};}catch{return {wins:0,plays:0,best:0};}};
  const persist=o=>{try{localStorage.setItem(KEY,JSON.stringify(o));}catch{}};
  const say=t=>window.PO_CASINO?.say?.(t);
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const suits=['♠','♥','♦','♣'], ranks=['2','3','4','5','6','7','8','9','10','V','D','R','A'];
  const red=s=>s==='♥'||s==='♦';
  const draw=()=>({rank:pick(ranks),suit:pick(suits)});
  const value=c=>ranks.indexOf(c.rank)+2;
  let game=null,root=null,tab='colonel';
  const taunts=['Le Lord te regarde. Il n’a pas l’air impressionné.','Tu as autant de chance qu’un ticket de parking sous la pluie.','Même le croupier a eu pitié. C’est dire.','On a vu des stratégies plus solides dans une boîte de céréales.','Le Colonel ne recrute pas les touristes.','Magnifique contre-performance. Le tapis vient de perdre confiance.'];
  const lordLines=['Le Lord : « Ici, on ne pose pas de questions. On pose des jetons. »','Le Lord : « Tu veux entrer dans mon cercle ? Commence par survivre à la soirée. »','Le Lord : « Les règles sont simples. Moi, je gagne. »','Le Lord : « Ce que tu vois est un accessoire. Ce que tu perds, ce sont tes jetons. »'];
  function nav(){
    const n=$('.casino-nav');if(!n||n.dataset.colonelReady)return;n.dataset.colonelReady='1';
    const sp=n.querySelector('.casino-nav-spacer');
    [['colonel','Le Colonel'],['lord','Le Lord']].forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.dataset.underground=id;b.textContent=label;sp?n.insertBefore(b,sp):n.append(b);});
  }
  function shell(){return '<section class="uc-page"><header class="uc-heading"><div><span class="casino-eyebrow">THE BLACK ROOM · ACCÈS NON PUBLIC</span><h1>LE <em>COLONEL</em></h1><p>Un jeu de cartes, une pyramide, une route de l’enfer et une dernière épreuve. Le Lord observe. Sophie commente.</p></div><div class="uc-stamp">MEMBRE<br><b>NON AUTORISÉ</b><br>PARFAIT.</div></header>';}
  function setTab(id){
    tab=id;document.querySelectorAll('[data-underground]').forEach(b=>b.classList.toggle('active',b.dataset.underground===id));
    document.querySelectorAll('[data-casino-extra]').forEach(b=>b.classList.remove('active'));
    if(id==='colonel')renderIntro();else renderLord();
  }
  function renderIntro(){
    const stats=read(),c=$('#casino-content');if(!c)return;
    c.innerHTML=shell()+'<div class="uc-grid"><article class="uc-panel uc-main"><span class="uc-kicker">ÉPREUVE SIGNATURE · 2 À 8 JOUEURS</span><h2>La route jusqu’au Colonel</h2><p>Quatre prédictions, une pyramide impitoyable, puis un parcours de 56 cases. Le joueur qui accumule le plus de cartes prend la première sanction. Les survivants affrontent ensuite les épreuves du trajet.</p><div class="uc-metrics"><div><small>PARTIES</small><b>'+stats.plays+'</b></div><div><small>VICTOIRES</small><b>'+stats.wins+'</b></div><div><small>MEILLEUR SCORE</small><b>'+stats.best+'</b></div></div><button class="casino-gold-btn" data-uc="setup">Entrer dans le jeu →</button></article><aside class="uc-panel uc-lore"><span class="uc-kicker">MESSAGE DU LORD</span><div class="uc-quote">« '+pick(['La porte est ouverte. Ta sortie, c’est une autre histoire.','Le Colonel adore les gens qui pensent maîtriser le hasard.','Pas de vrais billets, pas de vraies armes. Juste ton ego en jeu.'])+' »</div><p>Jetons fictifs uniquement. Les accessoires du décor sont des objets de cinéma.</p><button class="casino-action" data-uc="lord">Rencontrer le Lord</button></aside></div><div class="uc-rules"><h3>Les étapes du parcours</h3><div class="uc-stage-list"><span>01 · Les quatre prédictions</span><i>→</i><span>02 · La pyramide</span><i>→</i><span>03 · Le bus</span><i>→</i><span>04 · L’accident</span><i>→</i><span>05 · L’autoroute</span><i>→</i><span>06 · Les tentes</span><i>→</i><span>07 · Bataille de Corona</span><i>→</i><b>LE COLONEL</b></div></div></section>';
  }
  function renderLord(){
    const c=$('#casino-content');if(!c)return;
    c.innerHTML=shell()+'<div class="uc-lord-layout"><div class="uc-lord-portrait"><div class="uc-silhouette">♛</div><span>PROPRIÉTAIRE · FONDATEUR · ARBITRE</span><h2>LE LORD</h2><p>Il possède les lieux, connaît les dettes et décide qui mérite une seconde chance.</p><div class="uc-quote">« '+pick(lordLines)+' »</div></div><div class="uc-panel"><span class="uc-kicker">INVENTAIRE DU SOUS-SOL</span><h2>Le marché des accessoires</h2><p>Objets fictifs et accessoires de décor : aucun objet réel, aucune substance réelle.</p><div class="uc-inventory">'+[['🧸','Pistolet à amorces','Accessoire de cinéma inerte · pure décoration','35 jetons'],['🪓','Hache en mousse','Accessoire de cascade souple','20 jetons'],['💊','Pilules néon X-9','Bonbons fictifs de scénario · effet imaginaire','15 jetons'],['🧪','Sérum Phantom','Potion fluorescente factice','25 jetons'],['📦','Malette scellée','Objet mystère sans contenu réel','50 jetons'],['🕶️','Lunettes du Lord','Objet de prestige · bonus de réputation','40 jetons'],['📻','Radio brouillée','Déclenche une mission narrative aléatoire','30 jetons'],['🪪','Badge d’accès noir','Débloque le salon privé dans le scénario','60 jetons']].map(x=>'<article><span>'+x[0]+'</span><div><b>'+x[1]+'</b><small>'+x[2]+'</small></div><strong>'+x[3]+'</strong></article>').join('')+'</div><button class="casino-action" data-uc="back">Retour au Colonel</button></div></div><div class="uc-rules"><h3>Les règles du lieu</h3><p>Les armes sont des accessoires factices, les drogues des noms inventés pour le décor et les jetons n’ont aucune valeur monétaire. Le seul risque autorisé : perdre la partie et entendre Sophie se moquer de toi.</p></div></section>';
  }
  function setup(){
    $('#casino-content').innerHTML=shell()+'<form id="uc-setup" class="uc-panel uc-form"><span class="uc-kicker">ENREGISTREMENT DES JOUEURS</span><h2>Qui ose entrer ?</h2><label>Joueurs <small>2 à 8 noms, séparés par des virgules</small><input name="players" value="Nils, Sophie" maxlength="180" required></label><div class="uc-form-row"><label>Mise d’entrée<select name="stake"><option>0</option><option>10</option><option selected>25</option><option>50</option><option>100</option></select></label><label>Mode<select name="mode"><option value="normal">Classique</option><option value="chaos">Chaos du Lord</option></select></label></div><label><input type="checkbox" name="banter" checked> Sophie commente et chambre les joueurs</label><button class="casino-gold-btn">Sceller le pacte →</button><p class="uc-note">Partie locale sur cet appareil. Les mises sont des jetons fictifs, sans argent réel.</p></form></section>';
  }
  function start(e){
    e.preventDefault();const f=new FormData(e.target),names=String(f.get('players')||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(names.length<2||names.length>8){say('Deux à huit joueurs. Même dans le chaos, il y a des limites.');return;}
    if(new Set(names.map(x=>x.toLowerCase())).size!==names.length){say('Deux joueurs portent le même nom. Changez ça.');return;}
    const stake=Number(f.get('stake')||0);if(stake>0&&stake*names.length>(window.PO_CASINO?.account?.bankroll||1000)){say('La caisse ne peut pas couvrir cette mise.');return;}
    game={names,stake,mode:f.get('mode'),banter:f.has('banter'),phase:'predictions',turn:0,players:names.map(name=>({name,hand:[],predictions:[],misses:0,position:0,penalties:0,alive:true})),deck:[],pyramid:[],row:0,col:0,history:[],started:Date.now()};
    const st=read();st.plays++;persist(st);renderPrediction();say('Le Lord ferme la porte. Quatre prédictions vous attendent. '+names[0]+', à toi.');
  }
  function current(){return game.players[game.turn];}
  function header(phase,sub){return shell()+'<div class="uc-gamebar"><span>PARTIE SCELLÉE · '+game.players.length+' JOUEURS</span><span>ÉTAPE '+phase+'</span><span>MISE '+game.stake+' JETONS</span></div><h2 class="uc-phase-title">'+sub+'</h2>';}
  const prompts=[
    {q:'Carte 1 · Rouge ou noir ?',opts:['Rouge','Noir'],test:c=>red(c.suit)?'Rouge':'Noir'},
    {q:'Carte 2 · Plus haut ou plus bas ?',opts:['Plus haut','Plus bas'],test:(c,p)=>value(c)>value(p[0].card)?'Plus haut':'Plus bas'},
    {q:'Carte 3 · Intérieur ou extérieur ?',opts:['Intérieur','Extérieur'],test:(c,p)=>{const a=Math.min(value(p[0].card),value(p[1].card)),b=Math.max(value(p[0]),value(p[1]));return value(c)>a&&value(c)<b?'Intérieur':'Extérieur';}},
    {q:'Carte 4 · Quel symbole ?',opts:suits,test:c=>c.suit}
  ];
  function renderPrediction(msg=''){
    game.phase='predictions';const p=current(),idx=p.predictions.length,pr=prompts[idx];
    if(!pr){finishPredictions();return;}
    const c=$('#casino-content');c.innerHTML=header('01 / 07','Les quatre prédictions')+'<div class="uc-table"><div class="uc-dealer"><span>LE CROUPIER DU LORD</span><div class="uc-card-back">♛</div><p>'+esc(p.name)+', annonce ton choix avant le tirage.</p></div><div class="uc-panel"><span class="uc-kicker">QUESTION '+(idx+1)+'/4</span><h3>'+pr.q+'</h3><div class="uc-choice-grid">'+pr.opts.map(o=>'<button class="uc-choice" data-uc-choice="'+esc(o)+'">'+(o==='Rouge'?'♥ ':o==='Noir'?'♠ ':o)+' </button>').join('')+'</div><p class="uc-note">Une erreur ajoute une carte à ta main. Plus tu en accumules, plus la pyramide sera dangereuse.</p><p class="uc-feedback">'+esc(msg)+'</p></div><div class="uc-player-strip">'+game.players.map((x,i)=>'<span class="'+(i===game.turn?'active':'')+'">'+esc(x.name)+' · '+x.hand.length+' carte(s)</span>').join('')+'</div></div>';
  }
  function answer(choice){
    const p=current(),i=p.predictions.length,pr=prompts[i],card=draw(),correct=choice===pr.test(card,p.predictions);
    p.predictions.push({choice,card,correct});if(!correct){p.hand.push(card);p.misses++;}
    const label=card.rank+card.suit;const msg=correct?'Bonne réponse : '+label+'. Tu t’en sors.':'Raté : '+label+'. Une carte dans ta main.';
    say((correct?'Bien joué. ':'Échec. ')+p.name+', '+(game.banter?pick(taunts):msg));
    if(p.predictions.length===4){game.turn++;if(game.turn>=game.players.length)finishPredictions();else renderPrediction(msg);}else renderPrediction(msg);
  }
  function finishPredictions(){
    game.turn=0;game.phase='pyramid';game.pyramid=Array.from({length:15},()=>draw());game.row=0;game.col=0;renderPyramid();
    say('Les quatre cartes sont jouées. La pyramide se dévoile. Vous pouvez vous débarrasser des cartes de même valeur.');
  }
  function renderPyramid(msg=''){
    const c=$('#casino-content'),p=current(),card=game.pyramid.slice(0,game.row+1).at(-1);
    const rows=[1,2,3,4,5];let n=0,html='';
    rows.forEach((len,r)=>{html+='<div class="uc-pyramid-row">'+Array.from({length:len},()=>{const i=n++,revealed=i<game.row+1,cc=game.pyramid[i];return '<div class="uc-mini-card '+(revealed?(red(cc.suit)?'red':''):'hidden')+'">'+(revealed?cc.rank+cc.suit:'♛')+'</div>';}).join('')+'</div>';});
    c.innerHTML=header('02 / 07','La pyramide des dettes')+'<div class="uc-panel"><div class="uc-pyramid">'+html+'</div><div class="uc-pyramid-current"><span>CARTE RÉVÉLÉE</span><b class="uc-mini-card '+(red(card.suit)?'red':'')+'">'+card.rank+card.suit+'</b><p>Tour de '+esc(p.name)+' · '+(game.row+1)+'/15</p></div><div class="uc-hand"><span>TA MAIN</span>'+p.hand.map((x,i)=>'<button class="uc-mini-card '+(red(x.suit)?'red':'')+'" data-uc-discard="'+i+'" title="Défausser cette carte">'+x.rank+x.suit+'</button>').join('')+(p.hand.length?'':'<em>Aucune carte en main</em>')+'</div><p class="uc-note">Défausse une carte de même valeur que la carte révélée. Si tu ne peux pas, pioche une carte de dette.</p><p class="uc-feedback">'+esc(msg)+'</p><button class="casino-gold-btn" data-uc="pyramid-next">Continuer la pyramide →</button></div><div class="uc-player-strip">'+game.players.map(x=>'<span>'+esc(x.name)+' · '+x.hand.length+' carte(s)</span>').join('')+'</div>';
  }
  function discard(i){
    const p=current(),target=game.pyramid[game.row];if(p.hand[i]&&p.hand[i].rank===target.rank){p.hand.splice(i,1);say('Carte assortie. Tu effaces une dette.');renderPyramid('Bonne valeur : une carte en moins.');}else{say('Cette carte ne correspond pas. Essaie encore.');}
  }
  function pyramidNext(){
    const p=current(),card=game.pyramid[game.row];if(!p.hand.some(x=>x.rank===card.rank)){p.hand.push(draw());say(p.name+', aucune correspondance. Une carte de dette supplémentaire.');}
    game.row++;if(game.row>=15){finishPyramid();return;}
    game.turn=(game.turn+1)%game.players.length;renderPyramid();
  }
  function finishPyramid(){
    const sorted=game.players.slice().sort((a,b)=>b.hand.length-a.hand.length);game.loser=sorted[0];game.phase='bus';game.turn=game.players.indexOf(game.loser);
    renderRoad('La pyramide est terminée. '+game.loser.name+' possède '+game.loser.hand.length+' cartes : c’est le premier condamné.');
    say(game.loser.name+', tu as le plus de cartes. Le bus t’attend. Pas de négociation avec le Lord.');
  }
  const roadNames=['Départ du dépôt','Contrôle du videur','Le bus de nuit','Contrôle surprise','Accident de parcours','Détour obligatoire','Station-service','L’autoroute','Péage du Lord','Sortie manquée','Aire de repos','Les tentes','Campement discret','Radio brouillée','Bataille de Corona','Dernière ligne droite','Le Colonel'];
  const events=[
    ['Le videur te fouille','Tu perds 1 jeton fictif de réputation.',-1],['Un raccourci douteux','Avance de 2 cases.',2],['Panne du bus','Recule d’une case.',-1],['Le Lord t’accorde un passe-droit','Avance de 3 cases.',3],['Contrôle de routine','Passe un tour.',0],['Une malette mystérieuse','Gagne 2 points de réputation.',2],['La radio grésille','Recule de 2 cases.',-2],['Le chauffeur connaît la route','Avance de 1 case.',1],['Embouteillage','Rien ne se passe. Le suspense, c’est déjà ça.',0],['Le Colonel te remarque','Avance de 2 cases.',2]
  ];
  function renderRoad(msg=''){
    game.phase='road';const p=current(),c=$('#casino-content'),pos=p.position;
    const milestones={1:'Départ',8:'Bus',15:'Accident',22:'Autoroute',29:'Péage',36:'Tentes',43:'Camp',50:'Corona',56:'Colonel'};const cells=Array.from({length:56},(_,i)=>{const n=i+1,player=game.players.filter(x=>x.position===n).map(x=>x.name).join(', '),milestone=milestones[n];return '<div class="uc-road-cell '+(n===pos?'current':'')+' '+(milestone?'milestone':'')+' '+(n%7===0?'event':'')+'" title="'+(milestone||('Case '+n))+'"><small>'+n+'</small><b>'+(n===56?'♛':milestone?'✦':'·')+'</b>'+(milestone?'<em>'+milestone+'</em>':'')+(player?'<i>'+esc(player)+'</i>':'')+'</div>';}).join('');
    c.innerHTML=header('03–06 / 07','La route du Colonel')+'<div class="uc-road-info"><div><span>JOUEUR ACTIF</span><b>'+esc(p.name)+'</b></div><div><span>POSITION</span><b>'+pos+'/56</b></div><div><span>RÉPUTATION</span><b>'+p.penalties+' pt(s)</b></div></div><div class="uc-road-board">'+cells+'</div><div class="uc-panel"><p class="uc-feedback">'+esc(msg||'Lance le dé et découvre ce que la route te réserve.')+'</p><div class="uc-dice-display" id="uc-die">⚄</div><button class="casino-gold-btn" data-uc="roll-road">Lancer le dé</button><p class="uc-note">Cases spéciales tous les 7 emplacements. Arrivée au 56 : Le Colonel.</p></div><div class="uc-player-strip">'+game.players.map(x=>'<span>'+esc(x.name)+' · case '+x.position+'</span>').join('')+'</div>';
  }
  function rollRoad(){
    const p=current(),roll=1+Math.floor(Math.random()*6);p.position=Math.min(56,p.position+roll);let msg=p.name+' lance '+roll+' et arrive case '+p.position+'.';
    const ev=p.position%7===0?pick(events):null;if(ev){msg+=' '+ev[0]+' — '+ev[1];p.penalties=Math.max(0,p.penalties+(ev[2]<0?1:ev[2]));p.position=Math.max(0,Math.min(56,p.position+ev[2]));}
    const die=$('#uc-die');if(die)die.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][roll-1];
    if(p.position>=56){renderCorona(msg+' Tu atteins le dernier défi.');say(msg+' La Bataille de Corona commence.');return;}
    const idx=game.players.indexOf(p);let next=(idx+1)%game.players.length;let loops=0;while(game.players[next].position>=56&&loops++<game.players.length)next=(next+1)%game.players.length;game.turn=next;renderRoad(msg);say(msg+(game.banter?' '+pick(taunts):''));
  }
  function renderCorona(msg=''){
    game.phase='corona';const p=current();$('#casino-content').innerHTML=header('07 / 07','La Bataille de Corona')+'<div class="uc-corona"><div class="uc-corona-banner">CORONA · ÉPREUVE FINALE</div><h2>Un dernier face-à-face.</h2><p>'+esc(msg||'Chaque joueur lance deux dés. Le meilleur total obtient le titre de Colonel.')+'</p><div class="uc-player-strip">'+game.players.map((x,i)=>'<span>'+esc(x.name)+' · '+(x.finalRoll||'en attente')+'</span>').join('')+'</div><button class="casino-gold-btn" data-uc="corona-roll">Lancer les deux dés</button><div id="uc-corona-result"></div></div>';
  }
  function coronaRoll(){
    game.players.forEach(p=>{if(!p.finalRoll)p.finalRoll=1+Math.floor(Math.random()*6)+1+Math.floor(Math.random()*6);});
    const winner=game.players.slice().sort((a,b)=>b.finalRoll-a.finalRoll)[0];game.winner=winner;
    $('#uc-corona-result').innerHTML='<h3>'+esc(winner.name)+' remporte la Bataille de Corona avec '+winner.finalRoll+'.</h3><p>'+game.players.map(p=>esc(p.name)+': '+p.finalRoll).join(' · ')+'</p><button class="casino-gold-btn" data-uc="finish">Prendre le titre de Colonel</button>';
    say(winner.name+', victoire ! Le Lord vient de perdre son sourire.');
  }
  function finish(){
    const stats=read();stats.wins++;stats.best=Math.max(stats.best,game.winner?.finalRoll||0);persist(stats);
    $('#casino-content').innerHTML=shell()+'<div class="uc-champion"><span>LE TITRE EST ATTRIBUÉ</span><div>♛</div><h2>'+esc(game.winner?.name||'Le survivant')+'</h2><p>COLONEL DE LA BLACK ROOM</p><blockquote>« Le Lord se souviendra de cette soirée. Les autres essaieront de l’oublier. »</blockquote><button class="casino-gold-btn" data-uc="setup">Rejouer</button><button class="casino-action" data-uc="home">Retour au casino</button></div></section>';
    say('La partie est terminée. '+game.winner.name+' est le Colonel. Respect. Enfin, un peu.');
  }
  function click(e){
    const b=e.target.closest('[data-underground],[data-uc],[data-uc-choice],[data-uc-discard]');if(!b)return;
    if(b.dataset.underground){e.preventDefault();e.stopPropagation();setTab(b.dataset.underground);return;}
    if(b.dataset.ucChoice){answer(b.dataset.ucChoice);return;}
    if(b.dataset.ucDiscard!==undefined){discard(Number(b.dataset.ucDiscard));return;}
    const a=b.dataset.uc;
    if(a==='setup')setup();if(a==='lord')setTab('lord');if(a==='back')setTab('colonel');
    if(a==='pyramid-next')pyramidNext();if(a==='roll-road')rollRoad();if(a==='corona-roll')coronaRoll();if(a==='finish')finish();
    if(a==='home')window.PO_CASINO?.open('lobby');
  }
  function mount(r){if(r.dataset.undergroundMounted)return;r.dataset.undergroundMounted='1';root=r;nav();r.addEventListener('click',click);r.addEventListener('submit',e=>{if(e.target.id==='uc-setup')start(e);});}
  const obs=new MutationObserver(()=>{const r=$('#po-casino');if(r&&!r.dataset.undergroundMounted)mount(r);});
  obs.observe(document.body,{childList:true,subtree:true});if($('#po-casino'))mount($('#po-casino'));
  document.addEventListener('click',e=>{if(e.target.closest('[data-casino-open]'))setTimeout(()=>{const r=$('#po-casino');if(r&&!r.dataset.undergroundMounted)mount(r);},0);});
})();