/**
 * Planning cues for the 6:20 album recording of 方大同《好不容易》, 《15》.
 * Shared reference data for the director and its owner-facing review page.
 * Vocal timings remain LRC references. The supplied MP3 has been decoded and
 * measured; acoustic energy cues are distinguished from musical interpretation.
 */

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

const SOURCES = freeze({
  duration: 'https://itunes.apple.com/lookup?id=540055025',
  album: 'https://music.apple.com/us/song/540055025',
  interview: 'https://www.hitoradio.com/newweb/279pastmisshito',
  lrc: 'https://www.mulanci.org/lyric/tl193096/',
  lrcMirror: 'https://www.5nd.com/gecilrc/527535.htm',
});

const lrc = (id, time, label) => ({ id, time, label, basis: 'reference-lrc',
  calibrated: false, toleranceSeconds: 1.5,
  sourceURLs: [SOURCES.lrc, SOURCES.lrcMirror],
  note: 'Public LRC reference, approximately ±1.5 seconds; shared-source mirrors do not independently verify audio alignment.' });
const editorial = (id, time, label) => ({ id, time, label, basis: 'editorial-provisional',
  calibrated: false, toleranceSeconds: null, sourceURLs: [],
  note: 'Editorial allocation within the long orchestral ending; no musical peak or quiet point has been verified here.' });

export const ALBUM_TIMELINE = freeze({
  id: 'hao-bu-rong-yi-15-album-planning',
  title: '好不容易',
  artist: '方大同',
  album: '15',
  version: 'album',
  duration: 380,
  calibrated: false,
  status: 'recording-backed-reference',
  referenceToleranceSeconds: 1.5,
  sourcesURLs: Object.values(SOURCES),
  calibrationNote: 'A user-provided MP3 decodes cleanly at 380.107755 seconds. Vocal anchors remain unverified LRC references; measured acoustic onsets do not prove semantic sections or musical downbeats.',
  recording: { asset: 'assets/audio/hao-bu-rong-yi.mp3', duration: 380.107755,
    codec: 'mp3', sampleRate: 44100, channels: 2, bitRate: 320000,
    sha256: '350e391a1ce4ef28bc51ffac8e1fb38e99eb48e105d51b97329dd94816555ce4',
    source: 'user-provided', decodeVerified: true, vocalAnchorsCalibrated: false },
  anchors: [
    { id: 'start', time: 0, label: '音乐起点', basis: 'timeline-origin', calibrated: false,
      toleranceSeconds: null, sourceURLs: [], note: 'Start of the album recording.' },
    lrc('firstVoice', 14.82, '人声进入'),
    lrc('chorus1', 64.69, '第一遍副歌'),
    lrc('verse2', 101.84, '第二段主歌'),
    lrc('chorus2', 126.10, '第二遍副歌'),
    lrc('bridge', 159.25, '桥段'),
    lrc('recognition', 176.25, '陪伴意象转折'),
    lrc('finalChorus', 194.78, '最后一遍副歌'),
    lrc('vocalEnd', 227.43, '人声收束'),
    { id: 'orchestralRestart', time: 234.14, label: '尾奏明显重新起音', basis: 'measured-audio-feature',
      calibrated: true, toleranceSeconds: .2, sourceURLs: [],
      note: 'Measured stereo-energy rise after a low-energy gap near 233.55 seconds. Not an independently auditioned musical downbeat or semantic boundary.' },
    editorial('orchestralSettle', 345, '回落后进入雪景的剪辑预算'),
    editorial('portrait', 360, '暂定合照'),
    editorial('blessing', 368, '暂定生日祝福'),
    { id: 'end', time: 380, label: '专辑版结束', basis: 'official-metadata', calibrated: false,
      toleranceSeconds: null, sourceURLs: [SOURCES.duration, SOURCES.album],
      note: 'Official album metadata lists 380000 ms. This verifies duration, not internal cue alignment.' },
  ],
});

const CHAPTERS = freeze([
  { id: 'code', label: '代码背后，有一盏灯', startAnchor: 'start', endAnchor: 'firstVoice',
    emotionalPurpose: '从冷与陌生进入好奇；让暖光一直藏在同一个空间深处。',
    visual: '代码像薄壳包住街景，BADGER 弄坏一个小小的规则，裂缝透出唱片店的暖光。',
    interaction: '触碰可提前让局部碎裂；没有触碰时，BADGER 也会完成开场。' },
  { id: 'encounter', label: '走近那只熊', startAnchor: 'firstVoice', endAnchor: 'chorus1',
    emotionalPurpose: '用笨拙、幽默的小动作积累可信的亲近。',
    visual: '深夜小街连续展开；熊的黑帽、眼镜、蓝白围巾与小吉他成为辨识点。',
    interaction: '唱片、路灯和落叶给额外反应，不让探索暂停歌曲。' },
  { id: 'together', label: '开始一起走', startAnchor: 'chorus1', endAnchor: 'verse2',
    emotionalPurpose: '第一次明确感到两只已经在陪伴彼此。',
    visual: '镜头从各走各的变成共同前进，环境随着他们逐步变暖。',
    interaction: '触碰角色能看到彼此呼应的小动作。' },
  { id: 'photography', label: '把小小的光留下', startAnchor: 'verse2', endAnchor: 'chorus2',
    emotionalPurpose: '短暂停留在她喜欢的日常细节，留一次意外入镜的笑。',
    visual: '窗边阳光、花与叶；熊取景，BADGER 偶然闯进画面。摄影只占这一段。',
    interaction: '触碰光斑或花可触发细节；合适时刻会自动按下快门。' },
  { id: 'keepworld', label: '想把这一刻留住', startAnchor: 'chorus2', endAnchor: 'bridge',
    emotionalPurpose: '从轻松转向在乎，为后面的选择积累分量。',
    visual: '短暂回到两只同行；代码从画面边缘侵入，日常细节逐渐失去稳定。',
    interaction: '触碰能暂时补好小裂缝，主线继续发展。' },
  { id: 'fracture', label: '世界开始失灵', startAnchor: 'bridge', endAnchor: 'recognition',
    emotionalPurpose: '制造失去空间与方向的不安，角色关系保持清晰。',
    visual: '熟悉的街景被拆成有厚度的碎片，两只短暂隔开，远处仍能看见对方。',
    interaction: '触碰碎片产生额外回应，不决定故事是否能够继续。' },
  { id: 'reach', label: '先伸出手', startAnchor: 'recognition', endAnchor: 'finalChorus',
    emotionalPurpose: '把真正的动作留给角色：害怕时仍然走向彼此。',
    visual: '先找落点、短暂退缩，再由 BADGER 伸手，熊稍晚回应；最后几秒停在即将接触的手之间。',
    interaction: '观众触碰可得到手的回应；不操作也会完成靠近。' },
  { id: 'reunion', label: '终于握住', startAnchor: 'finalChorus', endAnchor: 'vocalEnd',
    emotionalPurpose: '关系的第一重高潮：陪伴成为看得见的选择。',
    visual: '两只真正握住；先给接触与停顿，再让原本危险的碎片慢慢变成可站立的世界。',
    interaction: '不要求连点，不用操作遮住这个情绪瞬间。' },
  { id: 'orchestralWorld', label: '让世界为你们展开', startAnchor: 'vocalEnd', endAnchor: 'orchestralSettle',
    emotionalPurpose: '由长弦乐承接第二重高潮，并给感动足够的停留空间。',
    visual: '三个事件依次展开：光进入旧裂缝；被破坏的窗光、花与落叶重组；镜头回到两只，它们发现原先的街灯仍在。内部转场需按实际录音再定位。',
    interaction: '探索带来局部变化；不将两分多钟尾奏做成重复粒子动画。' },
  { id: 'snow', label: '一起安静一会儿', startAnchor: 'orchestralSettle', endAnchor: 'portrait',
    emotionalPurpose: '把规模收回来，让两只一起看雪；入口时间只是暂定预算。',
    visual: '回到近距离的小院或街角，雪落掌心、围巾轻碰；两只在这里坐好，让最后合照不必匆忙准备。',
    interaction: '可以轻碰雪与角色，静止观看也有自然细节。' },
  { id: 'portrait', label: '留一张合照', startAnchor: 'portrait', endAnchor: 'blessing',
    emotionalPurpose: '将刚才经历的陪伴变成可保存的纪念。',
    visual: '构图和坐好已在上一段完成；帽子轻微歪掉，两只互相整理，然后快门、显影，留下合照。',
    interaction: '合照自动完成；保存能力在纪念物出现后提供。' },
  { id: 'birthday', label: '十九岁，生日快乐', startAnchor: 'blessing', endAnchor: 'end',
    emotionalPurpose: '最后落到她身上：温柔、具体，不虚构私人回忆。',
    visual: '先出现 19，再出现原创短祝福“愿你喜欢的小事，常常发生。”，最后落到生日快乐；合照始终留在画面中。',
    interaction: '不设置结束倒计时；音乐结束后继续停留。' },
]);

/**
 * Make a frozen planning profile. Overrides are {anchorId: seconds}; they
 * remain unverified editorial changes. The 0/380 bounds identify this exact
 * album plan and cannot be silently replaced by a short MV/live recording.
 */
export function createTimeline({ overrides = {} } = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('overrides must be an object of anchor IDs and seconds');
  }
  const known = new Set(ALBUM_TIMELINE.anchors.map(anchor => anchor.id));
  for (const [id, time] of Object.entries(overrides)) {
    if (!known.has(id)) throw new RangeError(`Unknown anchor: ${id}`);
    if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
      throw new TypeError(`Anchor ${id} must be a finite, nonnegative number of seconds`);
    }
    if (id === 'start' && time !== 0 || id === 'end' && time !== ALBUM_TIMELINE.duration) {
      throw new RangeError('This album plan must start at 0 and end at 380 seconds');
    }
  }
  const anchors = ALBUM_TIMELINE.anchors.map(anchor => {
    if (!Object.hasOwn(overrides, anchor.id) || overrides[anchor.id] === anchor.time) return anchor;
    return { ...anchor, time: overrides[anchor.id], originalTime: anchor.time,
      originalBasis: anchor.basis, basis: 'editorial-override', toleranceSeconds: null,
      calibrated: false, note: 'Manual timing override; still unverified against the selected audio file.' };
  });
  for (let index = 1; index < anchors.length; index++) {
    if (anchors[index].time <= anchors[index - 1].time) {
      throw new RangeError(`Anchors must be strictly increasing: ${anchors[index - 1].id} < ${anchors[index].id}`);
    }
  }
  const byId = Object.fromEntries(anchors.map(anchor => [anchor.id, anchor]));
  const sections = CHAPTERS.map((chapter, index) => {
    const start = byId[chapter.startAnchor].time;
    const end = byId[chapter.endAnchor].time;
    return { ...chapter, index, phase: chapter.id, start, end, duration: end - start,
      automaticProgress: true, calibrated: false,
      provisional: byId[chapter.startAnchor].basis.startsWith('editorial') ||
        byId[chapter.endAnchor].basis.startsWith('editorial') };
  });
  const duration = ALBUM_TIMELINE.duration;
  const plan = freeze({ ...ALBUM_TIMELINE, anchors, sections, cues: sections });
  return freeze({
    ...plan,
    /** Half-open chapter intervals: a cue's exact time enters the next chapter. */
    at(seconds) {
      if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
        throw new TypeError('Timeline time must be a finite number of seconds');
      }
      const time = Math.max(0, seconds);
      if (time >= duration) return freeze({
        section: 'quietExplore', phase: 'quietExplore', label: '安静地继续陪伴',
        index: sections.length, time, start: duration, end: null, duration: null,
        local: time - duration, progress: 1, overallProgress: 1,
        complete: true, calibrated: false,
      });
      const section = sections.find(candidate => time < candidate.end);
      const local = time - section.start;
      return freeze({ section: section.id, phase: section.phase, label: section.label,
        index: section.index, time, start: section.start, end: section.end,
        duration: section.duration, local, progress: local / section.duration,
        overallProgress: time / duration, complete: false, calibrated: false });
    },
    getPlan() { return plan; },
  });
}

/** Plain frozen metadata/chapters for a plan page, without constructing a player. */
export const getPlan = options => createTimeline(options).getPlan();
