import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getPlan } from '../rebuild/song-timeline.js';

const here = dirname(fileURLToPath(import.meta.url));
const plan = getPlan();
const embeddedPlan = JSON.stringify(plan).replaceAll('<', '\\u003c');

function boardApp(plan) {
  const $ = id => document.getElementById(id);
  const fmt = (time, decimal = false) => {
    const raw = Math.max(0, Number(time) || 0);
    const ticks = Math.round(raw * (decimal ? 10 : 1));
    const sec = decimal ? ticks / 10 : ticks;
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' +
      (decimal ? (sec % 60).toFixed(1).padStart(4, '0') : String(sec % 60).padStart(2, '0'));
  };
  const palette = ['#747b9c', '#8d849d', '#b59392', '#d0b287', '#c4a37c', '#8d849e', '#ae9ba9', '#e1b577', '#e8c282', '#b6c2cf', '#cdbfa9', '#e2cba3'];
  const bar = $('segments');
  const chapters = $('chapters');
  const cues = $('cues');
  let currentTime = 0;
  let silentPlaying = false;
  let previousFrame = null;
  let audioURL = null;
  let hasAudio = false;
  const audio = $('audio');
  const sectionButtons = [];
  const segmentButtons = [];

  plan.sections.forEach((section, index) => {
    const segment = document.createElement('button');
    segment.type = 'button';
    segment.className = 'segment' + (section.provisional ? ' provisional' : '');
    segment.style.flexBasis = (section.duration / plan.duration * 100) + '%';
    segment.style.setProperty('--scene-color', palette[index]);
    segment.title = fmt(section.start) + ' ' + section.label;
    segment.setAttribute('aria-label', '跳到 ' + fmt(section.start) + '，' + section.label);
    const num = document.createElement('span');
    num.textContent = String(index + 1).padStart(2, '0');
    segment.append(num);
    segment.addEventListener('click', () => seek(section.start));
    segmentButtons.push(segment);
    bar.append(segment);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter';
    button.style.setProperty('--scene-color', palette[index]);
    const count = document.createElement('span');
    count.className = 'chapter-number';
    count.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = section.label;
    const meta = document.createElement('small');
    meta.textContent = fmt(section.start) + ' — ' + fmt(section.end) + (section.provisional ? ' · 含暂定切点' : ' · 参考时间码');
    copy.append(title, meta);
    button.append(count, copy);
    button.addEventListener('click', () => { seek(section.start); showDetail(); });
    sectionButtons.push(button);
    chapters.append(button);
  });

  plan.anchors.filter(anchor => anchor.id !== 'start').forEach(anchor => {
    const li = document.createElement('li');
    const isEditorial = anchor.basis.startsWith('editorial');
    li.className = isEditorial ? 'cue provisional-cue' : 'cue';
    const button = document.createElement('button');
    button.type = 'button';
    const time = document.createElement('time');
    time.textContent = fmt(anchor.time);
    const label = document.createElement('span');
    label.textContent = anchor.label;
    const basis = document.createElement('small');
    basis.textContent = isEditorial ? '镜头预算 · 参考实际衰减' : anchor.basis === 'official-metadata' ? '官方元数据' : anchor.basis === 'measured-audio-feature' ? '实测能量起音 · 非强拍确认' : 'LRC 参考 ±1.5s';
    button.append(time, label, basis);
    button.addEventListener('click', () => { seek(anchor.time); showDetail(); });
    li.append(button);
    cues.append(li);
  });

  function render() {
    const ended = currentTime >= plan.duration;
    const index = ended ? plan.sections.length - 1 : plan.sections.findIndex(section => currentTime < section.end);
    const section = plan.sections[Math.max(0, index)];
    $('time').textContent = fmt(currentTime, true);
    $('scrubber').value = String(currentTime);
    $('scrubber').setAttribute('aria-valuetext', fmt(currentTime) + '，' + (ended ? '安静地继续陪伴' : section.label));
    $('playhead').style.left = Math.min(100, currentTime / plan.duration * 100) + '%';
    $('scene-number').textContent = 'SCENE ' + String(index + 1).padStart(2, '0') + ' / 12';
    $('scene-title').textContent = ended ? '安静地继续陪伴' : section.label;
    $('scene-time').textContent = ended ? '06:20 之后 · 不自动循环' : fmt(section.start) + ' — ' + fmt(section.end);
    $('emotion').textContent = ended ? '音乐自然结束；让照片、祝福与两只留在这里。' : section.emotionalPurpose;
    $('visual').textContent = ended ? '小街与角色仍可探索。结束不是倒计时，也不突然重启前奏。' : section.visual;
    $('interaction').textContent = ended ? '保存照片、收藏离线副本；明确重播才重新开始。' : section.interaction;
    $('detail').style.setProperty('--scene-color', palette[index]);
    $('scene-status').textContent = section.provisional ? '这一段含暂定尾奏切点，需听最终录音校准。' : '段落入口参考公开 LRC，尚未与最终录音实听校准。';
    $('scene-status').classList.toggle('is-provisional', section.provisional);
    sectionButtons.forEach((button, i) => {
      button.classList.toggle('active', !ended && i === index);
      if (!ended && i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    segmentButtons.forEach((button, i) => button.classList.toggle('active', !ended && i === index));
    const playing = hasAudio ? !audio.paused : silentPlaying;
    $('play').textContent = playing ? '暂停时间轴' : hasAudio ? '跟随本地音频' : '预览时间轴（静音）';
    $('play').setAttribute('aria-pressed', String(playing));
    $('clock-mode').textContent = hasAudio ? '时钟：本地音频 · 文件不上传' : '时钟：静音预演 · 不代表音乐强弱';
  }

  function seek(time) {
    currentTime = Math.min(plan.duration, Math.max(0, time));
    if (hasAudio && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(currentTime, audio.duration);
    }
    previousFrame = null;
    render();
  }

  function showDetail() {
    if (matchMedia('(max-width: 650px)').matches) {
      $('detail').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }

  $('scrubber').addEventListener('input', event => seek(Number(event.target.value)));
  $('play').addEventListener('click', async () => {
    if (hasAudio) {
      if (audio.paused) {
        if (audio.ended) { audio.currentTime = 0; currentTime = 0; }
        try { await audio.play(); } catch { $('audio-status').textContent = '浏览器暂时无法播放这个文件，可换用 MP3 / M4A / WAV。'; }
      } else audio.pause();
    } else {
      if (currentTime >= plan.duration) currentTime = 0;
      silentPlaying = !silentPlaying;
      previousFrame = null;
    }
    render();
  });
  $('reset').addEventListener('click', () => {
    silentPlaying = false;
    audio.pause();
    seek(0);
  });
  $('file').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    silentPlaying = false;
    audio.pause();
    if (audioURL) URL.revokeObjectURL(audioURL);
    audioURL = URL.createObjectURL(file);
    audio.src = audioURL;
    audio.hidden = false;
    hasAudio = true;
    $('clear-audio').hidden = false;
    $('file-name').textContent = file.name;
    $('audio-status').textContent = '正在读取本地音频；文件不会离开此设备。';
    $('audio-status').classList.remove('warning');
    currentTime = 0;
    render();
  });
  $('clear-audio').addEventListener('click', () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.hidden = true;
    if (audioURL) URL.revokeObjectURL(audioURL);
    audioURL = null;
    hasAudio = false;
    $('file').value = '';
    $('file-name').textContent = '尚未载入音频';
    $('audio-status').textContent = '可先静音查看编排。此页没有包含歌曲录音。';
    $('audio-status').classList.remove('warning');
    $('clear-audio').hidden = true;
    render();
  });
  audio.addEventListener('loadedmetadata', () => {
    const delta = Math.abs(audio.duration - plan.duration);
    $('audio-status').textContent = Number.isFinite(audio.duration)
      ? delta > 2
        ? '文件时长 ' + fmt(audio.duration) + '，与 06:20 版本不同；请重新标注段落，不要按比例拉伸。'
        : '文件时长 ' + fmt(audio.duration) + '。时长相近不代表已校准；请试听核对每个锚点。'
      : '无法读取音频时长，时间轴仍可静音预览。';
    $('audio-status').classList.toggle('warning', delta > 2);
    render();
  });
  audio.addEventListener('error', () => {
    if (hasAudio) $('audio-status').textContent = '这个文件未能播放。可换用 MP3 / M4A / WAV，或继续静音检查时间轴。';
  });
  for (const event of ['play', 'pause', 'ended', 'seeked', 'timeupdate']) audio.addEventListener(event, () => {
    if (hasAudio && Number.isFinite(audio.currentTime)) currentTime = Math.min(plan.duration, audio.currentTime);
    render();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { silentPlaying = false; audio.pause(); previousFrame = null; render(); }
  });
  window.addEventListener('beforeunload', () => { if (audioURL) URL.revokeObjectURL(audioURL); });
  function frame(now) {
    if (hasAudio && !audio.paused) {
      currentTime = Math.min(plan.duration, audio.currentTime);
      render();
    } else if (silentPlaying) {
      if (previousFrame !== null) currentTime = Math.min(plan.duration, currentTime + (now - previousFrame) / 1000);
      previousFrame = now;
      if (currentTime >= plan.duration) silentPlaying = false;
      render();
    }
    requestAnimationFrame(frame);
  }
  render();
  requestAnimationFrame(frame);
}

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>BADGER / 19 — 好不容易 · 导演时间轴</title>
<style>
:root{color-scheme:dark;--bg:#14141b;--panel:#1c1c25;--cream:#f0e7d8;--muted:#aca8b5;--line:#ffffff16;--gold:#e3bf87;--lavender:#b3accb;--scene-color:#e3bf87;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 5% 0%,#37304070,transparent 45%),radial-gradient(ellipse at 95% 15%,#42322a50,transparent 38%),var(--bg);color:var(--cream);line-height:1.65}button,input{font:inherit}button,a,label.file-button{touch-action:manipulation}button{color:inherit;cursor:pointer}button:focus-visible,a:focus-visible,label.file-button:focus-within{outline:2px solid var(--gold);outline-offset:4px}button:disabled{cursor:default}a{color:var(--gold);text-underline-offset:4px}.wrap{width:min(1180px,calc(100% - 64px));margin:auto}header{padding:32px 0 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:16px}.brand{font-size:14px;font-weight:750;letter-spacing:.2em}.brand b{color:var(--gold);font-weight:500}.edition{font-size:11px;color:var(--muted);letter-spacing:.14em}.hero{padding:60px 0 38px;display:grid;grid-template-columns:1fr 290px;gap:40px;align-items:end}.eyebrow{color:var(--gold);font-size:11px;letter-spacing:.22em;margin:0 0 16px}h1{font-size:clamp(28px,3.2vw,44px);line-height:1.35;font-weight:550;letter-spacing:.02em;margin:0 0 16px}.intro{margin:0;max-width:690px;font-size:14px;color:var(--muted)}.hero-note{border-left:1px solid #b3accb66;padding-left:22px;font-size:13px;color:#c6bfce}.hero-note strong{display:block;color:var(--cream);font-weight:500;margin-bottom:6px}.chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:23px}.chip{border:1px solid var(--line);border-radius:20px;padding:4px 11px;font-size:11px;color:#d6cedd}.panel{border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,#23212d99,#1a1a2299);box-shadow:0 18px 55px #00000018}.timeline{padding:27px 28px 24px;margin-bottom:22px}.panel-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:23px}.panel-heading h2{font-size:14px;font-weight:550;margin:0}.legend{display:flex;gap:18px;font-size:10px;color:var(--muted)}.legend span:before{content:"";display:inline-block;width:7px;height:7px;border-radius:2px;background:var(--lavender);margin-right:6px}.legend span:last-child:before{background:repeating-linear-gradient(135deg,#d9b482,#d9b482 2px,#61533e 2px,#61533e 4px)}.bar-shell{position:relative}.segments{height:66px;display:flex;border-radius:8px;overflow:hidden;gap:2px}.segment{position:relative;min-width:0;min-height:44px;flex-grow:0;flex-shrink:1;background:color-mix(in srgb,var(--scene-color) 40%,#23212c);border:0;border-bottom:3px solid transparent;transition:filter .15s,border-color .15s;font-size:10px;color:#f6efe3bb;padding:0}.segment.provisional{background-image:repeating-linear-gradient(135deg,transparent,transparent 6px,#14141b32 6px,#14141b32 8px)}.segment:hover{filter:brightness(1.3)}.segment.active{border-bottom-color:var(--cream);filter:brightness(1.23)}.segment span{pointer-events:none}.playhead{position:absolute;top:-6px;bottom:-6px;width:1px;background:#fff7e8;box-shadow:0 0 10px #fff7e870;pointer-events:none;transition:left .06s linear;z-index:2}.playhead:before{content:"";position:absolute;width:7px;height:7px;top:-3px;left:-3px;background:#fff7e8;transform:rotate(45deg)}.time-scale{position:relative;height:29px;color:#8f8b9d;font-size:10px;padding-top:12px;font-variant-numeric:tabular-nums}.time-scale span{position:absolute;transform:translateX(-50%)}.time-scale span:first-child{transform:none}.time-scale span:last-child{transform:translateX(-100%)}.transport{margin-top:16px;display:grid;grid-template-columns:126px 1fr;gap:23px;align-items:center}.time-readout{font-size:30px;font-weight:350;letter-spacing:.02em;font-variant-numeric:tabular-nums;line-height:1.15}.time-readout small{font-size:10px;color:var(--muted);display:block;margin-top:7px;letter-spacing:.08em}.range-wrap{display:flex;flex-direction:column;gap:11px}input[type=range]{width:100%;margin:0;height:28px;accent-color:var(--gold);cursor:ew-resize}.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.button{min-height:44px;border:1px solid #ffffff21;border-radius:8px;padding:9px 15px;background:#ffffff05;font-size:12px}.button.primary{background:#dec093;color:#29232b;border-color:#dec093;font-weight:600}.clock-mode{font-size:10px;color:var(--muted);margin-left:auto}.layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:22px}.detail{padding:30px;position:relative;overflow:hidden}.detail:before{content:"";width:220px;height:220px;border:1px solid color-mix(in srgb,var(--scene-color) 16%,transparent);border-radius:50%;position:absolute;right:-90px;top:-80px;box-shadow:0 0 0 30px color-mix(in srgb,var(--scene-color) 3%,transparent),0 0 0 65px color-mix(in srgb,var(--scene-color) 2%,transparent);pointer-events:none}.scene-kicker{color:var(--scene-color);font-size:10px;letter-spacing:.2em;margin:0 0 14px}.scene-time{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;margin-bottom:22px}.detail h2{font-size:27px;font-weight:500;margin:0 0 7px;line-height:1.45}.scene-status{display:inline-block;font-size:10px;padding:5px 9px;border-radius:5px;color:#c2bbd2;background:#b3accb0c;border:1px solid #b3accb26;margin:0 0 25px}.scene-status.is-provisional{color:#e3bf87;background:#e3bf870b;border-color:#e3bf872e}.notes{display:grid;gap:22px}.notes article{display:grid;grid-template-columns:60px 1fr;gap:18px}.notes h3{font-size:11px;letter-spacing:.1em;font-weight:500;color:var(--muted);margin:3px 0}.notes p{font-size:13px;margin:0;color:#d9d2df;max-width:620px}.audio-panel{padding:25px 24px;align-self:start}.audio-panel h2{font-size:14px;font-weight:550;margin:0 0 12px}.audio-panel p{font-size:11px;color:var(--muted);margin:0 0 18px}.file-button{display:flex;justify-content:center;align-items:center;min-height:44px;cursor:pointer;border:1px dashed #b3accb66;border-radius:8px;color:#dbd2e8;font-size:12px;background:#b3accb08;position:relative}.file-button input{position:absolute;width:100%;height:100%;opacity:0;inset:0;cursor:pointer}.file-name{margin-top:11px;font-size:11px;color:#ded3be;overflow-wrap:anywhere}.audio-panel audio{width:100%;height:38px;margin:17px 0 12px}.audio-panel .audio-status{font-size:10px;line-height:1.8;margin:13px 0 0}.audio-panel .audio-status.warning{color:#e3bf87}.clear-audio{margin-top:13px;width:100%}.audio-panel .privacy{font-size:9px;border-top:1px solid var(--line);padding-top:15px;margin-top:17px;margin-bottom:0;color:#8f899a}[hidden]{display:none!important}.chapters-panel{margin-top:22px;padding:27px 28px}.section-title{font-size:14px;font-weight:550;margin:0 0 20px}.chapters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.chapter{min-height:78px;border:1px solid var(--line);border-radius:9px;background:#ffffff02;display:flex;align-items:center;gap:13px;padding:12px 13px;text-align:left}.chapter:hover{background:#ffffff05;border-color:#ffffff29}.chapter.active{background:color-mix(in srgb,var(--scene-color) 8%,transparent);border-color:color-mix(in srgb,var(--scene-color) 60%,transparent)}.chapter-number{font-size:12px;color:var(--scene-color);font-variant-numeric:tabular-nums}.chapter strong{font-size:12px;font-weight:500;display:block;line-height:1.5}.chapter small{display:block;font-size:9px;color:var(--muted);margin-top:6px;line-height:1.6}.lower{display:grid;grid-template-columns:1fr 1fr;gap:34px;padding:38px 0 50px}.lower h2{font-size:12px;font-weight:550;margin:0 0 17px}.cues{padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:0 23px;margin:0}.cue button{border:0;border-bottom:1px solid var(--line);background:transparent;width:100%;min-height:55px;display:grid;grid-template-columns:49px 1fr;text-align:left;align-content:center;gap:0 5px;padding:8px 0}.cue time{font-size:11px;color:var(--lavender);grid-row:span 2;font-variant-numeric:tabular-nums}.cue span{font-size:10px}.cue small{color:#8e899b;font-size:8px}.cue.provisional-cue time,.cue.provisional-cue small{color:#d3af7c}.method p{font-size:12px;color:var(--muted);margin:0 0 16px}.method strong{font-weight:500;color:#dbd3e3}.sources{display:flex;gap:7px 17px;flex-wrap:wrap;margin-top:24px}.sources a{font-size:10px;color:#b8aec8}.foot{border-top:1px solid var(--line);padding:22px 0 30px;display:flex;justify-content:space-between;gap:20px;color:#817d8d;font-size:10px}.foot span:last-child{text-align:right} @media(max-width:900px){.hero{grid-template-columns:1fr;gap:22px;padding-top:40px}.hero-note{max-width:660px}.layout{grid-template-columns:minmax(0,1fr) 280px}.detail{padding:25px}.chapters{grid-template-columns:repeat(2,minmax(0,1fr))}.clock-mode{width:100%;margin-left:0}.lower{gap:25px}.cues{grid-template-columns:1fr}}@media(max-width:650px){.wrap{width:calc(100% - 34px)}header{padding:23px 0 18px}.brand{font-size:12px}.edition{font-size:9px;letter-spacing:.08em}.hero{padding:32px 0 27px}h1{font-size:29px}.intro{font-size:12px}.hero-note{font-size:11px;padding-left:15px}.timeline{padding:20px 17px}.panel-heading{align-items:start;gap:14px;margin-bottom:19px}.panel-heading h2{font-size:12px;white-space:nowrap}.legend{font-size:8px;gap:7px;flex-direction:column}.segments{height:55px}.segment span{font-size:8px}.segment:nth-child(6) span,.segment:nth-child(11) span,.segment:nth-child(12) span{display:none}.time-scale{font-size:8px}.transport{grid-template-columns:1fr;gap:13px}.time-readout{display:flex;align-items:baseline;gap:10px;font-size:25px}.time-readout small{display:inline}.range-wrap{gap:7px}.button{font-size:11px;padding:9px 12px}.layout{grid-template-columns:1fr;gap:18px}.detail{padding:23px 21px}.detail h2{font-size:24px}.notes{gap:19px}.notes article{grid-template-columns:40px 1fr;gap:13px}.notes p{font-size:12px}.notes h3{font-size:10px}.audio-panel{padding:22px}.audio-panel audio{max-width:100%}.chapters-panel{padding:22px 17px;margin-top:18px}.chapters{gap:8px}.chapter{min-height:88px;padding:10px;gap:8px;align-items:flex-start}.chapter-number{font-size:10px;margin-top:1px}.chapter strong{font-size:11px}.chapter small{font-size:8px}.lower{grid-template-columns:1fr;gap:28px;padding:28px 0 34px}.cues{grid-template-columns:1fr 1fr;gap:0 16px}.cue button{grid-template-columns:43px 1fr}.cue time{font-size:10px}.cue span{font-size:9px}.cue small{font-size:7px}.foot{font-size:9px;flex-direction:column;gap:7px}.foot span:last-child{text-align:left}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style></head><body><div class="wrap">
<header><div class="brand">BADGER <b>/ 19</b></div><div class="edition">DIRECTOR’S TIMELINE · 制作规划</div></header>
<section class="hero"><div><p class="eyebrow">方大同《好不容易》 · 《15》专辑版</p><h1>把陪伴，留到最后一秒。</h1><p class="intro">先让两只真正握住，再让世界为它们展开。生日祝福留在音乐落稳的地方，让最后留下的，是一张值得收藏的照片。</p><div class="chips"><span class="chip">06:20 完整专辑版</span><span class="chip">12 段镜头编排</span><span class="chip">关系高潮 → 世界高潮</span></div></div><div class="hero-note"><strong>这是导演工作台，不是成片。</strong>已收到并完整解码06:20录音。人声入口仍参考公开时间码；尾奏参考实测能量变化，尚未实听确认强拍。</div></section>
<main><section class="panel timeline" aria-label="导演时间轴"><div class="panel-heading"><h2>音乐 × 镜头</h2><div class="legend"><span>人声段落参考 · ±1.5s</span><span>斜线段 · 含暂定尾奏切点</span></div></div><div class="bar-shell"><div class="segments" id="segments"></div><div class="playhead" id="playhead"></div></div><div class="time-scale" aria-hidden="true"><span style="left:0%">00:00</span><span style="left:15.7895%">01:00</span><span style="left:31.5789%">02:00</span><span style="left:47.3684%">03:00</span><span style="left:63.1579%">04:00</span><span style="left:78.9474%">05:00</span><span style="left:100%">06:20</span></div><div class="transport"><div class="time-readout"><span id="time">00:00.0</span><small>/ 06:20</small></div><div class="range-wrap"><input id="scrubber" type="range" min="0" max="380" step="0.01" value="0" aria-label="时间轴位置"><div class="controls"><button class="button primary" id="play" type="button" aria-pressed="false">预览时间轴（静音）</button><button class="button" id="reset" type="button">回到开场</button><span class="clock-mode" id="clock-mode">时钟：静音预演</span></div></div></div></section>
<div class="layout"><section class="panel detail" id="detail" aria-label="当前镜头规划"><p class="scene-kicker" id="scene-number">SCENE 01 / 12</p><h2 id="scene-title">代码背后，有一盏灯</h2><div class="scene-time" id="scene-time">00:00 — 00:14</div><p class="scene-status" id="scene-status"></p><div class="notes"><article><h3>情绪</h3><p id="emotion"></p></article><article><h3>画面</h3><p id="visual"></p></article><article><h3>探索</h3><p id="interaction"></p></article></div></section><aside class="panel audio-panel"><h2>用最终录音，对齐呼吸。</h2><p>载入自己的本地文件后，时间轴会跟随音频播放位置。拖动时间轴也能直接试听对应段落。</p><label class="file-button">选择本地音频<input type="file" id="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" aria-label="选择本地音频文件"></label><div class="file-name" id="file-name">尚未载入音频</div><audio id="audio" controls preload="metadata" hidden></audio><p class="audio-status" id="audio-status" role="status">可先静音查看编排。此页没有包含歌曲录音。</p><button type="button" id="clear-audio" class="button clear-audio" hidden>移除本地音频</button><p class="privacy">音频仅在当前浏览器内读取，不上传、不保存。这个工作台可独立离线打开。</p></aside></div>
<section class="panel chapters-panel"><h2 class="section-title">十二段，都要有新的事情发生。</h2><div class="chapters" id="chapters"></div></section>
<div class="lower"><section><h2>关键锚点 · 待最终音源复核</h2><ul class="cues" id="cues"></ul></section><section class="method"><h2>这条时间线如何成立</h2><p><strong>约 03:15，关系先抵达。</strong>在最后一次人声副歌，真正握住，停两三秒。先让观众看清选择，再让光进入世界。</p><p><strong>约 03:54，空间重新展开。</strong>长弦乐承担世界展开、花与光生长、回到两只的第二重高潮。具体峰值仍需实听标注，不用循环粒子填满尾奏。</p><p><strong>最后，让热闹慢慢安静。</strong>雪、一次整理围巾的小动作、一张合照，再出现十九岁的祝福。05:45参考实际衰减；06:00、06:08仍为剪辑预算。</p><div class="sources"><a href="https://music.apple.com/us/song/540055025" target="_blank" rel="noreferrer">官方歌曲页 / 时长</a><a href="https://www.hitoradio.com/newweb/279pastmisshito" target="_blank" rel="noreferrer">Hit Fm 本人访问</a><a href="https://www.mulanci.org/lyric/tl193096/" target="_blank" rel="noreferrer">公开 LRC 时间码参考</a></div></section></div></main><footer class="foot"><span>PROJECT BADGER · 情绪与镜头规划 / 2026.11</span><span>实际音源版本、尾奏结构与手机声画同步仍需校准。</span></footer></div>
<script>(${boardApp.toString()})(${embeddedPlan});</script></body></html>`;

await mkdir(here, { recursive: true });
await writeFile(resolve(here, 'timeline-preview.html'), html);
await writeFile(resolve(here, 'song-cues.json'), JSON.stringify(plan, null, 2) + '\n');
if (process.env.BADGER_REVIEW_EXPORT_DIR) {
  const exportDir = resolve(process.env.BADGER_REVIEW_EXPORT_DIR);
  await mkdir(exportDir, { recursive: true });
  await writeFile(resolve(exportDir, 'BADGER-song-timeline.html'), html);
  await writeFile(resolve(exportDir, 'BADGER-song-cues.json'), JSON.stringify(plan, null, 2) + '\n');
}
console.log('Built standalone director timeline: docs/timeline-preview.html');
