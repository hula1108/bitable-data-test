export interface MockRecord {
  fields: {
    [key: string]: string;
  };
  record_id: string;
}

export function generateMockData(): MockRecord[] {
  const dataCenters = ['数据中心1', '数据中心2', '数据中心3'];
  const systems = ['系统1', '系统2', '系统3', '系统4', '系统5', '系统6'];
  const projectNames = ['项目名称1', '项目名称2', '项目名称3', '项目名称4', '项目名称5', '项目名称6'];
  const flows = ['需求FLOW1', '需求FLOW2', '需求FLOW3', '需求FLOW4', '需求FLOW5', '需求FLOW6'];
  const tasks = ['任务内容1', '任务内容2', '任务内容3', '任务内容4', '任务内容5', '任务内容6'];
  const developers = ['开发负责人1', '开发负责人2', '开发负责人3', '开发负责人4', '开发负责人5', '开发负责人6'];
  const deployTypes = ['上线类型1', '上线类型2', '上线类型3', '上线类型4', '上线类型5', '上线类型6'];

  const records: MockRecord[] = [];
  
  for (let i = 0; i < 6; i++) {
    records.push({
      record_id: `rec_${i + 1}`,
      fields: {
        '数据中心': dataCenters[i % dataCenters.length],
        '系统': systems[i],
        '项目名称': projectNames[i],
        '需求FLOW': flows[i],
        '任务内容': tasks[i],
        '开发负责人': developers[i],
        '上线类型': deployTypes[i],
        '环境': '生产'
      }
    });
  }

  return records;
}

export function generateMockDataWithEnvironment(): MockRecord[] {
  const records = generateMockData();
  
  // Add some records with different environments
  records.push({
    record_id: 'rec_7',
    fields: {
      '数据中心': '数据中心1',
      '系统': '系统7',
      '项目名称': '项目名称7',
      '需求FLOW': '需求FLOW7',
      '任务内容': '任务内容7',
      '开发负责人': '开发负责人7',
      '上线类型': '上线类型7',
      '环境': '测试'
    }
  });

  records.push({
    record_id: 'rec_8',
    fields: {
      '数据中心': '数据中心2',
      '系统': '系统8',
      '项目名称': '项目名称8',
      '需求FLOW': '需求FLOW8',
      '任务内容': '任务内容8',
      '开发负责人': '开发负责人8',
      '上线类型': '上线类型8',
      '环境': '开发'
    }
  });

  return records;
}