import { NextResponse } from "next/server";
import { deleteImage, ErreurDonnees, updateImage } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

function erreur(e: unknown) {
  if (e instanceof ErreurDonnees || e instanceof SyntaxError) {
    return NextResponse.json({ erreur: e.message }, { status: 400 });
  }
  throw e;
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const image = await updateImage(id, {
      termId: body.termId,
      rectangle: body.rectangle,
      statut: body.statut,
    });
    return NextResponse.json(image);
  } catch (e) {
    return erreur(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await deleteImage(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erreur(e);
  }
}
