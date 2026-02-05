// Field mapping for metadata sections
export const FIELD_MAPPINGS = {
  Who: [
    "Number of Participants",
    "Gender of Participants",
    "Age",
    "Grouping",
    "Geometrical Formation",
    "Connection between Dancers",
  ],
  Movement: [
    "Type of Leg Movements",
    "Direction of Movement (related to dancer)",
    "Direction of pathway (orientation in space)",
    "Level",
    "Base",
    "Focus (Attention)",
    "Shape",
    "Shape Qualities",
    "Movement in relation to Space",
    "Pathways",
    "Space",
  ],
  Effort: [
    "Weight",
    "Time",
    "Flow",
    "Hand Movements",
  ],
  Body: [
    "Characteristic Body Types",
    "Movement Repetition",
    "Movement Initiation",
    "Connection between body parts",
    "Movement Flow",
    "Lines of Patterned Movements",
    "Motifs of Movements",
    "Intensity/dynamics",
  ],
  Rhythm: [
    "Tempo",
    "Meter",
    "Relationship between dance and music",
  ],
  Where: [
    "Location",
    "Space used specifically for dance",
    "Boundary Markers",
    "Region (manual input)",
    "Country",
  ],
  When: [
    "Time of Year",
    "Time of Day",
  ],
  Other: [
    "Relationship between dance and costume",
    "Relationship between dance and implements",
    "Visual",
    "Function (manual input)",
  ],
} as const;

export type SectionName = keyof typeof FIELD_MAPPINGS;

export function getFieldsForSection(
  section: SectionName,
  fields: Record<string, string | null>
): Array<[string, string | null]> {
  const sectionFields = FIELD_MAPPINGS[section];
  return sectionFields
    .map((fieldName) => [fieldName, fields[fieldName] ?? null] as [string, string | null])
    .filter(([, value]) => value !== null && value !== undefined);
}

export function getDominantValue(
  segments: Array<{ fields: Record<string, string | null> }>,
  fieldName: string
): string {
  if (!segments || segments.length === 0) return "N/A";
  
  // Use first segment's value as dominant
  const firstValue = segments[0].fields[fieldName];
  if (firstValue !== null && firstValue !== undefined && firstValue !== "") {
    return firstValue;
  }
  
  return "N/A";
}
