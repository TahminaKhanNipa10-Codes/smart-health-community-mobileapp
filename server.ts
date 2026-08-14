import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();

// Enable CORS for all incoming requests (including Capacitor Android app on https://localhost)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
const PORT = 3000;

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Extracts a Google Drive File ID from various share URL formats.
 */
function extractGoogleDriveFileId(urlStr: string): string | null {
  if (!urlStr) return null;
  const trimmed = urlStr.trim();
  
  const matchD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  const matchDirect = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchDirect && matchDirect[1]) return matchDirect[1];

  return null;
}

/**
 * Downloads file bytes from Google Drive share link or direct URL.
 */
async function downloadDriveFile(
  urlStr: string
): Promise<{ buffer: Buffer; mimeType: string } | { error: string }> {
  if (!urlStr || !urlStr.trim()) {
    return { error: 'No Google Drive share link or document URL was provided.' };
  }

  const fileId = extractGoogleDriveFileId(urlStr);
  const urlsToTry: string[] = [];

  if (fileId) {
    // Priority order for Google Drive public files
    urlsToTry.push(`https://lh3.googleusercontent.com/d/${fileId}`);
    urlsToTry.push(`https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`);
    urlsToTry.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w2500`);
  } else if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    urlsToTry.push(urlStr.trim());
  } else {
    return { error: 'Invalid URL format. Please provide a valid HTTP/HTTPS link.' };
  }

  for (const targetUrl of urlsToTry) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*,application/pdf,*/*'
        },
        redirect: 'follow',
      });

      if (!response.ok) continue;

      let mimeType = response.headers.get('content-type') || '';

      // If Google Drive returns an HTML login/permission page instead of binary file
      if (mimeType.includes('text/html') && fileId) {
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 100) continue;
      const head = buffer.toString('utf8', 0, 100).toLowerCase();
      if (head.includes('<!doctype html') || head.includes('<html')) {
        continue;
      }

      // Sniff MIME type from header or magic bytes if missing/generic
      if (!mimeType || mimeType.includes('application/octet-stream') || mimeType.includes('text/plain')) {
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
          mimeType = 'image/jpeg';
        } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
          mimeType = 'image/png';
        } else if (buffer.toString('utf8', 0, 4) === '%PDF') {
          mimeType = 'application/pdf';
        } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
          mimeType = 'image/webp';
        } else {
          mimeType = 'image/jpeg';
        }
      }

      mimeType = mimeType.split(';')[0].trim();
      return { buffer, mimeType };
    } catch (err) {
      console.error(`Fetch attempt failed for ${targetUrl}:`, err);
    }
  }

  return {
    error: 'Unable to download or access the document from Google Drive. Please ensure link sharing is set to "Anyone with the link can view" and points to an image or PDF file.'
  };
}

// API Route for Prescription Analysis
app.post('/api/analyze-prescription', async (req, res) => {
  try {
    const { title, doctor, hospital, reportDate, notes, externalLink } = req.body || {};

    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing in server environment settings.'
      });
    }

    if (!externalLink || !externalLink.trim()) {
      return res.json({
        canAnalyze: false,
        errorMessage: 'No Google Drive share link was provided for this prescription record. Please edit the record and attach a valid Google Drive share link.',
        medicines: [],
        confidenceScore: '0%'
      });
    }

    // Download actual document/image from Google Drive link
    const downloaded = await downloadDriveFile(externalLink);

    if ('error' in downloaded) {
      return res.json({
        canAnalyze: false,
        errorMessage: downloaded.error,
        medicines: [],
        confidenceScore: '0%'
      });
    }

    // Convert downloaded buffer to base64 for Gemini Vision/Multimodal input
    const base64Data = downloaded.buffer.toString('base64');
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: downloaded.mimeType,
      },
    };

    const fieldSchema = {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        confidenceScore: { type: Type.STRING }
      },
      required: ['value', 'confidenceScore']
    };

    const promptText = `Analyze the attached medical prescription document (image or PDF) as a strict OCR and structured text extractor.

Context from medical record:
- Title / Document Name: ${title || 'N/A'}
- Prescribing Doctor: ${doctor || 'N/A'}
- Hospital / Clinic: ${hospital || 'N/A'}
- Date of Report/Prescription: ${reportDate || 'N/A'}
- Additional Patient Notes: ${notes || 'None provided'}

STRICT OCR & NO-HALLUCINATION INSTRUCTIONS:
You are acting as a strict OCR engine and visual document text parser. You must NOT behave as a doctor or medical predictor guessing missing information.

1. MEDICINE NAME:
   - Extract ONLY text actually visible in the prescription image.
   - Do NOT normalize, autocorrect, complete, or fix spelling based on medical knowledge.
   - Preserve handwritten spelling EXACTLY as seen. If a word appears to say "Triolone", output "Triolone". Do NOT change it to "Trialon", "Triamcinolone", "Triolone Cream", "Triolone Injection", etc.
   - If handwriting is ambiguous, preserve the uncertain spelling as literally seen.

2. DOSAGE FORM:
   - NEVER infer dosage form.
   - Only output: "Injection", "Tablet", "Capsule", "Cream", "Ointment", "Syrup", "Drops", "Lotion", "Gel", "Spray" (or exact written shorthand like "Inj.", "Tab.", "Cap.") IF that exact dosage form is explicitly written beside or for the medicine.
   - Otherwise, set dosageForm.value to EXACTLY: "Dosage form could not be determined." and assign a low confidence score (e.g. "20%").

3. INSTRUCTIONS, WARNINGS & PRECAUTIONS:
   - NEVER infer instructions or warnings (such as "Apply thin layer", "External use only", "Oral use", "Topical use", "Take after meals", "Take with water", "Injection", "Cream", "Ointment", "Tablet").
   - If not explicitly written on the prescription, set value to "Could not be determined" or "Not specified".

4. PER-FIELD CONFIDENCE SCORES:
   - For EVERY extracted field (medicineName, dosageForm, dosage, frequency, duration, instructions, warnings), provide an individual confidenceScore percentage (e.g. "95%", "62%", "20%").
   - Base confidence strictly on image legibility, resolution, and handwriting clarity.
   - If a field is missing, unclear, or inferred as "Could not be determined", assign a low confidence score (< 80%).

5. UNREADABLE DOCUMENTS:
   - If the document is unreadable, completely blurry, or not a prescription, set "canAnalyze" to false and explain why in "errorMessage".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [imagePart, promptText],
      config: {
        systemInstruction: 'You are a strict OCR Prescription Extractor. Output exact visible text only. Never guess missing medical details or complete words.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            canAnalyze: { type: Type.BOOLEAN },
            errorMessage: { type: Type.STRING },
            overallDocumentConfidence: { type: Type.STRING },
            medicines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  medicineName: fieldSchema,
                  dosageForm: fieldSchema,
                  dosage: fieldSchema,
                  frequency: fieldSchema,
                  duration: fieldSchema,
                  instructions: fieldSchema,
                  warnings: fieldSchema,
                  overallMedicineConfidence: { type: Type.STRING }
                },
                required: [
                  'medicineName',
                  'dosageForm',
                  'dosage',
                  'frequency',
                  'duration',
                  'instructions',
                  'warnings',
                  'overallMedicineConfidence'
                ]
              }
            },
            summaryNote: { type: Type.STRING }
          },
          required: ['canAnalyze', 'medicines', 'overallDocumentConfidence']
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/analyze-prescription:', err);
    return res.status(500).json({
      error: err?.message || 'Server failed to analyze prescription document with Gemini AI.'
    });
  }
});

// API Route for Lab Report Analysis
app.post('/api/analyze-lab-report', async (req, res) => {
  try {
    const { title, doctor, hospital, reportDate, notes, externalLink } = req.body || {};

    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing in server environment settings.'
      });
    }

    if (!externalLink || !externalLink.trim()) {
      return res.json({
        canAnalyze: false,
        errorMessage: 'No Google Drive share link was provided for this lab report. Please edit the record and attach a valid Google Drive share link.',
        tests: [],
        abnormalExplanations: [],
        doctorReminder: 'Always consult a qualified doctor for medical advice.'
      });
    }

    // Download actual document/image from Google Drive link
    const downloaded = await downloadDriveFile(externalLink);

    if ('error' in downloaded) {
      return res.json({
        canAnalyze: false,
        errorMessage: 'Unable to analyze this lab report. Please upload a clearer report.',
        tests: [],
        abnormalExplanations: [],
        doctorReminder: 'Always consult a qualified doctor for medical advice.'
      });
    }

    // Convert downloaded buffer to base64 for Gemini Vision/Multimodal input
    const base64Data = downloaded.buffer.toString('base64');
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: downloaded.mimeType,
      },
    };

    const promptText = `Analyze the attached medical lab report document (image or PDF) as a strict OCR and clinical lab report text parser.

Context from medical record:
- Title / Document Name: ${title || 'N/A'}
- Ordering Doctor: ${doctor || 'N/A'}
- Hospital / Lab Name: ${hospital || 'N/A'}
- Date of Report: ${reportDate || 'N/A'}
- Patient Notes: ${notes || 'None provided'}

STRICT ACCURACY & NO-HALLUCINATION INSTRUCTIONS:
You are acting as a strict OCR lab report parser. Do NOT invent, assume, or hallucinate values or test names.

1. EXTRACT LAB TEST PARAMETERS:
   - Extract ONLY test parameters that are ACTUALLY visible in the attached report image or PDF (e.g. Hemoglobin, WBC, RBC, Platelets, Fasting Blood Sugar, HbA1c, Serum Creatinine, Urea, Cholesterol, Triglycerides, HDL, LDL, ALT, AST, TSH, Vitamin D, Calcium, etc.).
   - Do NOT invent tests or values that are not visible in the document.
   - For every extracted test, provide:
     * testName: Exact name of the lab test as printed (e.g. "Hemoglobin (Hb)", "Serum Creatinine", "Fasting Blood Sugar").
     * result: Measured result value (e.g. "12.5", "1.1", "105", "Negative") as printed.
     * unit: Unit of measurement (e.g. "g/dL", "mg/dL", "%", "mmol/L", "10^3/uL", "IU/L", "N/A" if none).
     * referenceRange: Normal reference interval printed on the report (e.g. "13.5 - 17.5 g/dL", "< 100 mg/dL", "N/A" if not visible).
     * status: Determine status: "Low", "Normal", "High", or "Unknown" based strictly on the result compared to the reference range or flags (e.g., L, H, *, Bold) on the report.
     * confidenceScore: Individual confidence score for this test parameter (e.g. "95%", "70%", "50%") based on text legibility and image resolution.

2. HEALTH EXPLANATION SECTION (FOR ABNORMAL VALUES):
   - For every test parameter with status "Low" or "High", generate a patient-friendly explanation entry containing:
     * testName: Name of the abnormal test
     * status: "Low" or "High"
     * valueWithUnit: Measured value with unit (e.g. "9.2 g/dL")
     * whatItMeans: Plain-language explanation of what this marker measures and what a low/high value indicates.
     * possibleCauses: 2-3 common non-diagnostic factors (e.g. dietary intake, hydration, physical exertion, vitamin deficiency, recent illness).
     * healthAdvice: General lifestyle, dietary, or follow-up tips.
   - CRITICAL SAFETY MANDATE: DO NOT diagnose any specific disease.
   - Include doctorReminder: "Always consult a qualified doctor for medical evaluation and clinical diagnosis."

3. OVERALL HEALTH STATUS & COMPACT SUMMARY:
   - overallHealthStatus: Choose exactly one of "Normal", "Attention Needed", or "Consult Doctor":
     * "Normal" if all visible parameters are within reference range.
     * "Attention Needed" if 1-2 parameters are mildly low/high or need observation.
     * "Consult Doctor" if multiple or critical markers are significantly abnormal or out of range.
   - overallHealthReason: Generate a 1-2 line brief explanation for this status.
   - summaryBullets: 3 to 5 short, scannable bullet points describing key findings (e.g. "1 abnormal parameter detected.", "IgE is above normal range.", "Possible allergic activity.", "Clinical correlation recommended.").
   - whenToSeeDoctor: 2 to 4 short bullet points listing when the user should seek medical consultation (e.g. "Symptoms are getting worse.", "Persistent abnormal results.", "Difficulty breathing or severe fatigue.", "Doctor recommends additional testing."). If no abnormal indicators exist, return an empty array.

4. UNREADABLE / NOT A LAB REPORT:
   - If the document is unreadable, completely blurry, or not a lab report, set "canAnalyze" to false and set "errorMessage" to "Unable to analyze this lab report. Please upload a clearer report."`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [imagePart, promptText],
      config: {
        systemInstruction: 'You are a strict OCR Lab Report Analyzer. Extract visible lab test parameters with zero hallucination and explain abnormal parameters safely in plain language.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            canAnalyze: { type: Type.BOOLEAN },
            errorMessage: { type: Type.STRING },
            overallDocumentConfidence: { type: Type.STRING },
            overallHealthStatus: { type: Type.STRING, enum: ['Normal', 'Attention Needed', 'Consult Doctor'] },
            overallHealthReason: { type: Type.STRING },
            summaryBullets: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tests: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  testName: { type: Type.STRING },
                  result: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  referenceRange: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['Low', 'Normal', 'High', 'Unknown'] },
                  confidenceScore: { type: Type.STRING }
                },
                required: ['testName', 'result', 'unit', 'referenceRange', 'status', 'confidenceScore']
              }
            },
            abnormalExplanations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  testName: { type: Type.STRING },
                  status: { type: Type.STRING },
                  valueWithUnit: { type: Type.STRING },
                  whatItMeans: { type: Type.STRING },
                  possibleCauses: { type: Type.STRING },
                  healthAdvice: { type: Type.STRING }
                },
                required: ['testName', 'status', 'valueWithUnit', 'whatItMeans', 'possibleCauses', 'healthAdvice']
              }
            },
            whenToSeeDoctor: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            doctorReminder: { type: Type.STRING },
            summaryNote: { type: Type.STRING }
          },
          required: ['canAnalyze', 'tests', 'abnormalExplanations', 'doctorReminder']
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/analyze-lab-report:', err);
    return res.status(500).json({
      error: err?.message || 'Unable to analyze this lab report. Please upload a clearer report.'
    });
  }
});

// API Route for Imaging Report Analysis
app.post('/api/analyze-imaging-report', async (req, res) => {
  try {
    const { title, doctor, hospital, reportDate, notes, externalLink } = req.body || {};

    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing in server environment settings.'
      });
    }

    if (!externalLink || !externalLink.trim()) {
      return res.json({
        canAnalyze: false,
        isImageOnly: false,
        errorMessage: 'No Google Drive share link was provided for this imaging report. Please edit the record and attach a valid Google Drive share link.',
        overallConfidence: '0%',
        imagingType: 'Not detected.',
        bodyPart: 'Not detected.',
        findings: 'Not detected.',
        impression: 'Not detected.',
        plainLanguageExplanation: 'Not detected.',
        possibleMeaning: 'Not detected.',
        whenToSeeDoctor: [],
        summaryBullets: [],
        disclaimer: 'This AI analysis is for educational purposes only and is not a medical diagnosis. Please consult a qualified radiologist or physician.'
      });
    }

    // Download actual document/image from Google Drive link
    const downloaded = await downloadDriveFile(externalLink);

    if ('error' in downloaded) {
      return res.json({
        canAnalyze: false,
        isImageOnly: false,
        errorMessage: 'Unable to analyze this imaging report. Please upload a clearer report.',
        overallConfidence: '0%',
        imagingType: 'Not detected.',
        bodyPart: 'Not detected.',
        findings: 'Not detected.',
        impression: 'Not detected.',
        plainLanguageExplanation: 'Not detected.',
        possibleMeaning: 'Not detected.',
        whenToSeeDoctor: [],
        summaryBullets: [],
        disclaimer: 'This AI analysis is for educational purposes only and is not a medical diagnosis. Please consult a qualified radiologist or physician.'
      });
    }

    const base64Data = downloaded.buffer.toString('base64');
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: downloaded.mimeType,
      },
    };

    const promptText = `Analyze the attached radiology/imaging report document or scan image (X-ray, CT Scan, MRI, Ultrasound, Mammography, Echocardiography, or other radiology report).

Context from medical record:
- Title / Document Name: ${title || 'N/A'}
- Ordering/Attending Doctor: ${doctor || 'N/A'}
- Hospital / Imaging Center: ${hospital || 'N/A'}
- Date of Report: ${reportDate || 'N/A'}
- Patient Notes: ${notes || 'None provided'}

MANDATORY STEP 1: OCR & READABLE TEXT DETECTION
Perform a comprehensive optical character recognition (OCR) scan across the ENTIRE document or image first. Search for any readable text, including headings or paragraphs such as Findings, Impression, Conclusion, Observation, Technique, Clinical History, Radiologist Notes, Report Header, or any diagnostic text.

NEVER classify a document as Image Only simply because it contains an image, film, or scan (e.g., X-ray, CT, MRI, or Ultrasound). If there is ANY readable radiology report text or diagnostic notes present anywhere in the document, you MUST set "isImageOnly" to false and perform full extraction.

Set "isImageOnly" to true ONLY IF no meaningful radiology report text can be extracted anywhere from the document (i.e. the upload is purely a raw scan image with no readable radiologist report text).

IF "isImageOnly" IS TRUE (Purely raw scan with NO readable report text):
- "isImageOnly": true
- "findings": "No radiologist report detected."
- "impression": "No radiologist report detected."
- "plainLanguageExplanation": "No radiologist report detected."
- "possibleMeaning": "No radiologist report detected."
- "imagingType": Identify the imaging modality (e.g. "Chest X-ray", "Brain MRI", "CT Abdomen", "Ultrasound Abdomen") if visually identifiable, or "Not detected."
- "bodyPart": Identify the body part/region if visually identifiable, or "Not detected."
- "summaryBullets": Generate 3 to 4 concise bullet points indicating that an image-only scan was uploaded without written radiologist report text.

IF "isImageOnly" IS FALSE (Readable report text IS detected):
- "isImageOnly": false
- Extract all visible information accurately from the report text:
  * "imagingType": Modality & type (e.g. "Chest X-ray", "Brain MRI", "CT Abdomen & Pelvis", "Ultrasound Abdomen", "Mammography", "Echocardiography", or "Not detected.")
  * "bodyPart": Targeted body region (e.g. "Chest / Lungs", "Brain / Head", "Abdomen", "Left Knee", or "Not detected.")
  * "findings": Exact findings written by the radiologist.
  * "impression": Radiologist's final impression or conclusion.
  * "plainLanguageExplanation": Clear, compassionate explanation in simple non-technical language.
  * "possibleMeaning": Non-diagnostic, educational possibilities behind the findings. NEVER diagnose diseases or say "You have...". ALWAYS use non-diagnostic phrasing such as "This finding may be associated with...".
  * "summaryBullets": Generate 3 to 4 concise bullet points summarizing the report.

SAFETY MANDATES (ALWAYS APPLY):
- NEVER diagnose disease or infer diseases from raw scan images alone.
- NEVER recommend treatment or prescribe medication.
- NEVER state that cancer, pneumonia, fracture, stroke, tumor, or any disease is confirmed unless explicitly written verbatim in the radiologist's written report.
- Provide 2-4 short, clear bullet points for "whenToSeeDoctor".
- Provide an estimated OCR/extraction confidence percentage (e.g., "92%").
- Set "disclaimer" to "This AI analysis is for educational purposes only and is not a medical diagnosis. Please consult a qualified radiologist or physician."

UNREADABLE DOCUMENT:
If the document is completely unreadable, blurry, or not a medical imaging file, set "canAnalyze" to false and "errorMessage" to "Unable to analyze this imaging report. Please upload a clearer report."`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [imagePart, promptText],
      config: {
        systemInstruction: 'You are a strict OCR Radiology and Imaging Report Analyzer. Extract visible findings with zero hallucination. If an upload contains only a raw scan without a written report, do not infer diseases and set isImageOnly to true.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            canAnalyze: { type: Type.BOOLEAN },
            isImageOnly: { type: Type.BOOLEAN },
            errorMessage: { type: Type.STRING },
            overallConfidence: { type: Type.STRING },
            imagingType: { type: Type.STRING },
            bodyPart: { type: Type.STRING },
            findings: { type: Type.STRING },
            impression: { type: Type.STRING },
            plainLanguageExplanation: { type: Type.STRING },
            possibleMeaning: { type: Type.STRING },
            whenToSeeDoctor: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            summaryBullets: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            disclaimer: { type: Type.STRING }
          },
          required: [
            'canAnalyze',
            'isImageOnly',
            'overallConfidence',
            'imagingType',
            'bodyPart',
            'findings',
            'impression',
            'plainLanguageExplanation',
            'possibleMeaning',
            'whenToSeeDoctor',
            'summaryBullets',
            'disclaimer'
          ]
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/analyze-imaging-report:', err);
    return res.status(500).json({
      error: err?.message || 'Unable to analyze this imaging report. Please upload a clearer report.'
    });
  }
});

// API Route for Diet AI Guidance
app.post('/api/diet-ai', async (req, res) => {
  try {
    const { userProfile, goal, activityLevel, dietPreference, additionalNotes } = req.body || {};

    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing in server environment settings.'
      });
    }

    const age = userProfile?.age ? `${userProfile.age} years old` : 'Not provided';
    const gender = userProfile?.gender || 'Not provided';
    const height = userProfile?.height ? `${userProfile.height} cm` : 'Not provided';
    const weight = userProfile?.weight ? `${userProfile.weight} kg` : 'Not provided';
    const bloodGroup = userProfile?.bloodGroup || 'Not provided';
    
    let bmiStr = 'Not available';
    if (userProfile?.height && userProfile?.weight) {
      const hMeters = Number(userProfile.height) / 100;
      const wKg = Number(userProfile.weight);
      if (hMeters > 0 && wKg > 0) {
        bmiStr = (wKg / (hMeters * hMeters)).toFixed(1);
      }
    }

    const promptText = `Provide practical, easy-to-understand personalized general nutrition guidance for the user based on their goals and available health profile.

User Goal: ${goal || 'General healthy eating'}
Activity Level: ${activityLevel || 'Moderate'}
Dietary Preference: ${dietPreference || 'No preference'}
Additional Preferences / Allergies / Notes: ${additionalNotes || 'None'}

User Profile Data from Smart Health App:
- Age: ${age}
- Gender: ${gender}
- Height: ${height}
- Weight: ${weight}
- Calculated BMI: ${bmiStr}
- Blood Group: ${bloodGroup}

Instructions:
1. Do NOT invent missing user profile information. If important details (e.g. height, weight, age) are missing from the profile, mention in "missingInfoNotice" what was missing (e.g. "Age/weight was not set in profile. Meal plan uses standard adult reference targets. Update your profile for closer calibration.") and answer with safe general guidance.
2. Structure the recommendation cleanly with practical meal suggestions:
   - title: Title for the recommendation
   - goalSummary: High-level goal summary
   - userMetricsNote: Short summary of user's profile metrics considered
   - breakfast: Specific breakfast suggestion
   - lunch: Specific lunch suggestion
   - snack: Specific healthy snack suggestion
   - dinner: Specific dinner suggestion
   - hydration: Specific hydration guidance
   - generalTips: 3-5 concise, scannable general nutrition tips
3. Mandatory Safety Instructions:
   - Do NOT diagnose diseases.
   - Do NOT prescribe medicines or dietary supplements.
   - Do NOT claim that a specific diet will cure any disease.
   - If the user has a serious medical condition, pregnancy, eating disorder, severe allergy, kidney/liver disease, diabetes, or similar conditions, advise consulting a registered dietitian or doctor.
   - Always set disclaimer to: "Nutrition recommendations are general guidance and may not be suitable for everyone. AI-generated information is for educational purposes only and is not a medical diagnosis."`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [promptText],
      config: {
        systemInstruction: 'You are an expert Registered Dietitian and Nutrition Specialist AI. Provide practical, clear, safe, non-diagnostic meal plans and nutrition guidance.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            goalSummary: { type: Type.STRING },
            userMetricsNote: { type: Type.STRING },
            breakfast: { type: Type.STRING },
            lunch: { type: Type.STRING },
            snack: { type: Type.STRING },
            dinner: { type: Type.STRING },
            hydration: { type: Type.STRING },
            generalTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            missingInfoNotice: { type: Type.STRING },
            disclaimer: { type: Type.STRING }
          },
          required: [
            'title',
            'goalSummary',
            'userMetricsNote',
            'breakfast',
            'lunch',
            'snack',
            'dinner',
            'hydration',
            'generalTips',
            'disclaimer'
          ]
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/diet-ai:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate diet recommendation. Please try again.'
    });
  }
});

// API Route for General AI Health Chat
app.post('/api/health-chat', async (req, res) => {
  try {
    const { messages, userProfile } = req.body || {};

    const currentKey = process.env.GEMINI_API_KEY;
    if (!currentKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing in server environment settings.'
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Please provide a message to send to the Health Chat.'
      });
    }

    let profileContext = '';
    if (userProfile) {
      const details = [];
      if (userProfile.age) details.push(`Age: ${userProfile.age}`);
      if (userProfile.gender) details.push(`Gender: ${userProfile.gender}`);
      if (userProfile.height) details.push(`Height: ${userProfile.height}cm`);
      if (userProfile.weight) details.push(`Weight: ${userProfile.weight}kg`);
      if (userProfile.bloodGroup) details.push(`Blood Group: ${userProfile.bloodGroup}`);
      if (details.length > 0) {
        profileContext = `User Background Profile (for reference): ${details.join(', ')}. Do not invent missing facts.`;
      }
    }

    const geminiContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const systemInstruction = `You are an empathetic, clear, and reliable AI Health Assistant.
Your purpose is to answer general health-related questions in simple, accessible language, explain medical terms clearly, provide general educational information, and ask helpful follow-up questions when necessary.

${profileContext}

STRICT MEDICAL SAFETY & ACCURACY RULES:
1. Do NOT diagnose the user or claim certainty about any medical condition.
2. Do NOT prescribe medication or recommend changing prescribed medication dosage.
3. Do NOT invent test results or patient history.
4. Clearly distinguish general educational health information from a doctor's diagnosis.
5. If the user presents potentially serious, severe, or acute symptoms (e.g. chest pain, severe shortness of breath, sudden numbness, high fever, head injury), advise them immediately to seek urgent medical care or contact emergency services.
6. Keep explanations simple, reassuring, and scannable. Use clear paragraph breaks or bullet points where helpful.
7. Always include a subtle reminder that you are an AI assistant and they should consult a physician for medical advice.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: geminiContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "I'm sorry, I couldn't generate a response. Please try rephrasing your question.";

    return res.json({
      role: 'model',
      content: replyText,
      disclaimer: "AI-generated information is for educational purposes only and is not a medical diagnosis. Please consult a qualified healthcare professional for medical advice."
    });
  } catch (err: any) {
    console.error('Error in /api/health-chat:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to communicate with AI Health Chat. Please try again.'
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
