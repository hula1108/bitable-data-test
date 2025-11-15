export interface TemplateField {
  name: string;
  type: 'field' | 'text';
}

export interface ParsedTemplate {
  groupField: string;
  template: TemplateField[];
  secondaryTemplate?: TemplateField[];
}

export function parseTemplate(template: string): ParsedTemplate {
  const lines = template.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('Template must have at least 2 lines');
  }

  const firstLineMatch = lines[0].match(/\[([^\]]+)\]/);
  if (!firstLineMatch) {
    throw new Error('First line must contain a field name in brackets');
  }
  const groupField = firstLineMatch[1];

  if (lines.length >= 3) {
    const secondaryTemplate = parseInlineTemplate(lines[1]);
    const itemTemplate = parseInlineTemplate(lines[2]);
    return { groupField, template: itemTemplate, secondaryTemplate };
  } else {
    const itemTemplate = parseInlineTemplate(lines[1]);
    return { groupField, template: itemTemplate };
  }
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

// 检查记录是否有效（系统和项目名称不同时为空）
function isRecordValid(record: { record_id: string; fields: Record<string, string> }): boolean {
  const system = record.fields['系统'] || '';
  const projectName = record.fields['项目名称'] || '';
  // 如果系统和项目名称都为空，则记录无效
  return !(system === '' && projectName === '');
}

export function generateOutput(
  records: Array<{ record_id: string; fields: Record<string, string> }>,
  groupField: string,
  template: TemplateField[],
  secondaryTemplate?: TemplateField[]
): string {
  // Group records by the group field
  const groups = new Map<string, Array<{ record_id: string; fields: Record<string, string> }>>();
  
  records.forEach(record => {
    // 只有有效记录才添加到分组中
    if (isRecordValid(record)) {
      const groupValue = record.fields[groupField];
      if (!groups.has(groupValue)) {
        groups.set(groupValue, []);
      }
      groups.get(groupValue)!.push(record);
    }
  });

  // Generate output for each group
  const output: string[] = [];
  const order = ['国内', 'SG全球', 'EU全球', '亚太', '欧洲', '北美'];
  const suffix: Record<string, string> = {
    '国内': '国内22:00',
    'SG全球': 'SG全球23:00',
    'EU全球': 'EU全球23:00',
    '亚太': '亚太23:00',
    '欧洲': '欧洲 次日10:00',
    '北美': '北美 次日14:00'
  };
  const getOrder = (value: string) => {
    if (groupField === '数据中心') {
      const idx = order.indexOf(value);
      return idx === -1 ? order.length : idx;
    }
    return 0;
  };
  const getDisplay = (value: string) => {
    if (groupField === '数据中心') {
      return suffix[value] ?? value;
    }
    return value;
  };
  const existingKeys = Array.from(groups.keys());
  const otherKeys = existingKeys.filter(k => !order.includes(k)).sort((a, b) => a.localeCompare(b));
  const displayKeys = [...order, ...otherKeys];
  
  if (secondaryTemplate && secondaryTemplate.length) {
    displayKeys.forEach((groupValue) => {
      const groupRecords = groups.get(groupValue) || [];
      output.push(`**${getDisplay(groupValue)}：**`);
      const secondaryMap = new Map<string, Array<{ record_id: string; fields: Record<string, string> }>>();
      groupRecords.forEach(record => {
        const secVal = renderInline(record, secondaryTemplate);
        if (!secondaryMap.has(secVal)) secondaryMap.set(secVal, []);
        secondaryMap.get(secVal)!.push(record);
      });
      
      // 检查是否有有效的二级分组记录
      let hasValidRecords = false;
      secondaryMap.forEach((recordsInSec) => {
        recordsInSec.forEach((record) => {
          // 检查记录是否包含有效的字段值
          for (const field of template) {
            if (field.type === 'field' && record.fields[field.name]) {
              hasValidRecords = true;
              return;
            }
          }
        });
      });
      
      if (hasValidRecords) {
        secondaryMap.forEach((recordsInSec, secVal) => {
          output.push(`  ${secVal}`);
          recordsInSec.forEach((record, index) => {
            let line = `    ${index + 1}. `;
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
      } else {
        // 没有有效记录时显示"无"
        output.push('  无');
        output.push('');
      }
    });
  } else {
    displayKeys.forEach((groupValue) => {
      const groupRecords = groups.get(groupValue) || [];
      output.push(`**${getDisplay(groupValue)}：**`);
      
      // 检查是否有有效的记录
      let hasValidRecords = false;
      groupRecords.forEach((record) => {
        // 检查记录是否包含有效的字段值
        for (const field of template) {
          if (field.type === 'field' && record.fields[field.name]) {
            hasValidRecords = true;
            return;
          }
        }
      });
      
      if (hasValidRecords) {
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
      } else {
        // 没有有效记录时显示"无"
        output.push('  无');
      }
      
      // 添加一个空行分隔不同的数据中心
      if (displayKeys.indexOf(groupValue) < displayKeys.length - 1) {
        output.push('');
      }
    });
  }

  return output.join('\n').trim();
}

export function parseInlineTemplate(template: string): TemplateField[] {
  const fields: TemplateField[] = [];
  let currentIndex = 0;
  while (currentIndex < template.length) {
    const fieldMatch = template.substring(currentIndex).match(/^\[([^\]]+)\]/);
    if (fieldMatch) {
      fields.push({ name: fieldMatch[1], type: 'field' });
      currentIndex += fieldMatch[0].length;
    } else {
      const nextBracket = template.indexOf('[', currentIndex);
      const textEnd = nextBracket === -1 ? template.length : nextBracket;
      const text = template.substring(currentIndex, textEnd);
      if (text) {
        fields.push({ name: text, type: 'text' });
      }
      currentIndex = textEnd;
    }
  }
  return fields;
}

// 上线类型颜色映射
export const onlineTypeColorMap: Record<string, string> = {
  '提测需求': 'blue',
  '自测需求': 'wathet',
  '自研优化': 'turquoise',
  '质量待办': 'yellow',
  'BUG修复': 'carmine'
};

export function renderInline(
  record: { record_id: string; fields: Record<string, string> },
  tokens: TemplateField[]
): string {
  let result = '';
  tokens.forEach(token => {
    if (token.type === 'field') {
      const fieldValue = record.fields[token.name] || '';
      // 特殊处理上线类型，添加颜色标签
      if (token.name === '上线类型' && fieldValue && onlineTypeColorMap[fieldValue]) {
        result += `<text_tag color='${onlineTypeColorMap[fieldValue]}'>${fieldValue}</text_tag>`;
      } else {
        result += fieldValue;
      }
    } else {
      // 检查文本中是否包含上线类型的模板字符串
      if (token.name.includes('[上线类型]')) {
        const fieldValue = record.fields['上线类型'] || '';
        if (fieldValue && onlineTypeColorMap[fieldValue]) {
          result += token.name.replace(
            '[上线类型]',
            `<text_tag color='${onlineTypeColorMap[fieldValue]}'>${fieldValue}</text_tag>`
          );
        } else {
          result += token.name.replace('[上线类型]', fieldValue);
        }
      } else {
        result += token.name;
      }
    }
  });
  return result;
}
