import { SophieAvatar } from './sophie-avatar.js';
import { TTS } from './tts.js';
import { Bus } from './core.js';

(() => {
  'use strict';
  if (window.__PO_CASINO_HOST__) return;
  window.__PO_CASINO_HOST__ = true;
  const $=(s,r=document)=>r.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY='po-casino-host-profile-v1';
  const defaults={rep:0,credits:180,heat:0,inventory:['badge'],missionsDone:0,missions:0,unlocked:['lobby','backroom'],history:[]};
  const load=()=>{try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{return {...defaults};}};
  let profile=load(),root=null,stage=null,activeTab='dealer',lastSpeech='',lastHeard='',speakingTimer=0,conversation=[];
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(profile));}catch{}};
  const say=t=>window.PO_CASINO?.say?.(t);
  const items=[
    {id:'badge',name:'Badge Black Room',icon:'🪪',price:0,kind:'access',desc:'Accès au vestiaire et au salon privé.',effect:'Débloque des dialogues et des missions du Lord.'},
    {id:'prop-pistol',name:'Pistolet de cinéma',icon:'🔫',price:90,kind:'prop',desc:'Réplique inerte en plastique, accessoire de tournage.',effect:'Bonus de bluff narratif : +1 réputation si une mission de poker menteur est réussie.'},
    {id:'foam-axe',name:'Hache en mousse',icon:'🪓',price:55,kind:'prop',desc:'Accessoire souple de cascade, sans fonction réelle.',effect:'Permet de relancer une épreuve de défi du Colonel.'},
    {id:'smoke-prop',name:'Fumée de scène',icon:'🌫️',price:65,kind:'prop',desc:'Effet visuel fictif pour les transitions et les entrées dramatiques.',effect:'Une fois par soirée, Sophie masque une carte commune dans un mini-jeu de bluff.'},
    {id:'x9',name:'Pilules néon X-9',icon:'💊',price:75,kind:'fiction',desc:'Substance imaginaire du lore. Aucun effet réel.',effect:'Déclenche le mode Chaos : les commentaires et événements deviennent imprévisibles.'},
    {id:'phantom',name:'Sérum Phantom',icon:'🧪',price:100,kind:'fiction',desc:'Élixir de scénario totalement inventé.',effect:'Annule une pénalité fictive sur le parcours du Colonel.'},
    {id:'case',name:'Mallette scellée',icon:'💼',price:120,kind:'mystery',desc:'Personne ne sait ce qu’elle contient. Le Lord garde la clé.',effect:'Débloque une mission secrète aléatoire.'},
    {id:'radio',name:'Radio brouillée',icon:'📻',price:80,kind:'tool',desc:'Accessoire de décor qui capte les messages du sous-sol.',effect:'Révèle un indice de mission.'},
    {id:'glasses',name:'Lunettes du Lord',icon:'🕶️',price:150,kind:'prestige',desc:'Un signe de confiance. Ou une très mauvaise idée.',effect:'Débloque le dialogue VIP et +2 réputation.'}
  ];
  const missions=[
    {id:'m1',title:'La dette du croupier',brief:'Le croupier a oublié de régler une dette. Remporte une manche de blackjack sans dépasser 21.',goal:'blackjack',reward:55,rep:2,success:'Tu as récupéré la dette. Le Lord aime les gens efficaces.'},
    {id:'m2',title:'Le numéro fantôme',brief:'La bille doit tomber sur le numéro 17. Pas de négociation.',goal:'roulette',reward:70,rep:3,success:'Le 17. Le Lord te doit un regard presque respectueux.'},
    {id:'m3',title:'Le bus de minuit',brief:'Atteins la case 56 dans le jeu du Colonel.',goal:'colonel',reward:100,rep:4,success:'Tu as traversé la route. Le Colonel connaît ton nom.'},
    {id:'m4',title:'La salle des machines',brief:'Déclenche trois tours de machine à sous.',goal:'slots',reward:45,rep:1,success:'Trois tours, zéro dignité perdue. Enfin presque.'},
    {id:'m5',title:'Le cercle privé',brief:'Invite au moins trois joueurs et termine une partie de dés.',goal:'dice',reward:65,rep:2,success:'Le cercle privé t’ouvre une porte.'},
    {id:'m6',title:'Le coffre 13',brief:'Le Lord a ouvert une mallette scellée. Gagne une manche de blackjack pour prouver que tu sais garder un secret.',goal:'blackjack',reward:140,rep:5,success:'Le coffre 13 est à toi. Le Lord ne confie jamais deux fois la même clé.'}
  ];
  function avatar(state='idle'){return SophieAvatar({size:154,state,caption:false,button:false});}
  function inject(){
    if(!root||$('#casino-host-stage',root))return;
    const el=document.createElement('section');el.id='casino-host-stage';el.className='chs-stage';el.innerHTML=
      '<div class="chs-scene"><div class="chs-scene-top"><span class="chs-live"><i></i> BLACK ROOM · EN DIRECT</span><span class="chs-room">TABLE PRIVÉE 01</span></div>'+
      '<div class="chs-dealer">'+avatar('idle')+'<div class="chs-dealer-glow"></div><div class="chs-nameplate"><b>SOPHIE</b><span>MAÎTRESSE DE CÉRÉMONIE</span></div></div>'+
      '<div class="chs-dialogue"><span class="chs-dialogue-label">SOPHIE · '+(TTS.status().active==='elevenlabs'?'ELEVENLABS':'VOIX')+'</span><p data-host-speech>« Le Lord vous souhaite une mauvaise soirée. Installez-vous. »</p><div class="chs-dialogue-meta"><span data-host-state>En attente de la table</span><span data-host-provider>Voix : '+esc(TTS.status().mode)+'</span></div></div></div>'+
      '<div class="chs-side"><div class="chs-tabs"><button data-host-tab="dealer" class="active">La salle</button><button data-host-tab="dossier">Dossier noir</button><button data-host-tab="missions">Missions</button></div>'+
      '<div class="chs-content" data-host-content></div></div>';
    const content=$('#casino-content',root);if(content)root.insertBefore(el,content);else root.append(el);stage=el;renderTab();
  }
  function renderTab(){
    if(!stage)return;stage.querySelectorAll('[data-host-tab]').forEach(b=>b.classList.toggle('active',b.dataset.hostTab===activeTab));
    const c=$('[data-host-content]',stage);if(!c)return;
    if(activeTab==='dealer'){
      const game=detectGame();c.innerHTML='<div class="chs-kicker">LE SALON EST OUVERT</div><h3>La maison a ses règles.</h3><p>Je distribue, j’annonce les cartes, je tiens le rythme. Tu peux parler naturellement : « je tire », « je reste », « mise sur le rouge », « joueur suivant »…</p>'+
      '<div class="chs-stats"><div><small>RÉPUTATION</small><b>'+profile.rep+'</b></div><div><small>CRÉDITS DU LORD</small><b>'+profile.credits+'</b></div><div><small>NIVEAU DE CHALEUR</small><b>'+profile.heat+'/5</b></div></div>'+
      '<div class="chs-now"><span>TABLE DÉTECTÉE</span><b>'+esc(game.label)+'</b><small>'+esc(game.detail)+'</small></div>'+
      '<div class="chs-quick"><button data-host-action="listen">🎙 Parler à Sophie</button><button data-host-action="repeat">↻ Répéter</button><button data-host-action="rules">Règles de la table</button></div>'+
      '<div class="chs-transcript"><small>DERNIÈRE PHRASE ENTENDUE</small><b data-host-heard>'+esc(lastHeard||'Le micro attend ton signal…')+'</b></div><div class="chs-conversation" data-host-conversation>'+conversation.slice(-5).map(m=>'<div class="'+m.role+'"><small>'+(m.role==='sophie'?'SOPHIE':'JOUEUR')+'</small><span>'+esc(m.text)+'</span></div>').join('')+'</div>';
    }else if(activeTab==='dossier'){
      c.innerHTML='<div class="chs-kicker">ARCHIVES CONFIDENTIELLES</div><h3>Le marché du sous-sol</h3><p>Chaque objet possède une utilité dans le scénario. Tout est fictif : accessoires inertes, effets de jeu et substances inventées.</p>'+
      '<div class="chs-wallet"><span>TES CRÉDITS</span><b>'+profile.credits+' ◈</b></div><div class="chs-items">'+items.map(it=>'<article class="chs-item"><span class="chs-item-icon">'+it.icon+'</span><div><b>'+it.name+'</b><small>'+it.desc+'</small><em>'+it.effect+'</em></div><strong>'+(profile.inventory.includes(it.id)?'EN POCHE':it.price+' ◈')+'</strong>'+(profile.inventory.includes(it.id)?'<button data-host-use="'+it.id+'">'+(it.kind==='prop'||it.id==='glasses'||it.id==='badge'?'Équiper':'Utiliser')+'</button>':'<button data-host-buy="'+it.id+'" '+(profile.credits<it.price?'disabled':'')+'>Acheter</button>')+'</article>').join('')+'</div>';
    }else{
      const current=profile.currentMission;const m=missions.find(x=>x.id===current);
      c.innerHTML='<div class="chs-kicker">CONTRATS DU LORD</div><h3>Une soirée, des comptes à régler.</h3><p>Les missions donnent un objectif aux parties et récompensent les joueurs avec des crédits et de la réputation fictifs.</p>'+
      (m?'<article class="chs-mission"><span>MISSION ACTIVE</span><h4>'+m.title+'</h4><p>'+m.brief+'</p><small>Récompense : '+m.reward+' ◈ · '+m.rep+' réputation</small><button data-host-action="complete-mission">Valider la mission</button></article>':'<div class="chs-mission"><span>AUCUN CONTRAT ACTIF</span><h4>Le Lord a du travail.</h4><p>Choisis un contrat pour lancer un objectif pendant ta soirée.</p><button data-host-action="mission">Recevoir une mission</button></div>')+
      '<div class="chs-history"><b>MISSIONS TERMINÉES</b><strong>'+profile.missionsDone+'</strong></div>';
    }
  }
  function detectGame(){
    const c=$('#casino-content'),t=(c?.innerText||'').toLowerCase();
    if(t.includes('blackjack'))return {id:'blackjack',label:'Blackjack Royal',detail:$('.casino-turn-info strong',c)?.textContent?'Au tour de '+$('.casino-turn-info strong',c).textContent:'Table de cartes'};
    if(t.includes('roulette'))return {id:'roulette',label:'Roulette européenne',detail:'Choisis une mise puis lance la bille'};
    if(t.includes('machine à sous')||t.includes('rouleaux'))return {id:'slots',label:'Machine à sous',detail:'Les rouleaux attendent'};
    if(t.includes('dés')||t.includes('dice'))return {id:'dice',label:'Table de dés',detail:'Les dés sont prêts'};
    if(t.includes('bataille de corona'))return {id:'colonel',label:'Bataille de Corona',detail:'Épreuve finale'};
    if(t.includes('colonel')||t.includes('pyramide')||t.includes('route du'))return {id:'colonel',label:'Le Colonel',detail:'Pyramide et route des 56 cases'};
    if(t.includes('quiz')||t.includes('épreuve'))return {id:'custom',label:'Jeu personnalisé',detail:'Épreuve en cours'};
    if(t.includes('bataille'))return {id:'highcard',label:'Bataille de cartes',detail:'La main va être révélée'};
    return {id:'lobby',label:'Salon principal',detail:'Choisis une table pour commencer'};
  }
  function logConversation(role,text){conversation.push({role,text:String(text||'')});if(conversation.length>30)conversation=conversation.slice(-30);const box=$('[data-host-conversation]',stage);if(box){box.innerHTML=conversation.slice(-5).map(m=>'<div class="'+m.role+'"><small>'+(m.role==='sophie'?'SOPHIE':'JOUEUR')+'</small><span>'+esc(m.text)+'</span></div>').join('');box.scrollTop=box.scrollHeight;}}
  function setAvatar(state){const a=$('.sophie-avatar',stage);if(a){a.classList.remove('state-idle','state-listening','state-thinking','state-speaking');a.classList.add('state-'+state);}const label=$('[data-host-state]',stage);if(label)label.textContent=({idle:'En attente',listening:'Je t’écoute',thinking:'Je réfléchis',speaking:'Je parle'}[state]||state);}
  function onSpeak(text){
    if(!stage)return;lastSpeech=String(text);logConversation('sophie',lastSpeech);const p=$('[data-host-speech]',stage);if(p)p.textContent='« '+lastSpeech+' »';
    const provider=TTS.status();const v=$('[data-host-provider]',stage);if(v)v.textContent='Voix : '+provider.active+' · '+provider.mode;
    const voiceEnabled=$('#casino-voice',root)?.checked!==false;if(voiceEnabled)document.dispatchEvent(new CustomEvent('po:casino-speaking',{detail:{active:true}}));setAvatar(voiceEnabled?'speaking':'idle');clearTimeout(speakingTimer);speakingTimer=setTimeout(()=>{setAvatar('idle');if(voiceEnabled)document.dispatchEvent(new CustomEvent('po:casino-speaking',{detail:{active:false}}));},Math.min(12000,Math.max(2200,lastSpeech.length*62)));
  }
  function currentPlayer(){return $('.casino-turn-info strong')?.textContent||$('.uc-player-strip .active')?.textContent?.split(' · ')[0]||'';}
  function click(sel){const b=$(sel);if(b&&!b.disabled){b.click();return true;}return false;}
  function clickAny(selectors){for(const sel of selectors.split(',')){if(click(sel.trim()))return true;}return false;}
  function action(text){
    const t=String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
    const game=detectGame();
    if(/\b(reste|je reste|stand|je ne tire plus|je m arrete)\b/.test(t))return click('[data-bj="stand"]');
    if(/\b(double|double la mise|je double)\b/.test(t))return click('[data-bj="double"]');
    if(/\b(tire|je tire|carte|une carte|hit|encore une)\b/.test(t)&&game.id==='blackjack')return click('[data-bj="hit"]');
    if(/\b(revele la banque|montre la banque|termine la manche)\b/.test(t))return click('[data-bj="settle"]');
    if(/\b(joueur suivant|au suivant|suivant)\b/.test(t))return clickAny('[data-bj="next"],[data-cx="dice-next"],[data-cx="custom-next"]');
    if(/\b(rouge|noir|pair|impair|plein|manque|passe|tiers|zero)\b/.test(t)&&game.id==='roulette'){
      const type=[['rouge','red'],['noir','black'],['pair','even'],['impair','odd'],['manque','low'],['plein','high']].find(([w])=>t.includes(w));
      if(type&&click('[data-roulette-type="'+type[1]+'"]'))return true;
    }
    const num=t.match(/\b(?:numero|sur le|le)\s*(\d{1,2})\b/);if(num&&game.id==='roulette'){const n=Number(num[1]);if(n>=0&&n<=36)return click('[data-roulette-pick="'+n+'"]');}
    if(/\b(lance|tourne|fait tourner|spin)\b/.test(t)){
      if(game.id==='roulette')return click('[data-roulette-spin]');
      if(game.id==='slots')return click('[data-cx="slot-spin"]');
      if(game.id==='dice')return click('[data-cx="dice-roll"]');
      if(game.id==='colonel')return click('[data-uc="roll-road"]');
    }
    if(/\b(continue|carte suivante|pyramide)\b/.test(t)&&game.id==='colonel')return click('[data-uc="pyramid-next"]');
    if(/\b(revele|reponse)\b/.test(t)&&game.id==='custom')return click('[data-cx="custom-answer"]');
    if(/\b(defi|epreuve|pioche)\b/.test(t)&&game.id==='custom')return click('[data-cx="custom-draw"]');
    if(/\b(reussite|reussi|valide)\b/.test(t)&&game.id==='custom')return click('[data-cx="custom-good"]');
    if(/\b(passe|je passe)\b/.test(t)&&game.id==='custom')return click('[data-cx="custom-pass"]');
    if(/\b(distribue|distribuer|donne les cartes)\b/.test(t)&&game.id==='highcard')return click('[data-cx="high-start"]');
    if(/\b(lance les deux des|bataille de corona)\b/.test(t)&&game.id==='colonel')return click('[data-uc="corona-roll"]');
    if(/\b(ouvre|va au|lance)\b/.test(t)){
      const route=[['blackjack','blackjack'],['roulette','roulette'],['colonel','colonel'],['lord','lord'],['machine a sous','slots'],['des','dice'],['bataille','highcard']];
      const found=route.find(([word])=>t.includes(word));
      if(found){if(found[1]==='colonel'||found[1]==='lord')return click('[data-underground="'+found[1]+'"]');if(found[1]==='blackjack'||found[1]==='roulette')return click('[data-casino-tab="'+found[1]+'"]');if(found[1]==='slots')return click('[data-casino-extra="slots"]');if(found[1]==='dice')return click('[data-casino-extra="dice"]');if(found[1]==='highcard')return click('[data-casino-extra="highcard"]');}
    }
    return false;
  }
  function handle(raw){
    lastHeard=String(raw||'');logConversation('player',lastHeard);const heard=$('[data-host-heard]',stage);if(heard)heard.textContent='« '+lastHeard+' »';setAvatar('thinking');
    const t=lastHeard.toLowerCase();
    if(/\b(aide|que puis je faire|commandes)\b/.test(t)){say('Tu peux me parler comme à une vraie croupière : tire, reste, double, mise sur le rouge, numéro 17, lance les dés, révèle la banque ou joueur suivant. Je gère la table.');return true;}
    if(/\b(regles|règles)\b/.test(t)){const g=detectGame();say(g.id==='blackjack'?'Blackjack : approche-toi de 21 sans dépasser. Tu peux tirer, rester ou doubler. La banque révèle sa carte quand tous les joueurs ont terminé.':g.id==='roulette'?'Roulette européenne : choisis une couleur, une parité ou un numéro de zéro à trente-six, puis lance la bille.':'Je suis la maîtresse de cérémonie. Les règles détaillées sont affichées sur la table.');return true;}
    if(/\b(annule|annulation|retour au salon|quitte la table)\b/.test(t)){if(click('[data-casino-tab="lobby"]')){say('On quitte la table. Le Lord garde un œil sur vous.');return true;}return false;}
    if(action(lastHeard)){return true;}
    return false;
  }
  function useItem(id){
    const consumables=['foam-axe','smoke-prop','x9','phantom','case','radio'];
    if(!profile.inventory.includes(id))return;
    if(id==='badge'){say('Le badge te donne accès au salon privé. Il est déjà actif.');return;}
    if(id==='glasses'){say('Les lunettes du Lord te donnent accès au dialogue VIP. Tu as du style. Un peu inquiétant.');return;}
    const lines={
      'prop-pistol':'Accessoire de cinéma équipé. Bonus de +1 réputation à ta prochaine mission réussie.',
      'foam-axe':'Hache en mousse prête. Une relance de dé sera disponible sur le parcours du Colonel.',
      'smoke-prop':'Fumée de scène déclenchée. Sophie lance une transition dramatique et masque le prochain indice de scénario.',
      'x9':'Mode Chaos activé. Les événements et les commentaires de Sophie deviennent imprévisibles.',
      'phantom':'Sérum Phantom fictif activé. Une pénalité de scénario sera annulée.',
      'case':'La mallette est ouverte. Un contrat secret vient d’être ajouté au dossier.',
      'radio':'La radio capte un message : « Le Lord ne fait jamais de cadeau. Vérifie toujours la dernière carte. »'
    };
    if(id==='prop-pistol'){profile.nextMissionRepBonus=1;save();renderTab();say(lines[id]);return;}
    if(id==='case'){profile.secretUnlocked=true;}
    if(consumables.includes(id)){profile.inventory=profile.inventory.filter(x=>x!==id);profile.activeEffects=profile.activeEffects||[];profile.activeEffects.push(id);save();renderTab();document.dispatchEvent(new CustomEvent('po:casino-item-use',{detail:{id}}));say(lines[id]||'Objet activé.');return;}
    say(lines[id]||'Objet équipé.');
  }
  function buy(id){
    const item=items.find(x=>x.id===id);if(!item||profile.inventory.includes(id)||profile.credits<item.price)return;
    profile.credits-=item.price;profile.inventory.push(id);if(id==='glasses')profile.rep+=2;save();renderTab();say(item.name+' ajouté à ton inventaire. Le Lord vient de faire une affaire. Enfin, surtout lui.');
  }
  function newMission(){
    const available=missions.filter(m=>m.id!==profile.lastMission&&(m.id!=='m6'||profile.secretUnlocked));const m=available[Math.floor(Math.random()*available.length)]||missions[0];profile.currentMission=m.id;profile.lastMission=m.id;profile.missions++;save();renderTab();say('Contrat du Lord : '+m.title+'. '+m.brief+' Récompense : '+m.reward+' crédits fictifs.');
  }
  function completeMission(){
    const m=missions.find(x=>x.id===profile.currentMission);if(!m)return;
    const bonus=profile.nextMissionRepBonus||0;profile.credits+=m.reward;profile.rep+=m.rep+bonus;profile.nextMissionRepBonus=0;if(m.id==='m6')profile.secretUnlocked=false;profile.missionsDone++;profile.currentMission=null;save();renderTab();say(m.success+' Tu gagnes '+m.reward+' crédits et '+(m.rep+bonus)+' réputation.');
  }
  function listen(){
    const b=$('[data-voice-start]');if(b)b.click();else say('Active le micro dans le panneau de commande vocale.');
  }
  function mount(){
    root=$('#po-casino');if(!root)return;inject();
    if(root.dataset.hostBound)return;root.dataset.hostBound='1';
    root.addEventListener('click',e=>{
      const tab=e.target.closest('[data-host-tab]');if(tab){activeTab=tab.dataset.hostTab;renderTab();return;}
      const buyBtn=e.target.closest('[data-host-buy]');if(buyBtn){buy(buyBtn.dataset.hostBuy);return;}const useBtn=e.target.closest('[data-host-use]');if(useBtn){useItem(useBtn.dataset.hostUse);return;}
      const a=e.target.closest('[data-host-action]')?.dataset.hostAction;if(!a)return;
      if(a==='listen')listen();if(a==='repeat'&&lastSpeech)say(lastSpeech);if(a==='rules')handle('règles');if(a==='mission')newMission();if(a==='complete-mission')completeMission();
    });
    const gameContent=$('#casino-content',root);
    if(gameContent&&!gameContent.dataset.hostObserved){
      gameContent.dataset.hostObserved='1';
      const gameObserver=new MutationObserver(()=>{if(activeTab==='dealer'){const now=$('[data-host-content]',stage)?.querySelector('.chs-now b');if(now){const g=detectGame();now.textContent=g.label;const small=now.nextElementSibling;if(small)small.textContent=g.detail;}}});
      gameObserver.observe(gameContent,{childList:true,subtree:true,characterData:true});
    }
    const original=window.PO_CASINO?.say;
    if(original&&!window.PO_CASINO.__hostWrapped){window.PO_CASINO.say=(text)=>{const out=original(text);onSpeak(text);return out;};window.PO_CASINO.__hostWrapped=true;}
    root.addEventListener('click',e=>{if(e.target.closest('[data-casino-tab],[data-casino-extra],[data-underground],[data-cx],[data-bj],[data-roulette-spin]'))setTimeout(()=>{if(activeTab==='dealer')renderTab();},80);});
  }
  Bus.on('tts:provider',e=>{const v=$('[data-host-provider]',stage);if(v)v.textContent='Voix active : '+(e?.provider==='elevenlabs'?'ElevenLabs · Sophie':'voix native');});
  window.PO_CASINO_HOST={handle,refresh:renderTab,get profile(){return {...profile};},mission:newMission};
  const observer=new MutationObserver(()=>mount());observer.observe(document.documentElement,{childList:true,subtree:true});if($('#po-casino'))mount();
  document.addEventListener('po:casino-voice',e=>handle(e.detail?.text||''));
  document.addEventListener('click',e=>{if(e.target.closest('[data-casino-open]'))setTimeout(mount,80);});
  document.addEventListener('po:casino-listening',e=>setAvatar(e.detail?.active?'listening':'idle'));
  document.addEventListener('po:casino-game-event',e=>{const d=e.detail||{};if(d.type==='win'){profile.credits+=Number(d.credits||20);profile.rep+=1;save();}if(d.type==='loss')profile.heat=Math.min(5,profile.heat+1);renderTab();});
})();