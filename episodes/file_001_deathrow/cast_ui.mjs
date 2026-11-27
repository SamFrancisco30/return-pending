// What the feed can show about the people and their special kit, shared by every act of FILE 001.
//   PORTRAITS: dossier photos for dialogue lines marked `card: true` (the line is then shown in a box with the face, name, rank and job).
//              DISPATCH is only ever a voice and has no photo.
//   EQUIP:     special-equipment cards, shown beside the action the first time the piece matters.
// Looks, ranks' wording and the shield's text are proposals for the picture, not canon.
const F = "../scene/portraits/";
export const PORTRAITS = {
  KNOX: { img: F + "knox.png", tag: "RANK A  //  CAPTAIN" },
  FUSE: { img: F + "fuse.png", tag: "RANK B  //  DEMOLITIONS" },
  REYES: { img: F + "reyes.png", tag: "RANK D  //  RECON" },
  MILLER: { img: F + "miller.png", tag: "RANK C  //  RIFLEMAN" },
  COLE: { img: F + "cole.png", tag: "RANK C  //  RECOVERY" },
};
// marks the first line each of the named people speaks (and any line whose text is listed) to be shown with the face
export function withFaces(subtitles, { first = Object.keys(PORTRAITS), also = [] } = {}) {
  const seen = new Set();
  return subtitles.map(s => { const hit = (first.includes(s.who) && !seen.has(s.who)) || also.includes(s.text); seen.add(s.who); return hit && PORTRAITS[s.who] ? { ...s, card: true } : s; });
}
export const EQUIP = {
  shield: (from, to) => ({
    from, to, kind: "shield", color: "#6fdcff", img: "../library/characters/knox/guard/0000.png",
    label: "SPECIAL EQUIPMENT", klass: "CLASS II", name: "LIGHT SHIELD", sub: "CARRIED BY KNOX",
    lines: ["Charged with light, then struck:", "it throws back whatever stands", "within three metres in front of it.", "Must recharge after every use."],
    stat: { label: "REACH", value: "3 M", frac: 0.3 },
  }),
};
