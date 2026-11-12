(() => {
'use strict';
if(window.__PO_MECREANTS__)return;window.__PO_MECREANTS__=true;
const $=(s,r=document)=>r.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cast=[
{id:'lord',name:'Le Lord',role:'Propriétaire du Black Room',icon:'♛',tone:'Onctueux, méprisant, intéressé par votre portefeuille.'},
{id:'comptable',name:'Marcel le Comptable',role:'Responsable des dettes',icon:'▤',tone:'Obsédé par les chiffres et les petites lignes.'},
{id:'prophete',name:'Le Prophète',role:'Consultant en prédictions douteuses',icon:'✦',tone:'Mystique, théâtral, souvent à côté de la plaque.'},
{id:'videur',name:'Dédé le Videur',role:'Sécurité du sous-sol',icon:'⬟',tone:'Littéral, susceptible, pas très subtil.'}];
const stories=[
{id:'auction',name:'La vente aux enchères',tag:'ARGENT · BLUFF',desc:'Un lot mystérieux arrive. Le Lord veut le vendre au plus offrant. Le Comptable veut surtout récupérer une vieille dette.',intro:'Le Lord pose une boîte en métal sur le tapis. « À l’intérieur : un objet qui vaut beaucoup plus que votre curiosité. Enfin, normalement. »'},
{id:'tribunal',name:'Le tribunal des mécréants',tag:'ACCUSATION · VOTE',desc:'Une enveloppe a disparu. Tout le monde est suspect. Même le Lord, ce qui l’énerve beaucoup.',intro:'Dédé claque la porte. « Personne ne sort. Une enveloppe a disparu et j’ai déjà fouillé le ficus. »'},
{id:'contrat',name:'Le contrat du sous-sol',tag:'MISSION · CHOIX',desc:'Un client anonyme propose un marché absurde. Il faut choisir qui négocie, qui observe et qui risque de tout gâcher.',intro:'Une enveloppe glisse sous la porte. À l’intérieur : une photo floue, trois jetons et un mot : « Minuit. Soyez créatifs. »'}];
const events=[
{who:'Marcel le Comptable',title:'Le rappel de Marcel',text:'Marcel débarque avec un registre épais comme un dictionnaire. Il prétend que l’un de vous lui doit 43 crédits depuis 2019.',choices:[['payer','Payer 20 crédits pour acheter la paix'],['contester','Contester la dette avec aplomb'],['fuir','Faire semblant de ne pas le connaître']]},
{who:'Le Prophète',title:'Une prédiction urgente',text:'Le Prophète annonce qu’un joueur va prendre une décision catastrophique dans les prochaines secondes.',choices:[['croire','Lui demander un indice'],['defier','Le mettre au défi'],['ignorer','L’ignorer avec élégance']]},
{who:'Dédé le Videur',title:'Quelqu’un frappe à la porte',text:'Trois coups. Dédé entrouvre. Une silhouette demande à parler au joueur qui a le moins de réputation.',choices:[['ouvrir','Laisser entrer l’inconnu'],['refuser','Refuser poliment (ou presque)'],['lord','Demander au Lord de gérer ça']]},
{who:'Le Lord',title:'Le Lord change les règles',text:'Le Lord annonce que le prochain joueur à parler devra défendre une idée ridicule pendant trente secondes.',choices:[['accepter','Accepter le défi'],['negocier','Négocier une autre règle'],['tricher','Prétendre ne pas avoir entendu']]},
{who:'Le Prophète',title:'Le pigeon prophétique',text:'Le Prophète revient avec un pigeon en origami et affirme qu’il contient un message codé.',choices:[['lire','Déplier le message'],['enchere','Mettre le pigeon aux enchères'],['garder','Le garder comme mascotte']]}];
let state=null,eventTimer=2;
const fresh=()=>({players:[],turn:0,round:0,credits:120,rep:0,heat:0,story:'',log:[],phase:'setup',event:null,decisions:0,inventory:[]});
const root=()=>$('#mc-game-root'),say=t=>window.PO_CASINO?.say?.(t),save=()=>{try{localStorage.setItem('po-mecreants-session-v1',JSON.stringify(state));}catch{}};
function log(who,text,kind=''){state.log.push({who,text,kind});state.log=state.log.slice(-30);save();}
function current(){return state.players[state.turn%state.players.length]||'Invité';}
const voiceProfiles={
 lord:{rate:.86,pitch:.72,voiceHints:/henri|thomas|paul|daniel|nicolas|male|homme|google français|français/i},
 comptable:{rate:1.12,pitch:.94,voiceHints:/thomas|paul|nicolas|daniel|male|homme|français/i},
 prophete:{rate:.92,pitch:1.08,voiceHints:/henri|daniel|paul|male|homme|français/i},
 videur:{rate:.88,pitch:.62,voiceHints:/henri|thomas|paul|male|homme|français/i},
 sophie:{rate:1,pitch:1.04,voiceHints:/amelie|audrey|marie|virginie|celine|julie|lea|female|femme|samantha|hortense/i}
};
let micArmed=false,speechQueue=Promise.resolve(),speechSequence=0;
const speakerKey=name=>{const n=String(name||'').toLowerCase();if(n.includes('lord'))return 'lord';if(n.includes('marcel')||n.includes('comptable'))return 'comptable';if(n.includes('proph'))return 'prophete';if(n.includes('dédé')||n.includes('dede')||n.includes('videur'))return 'videur';return 'sophie';};
function nativeVoiceFor(key){
 if(!('speechSynthesis'in window))return null;
 const voices=speechSynthesis.getVoices(),fr=voices.filter(v=>/^fr(?:-|_)/i.test(v.lang));
 if(!fr.length)return null;
 const female=/amelie|audrey|marie|virginie|celine|julie|lea|female|femme|samantha|hortense/i;
 const candidates=key==='sophie'?fr.filter(v=>female.test(v.name)):fr.filter(v=>!female.test(v.name));
 return candidates.find(v=>(voiceProfiles[key]||voiceProfiles.lord).voiceHints.test(v.name))||candidates[0]||fr[0];
}
function speakLine(speaker,text){
 const key=speakerKey(speaker),line=String(text||'').trim();if(!line)return Promise.resolve();
 return new Promise(resolve=>{
  let done=false;const finish=()=>{if(done)return;done=true;document.dispatchEvent(new CustomEvent('po:casino-speaking',{detail:{active:false}}));resolve();};
  document.dispatchEvent(new CustomEvent('po:casino-speaking',{detail:{active:true}}));
  if(key==='sophie'){say(line);window.setTimeout(finish,Math.max(1400,line.length*48));return;}
  if(!('speechSynthesis'in window)||!window.SpeechSynthesisUtterance){window.setTimeout(finish,Math.max(900,line.length*42));return;}
  try{const u=new SpeechSynthesisUtterance(line),profile=voiceProfiles[key],voice=nativeVoiceFor(key);if(voice)u.voice=voice;u.lang=voice?.lang||'fr-FR';u.rate=profile.rate;u.pitch=profile.pitch;u.volume=1;u.onend=finish;u.onerror=finish;speechSynthesis.speak(u);}
  catch{window.setTimeout(finish,Math.max(900,line.length*42));}
 });
}
function setMicTurn(active){
 document.dispatchEvent(new CustomEvent('po:mecreants-mic',{detail:{active:!!active&&micArmed,player:state?.players?.[state.turn]||''}}));
 const status=$('.mc-turn small',root());if(status)status.textContent=active?(micArmed?'Micro prêt : parle naturellement.':'Active le micro une fois pour jouer à la voix.'):'Écoute en pause pendant les dialogues.';
}
function speakLines(lines){
 const sequence=++speechSequence;setMicTurn(false);speechQueue=speechQueue.then(async()=>{for(const line of lines)await speakLine(line.speaker,line.text);});
 return speechQueue.then(()=>{if(sequence===speechSequence&&state?.phase==='play')setMicTurn(true);});
}
function speakTurnAfter(resultLine){
 const lines=[];if(resultLine)lines.push({speaker:'SOPHIE',text:resultLine});
 (state?.pendingDialogues||[]).forEach(line=>lines.push(line));state.pendingDialogues=[];
 if(state?.event)lines.push({speaker:state.event.who,text:state.event.text});
 lines.push({speaker:'SOPHIE',text:state?.event?'La décision vous appartient. '+current()+', qu’est-ce qu’on fait ?':current()+', c’est à toi. À toi de décider.'});
 speakLines(lines);
}
function speakCurrentTurn(){
 if(!state||state.phase!=='play')return;const lines=[];
 if(state.event)lines.push({speaker:state.event.who,text:state.event.text});
 lines.push({speaker:'SOPHIE',text:state.event?'La décision vous appartient. '+current()+', qu’est-ce qu’on fait ?':current()+', c’est à toi. Tu peux choisir à l’écran ou me répondre à voix haute.'});
 speakLines(lines);
}
function armMic(){micArmed=true;if(window.PO_CASINO_VOICE?.arm)window.PO_CASINO_VOICE.arm();else say('Le panneau vocal n’est pas encore prêt. Active le micro depuis les commandes du casino.');}
function normalizeVoice(value){return String(value||'').toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function handleVoice(raw){
 if(!state||state.phase!=='play')return false;const t=normalizeVoice(raw);if(!t)return false;let chosen=null;
 if(state.event){
  const choices=state.event.choices||[],synonyms={
   payer:/\b(paie|payer|regler|je paie|je paye)\b/,contester:/\b(conteste|contester|refuse la dette|pas d accord)\b/,fuir:/\b(fuir|je me tire|je pars|disparais)\b/,
   croire:/\b(croire|indice|j ecoute|explique)\b/,defier:/\b(defi|defier|provoque le prophete|je le provoque)\b/,ignorer:/\b(ignore|ignorer|laisse tomber)\b/,
   ouvrir:/\b(ouvre|ouvrir|laisse entrer|fais entrer)\b/,refuser:/\b(refuse|refuser|reste dehors|dehors)\b/,lord:/\b(le lord|demande au lord)\b/,
   accepter:/\b(accepte|accepter|d accord)\b/,negocier:/\b(negocie|negocier|marchander)\b/,tricher:/\b(triche|tricher|pas entendu)\b/,
   lire:/\b(lis|lire|deplie|message)\b/,enchere:/\b(encheres|enchere|vendre|vends)\b/,garder:/\b(garde|garder|mascotte)\b/
  };
  chosen=choices.find(c=>synonyms[c[0]]?.test(t))?.[0];
  const number=t.match(/\b(?:choix|option)\s*(un|1|deux|2|trois|3)\b/);
  if(!chosen&&number){const n=({un:1,1:1,deux:2,2:2,trois:3,3:3})[number[1]]-1;chosen=choices[n]?.[0];}
  if(chosen){window.PO_CASINO_VOICE?.stop?.();eventChoice(chosen);return true;}
 }else{
  const actions=[['toast',/\b(toast|commander|commande un verre|je commande)\b/],['investigate',/\b(fouille|fouiller|inspecte|boite|boite mystere|je cherche)\b/],['challenge',/\b(provoque|defie le lord|challenge le lord)\b/],['deal',/\b(negocie|negocier|marcel|marchande)\b/],['bluff',/\b(bluff|bluffer|mens|je mens)\b/],['pass',/\b(passe|passer|je passe|tour suivant)\b/]];
  chosen=actions.find(([,re])=>re.test(t))?.[0];if(chosen){window.PO_CASINO_VOICE?.stop?.();action(chosen);return true;}
 }
 if(/repete|quels choix|que puis je faire|je ne sais pas/.test(t)){say(state.event?'Tu peux dire choix 1, 2 ou 3, ou formuler ta décision.':'Tu peux commander un toast, fouiller la boîte, provoquer le Lord, négocier avec Marcel, tenter un bluff ou passer.');return true;}
 say('Je n’ai pas compris ta décision. Répète-la ou choisis directement à l’écran.');return true;
}

function renderSetup(){const el=root();if(!el)return;el.innerHTML='<div class="mc-hero"><div><span class="mc-eyebrow">UNE AVENTURE NARRATIVE · 2 À 8 JOUEURS</span><h2>LES <em>MÉCRÉANTS</em><br>DU CASINO CLANDESTIN</h2><p>Une soirée au Black Room. Des personnages douteux, des contrats absurdes, des choix collectifs et des rebondissements que personne n’avait demandés.</p><div class="mc-pills"><span>♛ LORE VIVANT</span><span>◈ CRÉDITS FICTIFS</span><span>✦ ÉVÉNEMENTS ALÉATOIRES</span></div></div><div class="mc-seal">BLACK<br><b>ROOM</b><small>EST. 1998 · À PEU PRÈS</small></div></div><div class="mc-setup-grid"><section class="mc-card"><span class="mc-eyebrow">01 / LES INVITÉS</span><h3>Qui est de la partie ?</h3><p>Inscris les prénoms dans l’ordre de jeu. Faites tourner l’écran entre chaque décision.</p><label>Joueurs (séparés par virgules)<textarea id="mc-names" rows="3">Nils, Julien</textarea></label><label>Niveau de mauvaise foi de Sophie<select id="mc-tone"><option value="1">1 · Sarcasme léger</option><option value="2" selected>2 · Méchante mais drôle</option><option value="3">3 · Aucun respect, sauf pour le Lord</option></select></label><button class="mc-quiet" data-mc="arm-mic">🎙 Autoriser le micro pour la soirée</button><small class="mc-mic-hint">Autorisation demandée une seule fois. Le micro ne s’active ensuite qu’au tour du joueur.</small><button class="mc-primary" data-mc="enter">Entrer dans le Black Room →</button></section><section class="mc-card"><span class="mc-eyebrow">02 / LES VISAGES DU SOUS-SOL</span><h3>Vous n’êtes pas seuls.</h3><div class="mc-cast">'+cast.map(p=>'<article><span>'+p.icon+'</span><div><b>'+p.name+'</b><small>'+p.role+'</small><p>'+p.tone+'</p></div><i>VOIX CLASSIQUE</i></article>').join('')+'</div></section></div><p class="mc-footnote">Jeu de rôle fictif · Les crédits et objets n’ont aucune valeur réelle.</p>';}
function start(){const names=($('#mc-names')?.value||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,8);if(names.length<2){say('Il me faut au moins deux joueurs. Même les disputes solitaires manquent de spectacle.');return;}state=fresh();state.players=names;state.tone=Number($('#mc-tone')?.value||2);state.phase='opening';log('SOPHIE','La porte du Black Room vient de s’ouvrir. Bienvenue, '+names.join(', ')+'.','intro');renderOpening();speakLines([{speaker:'SOPHIE',text:'La porte du Black Room vient de s’ouvrir. Bienvenue, '+names.join(', ')+'. Installez-vous, les mécréants.'},{speaker:'LE LORD',text:'Mes chers invités. Vous êtes ici parce que vous avez du goût, du culot, ou un très mauvais sens de l’orientation. Ce soir, le Black Room vous appartient. Enfin… tant que vous payez.'},{speaker:'SOPHIE',text:'On va éviter les présentations interminables. Vous avez des jetons, des secrets et trop de temps libre. Qu’est-ce qu’on commence ?'}]);}
function renderOpening(){const el=root();if(!el)return;el.innerHTML='<div class="mc-chapter"><span class="mc-eyebrow">CHAPITRE 01 · LE SALON OUVRE</span><h2>Bienvenue chez les <em>mécréants.</em></h2><p class="mc-narration">La porte se referme derrière vous. Le velours est usé, les lustres sont trop chers et quelqu’un a écrit « faites confiance à personne » sur le miroir des toilettes.</p><div class="mc-dialogue"><b>LE LORD</b><p>« Mes chers invités. Vous êtes ici parce que vous avez du goût, du culot, ou un très mauvais sens de l’orientation. Ce soir, le Black Room vous appartient. Enfin… tant que vous payez. »</p></div><div class="mc-dialogue mc-sophie"><b>SOPHIE</b><p>« On va éviter les présentations interminables. Vous avez des jetons, des secrets et trop de temps libre. Qu’est-ce qu’on commence ? »</p></div><div class="mc-openings"><span class="mc-eyebrow">CHOISISSEZ VOTRE PREMIÈRE HISTOIRE</span>'+stories.map(s=>'<button data-mc="story" data-story="'+s.id+'"><span>'+s.tag+'</span><b>'+s.name+'</b><small>'+s.desc+'</small><i>Choisir cette histoire →</i></button>').join('')+'</div><button class="mc-quiet" data-mc="back">← Reconfigurer les invités</button></div>';}
function begin(id){const s=stories.find(x=>x.id===id)||stories[0];state.story=id;state.phase='play';state.round=1;eventTimer=2+Math.floor(Math.random()*2);const opener=id==='tribunal'?'DÉDÉ':'LE LORD';log(opener,s.intro,'story');log('SOPHIE','Le salon vous observe. '+current()+', vous ouvrez le bal.','dialogue');renderGame();speakLines([{speaker:opener,text:s.intro},{speaker:'SOPHIE',text:'Le salon vous observe. '+current()+', vous ouvrez le bal. Choisis ton action ou réponds-moi à voix haute.'}]);}
function after(){state.pendingDialogues=[];eventTimer--;if(state.heat>=5){state.heat=2;state.credits=Math.max(0,state.credits-10);const line='On baisse d’un ton. Le Lord vous colle 10 crédits de frais de dérangement.';log('DÉDÉ',line,'event');state.pendingDialogues.push({speaker:'DÉDÉ',text:line});}if(eventTimer<=0){state.event=events[Math.floor(Math.random()*events.length)];eventTimer=2+Math.floor(Math.random()*3);log(state.event.who,state.event.text,'event');}}
function nextTurn(){setMicTurn(false);state.turn=(state.turn+1)%state.players.length;state.round++;after();save();renderGame();}
function action(id){const p=current();const data={toast:[8,0,1,'commande un toast. Le barman apporte une assiette vide et facture 8 crédits.'],investigate:[0,2,0,'inspecte la boîte : un ticket de vestiaire, un bouton doré et une photo du Lord avec une coupe mulet.'],challenge:[0,1,1,'provoque le Lord. Celui-ci sourit. C’est mauvais signe.'],deal:[15,1,0,'négocie avec Marcel et obtient 15 crédits ainsi qu’une poignée de main moite.'],bluff:[0,2,2,'lance un bluff monumental. Personne n’y croit, mais tout le monde respecte l’audace.'],pass:[0,0,-1,'passe son tour. Le groupe respecte cette décision avec un silence gênant.']}[id];if(!data)return;state.credits+=data[0];state.rep+=data[1];state.heat=Math.max(0,state.heat+data[2]);log(p,p+' '+data[3],'result');nextTurn();speakTurnAfter(p+' '+data[3]);}
function eventChoice(id){if(!state.event)return;const p=current();const outcomes={payer:[-20,0,-1,'paie 20 crédits. Marcel vérifie trois fois, puis prétend que le compte est presque bon.'],contester:[0,2,1,'conteste la dette. Marcel est outré, mais le Lord apprécie le culot.'],fuir:[0,0,2,'tente de disparaître derrière un rideau beaucoup trop petit. Dédé a tout vu.'],croire:[0,1,0,'demande un indice. Le Prophète murmure quelque chose d’incompréhensible.'],defier:[0,2,1,'met le Prophète au défi. Il prédit que vous allez regretter.'],ignorer:[5,0,0,'ignore le Prophète. Celui-ci repart vexé et laisse tomber 5 crédits.'],ouvrir:[0,1,0,'laisse entrer l’inconnu. Il dépose une enveloppe. À suivre…'],refuser:[0,0,1,'refuse l’entrée. L’inconnu repart en applaudissant lentement.'],lord:[-5,0,0,'demande au Lord de régler ça. Il vous facture 5 crédits de frais de dossier.'],accepter:[0,1,0,'accepte la règle. Le Lord note votre manque d’instinct de survie.'],negocier:[8,0,0,'négocie une compensation de 8 crédits. Le Lord déteste les bons négociateurs.'],tricher:[0,0,1,'fait semblant de ne pas entendre. Sophie vous a parfaitement entendu.'],lire:[0,1,0,'déplie le message : « Le vrai trésor est la personne qui a payé le dernier verre. »'],enchere:[12,0,0,'met le pigeon en origami aux enchères. Il est adjugé 12 crédits à un acheteur absent.'],garder:[0,0,0,'garde le pigeon en origami. Il devient la mascotte officielle du groupe.']};const o=outcomes[id]||outcomes.ignorer;state.credits=Math.max(0,state.credits+o[0]);state.rep+=o[1];state.heat=Math.max(0,state.heat+o[2]);state.event=null;log(p,p+' '+o[3],'result');nextTurn();speakTurnAfter(p+' '+o[3]);}
function renderGame(){const el=root();if(!el||!state)return;const s=stories.find(x=>x.id===state.story)||stories[0],ev=state.event;el.innerHTML='<div class="mc-game-top"><div><span class="mc-eyebrow">BLACK ROOM · CHAPITRE 01</span><h2>'+s.name+'</h2><small>'+state.players.length+' invités · Tour '+state.round+'</small></div><div class="mc-wallet"><small>CAISSE DU GROUPE</small><b>'+state.credits+' ◈</b><small>RÉPUTATION '+state.rep+' · CHALEUR '+state.heat+'/5</small></div></div><div class="mc-game-layout"><section class="mc-main-card"><div class="mc-turn"><span>À TOI DE JOUER</span><b>'+esc(current())+'</b><small>Faites tourner l’écran après chaque décision.</small></div>'+(ev?'<div class="mc-event"><span class="mc-eyebrow">✦ INTERRUPTION · '+ev.who.toUpperCase()+'</span><h3>'+ev.title+'</h3><p>'+ev.text+'</p><div class="mc-choices">'+ev.choices.map(x=>'<button data-mc="event" data-choice="'+x[0]+'">'+x[1]+'</button>').join('')+'</div></div>':'<div class="mc-scene-text"><span class="mc-eyebrow">SOPHIE VOUS OBSERVE</span><p>Le salon bruisse de conversations. Le Lord surveille ses invités, Marcel recompte les jetons et le Prophète essaie de lire l’avenir dans une rondelle de citron.</p><div class="mc-action-grid"><button data-mc="action" data-action="toast"><b>Commander un toast</b><small>+8 crédits · +1 chaleur</small></button><button data-mc="action" data-action="investigate"><b>Fouiller la boîte</b><small>+2 réputation</small></button><button data-mc="action" data-action="challenge"><b>Provoquer le Lord</b><small>+1 réputation · +1 chaleur</small></button><button data-mc="action" data-action="deal"><b>Négocier avec Marcel</b><small>+15 crédits · +1 réputation</small></button><button data-mc="action" data-action="bluff"><b>Tenter un bluff</b><small>+2 réputation · +2 chaleur</small></button><button data-mc="action" data-action="pass"><b>Passer son tour</b><small>Réduire la chaleur</small></button></div></div>')+'</section><aside class="mc-sidebar"><div class="mc-card"><span class="mc-eyebrow">LES INVITÉS</span><div class="mc-player-list">'+state.players.map((p,i)=>'<div class="'+(i===state.turn?'active':'')+'"><span>'+(i+1).toString().padStart(2,'0')+'</span><b>'+esc(p)+'</b><small>'+(i===state.turn?'À SON TOUR':'EN SALLE')+'</small></div>').join('')+'</div></div><div class="mc-card mc-log"><span class="mc-eyebrow">LE FIL DE LA SOIRÉE</span>'+state.log.slice(-8).reverse().map(l=>'<div class="mc-log-entry '+l.kind+'"><b>'+esc(l.who)+'</b><p>'+esc(l.text)+'</p></div>').join('')+'</div><div class="mc-mini-actions"><button data-mc="new-event">🎭 Provoquer un événement</button><button data-mc="end">Quitter la soirée</button></div></aside></div><div class="mc-bottom-note">Jeu de rôle fictif · Décisions locales et partagées entre les joueurs.</div>';}
function mount(){if(state?.phase==='play')renderGame();else if(state?.phase==='opening')renderOpening();else renderSetup();}
document.addEventListener('po:mecreants-mount',mount);
document.addEventListener('click',e=>{const b=e.target.closest('[data-mc]');if(!b)return;const a=b.dataset.mc;if(a==='enter')start();if(a==='arm-mic')armMic();if(a==='back'){state=fresh();renderSetup();}if(a==='story')begin(b.dataset.story);if(a==='action')action(b.dataset.action);if(a==='event')eventChoice(b.dataset.choice);if(a==='new-event'&&state?.phase==='play'){state.event=events[Math.floor(Math.random()*events.length)];log(state.event.who,state.event.text,'event');renderGame();speakCurrentTurn();}if(a==='end'){state=fresh();renderSetup();say('La soirée est terminée. Le Lord vous remercie pour votre contribution à son mobilier.');}});
document.addEventListener('po:casino-voice',e=>{const t=String(e.detail?.text||'').toLowerCase();if(/mécréants|mecreants|black room/.test(t)){const b=$('[data-host-tab="mecreants"]');if(b)b.click();}else if(/prochaine décision|à moi|mon tour/.test(t)&&state?.phase==='play')say('C’est au tour de '+current()+'. Choisissez une action à l’écran.');});
document.addEventListener('po:mecreants-mic-ready',()=>{micArmed=true;setMicTurn(state?.phase==='play');});\nwindow.PO_MECREANTS={get state(){return state?JSON.parse(JSON.stringify(state)):null;},isActive(){return state?.phase==='play';},handleVoice,open(){const b=$('[data-host-tab="mecreants"]');if(b)b.click();}};
})();