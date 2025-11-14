import React, { useState, useCallback } from 'react';
import { marked } from 'marked';
import { parseTemplate, extractFieldNamesFromTemplate, generateOutput } from '../utils/templateProcessor';
import { bitable } from '@lark-base-open/js-sdk';

const defaultTemplate = `[数据中心]：
  [系统]、[项目名称]、[需求FLOW]、[任务内容]、[开发负责人]、[上线类型]`;

const FeishuPlugin: React.FC = () => {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [appToken, setAppToken] = useState('');
  const [tableId, setTableId] = useState('');
  const [template, setTemplate] = useState(defaultTemplate);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const updatePreview = useCallback(async (text: string) => {
    const html = await marked(text);
    setPreviewHtml(html);
  }, []);

  React.useEffect(() => {
    updatePreview(template);
  }, [template, updatePreview]);

  const handleGenerate = async () => {
    const isDemoMode = !appId || !appSecret || !appToken || !tableId;
    const sdkAvailable = !!bitable?.base;

    setIsLoading(true);
    setError('');
    setResult('');

    try {
      let records: { record_id: string; fields: Record<string, string> }[] = [];

      if (sdkAvailable) {
        const { groupField } = parseTemplate(template);
        const fieldNames = extractFieldNamesFromTemplate(template);
        const table = await bitable.base.getActiveTable();
        const metas = await table.getFieldMetaList();
        const nameToId = new Map<string, string>();
        metas.forEach((m: { id: string; name: string }) => nameToId.set(m.name, m.id));

        const envFieldId = nameToId.get('环境');
        const groupFieldId = nameToId.get(groupField);

        const resp = await table.getRecordList();

        console.log("metas:", metas);
        console.log("resp:", resp.toString());
        const sdkRecords = [];
        if (resp && typeof resp[Symbol.iterator] === 'function') {
          for (const record of resp) {
            sdkRecords.push(record);
          }
        }

        for (const r of sdkRecords) {
          const rid = r.recordId ?? r.id ?? r.record_id;
          if (envFieldId) {
            const envStr = await table.getCellString(envFieldId, rid);
            if (envStr !== '生产') continue;
          }

          const fieldsByName: Record<string, string> = {};
          if (groupFieldId) {
            const gv = await table.getCellString(groupFieldId, rid);
            fieldsByName[groupField] = gv;
          }
          for (const fname of fieldNames) {
            const fid = nameToId.get(fname);
            if (!fid) continue;
            const sv = await table.getCellString(fid, rid);
            fieldsByName[fname] = sv ?? '';
          }
          records.push({ record_id: rid, fields: fieldsByName });
        }
      }

      // const filteredRecords = filterRecordsByEnvironment(records);

      if (records.length === 0) {
        setResult('没有找到环境为"生产"的数据');
        return;
      }

      const { groupField, template: templateFields } = parseTemplate(template);
      const output = generateOutput(records, groupField, templateFields);
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成结果时出错');
    } finally {
      setIsLoading(false);
    }
  };

  const isDemoMode = !appId || !appSecret || !appToken || !tableId;
  const sdkAvailable = !!bitable?.base;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">飞书多维表格插件</h1>
          {sdkAvailable && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">JS SDK模式</div>
          )}
          {!sdkAvailable && isDemoMode && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              演示模式
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {!
            sdkAvailable && (
              <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">配置信息</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App ID
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入飞书应用的 App ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Secret
                </label>
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入飞书应用的 App Secret"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Token
                </label>
                <input
                  type="text"
                  value={appToken}
                  onChange={(e) => setAppToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入多维表格的 App Token"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table ID
                </label>
                <input
                  type="text"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入数据表的 Table ID"
                />
              </div>
            </div>
          </div>
            )
          }

          {/* Template Editor */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">模板编辑</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模板内容
                </label>
                <textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="请输入模板内容"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预览
                </label>
                <div 
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 overflow-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '生成中...' : '生成结果'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">生成结果</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{result}</pre>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigator.clipboard.writeText(result)}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                复制结果
              </button>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使用说明</h3>
          <div className="text-blue-800 space-y-2">
            <p>1. <strong>JS SDK模式：</strong>在飞书多维表格插件环境中打开，直接读取当前激活数据表，无需填写任何配置</p>
            <p>2. <strong>演示模式：</strong>本地开发或未在飞书环境中运行时，使用演示数据测试功能</p>
            <p>3. <strong>后端API模式：</strong>如需跨文档读取，可填写（App ID、App Secret、App Token、Table ID）使用开放平台接口</p>
            <p>4. 在模板编辑器中编辑模板内容，使用 [字段名] 格式引用数据表字段</p>
            <p>5. 第一行的 [字段名] 将作为分组字段</p>
            <p>6. 系统会自动筛选环境为"生产"的数据</p>
            <p>7. 点击"生成结果"按钮生成格式化后的输出</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeishuPlugin;
