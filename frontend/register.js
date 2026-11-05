import {api} from './api.js';
const form = document.getElementById('registerForm');
const submit = form.querySelector('button[type="submit"]');
const message = document.createElement('div');
message.setAttribute('role','status');
message.className = 'text-sm font-semibold mt-2';
submit.after(message);
const departments = await api('/api/departments').catch(e => {message.textContent=e.message;return [];});
const departmentSelect=document.getElementById('department');
if(departments.length) departmentSelect.innerHTML='<option value="" disabled selected>-- Chọn đơn vị trực thuộc --</option>' + departments.map(d=>`<option value="${d.code}">${d.name}</option>`).join('');
form.removeAttribute('onsubmit');
submit.removeAttribute('onclick');
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!form.reportValidity()) return;
 message.textContent='';
 const val=id=>document.getElementById(id).value.trim();
 const payload={full_name:val('fullName'),email:val('govEmail'),phone:val('phoneNumber'),department:val('department'),role:val('role'),staff_code:val('staffCode')||null,password:document.getElementById('password').value,confirm_password:document.getElementById('confirmPassword').value,agreement:document.getElementById('agreement').checked};
 submit.disabled=true;
 try {const data=await api('/api/auth/register',{method:'POST',body:JSON.stringify(payload)});message.className='text-sm font-semibold mt-2 text-green-700';message.textContent=data.message;form.reset();}
 catch(err){message.className='text-sm font-semibold mt-2 text-red-700';message.textContent=err.message;}
 finally{submit.disabled=false;}
});
