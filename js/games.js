/* PERSONAL OS — Sophie Games
 * Jeux locaux en pass-and-play : un seul écran, les joueurs se relaient.
 * Aucun compte, serveur ou échange de données réseau requis.
 */
(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SUITS = ['♠','♥','♦','♣'], VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const state = { game:null, players:['Joueur 1','Joueur 2'], turn:0, deck:[], hands:[], dealer:[], scores:{}, question:0, custom:null, mystery:null, promptIndex:0 };
  const quiz = [
    {q:'Quel est le seul mammifère capable de voler activement ?',a:['La chauve-souris','L’écureuil volant','Le lémurien volant','Le colugo'],ok:0,why:'La chauve-souris est le seul mammifère qui vole réellement grâce à ses ailes.'},
    {q:'Combien de côtés possède un hexagone ?',a:['5','6','7','8'],ok:1,why:'Un hexagone possède six côtés.'},
    {q:'Quelle planète est la plus proche du Soleil ?',a:['Vénus','La Terre','Mercure','Mars'],ok:2,why:'Mercure est la planète la plus proche du Soleil.'},
    {q:'Dans quel sport utilise-t-on un volant ?',a:['Squash','Badminton','Tennis de table','Padel'],ok:1,why:'Le badminton se joue avec un volant.'},
    {q:'Combien de joueurs composent une équipe de football sur le terrain au début du match ?',a:['9','10','11','12'],ok:2,why:'Une équipe aligne onze joueurs sur le terrain.'}
  ];
  const mysteries = [
    {title:'Le trophée disparu',intro:'À 21 h, le trophée du club a disparu d’une pièce fermée. Trois personnes étaient présentes.',suspects:['Alex — affirme être resté à l’accueil.','Camille — dit avoir rangé les coupes à 20 h 50.','Morgan — affirme être parti à 20 h 30.'],clues:['Le système d’alarme a été désactivé à 20 h 55 avec un code valide.','La caméra montre une silhouette portant la veste du club à 20 h 58.','Morgan a rendu sa veste au vestiaire avant de partir.'],solution:1,why:'Camille avait accès à la pièce et a indiqué avoir rangé les coupes juste avant la disparition. Les indices orientent vers elle.'},
    {title:'La dernière part de gâteau',intro:'Une part de gâteau a disparu pendant une pause de dix minutes. Quatre collègues donnent leur version.',suspects:['Lina — dit avoir préparé du café.','Noé — dit être resté au téléphone.','Sam — dit avoir lavé une assiette.'],clues:['Une assiette propre est encore humide.','La personne au téléphone a un appel sortant de dix minutes.','Il manque une fourchette dans le tiroir.'],solution:2,why:'Sam reconnaît avoir lavé une assiette : il était donc près de la cuisine et a pu prendre la part.'}
  ];
  const party = [
    'Fais deviner un film sans prononcer le nom des personnages ni le titre.',
    'Chaque joueur raconte une anecdote vraie : les autres doivent repérer le détail inventé.',
    'Défi mime : fais deviner un sport automobile en 30 secondes.',
    'Tour de table : donnez chacun deux vérités et un mensonge.',
    'Impro : vends un objet banal comme s’il coûtait un million d’euros.',
    'Défi mémoire : chacun ajoute un mot à une phrase. Celui qui se trompe recommence.',
    'Décris une célébrité uniquement avec trois indices, sans dire son métier.'
  ];
  function mountButton(){
    let fab=$('#po-fab'); if(!fab){fab=document.createElement('div');fab.id='po-fab';fab.className='po-fab';document.body.appendChild(fab);}
    if(!$('#po-games-btn')){const b=document.createElement('button');b.id='po-games-btn';b.className='po-fab-btn';b.type='button';b.textContent='♠';b.title='Ouvrir Sophie Games';b.setAttribute('aria-label','Ouvrir Sophie Games');b.addEventListener('click',open);fab.appendChild(b);}
  }
  function ensureOverlay(){
    let root=$('#po-games');if(root)return root;
    root=document.createElement('div');root.id='po-games';root.className='pg';root.hidden=true;root.innerHTML='<section class="pg-card wide" role="dialog" aria-modal="true" aria-labelledby="pg-title"><header class="pg-head"><span class="pg-badge">SOPHIE GAMES</span><h2 id="pg-title">La salle de jeux</h2><button class="pg-x" data-close aria-label="Fermer">✕</button></header><div class="pg-body" id="pg-body"></div></section>';
    root.addEventListener('click',e=>{if(e.target===root||e.target.closest('[data-close]'))close();});
    root.addEventListener('click',handleClick);document.body.appendChild(root);return root;
  }
  function open(){const root=ensureOverlay();root.hidden=false;renderHome();document.body.classList.add('games-open');}
  function close(){const root=$('#po-games');if(root)root.hidden=true;document.body.classList.remove('games-open');}
  function body(){return $('#pg-body');}
  function say(text){state.lastReply=text;return text;}
  function setPlayers(){
    const raw=$('#pg-player-names')?.value||'Joueur 1, Joueur 2';
    state.players=raw.split(',').map(x=>x.trim()).filter(Boolean).slice(0,8);
    if(!state.players.length)state.players=['Joueur 1'];
    state.scores=Object.fromEntries(state.players.map(p=>[p,0]));state.turn=0;
  }
  function homeCard(id,title,desc,icon){return '<article class="pg-tile"><span class="pg-badge">'+icon+'</span><h3>'+title+'</h3><p class="pg-muted">'+desc+'</p><button class="pg-btn primary" data-start="'+id+'">Lancer</button></article>';}
  function renderHome(){
    state.game=null;
    body().innerHTML='<div class="pg-grid">'+homeCard('blackjack','Blackjack','Sophie devient croupière. Jouez chacun votre tour, à voix haute ou avec les boutons.','♠')+homeCard('quiz','Quiz','Questions, points et classement pour tous les joueurs.','?')+homeCard('mystery','Mystery','Enquête collective : indices, suspects et accusation finale.','⌕')+homeCard('party','Party','Défis, improvisations et jeux d’ambiance.','✦')+homeCard('custom','Jeu personnalisé','Décrivez une idée : Sophie prépare une règle et un premier défi.','✎')+'</div><div class="pg-tile"><h3>Joueurs autour de l’écran</h3><p class="pg-muted">Mode local : les joueurs se relaient sur cet appareil. Aucun salon en ligne ni synchronisation entre téléphones.</p><label>Noms des joueurs (séparés par une virgule)<input id="pg-player-names" type="text" value="'+esc(state.players.join(', '))+'" placeholder="Nils, Alex, Camille"></label><div class="pg-row"><button class="pg-btn" data-save-players>Enregistrer les joueurs</button><span class="pg-muted" id="pg-player-status">'+state.players.length+' joueur(s)</span></div></div>';
  }
  function card(){const suit=SUITS[Math.floor(Math.random()*4)],value=VALUES[Math.floor(Math.random()*13)];return {suit,value};}
  function shuffle(){state.deck=[];for(const suit of SUITS)for(const value of VALUES)state.deck.push({suit,value});for(let i=state.deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[state.deck[i],state.deck[j]]=[state.deck[j],state.deck[i]];}}
  function draw(){return state.deck.pop();}
  function total(hand){let sum=0,aces=0;hand.forEach(c=>{if(c.value==='A'){sum+=11;aces++;}else sum+=['K','Q','J'].includes(c.value)?10:Number(c.value);});while(sum>21&&aces){sum-=10;aces--;}return sum;}
  function cardsHTML(hand,hide=false){return '<div class="bj-cards">'+hand.map((c,i)=>hide&&i===1?'<div class="bj-card back" aria-label="Carte cachée"></div>':'<div class="bj-card '+(['♥','♦'].includes(c.suit)?'red':'')+'"><b>'+c.value+'</b><i>'+c.suit+'</i></div>').join('')+'</div>';}
  function startBlackjack(){
    state.game='blackjack';state.roundOver=false;state.bjMessage='';shuffle();state.hands=state.players.map(()=>[draw(),draw()]);state.dealer=[draw(),draw()];state.turn=0;state.bjDone=state.hands.map(()=>false);renderBlackjack();
    return say('Bienvenue au blackjack. '+state.players[state.turn]+', à toi. Tu as '+total(state.hands[state.turn])+' points. Dis « tire » ou « reste ».');
  }
  function renderBlackjack(message=''){
    const i=state.turn,player=state.players[i],hand=state.hands[i]||[],done=state.bjDone?.[i];
    body().innerHTML='<div class="bj-table"><div class="bj-bank"><span>♠ TABLE DE BLACKJACK</span><span>Tour de '+esc(player||'')+'</span></div><div class="bj-hand"><h4>LA BANQUE</h4>'+cardsHTML(state.dealer,!state.roundOver)+'<span class="bj-total">'+(state.roundOver?total(state.dealer)+' points':'Carte visible : '+total([state.dealer[0]]))+'</span></div>'+state.players.map((p,n)=>'<div class="bj-hand"><h4>'+esc(p.toUpperCase())+(n===i?' · À TOI':'')+'</h4>'+cardsHTML(state.hands[n])+'<span class="bj-total">'+total(state.hands[n])+' points'+(state.bjDone[n]?' · terminé':'')+'</span></div>').join('')+'<div class="bj-say" aria-live="polite">'+esc(message||state.bjMessage||'Choisis ton action.')+'</div><div class="bj-actions"><button class="pg-btn primary" data-bj="hit" '+(done||state.roundOver?'disabled':'')+'>Tirer une carte</button><button class="pg-btn" data-bj="stand" '+(done||state.roundOver?'disabled':'')+'>Rester</button><button class="pg-btn" data-bj="next" '+(!done||state.roundOver?'disabled':'')+'>Joueur suivant</button><button class="pg-btn" data-bj="dealer" '+(!state.bjDone?.every(Boolean)||state.roundOver?'disabled':'')+'>Terminer la manche</button><button class="pg-btn" data-bj="again">Nouvelle manche</button></div></div><p class="pg-muted">Règle : objectif 21 sans le dépasser. As = 1 ou 11, figures = 10. Partie locale, sans argent réel.</p>';
  }
  function hit(){const i=state.turn;if(state.bjDone[i]||state.roundOver)return say('Ton tour est déjà terminé.');const c=draw();state.hands[i].push(c);const t=total(state.hands[i]);if(t>=21)state.bjDone[i]=true;const msg=state.players[i]+' tire '+c.value+c.suit+'. Total : '+t+'. '+(t>21?'Tu dépasses 21.':t===21?'Blackjack !':'Tu continues ou tu restes ?');state.bjMessage=msg;renderBlackjack(msg);return say(msg);}
  function stand(){const i=state.turn;state.bjDone[i]=true;let next=state.bjDone.findIndex((v,n)=>!v&&n>i);if(next<0)next=state.bjDone.findIndex(v=>!v);if(next>=0){state.turn=next;const msg='Tu restes à '+total(state.hands[i])+'. Au tour de '+state.players[next]+'.';renderBlackjack(msg);return say(msg);}renderBlackjack('Tous les joueurs ont terminé. La banque peut jouer.');return say('Tous les joueurs ont terminé. Dis « termine la manche » ou appuie sur le bouton.');}
  function dealer(){if(!state.bjDone.every(Boolean))return say('Tous les joueurs doivent terminer leur tour avant la banque.');while(total(state.dealer)<17)state.dealer.push(draw());state.roundOver=true;const bank=total(state.dealer);const results=state.players.map((p,i)=>{const t=total(state.hands[i]);return t>21?'perd':bank>21||t>bank?'gagne':t===bank?'égalité':'perd';});const msg='La banque termine à '+bank+'. '+state.players.map((p,i)=>p+' '+results[i]+' ('+total(state.hands[i])+' points)').join('. ')+'.';renderBlackjack(msg);return say(msg);}
  function startQuiz(){state.game='quiz';state.question=0;state.scores=Object.fromEntries(state.players.map(p=>[p,0]));renderQuiz();return say('Quiz lancé ! '+state.players[state.turn]+', réponds A, B, C ou D.');}
  function renderQuiz(message=''){
    const q=quiz[state.question%quiz.length],p=state.players[state.turn];
    body().innerHTML='<div class="pg-tile"><div class="pg-bank"><span class="pg-badge">QUESTION '+(state.question+1)+'</span><span>Tour de '+esc(p)+'</span></div><p class="pg-q">'+esc(q.q)+'</p><div class="pg-answers">'+q.a.map((a,i)=>'<button data-answer="'+i+'">'+String.fromCharCode(65+i)+'. '+esc(a)+'</button>').join('')+'</div><div class="bj-say">'+esc(message||'Choisis une réponse ou réponds à voix haute.')+'</div><div class="pg-row"><button class="pg-btn" data-quiz="next">Passer la question</button><button class="pg-btn" data-quiz="home">Quitter le quiz</button></div></div>'+scoreboard();
  }
  function answer(n){const q=quiz[state.question%quiz.length],p=state.players[state.turn],ok=n===q.ok;if(ok)state.scores[p]=(state.scores[p]||0)+1;const msg=(ok?'Bonne réponse ! ':'Pas cette fois. ')+q.why;state.turn=(state.turn+1)%state.players.length;renderQuiz(msg);return say(msg+' Au tour de '+state.players[state.turn]+'.');}
  function scoreboard(){return '<div class="pg-tile"><h3>Classement</h3><ol class="pg-rank">'+state.players.slice().sort((a,b)=>(state.scores[b]||0)-(state.scores[a]||0)).map(p=>'<li><span>'+esc(p)+'</span><b>'+Number(state.scores[p]||0)+' pt(s)</b></li>').join('')+'</ol></div>';}
  function startMystery(){state.game='mystery';state.mystery=mysteries[Math.floor(Math.random()*mysteries.length)];state.mysteryStep=0;renderMystery();return say('Enquête ouverte : '+state.mystery.title+'. Je suis la maîtresse du jeu. Demandez les indices un par un.');}
  function renderMystery(message=''){
    const m=state.mystery;body().innerHTML='<div class="pg-tile"><span class="pg-badge">ENQUÊTE · '+esc(m.title)+'</span><p class="pg-q">'+esc(m.intro)+'</p><h3>Suspects</h3><ul>'+m.suspects.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><div class="pg-row"><button class="pg-btn primary" data-mystery="clue">Révéler un indice</button><button class="pg-btn" data-mystery="accuse">Faire une accusation</button></div><div class="bj-say">'+esc(message||'Discutez ensemble. Sophie peut révéler les indices.')+'</div><div class="pg-row"><button class="pg-btn" data-mystery="home">Terminer l’enquête</button></div></div>';
    if(state.mysteryStep)body().querySelector('.pg-tile').insertAdjacentHTML('beforeend','<div class="pg-tile"><h3>Indices découverts</h3><ol>'+m.clues.slice(0,state.mysteryStep).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>');
  }
  function clue(){const m=state.mystery;if(state.mysteryStep>=m.clues.length)return say('Tous les indices ont été révélés. À vous de délibérer.');const c=m.clues[state.mysteryStep++];renderMystery(c);return say('Indice numéro '+state.mysteryStep+' : '+c);}
  function accuse(){const m=state.mystery;const names=m.suspects.map(s=>s.split(' —')[0]);body().innerHTML='<div class="pg-tile"><h3>Qui est responsable ?</h3><div class="pg-grid">'+names.map((n,i)=>'<button class="pg-btn" data-suspect="'+i+'">'+esc(n)+'</button>').join('')+'</div><button class="pg-btn" data-mystery="home">Annuler</button></div>';return say('Qui accusez-vous ? Choisissez un suspect à l’écran ou dites son nom.');}
  function accuseName(n){const m=state.mystery,idx=m.suspects.findIndex(s=>s.toLowerCase().startsWith(String(n).toLowerCase()));if(idx<0)return say('Je n’ai pas reconnu ce suspect.');const ok=idx===m.solution;renderMystery((ok?'Bien joué, enquête résolue ! ':'Ce n’est pas le bon suspect. ')+m.why);return say((ok?'Exact ! ':'Pas exactement. ')+m.why);}
  function startParty(){state.game='party';state.promptIndex=0;renderParty();return say('Jeu d’ambiance lancé. Je vous donne un défi à tour de rôle.');}
  function renderParty(message=''){const p=state.players[state.turn];body().innerHTML='<div class="pg-tile"><span class="pg-badge">PARTY · DÉFI '+(state.promptIndex+1)+'</span><h3>Au tour de '+esc(p)+'</h3><p class="pg-q">'+esc(party[state.promptIndex%party.length])+'</p><div class="pg-row"><button class="pg-btn primary" data-party="next">Défi suivant</button><button class="pg-btn" data-party="done">Joueur suivant</button></div><p class="pg-muted">'+esc(message||'Sophie anime la partie. À vous de jouer !')+'</p></div>';}
  function startCustom(){state.game='custom';body().innerHTML='<div class="pg-tile"><span class="pg-badge">CRÉATEUR DE JEUX</span><h3>Quel jeu inventons-nous ?</h3><p class="pg-muted">Décris une ambiance, un thème ou une règle. Sophie prépare une activité locale à partir de ta consigne.</p><label>Ton idée<textarea id="pg-custom-prompt" placeholder="Ex. : un jeu d’enquête drôle sur le thème du rallye, pour 4 joueurs…"></textarea></label><div class="pg-row"><button class="pg-btn primary" data-custom="create">Créer le jeu</button><button class="pg-btn" data-custom="back">Retour</button></div></div>';}
  function createCustom(){const prompt=$('#pg-custom-prompt')?.value.trim();if(!prompt)return say('Décris-moi le jeu que tu veux inventer.');state.custom={prompt,round:0};state.game='custom-play';const challenge='Manche 1 — '+prompt+'. Chaque joueur dispose de 30 secondes pour proposer sa réponse ou relever le défi. Les autres votent pour la proposition la plus drôle, créative ou convaincante.';body().innerHTML='<div class="pg-tile"><span class="pg-badge">JEU PERSONNALISÉ</span><h3>'+esc(prompt)+'</h3><p class="pg-q">'+esc(challenge)+'</p><p class="pg-muted">Ordre de passage : '+esc(state.players.join(' → '))+'</p><button class="pg-btn primary" data-custom="next">Inventer une autre manche</button><button class="pg-btn" data-custom="back">Retour aux jeux</button></div>';return say('J’ai créé un jeu autour de : '+prompt+'. '+challenge);}
  function customNext(){state.custom.round++;const p=state.players[state.custom.round%state.players.length];const prompts=['Ajoute une contrainte absurde à ta proposition.','Défends ton idée comme si tu passais à la télévision.','Fais deviner ton idée sans utiliser trois mots-clés.','Les autres joueurs inventent une règle qui complique ton défi.'];const msg='Manche '+(state.custom.round+1)+' — '+p+', '+prompts[state.custom.round%prompts.length];body().querySelector('.pg-q').textContent=msg;return say(msg);}
  function start(id){setPlayers();if(id==='blackjack')return startBlackjack();if(id==='quiz')return startQuiz();if(id==='mystery')return startMystery();if(id==='party')return startParty();if(id==='custom')return startCustom();}
  function handleClick(e){
    const el=e.target.closest('button');if(!el)return;
    if(el.hasAttribute('data-start')){start(el.dataset.start);return;}
    if(el.hasAttribute('data-save-players')){setPlayers();$('#pg-player-status').textContent=state.players.length+' joueur(s) enregistré(s)';return;}
    if(el.dataset.bj==='hit'){hit();return;}if(el.dataset.bj==='stand'){stand();return;}if(el.dataset.bj==='dealer'){dealer();return;}if(el.dataset.bj==='again'){startBlackjack();return;}if(el.dataset.bj==='next'){stand();return;}
    if(el.hasAttribute('data-answer')){answer(Number(el.dataset.answer));return;}
    if(el.dataset.quiz==='next'){state.question++;renderQuiz();return;}if(el.dataset.quiz==='home'){renderHome();return;}
    if(el.dataset.mystery==='clue'){clue();return;}if(el.dataset.mystery==='accuse'){accuse();return;}if(el.dataset.mystery==='home'){renderHome();return;}if(el.hasAttribute('data-suspect')){accuseName(state.mystery.suspects[Number(el.dataset.suspect)].split(' —')[0]);return;}
    if(el.dataset.party==='next'){state.promptIndex++;state.turn=(state.turn+1)%state.players.length;renderParty();return;}if(el.dataset.party==='done'){state.turn=(state.turn+1)%state.players.length;renderParty();return;}
    if(el.dataset.custom==='create'){createCustom();return;}if(el.dataset.custom==='next'){customNext();return;}if(el.dataset.custom==='back'){renderHome();return;}
  }
  function handleCommand(command){
    const raw=String(command||'').trim(),q=raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(/(?:ouvre|lance|demarre|on joue|jouons|casino|blackjack|un jeu|des jeux)/.test(q)){
      if(/blackjack|casino/.test(q)){open();return start('blackjack');}
      if(/quiz/.test(q)){open();return start('quiz');}
      if(/mystery|enquete/.test(q)){open();return start('mystery');}
      if(/party|ambiance|defi/.test(q)){open();return start('party');}
      if(/personnalise|invent|cree.*jeu/.test(q)){open();setPlayers();const idea=raw.replace(/^(?:sophie[, ]*)?(?:invente|crée|cree|imagine|prépare|prepare)\s+(?:moi\s+)?(?:un\s+)?jeu\s*(?:sur|autour de|pour|:)?\s*/i,'').trim()||raw;state.custom={prompt:idea,round:0};state.game='custom-play';const challenge='Manche 1 — '+idea+'. Chaque joueur dispose de 30 secondes pour proposer sa réponse ou relever le défi. Les autres votent pour la proposition la plus drôle, créative ou convaincante.';body().innerHTML='<div class="pg-tile"><span class="pg-badge">JEU PERSONNALISÉ</span><h3>'+esc(idea)+'</h3><p class="pg-q">'+esc(challenge)+'</p><p class="pg-muted">Ordre de passage : '+esc(state.players.join(' → '))+'</p><button class="pg-btn primary" data-custom="next">Inventer une autre manche</button><button class="pg-btn" data-custom="back">Retour aux jeux</button></div>';return say('J’ai créé un jeu autour de : '+idea+'. '+challenge);}
      if(!state.game){open();return say('La salle de jeux est ouverte. Quel jeu choisissez-vous ?');}
    }
    if(!state.game)return null;
    if(state.game==='blackjack'){
      if(/(?:tire|carte|hit)/.test(q))return hit();
      if(/(?:reste|stand|je m arrete)/.test(q))return stand();
      if(/(?:termine|finis|banque|croupier)/.test(q)&&state.bjDone.every(Boolean))return dealer();
      if(/nouvelle manche|recommence/.test(q))return startBlackjack();
      if(/joueur suivant|suivant/.test(q)&&state.bjDone[state.turn]){return stand();}
    }
    if(state.game==='quiz'){
      const m=q.match(/(?:reponse|option|choix)?\s*([abcd])\b/);if(m)return answer(m[1].charCodeAt(0)-97);
      if(/suivante|passe|passer/.test(q)){state.question++;renderQuiz();return say('Question suivante. '+state.players[state.turn]+', à toi.');}
    }
    if(state.game==='mystery'){
      if(/indice|revele|aide/.test(q))return clue();
      if(/accuse|c est .*|je pense que/.test(q)){const found=state.mystery.suspects.map(s=>s.split(' —')[0]).find(n=>q.includes(n.toLowerCase()));if(found)return accuseName(found);return accuse();}
    }
    if(state.game==='party'&&/(suivant|autre defi|prochaine manche)/.test(q)){state.promptIndex++;state.turn=(state.turn+1)%state.players.length;renderParty();return say(party[state.promptIndex%party.length]);}
    if(state.game==='custom-play'&&/(suivant|manche suivante|autre manche)/.test(q))return customNext();
    return null;
  }
  window.PO_GAMES={open,close,start,handleCommand,get state(){return state;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountButton);else mountButton();
})();
