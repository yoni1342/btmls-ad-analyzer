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
  overviewData: DashboardData | null; // Separate state for overview data
  tablesData: any | null; // Separate state for paginated tables data
  loading: boolean;
  untrackedAdsCount: number;
  untrackedCommentsCount: number;
  untrackedAdIds: string[];
  untrackedCommentIds: string[];
  isAdAnalyzing: boolean;
  isCommentAnalyzing: boolean;
  
  // Pagination state
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;

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
  setOverviewData: (data: DashboardData | null) => void;
  setTablesData: (data: any | null) => void;
  setLoading: (loading: boolean) => void;
  setUntrackedInfo: (info: {
    adsCount: number;
    commentsCount: number;
    adIds: string[];
    commentIds: string[];
  }) => void;
  setAnalyzingStatus: (status: { ad: boolean; comment: boolean }) => void;
  
  // Pagination setters
  setPagination: (pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
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
  overviewData: null,
  tablesData: null,
  loading: false,
  untrackedAdsCount: 0,
  untrackedCommentsCount: 0,
  untrackedAdIds: [],
  untrackedCommentIds: [],
  isAdAnalyzing: false,
  isCommentAnalyzing: false,
  
  // Pagination state
  currentPage: 1,
  totalPages: 0,
  totalRecords: 0,
  pageSize: 50,
  hasNext: false,
  hasPrevious: false,

  setBrands: (brands) => set({ brands }),
  setSelectedBrand: (brand) => set({ 
    selectedBrand: brand, 
    selectedTab: 'overview', 
    brandData: null, 
    overviewData: null, 
    tablesData: null,
    currentPage: 1,  // Reset pagination when changing brand
    // Reset untracked counts when brand changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setDateRange: (range) => set({ 
    dateRange: range, 
    currentPage: 1,
    // Reset untracked counts when date range changes (affects what's "untracked")
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setSentiment: (sentiment) => set({ 
    sentiment, 
    currentPage: 1,
    // Reset untracked counts when sentiment filter changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setFunnel: (funnel) => set({ 
    funnel, 
    currentPage: 1,
    // Reset untracked counts when funnel filter changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setAngel: (angel) => set({ 
    angel, 
    currentPage: 1,
    // Reset untracked counts when angel filter changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setCampaignStatus: (status) => set({ 
    campaignStatus: status, 
    currentPage: 1,
    // Reset untracked counts when campaign status changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setCampaignObjective: (objective) => set({ 
    campaignObjective: objective, 
    currentPage: 1,
    // Reset untracked counts when campaign objective changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setAdsetStatus: (status) => set({ 
    adsetStatus: status, 
    currentPage: 1,
    // Reset untracked counts when adset status changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setAdsetOptimization: (optimization) => set({ 
    adsetOptimization: optimization, 
    currentPage: 1,
    // Reset untracked counts when adset optimization changes
    untrackedAdsCount: 0,
    untrackedCommentsCount: 0,
    untrackedAdIds: [],
    untrackedCommentIds: []
  }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTab: (tab) => set({ selectedTab: tab, currentPage: 1 }), // Reset pagination on tab change
  setBrandData: (data) => set({ brandData: data }),
  setOverviewData: (data) => set({ overviewData: data }),
  setTablesData: (data) => set({ tablesData: data }),
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
    
  // Pagination setters
  setPagination: (pagination) => set({
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    totalRecords: pagination.totalRecords,
    hasNext: pagination.hasNext,
    hasPrevious: pagination.hasPrevious,
  }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
}));