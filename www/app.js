const KEY='license_reminder_v2';
let data={items:[],days:30,cfg:{svc:'',tpl:'',key:'',auto:true}},editId=null,busy=false;
const $=id=>document.getElementById(id);

// Plugin native (hanya aktif di APK)
const CAP=window.Capacitor||{};
const LN=CAP.Plugins&&CAP.Plugins.LocalNotifications;
const SMS=(CAP.Plugins&&CAP.Plugins.SmsSender)||(CAP.registerPlugin&&CAP.isNativePlatform&&CAP.isNativePlatform()?CAP.registerPlugin('SmsSender'):null);
const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%100000;return h};

// Data lama (WhatsApp) dipindah ke kolom HP; status kirim WA dibuang
const mig=i=>{if(i&&typeof i==='object'){if(i.wa&&!i.hp)i.hp=i.wa;delete i.wa;delete i.waSent;delete i.waErr;if(i.smsSent===undefined)i.smsSent='';if(i.smsErr===undefined)i.smsErr=''}return i};
const load=()=>{try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&Array.isArray(d.items)){data=Object.assign(data,d,{cfg:Object.assign(data.cfg,d.cfg)});delete data.cfg.ft;data.items.forEach(mig)}}}catch(e){}};
let sn;const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}clearTimeout(sn);sn=setTimeout(syncNotifs,600)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
const left=e=>Math.round((new Date(e+'T00:00:00')-today())/864e5);
const since=e=>-left(e);
const status=d=>d<0?'exp':d<=data.days?'soon':'ok';
const fmt=e=>new Date(e+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const iso=()=>{const d=today();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const cfgOk=()=>!!(data.cfg.svc&&data.cfg.tpl&&data.cfg.key);
const digits=n=>String(n||'').replace(/\D/g,'');
const hpNum=n=>{n=digits(n);return n.startsWith('0')?'+62'+n.slice(1):n.startsWith('62')?'+'+n:n};
const kind=it=>it.rf?'refresher':'training';
const title=it=>it.rf||it.tr||it.lic||'';

let tt;function toast(t){const el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('on'),3200)}

function msg(it){
  const k=kind(it);
  return{sub:`Pengingat ${k}: ${title(it)}`,
    body:`Kepada Yth. ${it.nama},\n\nAkan ada ${k} ${title(it)} pada tanggal ${fmt(it.exp)}.\n\nMohon agar hadir di ${k} tersebut.\n\nTerima kasih.`};
}
// Versi singkat untuk SMS (hemat pulsa)
const smsText=it=>{const k=kind(it);return `Kepada Yth. ${it.nama}, akan ada ${k} ${title(it)} pada tanggal ${fmt(it.exp)}. Mohon agar hadir di ${k} tersebut. Terima kasih.`};

async function sendEmail(it){
  const m=msg(it),c=data.cfg;
  const r=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({service_id:c.svc,template_id:c.tpl,user_id:c.key,template_params:{to_email:it.email,to_name:it.nama,participant_id:it.pid,item_type:kind(it),item_name:title(it),event_date:fmt(it.exp),subject:m.sub,message:m.body}})});
  if(!r.ok)throw new Error((await r.text())||r.status);
}

async function sendSMS(it){
  await SMS.send({to:hpNum(it.hp),message:smsText(it)});
}

const DAILY=5;
function needs(it,f){
  const d=left(it.exp);
  if(d<0||d>data.days)return false;
  if(!it[f])return true;
  const gap=since(it[f]);
  return d<DAILY?gap>=1:gap>=7;
}

async function autoSend(){
  if(busy||!data.cfg.auto)return;
  const jobs=[];
  for(const it of data.items){
    if(it.email&&cfgOk()&&needs(it,'sent'))jobs.push([it,'e']);
    if(it.hp&&SMS&&needs(it,'smsSent'))jobs.push([it,'s']);
  }
  if(!jobs.length)return;
  busy=true;let ok=0,fail=0;
  for(const [it,ch] of jobs){
    try{
      if(ch==='e'){await sendEmail(it);it.sent=iso();it.err=''}
      else{await sendSMS(it);it.smsSent=iso();it.smsErr='';await new Promise(r=>setTimeout(r,1500))}
      ok++;
    }catch(e){if(ch==='e')it.err='Gagal kirim email';else it.smsErr='Gagal kirim SMS';fail++}
  }
  busy=false;save();render();
  if(ok)toast(`${ok} pesan pengingat terkirim`);
  else if(fail)toast('Pengiriman gagal, cek pengaturan, izin SMS, dan koneksi');
}

function render(){
  $('days').value=String(data.days);
  const L=[...data.items].sort((a,b)=>a.exp.localeCompare(b.exp));
  const c={exp:0,soon:0,ok:0};L.forEach(i=>c[status(left(i.exp))]++);
  $('stats').innerHTML=`<div class="stat r"><b>${c.exp}</b><span>Sudah lewat</span></div><div class="stat a"><b>${c.soon}</b><span>Segera</span></div><div class="stat g"><b>${c.ok}</b><span>Terjadwal</span></div>`;
  const autoOn=data.cfg.auto&&(cfgOk()||SMS);
  $('banner').innerHTML=c.soon?`<div class="banner">${c.soon} jadwal perlu diingatkan.${autoOn?' Pesan dikirim otomatis saat aplikasi dibuka.':' Ketuk tombol kirim pada kartu.'}</div>`:'';
  if(!L.length){$('list').innerHTML='<div class="empty">Belum ada data. Isi formulir di atas untuk menambah jadwal pertama.</div>';return}
  $('list').innerHTML=L.map(i=>{
    const d=left(i.exp),s=status(d);
    return `<div class="item"><div class="cd ${s}"><b>${Math.abs(d)}</b><span>${d<0?'hari lewat':d===0?'hari ini':'hari lagi'}</span></div>
    <div class="info"><strong>${esc(i.nama)}</strong><div>ID ${esc(i.pid)}</div><div class="lic">${kind(i)==='refresher'?'Refresher':'Training'}: ${esc(title(i))}</div>
    <div>Tanggal ${fmt(i.exp)}</div>
    ${i.email?`<div>${esc(i.email)}</div>`:''}${i.hp?`<div>HP ${esc(i.hp)}</div>`:''}
    ${i.sent?`<div>Email terakhir dikirim ${fmt(i.sent)}</div>`:''}${i.err?`<div class="bad">${esc(i.err)}</div>`:''}
    ${i.smsSent?`<div>SMS terakhir dikirim ${fmt(i.smsSent)}</div>`:''}${i.smsErr?`<div class="bad">${esc(i.smsErr)}</div>`:''}
    <div class="acts">${i.email?`<button class="btn p" data-send="${i.uid}">Kirim email</button>`:''}${i.hp?`<button class="btn p" data-sms="${i.uid}">Kirim SMS</button>`:''}
    <button class="btn" data-edit="${i.uid}">Ubah</button><button class="btn d" data-del="${i.uid}">Hapus</button></div></div></div>`}).join('');
}

function resetForm(){editId=null;['pid','nama','email','hp','tr','rf','exp'].forEach(k=>$(k).value='');$('formTitle').textContent='Tambah jadwal';$('save').textContent='Simpan jadwal';$('cancel').hidden=true;$('err').textContent=''}

$('save').onclick=()=>{
  const v={pid:$('pid').value.trim(),nama:$('nama').value.trim(),email:$('email').value.trim(),hp:$('hp').value.trim(),tr:$('tr').value.trim(),rf:$('rf').value.trim(),exp:$('exp').value};
  if(!v.pid||!v.nama||!v.exp){$('err').textContent='ID, nama, dan tanggal wajib diisi.';return}
  if(!v.tr&&!v.rf){$('err').textContent='Isi salah satu: Training atau Refresher.';return}
  if(v.tr&&v.rf){$('err').textContent='Isi salah satu saja: Training atau Refresher.';return}
  if(!v.email&&!v.hp){$('err').textContent='Isi email, nomor HP, atau keduanya.';return}
  if(v.email&&!/^\S+@\S+\.\S+$/.test(v.email)){$('err').textContent='Format email belum benar.';return}
  if(v.hp){const n=digits(v.hp);if(n.length<9||n.length>15){$('err').textContent='Nomor HP belum benar.';return}}
  if(editId){const it=data.items.find(x=>x.uid===editId);if(it){const ch=it.exp!==v.exp;Object.assign(it,v);delete it.lic;if(ch){it.sent='';it.err='';it.smsSent='';it.smsErr=''}}}
  else data.items.push({...v,uid:Date.now().toString(36)+Math.random().toString(36).slice(2,6),sent:'',err:'',smsSent:'',smsErr:''});
  save();resetForm();render();autoSend();
};
$('cancel').onclick=resetForm;
$('days').onchange=e=>{data.days=+e.target.value;save();render();autoSend()};
$('saveCfg').onclick=()=>{
  data.cfg={svc:$('svc').value.trim(),tpl:$('tpl').value.trim(),key:$('key').value.trim(),auto:$('auto').checked};
  save();render();toast('Pengaturan disimpan');autoSend();
};

$('list').addEventListener('click',async e=>{
  const t=e.target.closest('[data-send],[data-sms],[data-edit],[data-del]');if(!t)return;
  if(t.dataset.send){
    const it=data.items.find(x=>x.uid===t.dataset.send);if(!it)return;
    if(!cfgOk()){const m=msg(it);location.href=`mailto:${encodeURIComponent(it.email)}?subject=${encodeURIComponent(m.sub)}&body=${encodeURIComponent(m.body)}`;return}
    t.disabled=true;t.textContent='Mengirim...';
    try{await sendEmail(it);it.sent=iso();it.err='';toast('Email terkirim ke '+it.email)}
    catch(x){it.err='Gagal kirim, cek pengaturan EmailJS dan koneksi';toast(it.err)}
    save();render();return}
  if(t.dataset.sms){
    const it=data.items.find(x=>x.uid===t.dataset.sms);if(!it)return;
    // Di luar APK (tanpa plugin), buka aplikasi SMS dengan pesan terisi
    if(!SMS){location.href=`sms:${hpNum(it.hp)}?body=${encodeURIComponent(smsText(it))}`;return}
    t.disabled=true;t.textContent='Mengirim...';
    try{await sendSMS(it);it.smsSent=iso();it.smsErr='';toast('SMS terkirim ke '+it.hp)}
    catch(x){it.smsErr='Gagal kirim SMS, cek izin SMS dan pulsa';toast(it.smsErr)}
    save();render();return}
  if(t.dataset.edit){
    const it=data.items.find(x=>x.uid===t.dataset.edit);if(!it)return;editId=it.uid;
    $('pid').value=it.pid;$('nama').value=it.nama;$('email').value=it.email||'';$('hp').value=it.hp||'';
    $('tr').value=it.tr||(it.rf?'':it.lic||'');$('rf').value=it.rf||'';$('exp').value=it.exp;
    $('formTitle').textContent='Ubah jadwal';$('save').textContent='Perbarui jadwal';$('cancel').hidden=false;
    $('pid').scrollIntoView({behavior:'smooth',block:'center'});return}
  if(t.dataset.del){
    if(!t.classList.contains('arm')){t.classList.add('arm');t.textContent='Ketuk lagi untuk hapus';setTimeout(()=>{t.classList.remove('arm');t.textContent='Hapus'},3000);return}
    data.items=data.items.filter(x=>x.uid!==t.dataset.del);save();render()}
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();autoSend()}});

// Notifikasi lokal terjadwal (hanya aktif di APK)
async function syncNotifs(){
  if(!LN)return;
  try{
    const pr=await LN.requestPermissions();if(pr.display!=='granted')return;
    const p=await LN.getPending();if(p.notifications.length)await LN.cancel({notifications:p.notifications});
    const now=Date.now(),list=[];
    for(const it of data.items){
      const base=new Date(it.exp+'T08:00:00');
      [...new Set([data.days,7,4,3,2,1,0])].forEach((o,k)=>{
        const at=new Date(base.getTime()-o*864e5);
        if(at.getTime()>now)list.push({id:hash(it.uid)*10+k,title:'Pengingat '+kind(it),body:`${it.nama}: ${kind(it)} ${title(it)} pada ${fmt(it.exp)}. Buka aplikasi untuk mengirim pengingat.`,schedule:{at,allowWhileIdle:true}});
      });
    }
    if(list.length)await LN.schedule({notifications:list});
  }catch(e){}
}
if(LN)LN.addListener('localNotificationActionPerformed',()=>{render();autoSend()});

// Cadangan data
$('bkExp').onclick=async()=>{
  const t=JSON.stringify({items:data.items,days:data.days});$('bkTxt').value=t;
  try{await navigator.clipboard.writeText(t);toast('Cadangan disalin. Simpan di catatan atau kirim ke diri sendiri')}
  catch(e){$('bkTxt').select();toast('Salin teks cadangan secara manual')}
};
$('bkImp').onclick=()=>{
  try{const d=JSON.parse($('bkTxt').value);if(!d||!Array.isArray(d.items))throw 0;
    data.items=d.items.map(mig).filter(i=>i&&i.uid&&i.exp&&(i.email||i.hp));if(d.days)data.days=+d.days||30;
    save();render();autoSend();toast('Data dipulihkan: '+data.items.length+' jadwal')}
  catch(e){toast('Teks cadangan tidak valid')}
};

load();
$('svc').value=data.cfg.svc;$('tpl').value=data.cfg.tpl;$('key').value=data.cfg.key;$('auto').checked=!!data.cfg.auto;
if(!cfgOk()&&!SMS)$('cfgBox').open=true;
render();autoSend();syncNotifs();
