import React, { useState, useCallback } from 'react';
import { marked } from 'marked';
import { parseTemplate, extractFieldNamesFromTemplate, generateOutput } from '../utils/templateProcessor';
import { bitable } from '@lark-base-open/js-sdk';

const defaultTemplate = `**[数据中心]：**
  [需求FLOW]-[任务内容]：
    [系统]（[项目名称]）-[开发负责人]<text_tag color=''>[上线类型]</text_tag>`;

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
  const [resultPreviewHtml, setResultPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);

  const updatePreview = useCallback(async (text: string) => {
    const html = await marked(text);
    setPreviewHtml(html);
  }, []);

  React.useEffect(() => {
    updatePreview(template);
  }, [template, updatePreview]);

  React.useEffect(() => {
    const run = async () => {
      if (!result) {
        setResultPreviewHtml('');
        return;
      }
      const html = await marked(result);
      setResultPreviewHtml(html);
    };
    run();
  }, [result]);

  const handleCopyResult = async () => {
  try {
    if (!result) return;

    let copySuccess = false;

    // 尝试现代 Clipboard API
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(result);
        copySuccess = true;
      } catch {
        // 静默失败，继续尝试其他方法
      }
    }

    // 尝试传统 execCommand
    if (!copySuccess) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = result;
        textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(textarea);
        textarea.select();
        copySuccess = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        // 静默失败
      }
    }

    // 最终降级方案
    if (!copySuccess) {
      const input = document.createElement('input');
      input.value = result;
      input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(input);
      input.select();
      setTimeout(() => document.body.removeChild(input), 100);
      alert(`文本已自动选中，请按 Ctrl+C 复制:\n\n${result}`);
    }

    // 显示成功状态
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setError(''); // 清空错误状态
    
  } catch (e) {
    setError('复制失败，请手动选择文本复制');
  }
};

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

      const { groupField, template: templateFields, secondaryTemplate } = parseTemplate(template);
      const output = generateOutput(records, groupField, templateFields, secondaryTemplate);
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
              
              
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '生成中...' : '生成结果'}
          </button>
          <button
            onClick={handleCopyResult}
            disabled={isLoading || !result}
            className="px-4 py-3 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            复制结果
          </button>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="px-4 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {showPreview ? '隐藏预览' : '预览效果'}
          </button>
          {copied && <span className="text-green-600 text-sm">已复制</span>}
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
            
            {showPreview && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Markdown预览</h3>
                <div
                  className="w-full min-h-24 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 overflow-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: resultPreviewHtml }}
                />
              </div>
            )}
          </div>
        )}

        
      </div>
    </div>
  );
};

export default FeishuPlugin;
