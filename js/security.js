import { Camera } from './camera.js';
import { Bus } from './core.js';
const KEY='po-security-captures-v1', MAX=18, $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let captures=[]; try{captures=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(captures))captures=[];}catch{}
let filter='all';
function save(){try{localStorage.setItem(KEY,JSON.stringify(captures));return true;}catch{captures=captures.slice(0,Math.max(2,captures.length-4));try{localStorage.setItem(KEY,JSON.stringify(captures));return true;}catch{toast('Stockage local saturé. Supprime quelques captures.','error');return false;}}}
function toast(message,type){const root=$('#toast-root');if(!root)return;const n=document.createElement('div');n.className='toast '+(type||'');n.textContent=message;root.append(n);setTimeout(()=>n.remove(),4500);}
function date(v){return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'medium'}).format(new Date(v));}
function onMotion(e){
 if(!Camera.armed||!Camera.video||Camera.video.readyState<2||!Camera.video.videoWidth)return;
 const c=document.createElement('canvas'),scale=Math.min(1,800/Camera.video.videoWidth);
 c.width=Math.round(Camera.video.videoWidth*scale);c.height=Math.round(Camera.video.videoHeight*scale);
 try{c.getContext('2d').drawImage(Camera.video,0,0,c.width,c.height);
  captures.unshift({id:'m'+Date.now()+Math.random().toString(36).slice(2,6),time:e.detail?.timestamp||Date.now(),label:e.detail?.label||Camera.label,image:c.toDataURL('image/jpeg',.65)});
  captures=captures.slice(0,MAX);if(save()){gallery();toast('Mouvement détecté : capture enregistrée sur cet appareil.');}
 }catch(err){console.warn('Capture webcam impossible',err);toast('La détection a eu lieu, mais la capture a échoué.','error');}
 c.width=0;c.height=0;
}
function ensure(){
 let root=$('#po-security');if(root)return root;
 root=document.createElement('div');root.id='po-security';root.className='security-shell';root.hidden=true;
 root.innerHTML='<section class="security-window" role="dialog" aria-modal="true"><header><div><small>PERSONAL OS · PROTECTION LOCALE</small><h2>Sécurité & surveillance</h2></div><button data-sec="close" aria-label="Fermer">×</button></header><main class="security-body"><section class="security-state"><div><small>ÉTAT DU SYSTÈME</small><strong id="sec-state">Alarme désactivée</strong><p id="sec-detail">La webcam est arrêtée.</p></div><i id="sec-led"></i><div class="security-controls"><button data-sec="arm">Activer la surveillance</button><button data-sec="disarm">Arrêter</button></div></section><section><div class="security-title"><div><small>CAMÉRA 01</small><h3>Flux webcam</h3></div><span id="sec-live">HORS LIGNE</span></div><div class="security-preview" data-camera-slot><p>Le flux webcam apparaîtra ici après activation.</p></div><p class="security-privacy">Les captures restent dans le stockage local de cet appareil. Aucune image n’est envoyée sur Internet.</p></section><section><div class="security-title"><div><small>JOURNAL DES ÉVÉNEMENTS</small><h3>Captures de mouvement <b id="sec-count">0</b></h3></div><div class="security-filters"><select id="sec-filter"><option value="all">Toutes</option><option value="today">Aujourd’hui</option><option value="week">7 jours</option></select><button data-sec="clear">Tout supprimer</button></div></div><div class="security-gallery" id="sec-gallery"></div></section></main><footer><span>STOCKAGE LOCAL · JPEG</span><span id="sec-total"></span></footer></section>';
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 root.addEventListener('click',e=>{if(e.target===root)close();});document.body.append(root);return root;
}
function open(){const r=ensure();r.hidden=false;document.body.classList.add('security-open');Camera.mount();status();gallery();}
function close(){const r=$('#po-security');if(r)r.hidden=true;document.body.classList.remove('security-open');Camera.mount();}
function status(){
 const state=Camera.status,active=Camera.armed;
 const s=$('#sec-state');if(!s)return;
 s.textContent=state==='live'?'Surveillance active':state==='starting'?'Démarrage…':state==='error'?'Caméra indisponible':'Alarme désactivée';
 $('#sec-detail').textContent=state==='error'?Camera.error:active?'Détection de mouvement active. Les images sont enregistrées localement.':'La webcam est arrêtée. Aucune image n’est capturée.';
 $('#sec-led').classList.toggle('active',active);$('#sec-live').textContent=active?'EN DIRECT':state==='error'?'ERREUR':'HORS LIGNE';
 $('[data-sec="arm"]').disabled=active;$('[data-sec="disarm"]').disabled=!active;
 $('#sec-count').textContent=captures.length;
}
function gallery(){
 const root=$('#sec-gallery');if(!root)return;
 const now=new Date(),items=captures.filter(x=>filter==='today'?new Date(x.time).toDateString()===now.toDateString():filter==='week'?now-x.time<=7*86400000:true);
 $('#sec-count').textContent=captures.length;$('#sec-total').textContent=captures.length+' capture(s) conservée(s)';
 root.innerHTML=items.length?items.map(x=>'<article><button class="sec-image" data-view="'+esc(x.id)+'"><img src="'+x.image+'" alt="Capture de mouvement"><span>AGRANDIR ↗</span></button><div class="sec-meta"><strong>'+esc(x.label)+'</strong><time>'+esc(date(x.time))+'</time><div><button data-download="'+esc(x.id)+'">Télécharger</button><button data-delete="'+esc(x.id)+'">Supprimer</button></div></div></article>').join(''):'<div class="sec-empty"><strong>Aucune capture pour le moment</strong><p>Active la surveillance : chaque mouvement détecté créera une image.</p></div>';
}
function click(e){
 const b=e.target.closest('button');if(!b)return;const action=b.dataset.sec;
 if(action==='close')close();
 if(action==='arm'){b.disabled=true;Camera.arm().then(r=>{status();if(!r.ok)toast(r.error||'Caméra indisponible.','error');});}
 if(action==='disarm'){Camera.disarm();status();}
 if(action==='clear'){if(captures.length&&confirm('Supprimer définitivement toutes les captures locales ?')){captures=[];save();gallery();}}
 if(b.dataset.delete){captures=captures.filter(x=>x.id!==b.dataset.delete);save();gallery();}
 if(b.dataset.download){const x=captures.find(v=>v.id===b.dataset.download);if(x){const a=document.createElement('a');a.href=x.image;a.download='personal-os-mouvement-'+new Date(x.time).toISOString().replace(/[:.]/g,'-')+'.jpg';a.click();}}
 if(b.dataset.view){const x=captures.find(v=>v.id===b.dataset.view);if(x){const v=document.createElement('div');v.className='sec-viewer';v.innerHTML='<button>×</button><img alt="Capture agrandie"><p></p>';v.querySelector('img').src=x.image;v.querySelector('p').textContent=x.label+' · '+date(x.time);v.addEventListener('click',()=>v.remove());document.body.append(v);}}
}
function change(e){if(e.target.id==='sec-filter'){filter=e.target.value;gallery();}}
document.querySelectorAll('[data-security-open]').forEach(b=>b.addEventListener('click',open));
window.addEventListener('po:motion-detected',onMotion);Bus.on('camera:changed',status);ensure();
