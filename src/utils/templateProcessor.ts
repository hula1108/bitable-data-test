export interface TemplateField {
  name: string;
  type: 'field' | 'text';
}

export interface ParsedTemplate {
  groupField: string;
  template: TemplateField[];
}

export function parseTemplate(template: string): ParsedTemplate {
  const lines = template.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('Template must have at least 2 lines');
  }

  // Parse first line to get group field
  const firstLineMatch = lines[0].match(/\[([^\]]+)\]/);
  if (!firstLineMatch) {
    throw new Error('First line must contain a field name in brackets');
  }
  const groupField = firstLineMatch[1];

  // Parse second line to get template
  const secondLine = lines[1];
  const templateFields: TemplateField[] = [];
  
  let currentIndex = 0;
  while (currentIndex < secondLine.length) {
    const fieldMatch = secondLine.substring(currentIndex).match(/^\[([^\]]+)\]/);
    if (fieldMatch) {
      templateFields.push({ name: fieldMatch[1], type: 'field' });
      currentIndex += fieldMatch[0].length;
    } else {
      const nextBracket = secondLine.indexOf('[', currentIndex);
      const textEnd = nextBracket === -1 ? secondLine.length : nextBracket;
      const text = secondLine.substring(currentIndex, textEnd);
      if (text) {
        templateFields.push({ name: text, type: 'text' });
      }
      currentIndex = textEnd;
    }
  }

  return { groupField, template: templateFields };
}

export function extractFieldNamesFromTemplate(template: string): string[] {
  const fieldNames: Set<string> = new Set();
  const matches = template.match(/\[([^\]]+)\]/g);
  
  if (matches) {
    matches.forEach(match => {
      const fieldName = match.slice(1, -1);
      fieldNames.add(fieldName);
    });
  }
  
  return Array.from(fieldNames);
}

export function generateOutput(
  records: Array<{ record_id: string; fields: Record<string, string> }>,
  groupField: string,
  template: TemplateField[]
): string {
  // Group records by the group field
  const groups = new Map<string, Array<{ record_id: string; fields: Record<string, string> }>>();
  
  records.forEach(record => {
    const groupValue = record.fields[groupField];
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)!.push(record);
  });

  // Generate output for each group
  const output: string[] = [];
  
  groups.forEach((groupRecords, groupValue) => {
    output.push(`**${groupValue}：**`);
    
    groupRecords.forEach((record, index) => {
      let line = `  ${index + 1}. `;
      
      template.forEach(field => {
        if (field.type === 'field') {
          const fieldValue = record.fields[field.name] || '';
          line += fieldValue;
        } else {
          line += field.name;
        }
      });
      
      output.push(line);
    });
    
    output.push('');
  });

  return output.join('\n').trim();
}

// export function filterRecordsByEnvironment(
//   records: Array<{ record_id: string; fields: Record<string, string> }>,
//   environment: string = '生产'
// ): Array<{ record_id: string; fields: Record<string, string> }> {
//   return records.filter(record => record.fields['环境'] === environment);
// }
