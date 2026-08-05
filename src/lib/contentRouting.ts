export type RoutableContent = {
  area?: string | null;
  format?: string | null;
};

function normalizeContentValue(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_');
}

export function isVideoContent(content: RoutableContent) {
  const area = normalizeContentValue(content.area);
  const format = normalizeContentValue(content.format);

  const videoAreas = [
    'FILMMAKER',
    'AUDIOVISUAL',
    'VIDEO',
    'VIDEOS',
  ];

  if (videoAreas.includes(area)) {
    return true;
  }

  const videoTerms = [
    'REEL',
    'REELS',
    'VIDEO',
    'VIDEOS',
    'STORY',
    'STORIES',
    'TIKTOK',
    'SHORT',
    'SHORTS',
    'YOUTUBE',
  ];

  return videoTerms.some((term) => format.includes(term));
}

export function getApprovedContentDestination(
  content: RoutableContent
): 'DESIGN' | 'FILMMAKER' {
  return isVideoContent(content) ? 'FILMMAKER' : 'DESIGN';
}