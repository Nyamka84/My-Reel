const DB = {
  KEY: 'angli_hel_v2',

  load() {
    try {
      const r = localStorage.getItem(this.KEY);
      return r ? JSON.parse(r) : { days: [], generalScore: null };
    } catch { return { days: [], generalScore: null }; }
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  getDay(i) {
    return this.load().days[i] || null;
  },

  createDay() {
    const data = this.load();
    data.days.push({
      id       : data.days.length + 1,
      sentences: Array(10).fill(null).map(() => ({ mn:'', en:'', filled:false })),
      score    : null,
      createdAt: new Date().toISOString()
    });
    this.save(data);
    return data.days.length - 1;
  },

  saveSentence(dayIdx, sentIdx, mn, en) {
    const data = this.load();
    if (!data.days[dayIdx]) return;
    data.days[dayIdx].sentences[sentIdx] = { mn, en, filled: true };
    this.save(data);
  },

  saveScore(dayIdx, score) {
    const data = this.load();
    if (!data.days[dayIdx]) return;
    data.days[dayIdx].score = score;
    this.save(data);
  },

  saveGeneralScore(score) {
    const data = this.load();
    data.generalScore = score;
    this.save(data);
  },

  isDayLocked(i) {
    if (i === 0) return false;
    const data = this.load();
    const prev = data.days[i - 1];
    return !prev || prev.score !== 10;
  },

  filledCount(i) {
    const d = this.getDay(i);
    return d ? d.sentences.filter(s => s.filled).length : 0;
  }
};