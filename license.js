// ===== ЛИЦЕНЗИЙН СИСТЕМ (Энгийн хувилбар) =====
// Fingerprint байхгүй
// localStorage-д хадгалагдана
// Утас форматлах = localStorage устна = дахин код нэхнэ

const LICENSE = {
  STORE_KEY: 'angli_license_v1',
  SECRET   : 'AnGLi2024MoNGoL@HEL#SuRGaLT',

  // Hash функц
  simpleHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h  = Math.imul(h, 0x01000193);
      h >>>= 0;
    }
    return h;
  },

  // Код үүсгэх — admin generate.html-тэй ижил алгоритм
  generateCode(name, id) {
    const date    = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const payload = `${name}|${id}|${date}|${this.SECRET}`;
    const h1      = this.simpleHash(payload).toString(36).toUpperCase();
    const h2      = this.simpleHash(payload + 'SALT').toString(36).toUpperCase();
    const p1      = (h1 + '0000').slice(0, 4);
    const p2      = (h2 + '0000').slice(0, 4);
    return `ANGLI-${p1}-${p2}`;
  },

  // Формат шалгах: ANGLI-XXXX-XXXX (нийт 14 тэмдэгт)
  isValidFormat(code) {
    if (!code || typeof code !== 'string') return false;
    const c = code.toUpperCase().trim();
    return /^ANGLI-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c);
  },

  // Идэвхижүүлэх
  activate(code) {
    const clean = code.toUpperCase().trim();
    if (!this.isValidFormat(clean)) return false;
    const data = {
      code       : clean,
      activatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(this.STORE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  },

  // Идэвхитэй эсэхийг шалгах
  isActivated() {
    try {
      const raw = localStorage.getItem(this.STORE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.code) return false;
      return this.isValidFormat(data.code);
    } catch {
      return false;
    }
  },

  // Устгах
  deactivate() {
    localStorage.removeItem(this.STORE_KEY);
  }
};