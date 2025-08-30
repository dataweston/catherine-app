// pages/api/adaptive/recalculate.js
import { supabaseServer } from '../../lib/supabaseServer';
import { mifflinStJeor, tdee, caloriesForTarget } from '../../lib/calories';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  const { user_id, lookback_days = 14 } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  // load user
  const { data: user, error: userErr } = await supabaseServer.from('users').select('*').eq('id', user_id).single();
  if (userErr || !user) return res.status(500).json({ error: userErr?.message || 'user not found' });

  // get daily_summaries for lookback
  const { data: summaries } = await supabaseServer
    .from('daily_summaries')
    .select('date, calories_in, calories_out, net_calories')
    .eq('user_id', user_id)
    .order('date', { ascending: true })
    .limit(lookback_days);

  // get weights during period
  const { data: weights } = await supabaseServer
    .from('weights')
    .select('date, weight_kg')
    .eq('user_id', user_id)
    .order('date', { ascending: true })
    .limit(lookback_days);

  if (!summaries || summaries.length < 7 || !weights || weights.length < 2) {
    return res.status(200).json({ message: 'not enough data to recalculate', enough: false });
  }

  const days = summaries.length;
  const totalNet = summaries.reduce((s, r) => s + (r.net_calories || 0), 0);
  const avgDailyNet = totalNet / days;
  // predicted weight change (kg) over period
  const predictedKg = avgDailyNet * days / 7700;

  const actualKg = (weights[weights.length-1].weight_kg - weights[0].weight_kg);
  // compare
  const ratio = Math.abs(predictedKg) < 1e-6 ? 0 : Math.abs(actualKg / predictedKg);

  // choose adjustment rule:
  // if predicted magnitude >> actual (ratio < 0.8) -> reduce deficit by 100-300 kcal
  // if actual >> predicted (ratio > 1.25) -> can increase deficit a bit
  let adjustment = 0;
  let reason = '';
  if (Math.abs(predictedKg) > 0.01) {
    if (Math.abs(actualKg) < Math.abs(predictedKg) * 0.8) {
      adjustment = -Math.sign(avgDailyNet) * -150; // reduce deficit magnitude by 150kcal (e.g., if deficit was -500, bump to -350)
      reason = 'observed weight change smaller than predicted → reduce planned deficit magnitude';
    } else if (Math.abs(actualKg) > Math.abs(predictedKg) * 1.25) {
      adjustment = -Math.sign(avgDailyNet) * 100; // increase deficit magnitude
      reason = 'observed weight change larger than predicted → adjust to maintain progress';
    } else {
      reason = 'predicted/observed within range — no change';
    }
  } else {
    reason = 'predicted close to zero — no change';
  }

  // compute baseline recommended calories using Mifflin
  const age = user.dob ? Math.floor((Date.now() - new Date(user.dob).getTime())/(1000*60*60*24*365.25)) : 30;
  const weightKg = weights[weights.length-1].weight_kg;
  const heightCm = user.height_cm || 170;
  const bmr = mifflinStJeor({ sex: user.sex || 'male', weightKg, heightCm, age });
  const activityMap = { sedentary:1.2, light:1.375, moderate:1.55, very_active:1.725 };
  const tdeeVal = tdee({ bmr, activityFactor: activityMap[user.activity_level] || 1.2 });

  // if user set goal_date and goal_weight, compute per-day target
  let recommended = null;
  if (user.goal_weight_kg && user.goal_date) {
    const daysToTarget = Math.max(1, Math.ceil((new Date(user.goal_date) - new Date())/(1000*60*60*24)));
    recommended = caloriesForTarget({ currentWeightKg: weightKg, targetWeightKg: Number(user.goal_weight_kg), days: daysToTarget, tdee: tdeeVal });
  } else {
    // default recommended = tdee adjusted by small deficit based on trend
    recommended = tdeeVal + (avgDailyNet); // naive - apply current average net
  }

  // apply adjustment
  const finalRecommended = Math.round((recommended || tdeeVal) + adjustment);

  // log adaptive decision
  await supabaseServer.from('adaptive_logs').insert({
    user_id,
    old_goal_details: { recommended, tdee: tdeeVal, avgDailyNet },
    new_goal_details: { recommended_calories: finalRecommended, adjustment, days },
    reason
  });

  // optionally save recommended_targets
  await supabaseServer.from('recommended_targets').insert({
    user_id,
    recommended_calories: finalRecommended,
    source: 'adaptive_recalc'
  });

  return res.status(200).json({
    recommended_calories: finalRecommended,
    reason,
    predictedKg,
    actualKg,
    avgDailyNet,
    bmr,
    tdee: tdeeVal
  });
}
