function parseVideo(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (host === 'youtu.be') {
      return { provider: 'youtube', id: u.pathname.slice(1) };
    }
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').pop();
      return { provider: 'youtube', id };
    }
    if (host.endsWith('vimeo.com')) {
      return { provider: 'vimeo', id: u.pathname.split('/').filter(Boolean).pop() };
    }
  } catch (e) {
    // ignore malformed URLs
  }
  return null;
}

function embedUrl(video) {
  if (video.provider === 'youtube') {
    return `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`;
  }
  return `https://player.vimeo.com/video/${video.id}?autoplay=1`;
}

function thumbnailUrl(video) {
  if (video.provider === 'youtube') {
    return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  }
  return null;
}

function loadIframe(container, video) {
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl(video);
  iframe.setAttribute('title', 'Video player');
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.setAttribute('loading', 'lazy');
  container.replaceChildren(iframe);
}

export default function decorate(block) {
  const link = block.querySelector('a[href]');
  const video = link && parseVideo(link.href);
  if (!video || !video.id) return;

  block.textContent = '';

  const facade = document.createElement('button');
  facade.className = 'embed-facade';
  facade.type = 'button';
  facade.setAttribute('aria-label', 'Play video');

  const thumb = thumbnailUrl(video);
  if (thumb) {
    facade.style.backgroundImage = `url("${thumb}")`;
  }

  const play = document.createElement('span');
  play.className = 'embed-play';
  play.setAttribute('aria-hidden', 'true');
  facade.append(play);

  facade.addEventListener('click', () => loadIframe(block, video));
  block.append(facade);
}
