import { getVignette } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ chemin: string[] }> }) {
  const { chemin } = await params;
  const vignette = await getVignette(chemin.join("/"));
  if (!vignette) return new Response("Image introuvable.", { status: 404 });
  return new Response(new Uint8Array(vignette), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" },
  });
}

