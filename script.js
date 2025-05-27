// script.js
const STORAGE_KEY = 'student_data_enc';

function loadData() {
  const enc = localStorage.getItem(STORAGE_KEY);
  if (!enc) return [];
  const pwd = 'fixed_global_password';
  const bytes = CryptoJS.AES.decrypt(enc, pwd);
  const json  = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(json || '[]');
}

function saveData(arr) {
  const pwd = 'fixed_global_password';
  const json = JSON.stringify(arr);
  const enc  = CryptoJS.AES.encrypt(json, pwd).toString();
  localStorage.setItem(STORAGE_KEY, enc);
}
