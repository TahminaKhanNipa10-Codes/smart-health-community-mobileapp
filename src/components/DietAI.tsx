import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDietAIRecommendation, DietAIResult } from '../services/gemini';
import { 
  Utensils, 
  Sparkles, 
  User, 
  Activity, 
  Droplet, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  Check, 
  Flame, 
  Sun, 
  Coffee, 
  Moon, 
  Apple, 
  GlassWater, 
  Lightbulb,
  HeartPulse
} from 'lucide-react';

interface DietAIProps {
  onClose?: () => void;
}

// Helper to parse meal text into visual food items
interface MealFoodItem {
  icon: string;
  name: string;
  portion: string;
  instruction?: string;
}

function parseMealText(mealText: string): { items: MealFoodItem[]; rawText: string } {
  if (!mealText) return { items: [], rawText: '' };

  const rawText = mealText.trim();

  // Split clauses by semicolons, newlines, bullet points, or connectors like 'topped with', 'served with', 'mixed with', 'side of'
  const rawSegments = rawText
    .split(/(?:;|\n|•|\b(?:topped with|served over|served with|mixed with|side of|accompanied by|along with)\b)/i)
    .flatMap(seg => seg.split(/,\s*(?![^(]*\))/)) // split on commas outside parentheses
    .map(s => s.trim().replace(/^and\s+/i, '').replace(/^a\s+/i, '').replace(/^[\d\.\-\*\,]+\s*/, ''))
    .filter(s => s.length > 1);

  const items: MealFoodItem[] = [];

  for (let seg of rawSegments) {
    let instruction = '';
    let portion = 'Amount not specified';

    // Extract parentheses e.g. "(1 cup)" or "(no added salt)"
    const parenMatches = seg.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      for (const pm of parenMatches) {
        const inner = pm.replace(/[()]/g, '').trim();
        if (/^\d+[\/\d\.]*\s*(?:g|ml|oz|cup|cups|bowl|bowls|slice|slices|tbsp|tsp|handful|piece|pieces|egg|eggs)?$/i.test(inner)) {
          portion = inner;
        } else {
          instruction = inner;
        }
        seg = seg.replace(pm, '').trim();
      }
    }

    // Search for quantity in remaining seg if portion is not found yet
    if (portion === 'Amount not specified') {
      const qtyMatch = seg.match(/\b(\d+[\/\d\.]*\s*(?:g|ml|oz|cup|cups|bowl|bowls|slice|slices|tbsp|tsp|handful|piece|pieces|glass|glasses|egg|eggs)?)\b/i);
      if (qtyMatch && qtyMatch[1] && qtyMatch[1].length < 15) {
        portion = qtyMatch[1].trim();
        seg = seg.replace(qtyMatch[0], '').trim();
      }
    }

    let name = seg.replace(/^[,\s\-\–\—]+|[,\s\-\–\—]+$/g, '').trim();
    if (!name) continue;

    if (!instruction && /no added salt|steamed|grilled|unsweetened|raw|fresh/i.test(name)) {
      const match = name.match(/\b(no added salt|steamed|grilled|unsweetened|raw|fresh)\b/i);
      if (match) {
        instruction = match[0].charAt(0).toUpperCase() + match[0].slice(1);
      }
    }

    // Food Emoji Matching
    let icon = '🍽️';
    const lower = name.toLowerCase();
    if (lower.includes('egg') || lower.includes('omelet')) icon = '🥚';
    else if (lower.includes('oat') || lower.includes('cereal') || lower.includes('porridge')) icon = '🥣';
    else if (lower.includes('banana')) icon = '🍌';
    else if (lower.includes('berr') || lower.includes('strawberr') || lower.includes('blueberr')) icon = '🍓';
    else if (lower.includes('apple')) icon = '🍎';
    else if (lower.includes('yogurt') || lower.includes('curd')) icon = '🥛';
    else if (lower.includes('milk')) icon = '🥛';
    else if (lower.includes('chickpea') || lower.includes('hummus') || lower.includes('bean') || lower.includes('lentil') || lower.includes('dal') || lower.includes('legume')) icon = '🫘';
    else if (lower.includes('quinoa') || lower.includes('rice') || lower.includes('grain')) icon = '🍚';
    else if (lower.includes('salad') || lower.includes('cucumber') || lower.includes('tomato') || lower.includes('spinach') || lower.includes('greens') || lower.includes('broccoli') || lower.includes('veg')) icon = '🥗';
    else if (lower.includes('tofu') || lower.includes('paneer')) icon = '🫘';
    else if (lower.includes('chicken') || lower.includes('turkey') || lower.includes('poultry')) icon = '🍗';
    else if (lower.includes('fish') || lower.includes('salmon') || lower.includes('tuna')) icon = '🐟';
    else if (lower.includes('nut') || lower.includes('almond') || lower.includes('walnut') || lower.includes('chia') || lower.includes('seed')) icon = '🥜';
    else if (lower.includes('soup') || lower.includes('broth')) icon = '🍲';
    else if (lower.includes('sandwich') || lower.includes('toast') || lower.includes('bread') || lower.includes('wrap')) icon = '🥪';
    else if (lower.includes('tea') || lower.includes('coffee')) icon = '☕';
    else if (lower.includes('juice') || lower.includes('smoothie')) icon = '🥤';
    else if (lower.includes('water')) icon = '💧';
    else if (lower.includes('fruit')) icon = '🍎';

    name = name.charAt(0).toUpperCase() + name.slice(1);

    items.push({
      icon,
      name,
      portion,
      instruction: instruction ? instruction : undefined
    });
  }

  if (items.length === 0) {
    items.push({
      icon: '🥗',
      name: rawText,
      portion: 'Amount not specified'
    });
  }

  return { items, rawText };
}

function parseHydrationPoints(text: string) {
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  return sentences.map(s => {
    let icon = '💧';
    const lower = s.toLowerCase();
    if (lower.includes('lemon') || lower.includes('citrus')) icon = '🍋';
    else if (lower.includes('mint')) icon = '🌿';
    else if (lower.includes('liter') || lower.includes('glass') || lower.includes('fluid') || lower.includes('water')) icon = '🥛';
    else if (lower.includes('tea') || lower.includes('warm')) icon = '🍵';
    return { icon, text: s };
  });
}

export default function DietAI({ onClose }: DietAIProps) {
  const { userData } = useAuth();

  const [goal, setGoal] = useState<string>('General healthy eating');
  const [activityLevel, setActivityLevel] = useState<string>('Moderate');
  const [dietPreference, setDietPreference] = useState<string>('No preference');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<DietAIResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Pre-fill profile metrics if available
  const heightInMeters = userData?.height ? Number(userData.height) / 100 : 0;
  const weight = userData?.weight ? Number(userData.weight) : 0;
  const calculatedBmi = heightInMeters > 0 && weight > 0 ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const input = {
        userProfile: {
          age: userData?.age ?? '',
          gender: userData?.gender ?? '',
          height: userData?.height ?? '',
          weight: userData?.weight ?? '',
          bloodGroup: userData?.bloodGroup ?? '',
          name: userData?.name ?? ''
        },
        goal,
        activityLevel,
        dietPreference,
        additionalNotes
      };

      const data = await fetchDietAIRecommendation(input);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate diet recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    const text = `🥗 ${result.title}\nGoal: ${result.goalSummary}\nProfile: ${result.userMetricsNote}\n\n🌅 Breakfast: ${result.breakfast}\n☀️ Lunch: ${result.lunch}\n🍎 Snack: ${result.snack}\n🌙 Dinner: ${result.dinner}\n\n💧 Hydration: ${result.hydration}\n\n💡 General Tips:\n${result.generalTips.map(t => `• ${t}`).join('\n')}\n\n⚠️ Disclaimer: ${result.disclaimer}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header & Description */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-teal-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Diet AI Assistant</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                Personalized Nutrition
              </span>
            </h2>
            <p className="text-xs text-slate-600">
              Get personalized, general dietary recommendations powered by Gemini AI calibrated to your health profile.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Metrics Snapshot */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-teal-600" />
            <span>Health Profile Context</span>
          </span>
          <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
            Auto-loaded from Profile
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-150">
            <span className="text-slate-400 block text-[10px] font-semibold">Age / Gender</span>
            <span className="font-bold text-slate-800">
              {userData?.age ? `${userData.age} yrs` : 'Not set'}, {userData?.gender || 'Not set'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-150">
            <span className="text-slate-400 block text-[10px] font-semibold">Height & Weight</span>
            <span className="font-bold text-slate-800">
              {userData?.height ? `${userData.height} cm` : 'Not set'} / {userData?.weight ? `${userData.weight} kg` : 'Not set'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-150">
            <span className="text-slate-400 block text-[10px] font-semibold">Calculated BMI</span>
            <span className="font-bold text-teal-700">
              {calculatedBmi ? `${calculatedBmi} kg/m²` : 'Not available in profile'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-150">
            <span className="text-slate-400 block text-[10px] font-semibold">Blood Group</span>
            <span className="font-bold text-rose-600">
              {userData?.bloodGroup || 'Not available in profile'}
            </span>
          </div>
        </div>

        {(!userData?.height || !userData?.weight) && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Some metrics are missing in your profile. AI will use standard averages or you can specify notes below.</span>
          </p>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Goal Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Primary Goal <span className="text-rose-500">*</span>
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              required
            >
              <option value="Lose weight">Weight Loss Diet</option>
              <option value="Gain weight">Weight Gain Diet</option>
              <option value="Maintain weight">Healthy Maintenance</option>
              <option value="General healthy eating">General Healthy Eating</option>
            </select>
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Activity Level
            </label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="Low">Low (Sedentary / Desk Work)</option>
              <option value="Moderate">Moderate (Exercise 2-4x/week)</option>
              <option value="High">High (Active / Daily Exercise)</option>
            </select>
          </div>

          {/* Diet Preference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dietary Preference
            </label>
            <select
              value={dietPreference}
              onChange={(e) => setDietPreference(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="No preference">No Preference</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Non-vegetarian">Non-Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Additional preferences / allergies */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Additional Preferences / Food Allergies / Specific Questions <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="e.g., Lactose intolerant, low sodium requirement, prefer high protein snacks..."
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
            id="btn-generate-diet"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Diet Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Diet Recommendation</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Recommendation Output Display */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Utensils className="w-4 h-4" />
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg">{result.title || '🥗 Diet Recommendation'}</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {result.goalSummary} &bull; <span className="text-teal-700 font-semibold">{result.userMetricsNote}</span>
              </p>
            </div>

            <button
              onClick={handleCopy}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              id="btn-copy-diet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Plan'}</span>
            </button>
          </div>

          {/* Missing info notice if present */}
          {result.missingInfoNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{result.missingInfoNotice}</span>
            </div>
          )}

          {/* Visual Meal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'BREAKFAST', emoji: '🍳', bg: 'from-amber-50 to-orange-50/60', border: 'border-amber-200/80', text: 'text-amber-900', badgeBg: 'bg-amber-100 text-amber-800', data: result.breakfast },
              { title: 'LUNCH', emoji: '☀️', bg: 'from-emerald-50 to-teal-50/60', border: 'border-emerald-200/80', text: 'text-emerald-900', badgeBg: 'bg-emerald-100 text-emerald-800', data: result.lunch },
              { title: 'HEALTHY SNACK', emoji: '🍎', bg: 'from-sky-50 to-indigo-50/60', border: 'border-sky-200/80', text: 'text-sky-900', badgeBg: 'bg-sky-100 text-sky-800', data: result.snack },
              { title: 'DINNER', emoji: '🌙', bg: 'from-purple-50 to-slate-50/60', border: 'border-purple-200/80', text: 'text-purple-900', badgeBg: 'bg-purple-100 text-purple-800', data: result.dinner },
            ].map((meal, idx) => {
              const { items, rawText } = parseMealText(meal.data);
              return (
                <div key={idx} className={`bg-gradient-to-br ${meal.bg} border ${meal.border} rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5`}>
                  {/* Meal Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">{meal.emoji}</span>
                      <h4 className={`font-black text-xs sm:text-sm tracking-wider uppercase ${meal.text}`}>
                        {meal.title}
                      </h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${meal.badgeBg}`}>
                      {items.length} {items.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  {/* Food Items */}
                  <div className="space-y-2">
                    {items.map((item, itemIdx) => (
                      <div key={itemIdx} className="bg-white/90 backdrop-blur-xs border border-slate-200/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl shrink-0">{item.icon}</span>
                          <div>
                            <p className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight">
                              {item.name}
                            </p>
                            {item.instruction && (
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                💡 {item.instruction}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${
                            item.portion !== 'Amount not specified' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                          }`}>
                            {item.portion !== 'Amount not specified' ? `${item.portion}` : 'Amount not specified'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Original context hint if helpful */}
                  {rawText && items.length > 1 && (
                    <p className="text-[10px] text-slate-500 italic leading-snug pt-1 border-t border-slate-200/40">
                      "{rawText}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hydration Guidance - Visual Cards */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-900 font-black text-xs sm:text-sm uppercase tracking-wider">
              <span className="text-xl">💧</span>
              <span>Hydration Guidance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {parseHydrationPoints(result.hydration).map((point, idx) => (
                <div key={idx} className="bg-white/90 border border-sky-150 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
                  <span className="text-base shrink-0 mt-0.5">{point.icon}</span>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    {point.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* General Nutrition Tips - Visual Cards */}
          {result.generalTips && result.generalTips.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs sm:text-sm uppercase tracking-wider">
                <span className="text-xl">💡</span>
                <span>General Nutrition Tips</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {result.generalTips.map((tip, idx) => {
                  let icon = '💡';
                  const lower = tip.toLowerCase();
                  if (lower.includes('salt') || lower.includes('sodium') || lower.includes('herb') || lower.includes('spice')) icon = '🌿';
                  else if (lower.includes('fiber') || lower.includes('plant') || lower.includes('veg') || lower.includes('legume')) icon = '🥬';
                  else if (lower.includes('label') || lower.includes('check') || lower.includes('canned')) icon = '🏷️';
                  else if (lower.includes('water') || lower.includes('fluid')) icon = '💧';
                  else if (lower.includes('fruit') || lower.includes('snack')) icon = '🍎';
                  else if (lower.includes('protein')) icon = '🍳';

                  return (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
                      <span className="text-base shrink-0 mt-0.5">{icon}</span>
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Medical Safety Disclaimer */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-snug flex items-start gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-700 block mb-0.5">Medical Safety & Disclaimer:</span>
              <span>{result.disclaimer || "Nutrition recommendations are general guidance and may not be suitable for everyone. AI-generated information is for educational purposes only and is not a medical diagnosis. Please consult a qualified doctor or dietitian for medical advice."}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
