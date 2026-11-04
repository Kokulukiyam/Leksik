import { NextResponse } from "next/server";
import { addImage, ErreurDonnees } from "@/lib/data";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const fichier = form.get("fichier");
    if (!(fichier instanceof File) || fichier.size === 0) {
      return NextResponse.json({ erreur: "Aucune photo envoyée." }, { status: 400 });
    }
    const rect = form.get("rectangle");
    const terme = form.get("terme");
    const image = await addImage({
      fichier: Buffer.from(await fichier.arrayBuffer()),
      termId: (form.get("termId") as string) || undefined,
      nouveauTerme: terme
        ? {
            terme: String(terme),
            definition: String(form.get("definition") ?? ""),
            categorie: String(form.get("categorie") ?? ""),
          }
        : undefined,
      rectangle: rect ? JSON.parse(String(rect)) : null,
      lieu: String(form.get("lieu") ?? ""),
    });
    return NextResponse.json(image, { status: 201 });
  } catch (e) {
    if (e instanceof ErreurDonnees || e instanceof SyntaxError) {
      return NextResponse.json({ erreur: e.message }, { status: 400 });
    }
    throw e;
  }
}
