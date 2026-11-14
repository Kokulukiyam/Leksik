/**
 * Nombre avec espace fine entre les milliers. L'espace est une marge, pas un caractère :
 * le texte reste « 1009 » pour la recherche, la copie et les lecteurs d'écran.
 */
export default function Nombre({ n }: { n: number }) {
  const s = String(n);
  if (s.length < 4) return <>{s}</>;
  const tete = s.length % 3 || 3;
  const groupes = [s.slice(0, tete)];
  for (let i = tete; i < s.length; i += 3) groupes.push(s.slice(i, i + 3));
  return (
    <>
      {groupes.map((g, k) =>
        k === 0 ? g : (
          <span key={k} className="ml-[0.17em]">
            {g}
          </span>
        ),
      )}
    </>
  );
}
