/**
 * 图片上传 API 服务
 */

// API 响应类型
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 上传单张图片响应
interface UploadImageResp {
  url: string;
}

// 上传多张图片响应
interface UploadMultipleResp {
  urls: string[];
}

// 通用请求函数
async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// 上传 API
export const uploadApi = {
  /**
   * 上传单张图片
   * @param image Base64图片数据
   * @param folder 存储目录（可选，默认 images）
   * @returns 图片URL
   */
  uploadImage: async (image: string, folder?: string): Promise<string> => {
    const response = await request<UploadImageResp>('/api/v1/upload/image', {
      method: 'POST',
      body: JSON.stringify({
        image,
        folder: folder || 'images',
      }),
    });

    if (response.code !== 0) {
      throw new Error(response.msg);
    }

    return response.data.url;
  },

  /**
   * 上传多张图片
   * @param images 图片列表 [{image: base64, folder: string}]
   * @returns 图片URL列表
   */
  uploadMultiple: async (images: { image: string; folder?: string }[]): Promise<string[]> => {
    const response = await request<UploadMultipleResp>('/api/v1/upload/multiple', {
      method: 'POST',
      body: JSON.stringify({
        images: images.map(img => ({
          image: img.image,
          folder: img.folder || 'images',
        })),
      }),
    });

    if (response.code !== 0) {
      throw new Error(response.msg);
    }

    return response.data.urls;
  },
};

export default uploadApi;
