import {api} from './api.js';
const form=document.getElementById('loginForm');
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const err=document.getElementById('error');err.textContent='';
 try {const result=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:form.email.value,password:form.password.value})});sessionStorage.setItem('access_token',result.access_token);location.href='/trang-chu.html';}
 catch(ex){err.textContent=ex.message;}
});
