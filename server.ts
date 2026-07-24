/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  registerUser,
  loginUser,
  findUserById,
  updateUserProfile,
  signToken,
  requireAuth,
  toPublicUser,
} from './server/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, schoolName, position, city } = req.body;
    const user = await registerUser({ fullName, email, password, schoolName, position, city });
    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Тіркелу мүмкін болмады.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email және құпия сөзді енгізіңіз.' });
      return;
    }
    const user = await loginUser(email, password);
    const token = signToken(user.id);
    res.json({ token, user });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Кіру мүмкін болмады.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = findUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'Пайдаланушы табылмады.' });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, schoolName, position, city, subjects, grades, standardConformity, autosave, theme } = req.body;
    const user = await updateUserProfile(req.userId!, {
      fullName, schoolName, position, city, subjects, grades, standardConformity, autosave, theme,
    });
    res.json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Профильді жаңарту мүмкін болмады.' });
  }
});

// Lazy-initialized GoogleGenAI client to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY қоршаған орта айнымалысы орнатылмаған.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Robust wrapper for generateContent to handle 503/429 and implement retry & fallback across multiple models
async function generateContentWithRetry(client: GoogleGenAI, parameters: {
  model: string;
  contents: string;
  config: any;
}): Promise<any> {
  const primaryModel = parameters.model || 'gemini-3.1-flash-lite';
  // Account's real AI Studio quota (checked via Rate Limits page):
  //   gemini-2.5-flash / gemini-3-flash  -> only 5 RPM / 20 RPD (runs out fast)
  //   gemini-3.1-flash-lite              -> 15 RPM / 500 RPD (25x the daily budget)
  // So gemini-3.1-flash-lite is primary; gemini-flash-latest and gemini-2.5-flash
  // are kept as fallbacks for when a request needs a bit more quality and quota allows.
  const modelsToTry = Array.from(new Set([primaryModel, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean)));
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    console.log(`Starting generation attempt using model: ${currentModel}`);
    
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Gemini API Call: ${currentModel} (Attempt ${attempt}/${maxAttempts})`);
        
        const callParams = {
          ...parameters,
          model: currentModel
        };
        
        const response = await client.models.generateContent(callParams);
        console.log(`Successfully generated content using model: ${currentModel}`);
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt} with ${currentModel} failed:`, error.message || error);
        
        const errorMsg = (error.message || '').toUpperCase();
        const isTransient = errorMsg.includes('503') || 
                            errorMsg.includes('UNAVAILABLE') || 
                            errorMsg.includes('429') || 
                            errorMsg.includes('RESOURCE_EXHAUSTED') ||
                            error.status === 503 ||
                            error.status === 429;

        if (isTransient && attempt < maxAttempts) {
          const delay = attempt * 1000;
          console.log(`Transient error for ${currentModel}. Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break; // Try next model in fallback list
        }
      }
    }
  }

  throw lastError;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// BJBTJB Generator
app.post('/api/gemini/generate-bjb', async (req, res) => {
  try {
    const { subject, grade, quarter, topic, questionCount, bloomTaxonomy, difficulty } = req.body;
    
    const client = getAIClient();
    
    const systemInstruction = `Сіз мұғалімдерге арналған кәсіби білім беру контентін жасаушы сарапшысыз. 
Барлық нәтижені МІНДЕТТІ ТҮРДЕ тек қазақ тілінде жасаңыз. Орыс немесе ағылшын сөздерін мүлде қолданбаңыз.
Нәтиже берілген JSON схемасына сәйкес болуы керек. 
Сұрақтар мен дескрипторлар өте сапалы, нақты және мектеп бағдарламасына сай болуы тиіс.`;

    const prompt = `Пән: ${subject}
Сынып: ${grade}
Тоқсан: ${quarter}
Тақырып немесе бөлім: ${topic}
Сұрақтар саны: ${questionCount}
Блум таксономиясының деңгейлері: ${bloomTaxonomy}
Қиындық деңгейі: ${difficulty}

Осы деректер бойынша толық БЖБ (Бөлім бойынша жиынтық бағалау) немесе ТЖБ (Тоқсандық жиынтық бағалау) тапсырмаларын жасаңыз.
Әр сұраққа сәйкес бағалау критерийлерін, дескрипторларын және жауап кілтін нақты жазыңыз.`;

    const response = await generateContentWithRetry(client, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            grade: { type: Type.STRING },
            quarter: { type: Type.STRING },
            topic: { type: Type.STRING },
            bloomTaxonomy: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            overallInstructions: { type: Type.STRING, description: 'Тапсырмаларды орындау жөніндегі жалпы нұсқаулық' },
            criteria: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Бағалау критерийлерінің тізімі'
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  question: { type: Type.STRING, description: 'Сұрақ мәтіні немесе тапсырма' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Нұсқалар тізімі (егер тест түрінде болса, әйтпесе бос қалдырыңыз немесе А, В, С, Д нұсқаларын қосыңыз)'
                  },
                  level: { type: Type.STRING, description: 'Блум таксономиясының деңгейі (мысалы: Білу және түсіну)' },
                  descriptor: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Осы тапсырманың дескрипторлары (қадамдық бағалау)'
                  },
                  maxScore: { type: Type.INTEGER, description: 'Максималды балл' },
                  answerKey: { type: Type.STRING, description: 'Дұрыс жауабы және шешілу жолы' }
                },
                required: ['number', 'question', 'level', 'descriptor', 'maxScore', 'answerKey']
              }
            }
          },
          required: ['subject', 'grade', 'quarter', 'topic', 'bloomTaxonomy', 'difficulty', 'overallInstructions', 'criteria', 'questions']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Модельден жауап келмеді.');
    }
    
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('BJB Generation Error:', error);
    res.status(500).json({ error: error.message || 'Ішкі серверлік қателік орын алды' });
  }
});

// Lesson Plan Generator
app.post('/api/gemini/generate-lesson', async (req, res) => {
  try {
    const { subject, grade, topic } = req.body;
    
    const client = getAIClient();
    
    const systemInstruction = `Сіз мектеп пен балабақша мұғалімдеріне арналған кәсіби сабақ жоспарларын жасайтын сарапшы әдіскерсіз.
Барлық материалдарды тек қана қазақ тілінде жасаңыз. Ешқандай басқа тіл араласпауы тиіс.
Нәтиже берілген JSON схемасына сәйкес болуы керек.
Сабақтың әр кезеңі (кіріспе, негізгі бөлім, рефлексия, үй тапсырмасы) жан-жақты, заманауи интерактивті әдіс-тәсілдермен толтырылсын.`;

    const prompt = `Пән: ${subject}
Сынып/Топ: ${grade}
Сабақ тақырыбы: ${topic}

Осы деректер негізінде толық ашық сабақ жоспарын, көрнекілік материалдарының сипаттамасын, презентация жоспарын және оқушыларға арналған жұмыс парақтарының мазмұнын жасаңыз.`;

    const response = await generateContentWithRetry(client, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            grade: { type: Type.STRING },
            topic: { type: Type.STRING },
            objectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Сабақтың мақсаттары'
            },
            learningOutcomes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Күтілетін нәтижелер'
            },
            warmUp: { type: Type.STRING, description: 'Миға шабуыл, ұйымдастыру кезеңі немесе қызығушылықты ояту кезеңі' },
            mainLesson: { type: Type.STRING, description: 'Сабақтың негізгі бөлімі, жаңа тақырыпты түсіндіру және тапсырмалар' },
            reflection: { type: Type.STRING, description: 'Сабақты қорытындылау, рефлексия немесе кері байланыс' },
            homework: { type: Type.STRING, description: 'Үй тапсырмасы және оны орындау бойынша нұсқаулық' },
            assessment: { type: Type.STRING, description: 'Сабақты бағалау критерийлері мен дескрипторлары' },
            presentationOutline: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Слайдтар немесе презентация жоспарының тізімі'
            },
            worksheets: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Оқушыларға арналған тарату парақтары, жұмыс парақтары мен тапсырмалар'
            }
          },
          required: [
            'subject',
            'grade',
            'topic',
            'objectives',
            'learningOutcomes',
            'warmUp',
            'mainLesson',
            'reflection',
            'homework',
            'assessment',
            'presentationOutline',
            'worksheets'
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Модельден жауап келмеді.');
    }
    
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('Lesson Generation Error:', error);
    res.status(500).json({ error: error.message || 'Ішкі серверлік қателік орын алды' });
  }
});

// Күнтізбелік-тақырыптық жоспар (КТЖ)
app.post('/api/gemini/generate-ktj', async (req, res) => {
  try {
    const { subject, grade, schoolYear, weeklyHours, curriculum } = req.body;
    const client = getAIClient();
    
    const systemInstruction = `Сіз күнтізбелік-тақырыптық жоспарлар (КТЖ) құрастыратын кәсіби педагог-әдіскерсіз.
Барлық жауапты қазақ тілінде жазыңыз. Жоспар МЖББС стандарттарына сай, нақты және сауатты болуы керек.`;

    const prompt = `Пән: ${subject}
Сынып: ${grade}
Оқу жылы: ${schoolYear}
Апталық сағат саны: ${weeklyHours}
Үлгілік оқу бағдарламасы: ${curriculum}

Осы деректер негізінде толық күнтізбелік-тақырыптық жоспар (КТЖ) жасаңыз. 
Онда сабақ тақырыптарын тоқсандар бойынша бөліңіз, әр тақырыпқа сәйкес оқу мақсаттарын, сағат санын және тиісті бөлімін көрсетіңіз.`;

    const response = await generateContentWithRetry(client, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subject: { type: Type.STRING },
            grade: { type: Type.STRING },
            schoolYear: { type: Type.STRING },
            weeklyHours: { type: Type.STRING },
            curriculum: { type: Type.STRING },
            quarters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  quarterName: { type: Type.STRING },
                  topics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        lessonNumber: { type: Type.INTEGER },
                        topic: { type: Type.STRING },
                        hours: { type: Type.INTEGER },
                        learningObjectives: { type: Type.STRING },
                        section: { type: Type.STRING }
                      },
                      required: ['lessonNumber', 'topic', 'hours', 'learningObjectives', 'section']
                    }
                  }
                },
                required: ['quarterName', 'topics']
              }
            }
          },
          required: ['title', 'subject', 'grade', 'schoolYear', 'weeklyHours', 'curriculum', 'quarters']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Құжат мазмұнын жасау мүмкін болмады.');
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('KTJ Generation Error:', error);
    res.status(500).json({ error: error.message || 'Ішкі серверлік қателік орын алды' });
  }
});

// Universal Document Generator (for UMJ, Tarbie, Balabaqsha)
app.post('/api/gemini/generate-doc', async (req, res) => {
  try {
    const { docType, params } = req.body;
    const { subject, grade, topic } = params || {};
    
    const client = getAIClient();
    
    let systemInstruction = '';
    let prompt = '';
    
    if (docType === 'umj') {
      systemInstruction = `Сіз кәсіби әдіскерсіз. Берілген пән мен сынып бойынша толық Ұзақ мерзімді жоспар (ҰМЖ) жасаңыз.
Барлық мәтінді тек қазақ тілінде жазыңыз. Нәтиже тақырыптар, сағат саны және оқу мақсаттары бар әдемі безендірілген HTML кесте түрінде болуы тиіс.`;
      prompt = `Пән: ${subject}
Сынып: ${grade}
ҰМЖ Бөлімі/Бағыты: ${topic}

Осы деректер негізінде толық Ұзақ мерзімді жоспардың (ҰМЖ) мазмұнын құрастырыңыз. Оны HTML форматында (кестелер, тізімдер және тақырыпшалармен) қайтарыңыз.`;
    } else if (docType === 'tarbie') {
      systemInstruction = `Сіз мектептің сынып жетекшісісіз. Тәрбие сағатының толық, мазмұнды жоспарын құрастырыңыз.
Барлық мәтінді тек қазақ тілінде жазыңыз. HTML форматында әдемі безендірілген, құрылымдалған түрде шығарыңыз (кіріспе, негізгі бөлім, ойындар/тренингтер, қорытынды, рефлексия).`;
      prompt = `Сынып: ${grade}
Тақырыбы: ${topic}

Тәрбие сағатының толық, тәрбиелік мәні зор сценарий-жоспарын HTML форматында жасаңыз.`;
    } else if (docType === 'balabaqsha') {
      systemInstruction = `Сіз балабақша тәрбиешісісіз. Мектепке дейінгі ұйымға арналған Ұйымдастырылған оқу қызметінің (ҰОҚ) жоспарын жасаңыз.
Барлық мәтінді қазақ тілінде жазыңыз. HTML форматында әдемі құрылымдалған (шеңбер, ойын, негізгі бөлім, қорытынды) етіп қайтарыңыз.`;
      prompt = `Жас тобы: ${grade}
Тақырыбы: ${topic}

Балабақшаға арналған ҰОҚ жоспарын HTML форматында жасаңыз.`;
    } else {
      systemInstruction = `Сіз кәсіби педагогсіз. Сұралған құжатты қазақ тілінде толық әрі HTML форматында безендіріп жасаңыз.`;
      prompt = `Тақырып: ${topic}, Пән: ${subject}, Сынып: ${grade}`;
    }

    const response = await generateContentWithRetry(client, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Құжаттың ресми тақырыбы' },
            contentHtml: { type: Type.STRING, description: 'Құжаттың толық HTML мазмұны (стильдерсіз, таза құрылымдық HTML: кестелер, тізімдер, тақырыпшалар)' }
          },
          required: ['title', 'contentHtml']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Құжат мазмұнын жасау мүмкін болмады.');
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('Doc Generation Error:', error);
    res.status(500).json({ error: error.message || 'Ішкі серверлік қателік орын алды' });
  }
});

// Оқушы жетістіктерінің есебі
app.post('/api/gemini/generate-achievements', async (req, res) => {
  try {
    const { grade, student, subject, results, olympiad, competitions, clubs, attendance } = req.body;
    const client = getAIClient();
    
    const systemInstruction = `Сіз мектеп психологі және сынып жетекшісісіз. Оқушы жетістіктерінің ресми, сауатты есебін құрастырасыз.
Барлық жауапты қазақ тілінде жазыңыз.`;

    const prompt = `Сынып: ${grade}
Оқушы: ${student}
Пән: ${subject}
Бағалау нәтижелері: ${results}
Олимпиадалар: ${olympiad}
Байқаулар: ${competitions}
Үйірмелер: ${clubs}
Қатысу көрсеткіші: ${attendance}

Осы деректер бойынша оқушының пән және тәрбие бойынша жетістіктерінің толық есебін, үлгерім талдауын, күшті жақтарын, даму қажет тұстарын және ұсыныстарын жасаңыз.`;

    const response = await generateContentWithRetry(client, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING },
            grade: { type: Type.STRING },
            subject: { type: Type.STRING },
            achievementReport: { type: Type.STRING },
            performanceAnalysis: { type: Type.STRING },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['studentName', 'grade', 'subject', 'achievementReport', 'performanceAnalysis', 'strengths', 'weaknesses', 'recommendations']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Құжат мазмұнын жасау мүмкін болмады.');
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('Achievements Generation Error:', error);
    res.status(500).json({ error: error.message || 'Ішкі серверлік қателік орын алды' });
  }
});

// Ата-анаға мінездеме
app.post('/api/gemini/generate-parent-reference', async (req, res) => {
  try {
    const { studentName, grade, behavior, performance, activity, attendance, relationships } = req.body;
    const client = getAIClient();
    
    const systemInstruction = `Сіз сынып жетекшісісіз. Ата-анаға арналған оқушының ресми педагогикалық-психологиялық мінездемесін, ұсыныстар мен қолдау кеңестерін әзірлейсіз.
Барлық жауапты қазақ тілінде жазыңыз. Сөз саптауы сыпайы, бірақ кәсіби және педагогикалық тұрғыдан дұрыс болуы тиіс.`;

    const prompt = `Оқушы аты-жөні: ${studentName}
Сыныбы: ${grade}
Мінез-құлқы: ${behavior}
Үлгерімі: ${performance}
Белсенділігі: ${activity}
Қатысуы: ${attendance}
Қарым-қатынасы: ${relationships}

Осы деректер негізінде ата-анаға арналған ресми мінездеме, оқушыны дамыту бойынша ұсыныстар мен үйде қолдау көрсету кеңестерін жасаңыз.`;

    const response = await generateContentWithRetry(client, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING },
            grade: { type: Type.STRING },
            officialReference: { type: Type.STRING },
            recommendationsForParents: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            supportTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['studentName', 'grade', 'officialReference', 'recommendationsForParents', 'supportTips']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Құжат мазмұнын жасау мүмкін болмады.');
    }

    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error('Parent Reference Error:', error);
    res.status(500).json({ error: error.message || 'Ішкі серверлік қателік орын алды' });
  }
});

// AI Chat Assistant
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const client = getAIClient();
    
    const systemInstruction = `Сіз мұғалімдерге, тәрбиешілерге және мектеп/балабақша әкімшілігіне арналған "Ustaz Studio" заманауи платформасының ақылды көмекшісісіз.
Қолданушылар сізден сабақ жоспарларын жасауды, БЖБ/ТЖБ тақырыптарын талқылауды, балабақша тәрбиешілеріне арналған ойындар ұсынуды немесе педагогикалық кеңестер беруді сұрайды.
Барлық жауаптарды ТЕК қана қазақ тілінде жазыңыз. Заманауи, сыпайы, пайдалы және құрылымдалған түрде жауап беріңіз.
Жауаптарда маңызды пункттерді қалың қаріппен (bold) немесе тізімдермен белгілеңіз.`;

    let chat = client.chats.create({
      model: 'gemini-3.1-flash-lite',
      config: {
        systemInstruction,
      }
    });

    // Populate history if available
    if (history && history.length > 0) {
      // Direct message history injection or we can simulate conversation by structuring the prompt
    }

    let response;
    const chatModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let lastChatError: any = null;

    for (const chatModel of chatModels) {
      try {
        console.log(`Attempting chat with model: ${chatModel}`);
        chat = client.chats.create({
          model: chatModel,
          config: {
            systemInstruction,
          }
        });
        response = await chat.sendMessage({ message });
        console.log(`Successfully completed chat with model: ${chatModel}`);
        break;
      } catch (chatError: any) {
        lastChatError = chatError;
        console.error(`Chat failed with model ${chatModel}:`, chatError);
      }
    }

    if (!response) {
      throw lastChatError || new Error('All chat models failed to generate response');
    }
    const text = response.text;
    
    res.json({
      reply: text || 'Кешіріңіз, мен бұл сұраққа жауап бере алмадым.'
    });
  } catch (error: any) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: error.message || 'Ішкі серверлік қателік' });
  }
});

// ----------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// ----------------------------------------------------

async function setupApp() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupApp();
