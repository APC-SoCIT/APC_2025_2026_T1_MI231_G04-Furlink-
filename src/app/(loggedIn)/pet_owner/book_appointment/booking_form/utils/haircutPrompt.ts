const STYLE_DETAILS: Record<string, string> = {
  'Teddy Bear Cut':
    'a rounded, plush "teddy bear" trim: fur kept at a medium length all over (roughly 1-1.5 inches), ' +
    'face and head fur rounded into a full, fluffy circular shape framing the eyes, ears trimmed neatly ' +
    'but left soft-edged, legs left slightly fuller and rounded at the paws like little pillars, overall ' +
    'silhouette soft, plush, and evenly rounded with no sharp lines',
  'Puppy Cut':
    'a classic all-over "puppy cut": fur trimmed to a short, uniform length (about 1 inch) evenly across ' +
    'the body, legs, and head, face trimmed short and neat rather than rounded or sculpted, ears trimmed ' +
    'close to follow their natural shape, tail trimmed short and even, overall look clean, low-maintenance, ' +
    'and youthful with no dramatic shaping anywhere',
  'Lion Cut':
    'a dramatic "lion cut": body fur shaved very short and close to the skin from the ribcage back through ' +
    'the hindquarters and tail (leaving only a tufted pom at the very tip of the tail), while the fur on the ' +
    'head, neck, chest, and front legs down to the "elbow" is left long, thick, and voluminous like a mane, ' +
    'a sharp, visible line where the short-shaved body meets the long mane fur, strong visual contrast between ' +
    'the shaved and unshaved sections',
  'Summer / Short All-Over Trim':
    'a short, practical summer trim: fur clipped very short and uniform (close to 0.5 inch) across the entire ' +
    'body including legs, head, and tail, no shaping, rounding, or contouring of any kind, ears trimmed close ' +
    'and flat against the head, the coat should look neat, cool, and minimal with an even buzzed texture ' +
    'throughout',
};

export function buildHaircutPrompt(petType: string, style: string): string {
  const petLabel = petType.toLowerCase();
  const styleClause =
    STYLE_DETAILS[style] ?? `a "${style}" haircut, groomed neatly and evenly`;

  return (
    `Professional pet grooming after-photo. Keep the exact same ${petLabel} ` +
    `(same face, same eyes, same fur color and markings, same pose, same background, same lighting), ` +
    `but re-style its coat into ${styleClause}. ` +
    `The haircut should be clearly and visibly distinct in length and shape from the pet's original coat in the ` +
    `source photo. Realistic, well-lit pet salon photo, natural fur texture, no text, no watermark.`
  );
}