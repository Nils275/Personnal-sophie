/* PERSONAL OS — Casino : commandes vocales et modes de contrôle */
(() => {
  'use strict';
  const KEY='po-casino-control-mode-v1';
  const readMode=()=>{try{return localStorage.getItem(KEY)||'hybrid';}catch{return 'hybrid';}};
  let mode=readMode(),recognition=null,listening=false,restart=false,voiceSupported=false,lastTranscript='',commandBusy=false;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normal=s=>String(s||'').toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const say=t=>window.PO_CASINO?.say(t);
  function status(message,type='info'){
    const el=$('[data-casino-voice-status]');if(!el)return;
    el.textContent=message;el.dataset.state=type;
  }
  function inject(root){
    if(root.querySelector('[data-casino-control-panel]'))return;
    const panel=document.createElement('section');
    panel.className='casino-control-panel';panel.dataset.casinoControlPanel='';
    panel.innerHTML='<div class="ccp-top"><div><span class="casino-eyebrow">PILOTAGE DE LA PARTIE</span><h3>Comment veux-tu jouer ?</h3><p>Choisis ton style de commande. Tu peux le modifier à tout moment, même au milieu d’une manche.</p></div><span class="ccp-live"><i></i> SOPHIE À L’ÉCOUTE</span></div><div class="ccp-modes" role="group" aria-label="Mode de contrôle"><button type="button" data-control-mode="click"><b>⌖</b><span><strong>CLIC</strong><small>Souris / écran tactile</small></span></button><button type="button" data-control-mode="voice"><b>♫</b><span><strong>VOCAL</strong><small>Commandes à Sophie</small></span></button><button type="button" data-control-mode="hybrid"><b>◈</b><span><strong>HYBRIDE</strong><small>Clic et voix combinés</small></span></button></div><div class="ccp-voice"><div class="ccp-mic"><span class="ccp-mic-icon">🎙</span><div><strong>Commande vocale Sophie</strong><small data-casino-voice-status data-state="idle">Micro désactivé. Active-le pour parler à Sophie.</small></div></div><div class="ccp-voice-actions"><button type="button" class="casino-gold-btn" data-voice-start>Activer le micro</button><button type="button" class="casino-action" data-voice-stop disabled>Arrêter</button></div></div><details class="ccp-help"><summary>Voir les commandes vocales disponibles</summary><div class="ccp-command-grid"><span>« Ouvre le blackjack »</span><span>« Va à la roulette »</span><span>« Machine à sous »</span><span>« Lance les rouleaux »</span><span>« Tire une carte » / « Reste »</span><span>« Double la mise »</span><span>« Joueur suivant »</span><span>« Lance les dés »</span><span>« Tire une épreuve »</span><span>« Réussite » / « Je passe »</span><span>« Mise 50 »</span><span>« Répète les règles »</span><span>« Retour au salon »</span><span>« Coupe le son »</span><span>« Sophie, aide-moi »</span><span>« Arrête d’écouter »</span></div></details><div class="ccp-last" aria-live="polite"><span>DERNIÈRE COMMANDE</span><strong data-casino-last-command>En attente de ta voix…</strong></div></section>';
    const content=$('#casino-content',root);if(content)root.insertBefore(panel,content);else root.append(panel);
    updateMode(root);
  }
  function updateMode(root=$('#po-casino')){
    if(!root)return;
    root.dataset.controlMode=mode;
    root.querySelectorAll('[data-control-mode]').forEach(b=>{const on=b.dataset.controlMode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    const start=$('[data-voice-start]',root),stop=$('[data-voice-stop]',root);
    if(start)start.textContent=listening?'Micro actif · Parler':'Activer le micro';
    if(stop)stop.disabled=!listening;
    const statusEl=$('[data-casino-voice-status]',root);
    if(statusEl&&!listening&&mode==='click')status('Mode clic : toutes les commandes se font à l’écran.','idle');
    if(statusEl&&!voiceSupported)status('La reconnaissance vocale nécessite un navigateur compatible (Chrome ou Edge conseillé).','warning');
  }
  function setMode(next){
    mode=next;try{localStorage.setItem(KEY,mode);}catch{}
    updateMode();
    if(mode==='click'){stopListening();say('Mode clic activé. Utilise les boutons et les cartes pour jouer.');}
    else {say(mode==='voice'?'Mode vocal activé. Active le micro et donne-moi tes ordres.':'Mode hybride activé. Tu peux cliquer ou me parler.');}
  }
  function initRecognition(){
    const API=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!API){voiceSupported=false;updateMode();return false;}
    voiceSupported=true;
    if(recognition)return true;
    recognition=new API();recognition.lang='fr-FR';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
    recognition.onstart=()=>{listening=true;status('Je t’écoute. Parle naturellement, je m’occupe du reste.','live');updateMode();};
    recognition.onresult=e=>{
      let finalText='';
      for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)finalText+=t;}
      if(finalText.trim())handleVoice(finalText.trim());
    };
    recognition.onerror=e=>{
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){restart=false;listening=false;status('Accès au micro refusé. Autorise le microphone dans les paramètres du navigateur.','error');}
      else if(e.error==='no-speech')status('Je n’ai rien entendu. Tu peux réessayer.','warning');
      else if(e.error!=='aborted')status('Micro : '+e.error,'error');
      updateMode();
    };
    recognition.onend=()=>{listening=false;updateMode();if(restart&&mode!=='click'){setTimeout(()=>{try{recognition.start();}catch{}},350);}else if(mode!=='click')status('Micro en pause. Réactive-le pour continuer.','idle');};
    return true;
  }
  function startListening(){
    if(mode==='click')setMode('voice');
    if(!initRecognition()){status('Reconnaissance vocale non prise en charge sur ce navigateur. Essaie Chrome ou Edge.','error');return;}
    restart=true;
    try{recognition.start();}catch(e){if(e.name==='InvalidStateError')status('Le micro est déjà actif.','live');else status('Impossible de démarrer le micro : '+e.message,'error');}
  }
  function stopListening(){
    restart=false;
    if(recognition&&listening){try{recognition.stop();}catch{}}
    listening=false;updateMode();
  }
  function click(selector){
    const b=$(selector);if(b&&!b.disabled){b.click();return true;}return false;
  }
  function setStake(amount){
    const selects=['#cx-slot-stake','#cx-dice-stake','#cx-high-stake','#casino-default-bet','#roulette-stake'];
    for(const s of selects){const el=$(s);if(el){const opt=[...el.options].find(o=>Number(o.value||o.textContent)===amount);if(opt){el.value=opt.value;el.dispatchEvent(new Event('change',{bubbles:true}));return true;}}}
    return false;
  }
  function handleVoice(raw){
    const text=normal(raw);if(!text||commandBusy)return;
    commandBusy=true;setTimeout(()=>commandBusy=false,450);
    lastTranscript=raw;
    const last=$('[data-casino-last-command]');if(last)last.textContent='« '+raw+' »';
    status('Commande comprise : '+raw,'live');
    if(/\b(arrete|stop) (de )?m ecouter\b/.test(text)||text==='stop ecoute'){stopListening();say('Très bien, je coupe le micro.');return;}
    if(text.includes('aide')||text.includes('commande vocale')){say('Tu peux me demander d’ouvrir un jeu, lancer les rouleaux, tirer une carte, rester, doubler, lancer les dés, passer au joueur suivant, tirer une épreuve, valider une réussite, changer la mise ou revenir au salon.');return;}
    if((text.includes('repete')&&text.includes('regle'))||text==='les regles'){say('Blackjack : rapproche-toi de 21 sans dépasser. Roulette : choisis une mise et laisse tourner la bille. Machine à sous : aligne les symboles. Dés : le meilleur total gagne. Bataille : la carte la plus forte gagne. Dans tes jeux personnalisés, tire une épreuve et valide la réussite ou passe.');return;}
    const stake=text.match(/\b(?:mise|mise a|parie|pari)\s*(?:de\s*)?(\d+)\b/);if(stake){const n=Number(stake[1]);say(setStake(n)?'Mise réglée à '+n+' jetons fictifs.':'Je ne trouve pas de mise de '+n+' jetons sur cette table.');return;}
    if(text.includes('coupe le son')||text.includes('couper le son')||text.includes('silence musique')){if(!$('[data-audio-toggle]')?.textContent.includes('coupé'))click('[data-audio-toggle]');say('Le son est coupé. Enfin un peu de paix.');return;}
    if(text.includes('active le son')||text.includes('remets le son')||text==='musique'){if($('[data-audio-toggle]')?.textContent.includes('coupé'))click('[data-audio-toggle]');say('Ambiance rétablie. Le suspense reprend.');return;}
    const routes=[
      [/(jeu du colonel|le colonel|route du colonel)/,'[data-underground="colonel"]','Le Colonel t’attend. Essaie de ne pas finir avec toute la pyramide sur le dos.'],
      [/(le lord|rencontrer le lord|bureau du lord)/,'[data-underground="lord"]','Le Lord accepte de te recevoir. Tiens-toi correctement.'],
      [/(blackjack|vingt et un)/,'[data-casino-tab="blackjack"]','Blackjack, c’est parti. Essaie de ne pas offrir ton portefeuille à la banque.'],
      [/(roulette)/,'[data-casino-tab="roulette"]','La roulette est ouverte. Fais tes jeux.'],
      [/(machine a sous|machines a sous|jackpot|bandit manchot)/,'[data-casino-extra="slots"]','La machine à sous est prête. Fais tourner ces rouleaux.'],
      [/(des du sous sol|jeu de des|table de des)/,'[data-casino-extra="dice"]','La table des dés est ouverte.'],
      [/(bataille|jeu de cartes)/,'[data-casino-extra="highcard"]','Les cartes vont parler.'],
      [/(creer un jeu|creation de jeu|atelier du casino)/,'[data-casino-extra="creator"]','Direction l’atelier. À toi d’inventer les règles.'],
      [/(ma ludotheque|mes jeux)/,'[data-cx="custom-list"]','Voici ta ludothèque.']
    ];
    for(const [re,sel,response] of routes){if(re.test(text)){if(click(sel)){say(response);return;}}}
    const roulettePick=text.match(/(?:numero|numéro)\s*(\d{1,2})/);if(roulettePick){const n=Number(roulettePick[1]);if(n>=0&&n<=36&&click('[data-roulette-pick="'+n+'"]')){say('Tu mises sur le '+n+'.');return;}}
    const rouletteType=[['rouge','red'],['noir','black'],['pair','even'],['impair','odd'],['bas','low'],['haut','high']].find(([word])=>text.includes('mise sur le '+word)||text==='parie '+word);if(rouletteType){if(click('[data-roulette-type="'+rouletteType[1]+'"]')){say('Pari '+rouletteType[0]+' sélectionné.');return;}}
    const ucChoice=text.match(/^(rouge|noir|plus haut|plus bas|interieur|exterieur|pique|coeur|carreau|trefle)$/);
    if(ucChoice){const map={'pique':'♠','coeur':'♥','carreau':'♦','trefle':'♣'};const val=map[ucChoice[1]]||ucChoice[1].replace(/^./,c=>c.toUpperCase());const b=[...document.querySelectorAll('[data-uc-choice]')].find(x=>normal(x.dataset.ucChoice)===normal(val));if(b){b.click();say('Choix validé.');return;}}
    const actions=[
      [/(continue la pyramide|carte suivante|passe a la pyramide)/,'[data-uc="pyramid-next"]','La pyramide continue.'],
      [/(lance le de|lance le dé|avance)/,'[data-uc="roll-road"]','Le dé roule.'],
      [/(lance les deux des|bataille de corona)/,'[data-uc="corona-roll"]','Dernière épreuve.'],
      [/(titre de colonel|je suis le colonel)/,'[data-uc="finish"]','Le titre est attribué.'],
      [/(lance les rouleaux|fais tourner|lance la machine|spin)/,'[data-cx="slot-spin"]','Rouleaux lancés.'],
      [/(lance les des|lancer les des|roule les des)/,'[data-cx="dice-roll"]','Les dés sont lancés.'],
      [/(installe la table|prepare la table de des)/,'[data-cx="dice-start"]','La table de dés est installée.'],
      [/(tourne la roulette|lance la roulette)/,'[data-roulette-spin]','La bille est lancée.'],
      [/(joueur suivant|a toi|suivant)/,'[data-cx="dice-next"],[data-cx="custom-next"],[data-bj="next"]','Au suivant.'],
      [/(tirer une epreuve|nouvelle epreuve|donne moi un defi|pioche un defi)/,'[data-cx="custom-draw"]','Nouvelle épreuve. À toi de jouer.'],
      [/(reussite|defi reussi|j ai reussi)/,'[data-cx="custom-good"]','Je note la réussite. Ne prends pas trop la confiance.'],
      [/(revele la reponse|quelle est la reponse|donne la reponse)/,'[data-cx="custom-answer"]','Je révèle la réponse.'],
      [/(je passe|passer|passe mon tour)/,'[data-cx="custom-pass"]','Tu passes. Petite nature.'],
      [/(distribue|distribuer|donne les cartes)/,'[data-cx="high-start"]','Je distribue les cartes.'],
      [/(revele le gagnant|resultat|fin de manche)/,'[data-cx="dice-settle"]','Je révèle le résultat.'],
      [/(tire une carte|carte suivante|hit)/,'[data-bj="hit"]','Une carte de plus.'],
      [/(je reste|rester|stand)/,'[data-bj="stand"]','Tu restes. Voyons si c’était intelligent.'],
      [/(double la mise|doubler)/,'[data-bj="double"]','Tu doubles. Il fallait oser.'],
      [/(revele la banque|montre la banque)/,'[data-bj="settle"]','Je révèle ma main.'],
      [/(lance la partie|demarre la partie|valide la table)/,'#casino-setup-form,#cx-custom-start-form','La partie commence.'],
      [/(retour au salon|accueil|quitter la table)/,'[data-cx="home"]','Retour au salon. La maison ne ferme jamais.']
    ];
    for(const [re,sel,response] of actions){if(re.test(text)){if(sel==='#casino-setup-form,#cx-custom-start-form'){const form=$('#casino-setup-form')||$('#cx-custom-start-form');if(form){form.requestSubmit();say(response);return;}}const selectors=sel.split(',');for(const s of selectors){if(click(s)){say(response);return;}}say('Je comprends la commande, mais cette action n’est pas disponible à cette étape.');return;}}

    const players=text.match(/\bjoueurs?\s+(.+)/);if(players){const names=players[1].split(/\s+et\s+|,| puis /).map(x=>x.trim()).filter(Boolean);const input=$('#cx-custom-players')||$('#cx-dice-players')||$('#cx-high-players');if(input){input.value=names.join(', ');say('J’ai inscrit '+names.join(' et ')+'.');return;}const count=$('#casino-player-count');if(count){count.value=String(Math.max(1,Math.min(6,names.length)));count.dispatchEvent(new Event('change',{bubbles:true}));names.forEach((name,i)=>{const field=$('[name="player'+(i+1)+'"]');if(field)field.value=name.slice(0,18);});say('J’ai préparé la table pour '+names.join(' et ')+'. Dis « lance la partie » quand tu es prêt.');return;}}
    say('Je n’ai pas compris « '+raw+' ». Dis « aide » pour entendre les commandes possibles.');
  }
  function mount(root){
    inject(root);
    root.addEventListener('click',e=>{
      const modeBtn=e.target.closest('[data-control-mode]');if(modeBtn){setMode(modeBtn.dataset.controlMode);return;}
      if(e.target.closest('[data-voice-start]')){startListening();return;}
      if(e.target.closest('[data-voice-stop]')){stopListening();status('Micro arrêté.','idle');say('Je ne t’écoute plus.');}
    });
  }
  const observer=new MutationObserver(()=>{const root=$('#po-casino');if(root)mount(root);});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if($('#po-casino'))mount($('#po-casino'));
  document.addEventListener('click',e=>{if(e.target.closest('[data-casino-open]'))setTimeout(()=>{const root=$('#po-casino');if(root)mount(root);},30);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopListening();});
  window.addEventListener('pagehide',stopListening);
})();