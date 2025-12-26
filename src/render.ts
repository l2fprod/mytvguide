import './styles.css'

function parseISO(s: any) { if (!s) return null; return new Date(s); }
function minutesBetween(a: Date, b: Date) { return (b.getTime() - a.getTime()) / 60000; }

function createProgramBlock(prog: any, timelineStart: Date, ppm: number) {
  const start = parseISO(prog.start);
  const end = parseISO(prog.end) || new Date(start.getTime() + 30*60000);
  const minsFromStart = minutesBetween(timelineStart, start);
  const durationMins = Math.max(1, minutesBetween(start, end));
  const el = document.createElement('div');
  el.className = 'prog';
  el.style.left = (minsFromStart * ppm) + 'px';
  el.style.width = (durationMins * ppm) + 'px';
  el.title = prog.title + (prog.desc ? '\n' + prog.desc : '');
  el.textContent = prog.title;
  return el;
}

export function render(schedule: any, ppm: number) {
  const container = document.getElementById('timeline');
  if (!container) return;
  container.innerHTML = '';

  const starts = schedule.channels.flatMap((c: any) => c.programmes.map((p: any) => parseISO(p.start)).filter(Boolean));
  const ends = schedule.channels.flatMap((c: any) => c.programmes.map((p: any) => parseISO(p.end)).filter(Boolean));
  if (starts.length === 0) {
    container.textContent = 'No programmes found in data/xmltv.xml';
    return;
  }

  const minStartMs = starts.reduce((m: number, d: Date) => Math.min(m, d.getTime()), Infinity);
  const maxEndMs = ends.reduce((M: number, d: Date) => Math.max(M, d.getTime()), -Infinity);
  const minStart = new Date(minStartMs);
  const maxEnd = new Date(maxEndMs);
  const timelineStart = new Date(minStart.getTime() - 60*60000);
  const timelineEnd = new Date(maxEnd.getTime() + 60*60000);
  const totalMinutes = Math.max(60, minutesBetween(timelineStart, timelineEnd));
  const totalWidth = Math.ceil(totalMinutes * ppm);

  const header = document.createElement('div');
  header.className = 'timeline-header';
  header.style.overflowX = 'auto';
  const headerInner = document.createElement('div');
  headerInner.className = 'timeline-header-inner';
  headerInner.style.position = 'relative';
  headerInner.style.width = totalWidth + 'px';
  let tMs = timelineStart.getTime();
  const endMs = timelineEnd.getTime();
  let tickCount = 0;
  const MAX_TICKS = 1000;
  while (tMs <= endMs && tickCount < MAX_TICKS) {
    const tDate = new Date(tMs);
    const tick = document.createElement('div');
    tick.className = 'tick';
    const mins = minutesBetween(timelineStart, tDate);
    tick.style.left = (mins * ppm) + 'px';
    tick.textContent = tDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    headerInner.appendChild(tick);
    tMs += 60 * 60 * 1000;
    tickCount++;
  }
  header.appendChild(headerInner);

  const oldHeader = document.querySelector('.timeline-header');
  if (oldHeader) oldHeader.remove();
  container.parentNode?.insertBefore(header, container);

  const channelsContainer = document.createElement('div');
  channelsContainer.className = 'channels';
  channelsContainer.style.width = '100%';
  channelsContainer.style.overflow = 'auto';

  schedule.channels.forEach((channel: any) => {
    const row = document.createElement('div');
    row.className = 'channel-row';
    const label = document.createElement('div');
    label.className = 'channel-label';
    label.textContent = channel.name || channel.id;
    row.appendChild(label);

    const track = document.createElement('div');
    track.className = 'channel-track';
    track.style.width = totalWidth + 'px';

    channel.programmes.forEach((p: any) => {
      const b = createProgramBlock(p, timelineStart, ppm);
      track.appendChild(b);
    });

    row.appendChild(track);
    channelsContainer.appendChild(row);
  });

  container.appendChild(channelsContainer);

  header.addEventListener('scroll', () => { channelsContainer.scrollLeft = header.scrollLeft; });
  channelsContainer.addEventListener('scroll', () => { header.scrollLeft = channelsContainer.scrollLeft; });
}
