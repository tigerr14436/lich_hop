const API_BASE = 'http://127.0.0.1:8000';
export async function api(path, {token, ...opts} = {}) {
  const headers = {'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(opts.headers||{})};
  let response;
  try {response = await fetch(API_BASE + path, {...opts, headers});}
  catch {throw new Error('Không kết nối được backend. Kiểm tra FastAPI tại http://127.0.0.1:8000');}
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail.map(x => x.msg).join('; ') : 'Yêu cầu thất bại';
    throw new Error(message);
  }
  return data;
}
export const getToken = () => sessionStorage.getItem('access_token');
export const logout = () => {sessionStorage.removeItem('access_token'); location.href='/dang-nhap.html';};
