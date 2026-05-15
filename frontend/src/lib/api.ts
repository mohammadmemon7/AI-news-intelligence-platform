import axios from 'axios';
import type { ArticlesResponse, StatsResponse, GetArticlesParams, Article } from '../types/article';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getArticles = async (params: GetArticlesParams): Promise<ArticlesResponse> => {
  const { data } = await api.get<ArticlesResponse>('/articles', { params });
  return data;
};

export const getArticle = async (id: string): Promise<{ success: boolean; data: Article }> => {
  const { data } = await api.get<{ success: boolean; data: Article }>(`/articles/${id}`);
  return data;
};

export const getStats = async (): Promise<StatsResponse> => {
  const { data } = await api.get<StatsResponse>('/stats');
  return data;
};

export const runPipeline = async (): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post('/pipeline/run', {}, {
    headers: {
      'x-pipeline-secret': import.meta.env.VITE_PIPELINE_SECRET
    }
  });
  return data;
};

export const getPipelineStatus = async (): Promise<{ success: boolean; data: any }> => {
  const { data } = await api.get('/pipeline/status');
  return data;
};

export const processArticle = async (id: string): Promise<{ success: boolean; data: any }> => {
  const { data } = await api.post(`/pipeline/process/${id}`, {}, {
    headers: {
      'x-pipeline-secret': import.meta.env.VITE_PIPELINE_SECRET
    }
  });
  return data;
};

export default api;
