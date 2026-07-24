/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BJBQuestion {
  id: string;
  number: number;
  question: string;
  options?: string[]; // for MCQs if applicable
  level: string; // e.g., Білу және түсіну, Қолдану, Жоғары деңгей дағдылары
  descriptor: string[];
  maxScore: number;
  answerKey: string;
}

export interface BJBData {
  id: string;
  subject: string;
  grade: string;
  quarter: string;
  topic: string;
  questionCount: number;
  bloomTaxonomy: string;
  difficulty: string;
  questions: BJBQuestion[];
  criteria: string[];
  overallInstructions: string;
  createdAt: string;
}

export interface LessonPlanData {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  objectives: string[];
  learningOutcomes: string[];
  warmUp: string;
  mainLesson: string;
  reflection: string;
  homework: string;
  assessment: string;
  presentationOutline: string[];
  worksheets: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
