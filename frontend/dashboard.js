import {api,getToken,logout} from './api.js';
const token=getToken();
if(!token) location.replace('/dang-nhap.html');
const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vnTime=s=>new Date(s).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
const vnDate=s=>new Date(s).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
function panel(title){return [...document.querySelectorAll('h2')].find(x=>x.textContent.includes(title))?.closest('.bg-surface-container-lowest');}
async function render(){
 try{
 const [me,data]=await Promise.all([api('/api/auth/me',{token}),api('/api/dashboard/summary',{token})]);
 const profile=document.querySelector('header .flex.flex-col.text-left');
 if(profile) profile.innerHTML=`<span class="font-semibold">${escapeHtml(me.full_name)}</span><span class="text-xs text-slate-500">${escapeHtml(me.department)} • ${escapeHtml(me.role)}</span>`;
 const kpis=[data.meetings_today,data.schedules_this_week,data.pending_tasks,data.unread_notifications];
 const cards=document.querySelectorAll('main .grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-4 > div');
 cards.forEach((card,i)=>{const el=card.querySelector('.font-headline-xl.text-headline-xl');if(el)el.textContent=String(kpis[i]).padStart(2,'0');});
 const meetingsPanel=panel('Lịch họp &');
 if(meetingsPanel){const list=meetingsPanel.querySelector('.space-y-3\\.5');if(list)list.innerHTML=data.upcoming_meetings.length ? data.upcoming_meetings.map(m=>`<div class="p-4 rounded-xl bg-slate-50 border border-slate-100"><div class="font-semibold">${escapeHtml(m.title)}</div><div class="mt-1 text-sm text-slate-600">${vnTime(m.start_at)} – ${vnTime(m.end_at)} · ${escapeHtml(m.room)} · Chủ trì: ${escapeHtml(m.organizer)}</div>${m.join_url ? `<a class="text-blue-700 underline" target="_blank" rel="noopener noreferrer" href="${escapeHtml(m.join_url)}">Tham gia cuộc họp</a>`:''}</div>`).join('') : '<p class="py-6 text-slate-500">Hôm nay chưa có cuộc họp.</p>';}
 const tasksPanel=panel('Nhiệm vụ &');
 if(tasksPanel){const tbody=tasksPanel.querySelector('tbody');if(tbody)tbody.innerHTML=data.tasks.length ? data.tasks.map(t=>`<tr class="border-b"><td class="p-3"></td><td class="p-3 font-medium">${escapeHtml(t.title)}</td><td class="p-3">—</td><td class="p-3">${escapeHtml(t.assignee)}</td><td class="p-3">${escapeHtml(t.priority)}</td><td class="p-3">${vnDate(t.due_at)}</td><td class="p-3">${escapeHtml(t.status)}</td></tr>`).join('') : '<tr><td colspan="7" class="p-6 text-center text-slate-500">Chưa có nhiệm vụ cần xử lý.</td></tr>';}
 const roomsPanel=panel('Tình trạng phòng họp');
 if(roomsPanel){let list=roomsPanel.querySelector('.space-y-3.mt-1');if(list)list.innerHTML=data.rooms.map(r=>`<div class="bg-slate-50 p-3 rounded-lg flex justify-between"><div><strong>${escapeHtml(r.name)}</strong><div class="text-xs text-slate-500">${escapeHtml(r.location)} · ${r.capacity} chỗ</div></div><span class="text-sm ${r.busy?'text-red-700':'text-green-700'}">${r.busy?'Bận':'Trống'}</span></div>`).join('');}
 document.querySelectorAll('header .font-data-tabular').forEach(el=>{if(el.textContent.includes('2024')) el.textContent=new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'numeric',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'});});
 document.querySelectorAll('main p').forEach(el=>{if(el.textContent.includes('24/10/2024'))el.textContent='Dữ liệu trực tiếp từ hệ thống';});
 const warning=document.querySelector('main .bg-error-container');if(warning) warning.style.display='none';
 }catch(e){if(/401|403|Token|đăng nhập|khóa/.test(e.message)){logout();return;}alert(e.message);}
}
const header=document.querySelector('header .flex.items-center.gap-space-sm.pl-space-xs');
if(header){const b=document.createElement('button');b.textContent='Đăng xuất';b.className='bg-slate-100 rounded-lg p-2 text-sm';b.addEventListener('click',logout);header.after(b);}
render();
