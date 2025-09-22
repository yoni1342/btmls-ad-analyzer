import { create } from 'zustand';
import { DashboardData } from './datamapper';

export type AppState = {
  brands: { id: string; brand_name: string }[];
  selectedBrand?: { id: string; brand_name: string };
  dateRange: { start: Date; end: Date };
  sentiment: string;
  funnel: string;
  angel: string;
  campaignStatus: string;
  campaignObjective: string;
  adsetStatus: string;
  adsetOptimization: string;
  searchQuery: string;
  selectedTab: string;
  brandData: DashboardData | null;
  loading: boolean;
  untrackedAdsCount: number;
  untrackedCommentsCount: number;
  untrackedAdIds: string[];
  untrackedCommentIds: string[];
  isAdAnalyzing: boolean;
  isCommentAnalyzing: boolean;

  setBrands: (brands: { id: string; brand_name: string }[]) => void;
  setSelectedBrand: (brand?: { id: string; brand_name: string }) => void;
  setDateRange: (range: { start: Date; end: Date }) => void;
  setSentiment: (sentiment: string) => void;
  setFunnel: (funnel: string) => void;
  setAngel: (angel: string) => void;
  setCampaignStatus: (status: string) => void;
  setCampaignObjective: (objective: string) => void;
  setAdsetStatus: (status: string) => void;
  setAdsetOptimization: (optimization: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTab: (tab: string) => void;
  setBrandData: (data: DashboardData | null) => void;
  setLoading: (loading: boolean) => void;
  setUntrackedInfo: (info: {
    adsCount: number;
    commentsCount: number;
    adIds: string[];
    commentIds: string[];
  }) => void;
  setAnalyzingStatus: (status: { ad: boolean; comment: boolean }) => void;
};

export const useAppStore = create<AppState>((set) => ({
  brands: [],
  selectedBrand: undefined,
  dateRange: {
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  },
  sentiment: 'all',
  funnel: 'all',
  angel: 'all',
  campaignStatus: 'all',
  campaignObjective: 'all',
  adsetStatus: 'all',
  adsetOptimization: 'all',
  searchQuery: '',
  selectedTab: 'overview',
  brandData: null,
  loading: false,
  untrackedAdsCount: 0,
  untrackedCommentsCount: 0,
  untrackedAdIds: [],
  untrackedCommentIds: [],
  isAdAnalyzing: false,
  isCommentAnalyzing: false,

  setBrands: (brands) => set({ brands }),
  setSelectedBrand: (brand) => set({ selectedBrand: brand, selectedTab: 'overview', brandData: null }),
  setDateRange: (range) => set({ dateRange: range }),
  setSentiment: (sentiment) => set({ sentiment }),
  setFunnel: (funnel) => set({ funnel }),
  setAngel: (angel) => set({ angel }),
  setCampaignStatus: (status) => set({ campaignStatus: status }),
  setCampaignObjective: (objective) => set({ campaignObjective: objective }),
  setAdsetStatus: (status) => set({ adsetStatus: status }),
  setAdsetOptimization: (optimization) => set({ adsetOptimization: optimization }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setBrandData: (data) => set({ brandData: data }),
  setLoading: (loading) => set({ loading }),
  setUntrackedInfo: (info) =>
    set({
      untrackedAdsCount: info.adsCount,
      untrackedCommentsCount: info.commentsCount,
      untrackedAdIds: info.adIds,
      untrackedCommentIds: info.commentIds,
    }),
  setAnalyzingStatus: (status) =>
    set({ isAdAnalyzing: status.ad, isCommentAnalyzing: status.comment }),
}));