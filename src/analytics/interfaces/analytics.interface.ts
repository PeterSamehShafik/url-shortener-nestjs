export interface CreateUrlAnalyticData {
  urlId: string;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
}

export interface RawOverviewStats {
  totalClicks: string;
  uniqueVisitors: string;
  clicksLast7Days: string;
  clicksLast30Days: string;
}

export interface RawClicksByDay {
  date: string;
  count: string;
}

export interface RawTopReferers {
  referer: string | null;
  count: string;
}
export interface RawDeviceStats {
  device: string;
  count: string;
}

export interface RawBrowserStats {
  browser: string;
  count: string;
}
export interface AnalyticsResponse {
  urlId: string;
  slug: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksLast7Days: number;
  clicksLast30Days: number;
  clicksByDay: Array<{ date: string; count: number }>;
  topReferers: Array<{ referer: string | null; count: number }>;
  devices: Array<{ device: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
}
