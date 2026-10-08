type GroupKey = 'groupA' | 'groupB' | 'groupC' | 'groupD';

type RiskTier = {
  tier: 'urgent' | 'high' | 'moderate' | 'low';
  label: string;
  min: number;
  color: string;
  bgClass: string;
  icon: string;
  summary: string;
  recommendation: string;
  urgency: string;
};

const GROUPS: Record<GroupKey, { weight: number; questionIds: string[] }> = {
  groupA: {
    weight: 3,
    questionIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'],
  },
  groupB: {
    weight: 4,
    questionIds: ['b1', 'b2', 'b3', 'b4', 'b5'],
  },
  groupC: {
    weight: 4,
    questionIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
  },
  groupD: {
    weight: 2,
    questionIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
  },
};

const RISK_TIERS: RiskTier[] = [
  {
    tier: 'urgent',
    label: 'Urgent',
    min: 75,
    color: '#C0392B',
    bgClass: 'urgent',
    icon: '🚨',
    summary:
      'Your responses indicate a pattern of symptoms that requires urgent clinical attention.',
    recommendation:
      'You should seek an immediate appointment with a urology or oncology department. Do not delay. Bring this assessment report with you. A doctor will conduct a physical examination, request a PSA blood test, and determine if further imaging is needed.',
    urgency: 'SAME DAY OR NEXT AVAILABLE APPOINTMENT',
  },
  {
    tier: 'high',
    label: 'High Risk',
    min: 50,
    color: '#B36B00',
    bgClass: 'high',
    icon: '🔴',
    summary:
      'Your responses suggest a high level of concerning symptoms and risk factors.',
    recommendation:
      'An appointment with a urologist is strongly recommended within the next 1–2 weeks. A PSA test and digital rectal examination (DRE) will be arranged. Please do not self-medicate before your consultation.',
    urgency: 'WITHIN 1–2 WEEKS',
  },
  {
    tier: 'moderate',
    label: 'Moderate Risk',
    min: 25,
    color: '#D4882A',
    bgClass: 'moderate',
    icon: '🟡',
    summary:
      'Your responses suggest moderate symptoms that warrant clinical evaluation.',
    recommendation:
      'Schedule an outpatient consultation within the coming weeks. A doctor will review your responses and advise on appropriate next steps, which may include a PSA screening test.',
    urgency: 'WITHIN 4 WEEKS',
  },
  {
    tier: 'low',
    label: 'Low Risk',
    min: 0,
    color: '#1A7A54',
    bgClass: 'low',
    icon: '🟢',
    summary: 'Your current responses suggest a low symptom burden.',
    recommendation:
      'Continue attending regular health check-ups. Men above age 50 (or age 40 with family history) should discuss routine PSA screening with their doctor annually. Report any new or worsening symptoms promptly.',
    urgency: 'ROUTINE ANNUAL REVIEW',
  },
];

const SYMPTOM_RECOMMENDATIONS = [
  {
    priority: 100,
    symptomIds: ['b1'],
    text: 'Blood in the urine should be assessed promptly by a clinician. Arrange an urgent clinical review, especially if the bleeding is ongoing, heavy, or accompanied by pain, clots, dizziness, or difficulty passing urine.',
  },
  {
    priority: 100,
    symptomIds: ['c4'],
    text: 'New or persistent bone pain should be assessed promptly by a clinician. Arrange an urgent review and explain where the pain is, how long it has lasted, and whether it limits movement or sleep.',
  },
  {
    priority: 95,
    symptomIds: ['b3'],
    text: 'Unexplained significant weight loss should be reviewed promptly by a clinician. Arrange an appointment and mention the amount and timing of the weight change, along with any other symptoms.',
  },
  {
    priority: 95,
    symptomIds: ['b5'],
    text: 'Unexplained swelling of the legs or feet should be reviewed promptly, particularly if it is new, worsening, one-sided, or associated with breathlessness or chest pain. Seek urgent care for severe or sudden symptoms.',
  },
  {
    priority: 70,
    symptomIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'],
    text: 'Urinary symptoms can have several causes and should be discussed with a clinician. Arrange a review to assess the symptoms and ask whether urine testing, a prostate examination, or other investigations are appropriate. Do not self-medicate.',
  },
  {
    priority: 65,
    symptomIds: ['b2', 'b4'],
    text: 'Systemic or reproductive symptoms should be discussed with a clinician. Arrange a clinical review and report when the symptom started, whether it is changing, and any associated symptoms.',
  },
  {
    priority: 60,
    symptomIds: ['c1', 'c2', 'c3', 'c5'],
    text: 'Persistent pelvic, back, urinary, or sexual pain should be assessed by a clinician. Arrange a review and describe the location, severity, duration, and triggers of the pain.',
  },
  {
    priority: 40,
    symptomIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
    text: 'Your risk factors are worth discussing during a routine clinical review. Bring any previous test results and family history details so the clinician can advise whether screening or further assessment is appropriate.',
  },
] as const;

export function runRiskEvaluation(selectedIds: string[]) {
  let score = 0;
  let maxScore = 0;
  const breakdown: Record<GroupKey, number> = {
    groupA: 0,
    groupB: 0,
    groupC: 0,
    groupD: 0,
  };
  const selected = new Set(selectedIds);

  for (const groupKey of Object.keys(GROUPS) as GroupKey[]) {
    const group = GROUPS[groupKey];
    maxScore += group.questionIds.length * group.weight;
    for (const questionId of group.questionIds) {
      if (selected.has(questionId)) {
        score += group.weight;
        breakdown[groupKey] += group.weight;
      }
    }
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const tier = RISK_TIERS.find((item) => percentage >= item.min)!;
  const recommendation = SYMPTOM_RECOMMENDATIONS.find((item) =>
    item.symptomIds.some((id) => selected.has(id)),
  );

  return {
    score,
    maxScore,
    percentage,
    tier,
    automaticRecommendation:
      recommendation?.text ??
      'No symptoms were selected. Continue routine health care and discuss any new or worsening symptoms with a clinician.',
    breakdown,
    selectedIds,
    timestamp: new Date().toISOString(),
  };
}
