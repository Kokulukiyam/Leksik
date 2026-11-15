// Nettoie les crédits venus de Commons : le champ « auteur » y contient souvent des phrases entières
// (« This Photo was taken by X. Feel free… », « X from Ville, Pays »). On ne garde que le nom.
const REGLES = [
  [/^L[’']auteur n[’']a pas pu être identifié automatiquement\. Il est supposé qu[’']il s[’']agit de : (.+?) \(étant donné.*$/, "$1"],
  [/^This Photo was taken by (.+?) \. .*$/, "$1"],
  [/^.*Cette photographie a été prise par (.+?) et publié.*$/, "$1"],
  [/^.*Please credit as "([^",]+).*$/, "$1"],
  [/^.*Please attribute as: (.+?)( \(Wikimedia\))?$/, "$1"],
  [/^(.+?) This image was made by .*$/, "$1"],
  [/^(.+?) \( \1 \) .*$/, "$1"],
  [/^(\S+) \S+ \[at\] \S+.*$/, "$1"],
  [/^.+\.jpe?g : (.+?) derivative work: (.+?) \( talk \)$/i, "$1, $2"],
  [/^(\S+) Cette photo a été créée.*$/, "$1"],
  [/^(\S+) \( t \/ c .*$/, "$1"],
  [/^Department of State\. .*$/, "U.S. Department of State"],
  [/^Photo by /, ""],
  [/\s+from [^,]+(, [^,]+){0,2}( and .+)?$/, ""],
  [/\.? – /, ", "],
];

export function nettoyerAuteur(brut) {
  let a = (brut ?? "").replace(/\s+/g, " ").trim();
  for (const [re, par] of REGLES) a = a.replace(re, par).trim();
  // Phrase sans nom exploitable : on renvoie vers la page source, où le crédit complet figure.
  if (a.length > 80 || /^I would /.test(a)) return "Auteur indiqué sur la page source";
  return a.replace(/'/g, "’");
}

const LICENCES = { "Public domain": "Domaine public", "No restrictions": "Sans restriction connue", Attribution: "Attribution requise" };
export const nettoyerLicence = (l) => LICENCES[l] ?? l;
