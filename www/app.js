const KEY='license_reminder_v2';
let data={items:[],days:30,cfg:{svc:'',tpl:'',key:'',auto:true}},editId=null,busy=false;
const $=id=>document.getElementById(id);
const load=()=>{try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&Array.isArray(d.items))data=Object.assign(data,d,{cfg:Object.assign(data.cfg,d.cfg)})}}catch(e){}};
let sn;const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}clearTimeout(sn);sn=setTimeout(syncNotifs,600)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
const left=e=>Math.round((new Date(e+'T00:00:00')-today())/864e5);
const since=e=>-left(e);
const status=d=>d<0?'exp':d<=data.days?'soon':'ok';
const fmt=e=>new Date(e+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const iso=()=>{const d=today();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const cfgOk=()=>!!(data.cfg.svc&&data.cfg.tpl&&data.cfg.key);
const due=it=>status(left(it.exp))!=='ok';

let tt;function toast(t){const el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('on'),3200)}

function msg(it){
  const d=left(it.exp);
  const when=d<0?`sudah kedaluwarsa pada ${fmt(it.exp)}`:d===0?`kedaluwarsa hari ini (${fmt(it.exp)})`:`akan kedaluwarsa pada ${fmt(it.exp)} (${d} hari lagi)`;
  return{sub:`Pengingat: ${it.lic} ${d<0?'sudah kedaluwarsa':'akan kedaluwarsa'}`,
    body:`Yth. ${it.nama},\n\nKami mengingatkan bahwa ${it.lic} (ID peserta ${it.pid}) ${when}.\n\nMohon segera lakukan perpanjangan atau hubungi kami jika ada kendala.\n\nTerima kasih.`};
}

async function send(it){
  const m=msg(it),c=data.cfg;
  const r=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({service_id:c.svc,template_id:c.tpl,user_id:c.key,template_params:{to_email:it.email,to_name:it.nama,participant_id:it.pid,license_name:it.lic,expiry_date:fmt(it.exp),subject:m.sub,message:m.body}})});
  if(!r.ok)throw new Error((await r.text())||r.status);
}

const DAILY=5;
function needs(it){
  const d=left(it.exp);
  if(d>data.days)return false;
  if(!it.sent)return true;
  const gap=since(it.sent);
  return d>=0&&d<DAILY?gap>=1:gap>=7;
}
async function autoSend(){
  if(busy||!data.cfg.auto||!cfgOk())return;
  const q=data.items.filter(needs);
  if(!q.length)return;
  busy=true;let ok=0,fail=0;
  for(const it of q){try{await send(it);it.sent=iso();it.err='';ok++}catch(e){it.err='Gagal kirim otomatis';fail++}}
  busy=false;save();render();
  if(ok)toast(`${ok} email pengingat terkirim`);
  else if(fail)toast('Pengiriman gagal, cek pengaturan EmailJS dan koneksi');
}

function render(){
  $('days').value=String(data.days);
  const L=[...data.items].sort((a,b)=>a.exp.localeCompare(b.exp));
  const c={exp:0,soon:0,ok:0};L.forEach(i=>c[status(left(i.exp))]++);
  $('stats').innerHTML=`<div class="stat r"><b>${c.exp}</b><span>Kedaluwarsa</span></div><div class="stat a"><b>${c.soon}</b><span>Segera habis</span></div><div class="stat g"><b>${c.ok}</b><span>Aman</span></div>`;
  const n=c.exp+c.soon;
  $('banner').innerHTML=n?`<div class="banner ${c.exp?'r':''}">${n} license perlu diingatkan.${cfgOk()?(data.cfg.auto?' Email dikirim otomatis saat aplikasi dibuka.':' Ketuk Kirim email pada kartu.'):' Isi Pengaturan EmailJS agar email terkirim langsung.'}</div>`:'';
  if(!L.length){$('list').innerHTML='<div class="empty">Belum ada data. Isi formulir di atas untuk menambah license pertama.</div>';return}
  $('list').innerHTML=L.map(i=>{
    const d=left(i.exp),s=status(d);
    return `<div class="item"><div class="cd ${s}"><b>${Math.abs(d)}</b><span>${d<0?'hari lewat':d===0?'hari ini':'hari lagi'}</span></div>
    <div class="info"><strong>${esc(i.nama)}</strong><div>ID ${esc(i.pid)}</div><div class="lic">${esc(i.lic)}</div>
    <div>Berlaku sampai ${fmt(i.exp)}</div><div>${esc(i.email)}</div>
    ${i.sent?`<div>Pengingat terakhir dikirim ${fmt(i.sent)}</div>`:''}${i.err?`<div class="bad">${esc(i.err)}</div>`:''}
    <div class="acts"><button class="btn p" data-send="${i.uid}">Kirim email</button>
    <button class="btn" data-edit="${i.uid}">Ubah</button><button class="btn d" data-del="${i.uid}">Hapus</button></div></div></div>`}).join('');
}

function resetForm(){editId=null;['pid','nama','email','lic','exp'].forEach(k=>$(k).value='');$('formTitle').textContent='Tambah license';$('save').textContent='Simpan license';$('cancel').hidden=true;$('err').textContent=''}

$('save').onclick=()=>{
  const v={pid:$('pid').value.trim(),nama:$('nama').value.trim(),email:$('email').value.trim(),lic:$('lic').value.trim(),exp:$('exp').value};
  if(!v.pid||!v.nama||!v.email||!v.lic||!v.exp){$('err').textContent='Semua kolom wajib diisi.';return}
  if(!/^\S+@\S+\.\S+$/.test(v.email)){$('err').textContent='Format email belum benar.';return}
  if(editId){const it=data.items.find(x=>x.uid===editId);if(it){const ch=it.exp!==v.exp;Object.assign(it,v);if(ch){it.sent='';it.err=''}}}
  else data.items.push({...v,uid:Date.now().toString(36)+Math.random().toString(36).slice(2,6),sent:'',err:''});
  save();resetForm();render();autoSend();
};
$('cancel').onclick=resetForm;
$('days').onchange=e=>{data.days=+e.target.value;save();render();autoSend()};
$('saveCfg').onclick=()=>{
  data.cfg={svc:$('svc').value.trim(),tpl:$('tpl').value.trim(),key:$('key').value.trim(),auto:$('auto').checked};
  save();render();toast(cfgOk()?'Pengaturan disimpan':'Pengaturan disimpan, tapi belum lengkap');autoSend();
};

$('list').addEventListener('click',async e=>{
  const t=e.target.closest('[data-send],[data-edit],[data-del]');if(!t)return;
  if(t.dataset.send){
    const it=data.items.find(x=>x.uid===t.dataset.send);if(!it)return;
    if(!cfgOk()){const m=msg(it);location.href=`mailto:${encodeURIComponent(it.email)}?subject=${encodeURIComponent(m.sub)}&body=${encodeURIComponent(m.body)}`;return}
    t.disabled=true;t.textContent='Mengirim...';
    try{await send(it);it.sent=iso();it.err='';toast('Email terkirim ke '+it.email)}
    catch(x){it.err='Gagal kirim, cek pengaturan EmailJS dan koneksi';toast(it.err)}
    save();render();return}
  if(t.dataset.edit){
    const it=data.items.find(x=>x.uid===t.dataset.edit);if(!it)return;editId=it.uid;
    $('pid').value=it.pid;$('nama').value=it.nama;$('email').value=it.email;$('lic').value=it.lic;$('exp').value=it.exp;
    $('formTitle').textContent='Ubah license';$('save').textContent='Perbarui license';$('cancel').hidden=false;
    $('pid').scrollIntoView({behavior:'smooth',block:'center'});return}
  if(t.dataset.del){
    if(!t.classList.contains('arm')){t.classList.add('arm');t.textContent='Ketuk lagi untuk hapus';setTimeout(()=>{t.classList.remove('arm');t.textContent='Hapus'},3000);return}
    data.items=data.items.filter(x=>x.uid!==t.dataset.del);save();render()}
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();autoSend()}});
load();
$('svc').value=data.cfg.svc;$('tpl').value=data.cfg.tpl;$('key').value=data.cfg.key;$('auto').checked=!!data.cfg.auto;
if(!cfgOk())$('cfgBox').open=true;
render();autoSend();syncNotifs();

// Notifikasi lokal terjadwal (hanya aktif di APK)
const LN=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications;
const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%100000;return h};
async function syncNotifs(){
  if(!LN)return;
  try{
    const pr=await LN.requestPermissions();if(pr.display!=='granted')return;
    const p=await LN.getPending();if(p.notifications.length)await LN.cancel({notifications:p.notifications});
    const now=Date.now(),list=[];
    for(const it of data.items){
      const base=new Date(it.exp+'T08:00:00');
      [...new Set([data.days,7,4,3,2,1,0,-7,-14])].forEach((o,k)=>{
        const at=new Date(base.getTime()-o*864e5);
        if(at.getTime()>now)list.push({id:hash(it.uid)*10+k,title:'Pengingat license',body:`${it.nama}: ${it.lic} berlaku sampai ${fmt(it.exp)}. Buka aplikasi untuk mengirim pengingat.`,schedule:{at,allowWhileIdle:true}});
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
    data.items=d.items.filter(i=>i&&i.uid&&i.exp&&i.email);if(d.days)data.days=+d.days||30;
    save();render();autoSend();toast('Data dipulihkan: '+data.items.length+' license')}
  catch(e){toast('Teks cadangan tidak valid')}
};
