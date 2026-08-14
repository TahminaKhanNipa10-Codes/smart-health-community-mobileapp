import { Capacitor } from '@capacitor/core';

// Production backend fallback URL for native Android APK builds
const DEFAULT_REMOTE_BACKEND_URL = 'https://ais-pre-gg45xuriuve3zvwph7g7t7-273340868786.asia-southeast1.run.app';

/**
 * Resolves the appropriate backend base URL depending on whether the app is running
 * inside a native Capacitor mobile container (Android/iOS) or in a standard web browser.
 */
export function getApiBaseUrl(): string {
  // 1. Explicitly configured environment variable
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Check if running on Android/iOS via Capacitor or local WebView scheme
  if (typeof window !== 'undefined') {
    const isCapacitor =
      Capacitor.isNativePlatform() ||
      window.location.protocol === 'capacitor:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isCapacitor) {
      return DEFAULT_REMOTE_BACKEND_URL;
    }
  }

  // 3. Running in a standard web browser -> use relative API path
  return '';
}

export interface ExtractedField {
  value: string;
  confidenceScore: string;
}

export interface MedicineAnalysis {
  medicineName: ExtractedField | string;
  dosageForm: ExtractedField | string;
  dosage: ExtractedField | string;
  frequency: ExtractedField | string;
  duration: ExtractedField | string;
  instructions: ExtractedField | string;
  warnings?: ExtractedField | string;
  overallMedicineConfidence?: string;
  confidenceScore?: string;
}

export interface PrescriptionAnalysisResult {
  canAnalyze: boolean;
  errorMessage?: string;
  overallDocumentConfidence?: string;
  confidenceScore?: string;
  medicines: MedicineAnalysis[];
  summaryNote?: string;
}

export interface PrescriptionInput {
  title: string;
  doctor?: string;
  hospital?: string;
  reportDate?: string;
  notes?: string;
  externalLink?: string;
}

/**
 * Sends prescription details and link to the backend Gemini AI service.
 */
export async function analyzePrescriptionWithGemini(
  input: PrescriptionInput
): Promise<PrescriptionAnalysisResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/analyze-prescription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze prescription. Please check your network or try again.');
  }

  const data: PrescriptionAnalysisResult = await response.json();
  return data;
}

export interface LabTestItem {
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  status: 'Low' | 'Normal' | 'High' | 'Unknown';
  confidenceScore: string;
}

export interface AbnormalHealthExplanation {
  testName: string;
  status: string;
  valueWithUnit: string;
  whatItMeans: string;
  possibleCauses: string;
  healthAdvice: string;
}

export interface LabReportAnalysisResult {
  canAnalyze: boolean;
  errorMessage?: string;
  overallDocumentConfidence?: string;
  overallHealthStatus?: 'Normal' | 'Attention Needed' | 'Consult Doctor';
  overallHealthReason?: string;
  summaryBullets?: string[];
  tests: LabTestItem[];
  abnormalExplanations: AbnormalHealthExplanation[];
  whenToSeeDoctor?: string[];
  doctorReminder: string;
  summaryNote?: string;
}

export interface LabReportInput {
  title: string;
  doctor?: string;
  hospital?: string;
  reportDate?: string;
  notes?: string;
  externalLink?: string;
}

/**
 * Sends lab report details and link to the backend Gemini AI service.
 */
export async function analyzeLabReportWithGemini(
  input: LabReportInput
): Promise<LabReportAnalysisResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/analyze-lab-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Unable to analyze this lab report. Please upload a clearer report.');
  }

  const data: LabReportAnalysisResult = await response.json();
  return data;
}

export interface ImagingReportAnalysisResult {
  canAnalyze: boolean;
  isImageOnly?: boolean;
  errorMessage?: string;
  overallConfidence: string;
  imagingType: string;
  bodyPart: string;
  findings: string;
  impression: string;
  plainLanguageExplanation: string;
  possibleMeaning: string;
  whenToSeeDoctor: string[];
  summaryBullets: string[];
  disclaimer: string;
}

export interface ImagingReportInput {
  title: string;
  doctor?: string;
  hospital?: string;
  reportDate?: string;
  notes?: string;
  externalLink?: string;
}

/**
 * Sends imaging report details and link to the backend Gemini AI service.
 */
export async function analyzeImagingReportWithGemini(
  input: ImagingReportInput
): Promise<ImagingReportAnalysisResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/analyze-imaging-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Unable to analyze this imaging report. Please upload a clearer report.');
  }

  const data: ImagingReportAnalysisResult = await response.json();
  return data;
}

export interface DietAIInput {
  userProfile?: {
    age?: number | string;
    gender?: string;
    height?: number | string;
    weight?: number | string;
    bloodGroup?: string;
    name?: string;
  };
  goal: string;
  activityLevel: string;
  dietPreference: string;
  additionalNotes?: string;
}

export interface DietAIResult {
  title: string;
  goalSummary: string;
  userMetricsNote: string;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  hydration: string;
  generalTips: string[];
  missingInfoNotice?: string;
  disclaimer: string;
}

/**
 * Calls backend Gemini API to generate personalized diet guidance.
 */
export async function fetchDietAIRecommendation(input: DietAIInput): Promise<DietAIResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/diet-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch diet recommendation. Please try again.');
  }

  return await response.json();
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface HealthChatInput {
  messages: ChatMessage[];
  userProfile?: {
    age?: number | string;
    gender?: string;
    height?: number | string;
    weight?: number | string;
    bloodGroup?: string;
  };
}

export interface HealthChatResult {
  role: 'model';
  content: string;
  disclaimer: string;
}

/**
 * Calls backend Gemini API to continue AI Health Chat session.
 */
export async function fetchHealthChatReply(input: HealthChatInput): Promise<HealthChatResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/health-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to communicate with Health Chat. Please try again.');
  }

  return await response.json();
}

