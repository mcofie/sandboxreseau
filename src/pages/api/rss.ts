export const prerender = false;

export async function GET() {
  const feedUrl = 'https://api.substack.com/feed/podcast/7581260.rss';

  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      return new Response('Failed to fetch RSS feed', { status: response.status });
    }

    const xml = await response.text();

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    return new Response('RSS proxy error', { status: 502 });
  }
}
