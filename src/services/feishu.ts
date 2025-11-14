import axios from 'axios';

export interface FeishuRecord {
  fields: Record<string, string | number | boolean | null>;
  record_id: string;
}

export interface FeishuTableData {
  records: FeishuRecord[];
  total: number;
  has_more: boolean;
}

class FeishuService {
  private baseURL = 'https://open.feishu.cn/open-apis';
  private appId: string;
  private appSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/v3/tenant_access_token/internal`, {
        app_id: this.appId,
        app_secret: this.appSecret,
      });

      const { tenant_access_token, expire } = response.data;
      this.accessToken = tenant_access_token;
      this.tokenExpiry = Date.now() + (expire - 60) * 1000; // Refresh 1 minute before expiry
      
      return tenant_access_token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw new Error('Failed to authenticate with Feishu');
    }
  }

  async getTableRecords(
    appToken: string,
    tableId: string,
    filter?: string,
    fieldNames?: string[]
  ): Promise<FeishuTableData> {
    const token = await this.getAccessToken();
    
    const params: Record<string, string> = {};
    if (filter) params.filter = filter;
    if (fieldNames) params.field_names = fieldNames.join(',');

    try {
      const response = await axios.get(
        `${this.baseURL}/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params,
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch table records:', error);
      throw new Error('Failed to fetch table data');
    }
  }

  async getAllTableRecords(
    appToken: string,
    tableId: string,
    filter?: string,
    fieldNames?: string[]
  ): Promise<FeishuRecord[]> {
    const allRecords: FeishuRecord[] = [];
    let pageToken: string | undefined;

    do {
      const token = await this.getAccessToken();
      const params: { [k: string]: string | number } = { page_size: 500 };
      
      if (filter) params.filter = filter;
      if (fieldNames) params.field_names = fieldNames.join(',');
      if (pageToken) params.page_token = pageToken;

      try {
        const response = await axios.get(
          `${this.baseURL}/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            params,
          }
        );

        const data = response.data.data;
        allRecords.push(...data.records);
        pageToken = data.has_more ? data.page_token : undefined;
      } catch (error) {
        console.error('Failed to fetch table records:', error);
        throw new Error('Failed to fetch table data');
      }
    } while (pageToken);

    return allRecords;
  }
}

export default FeishuService;
