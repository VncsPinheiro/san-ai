import { Type } from '@google/genai'

// Certifique-se de importar o SchemaType do SDK
// import { SchemaType as Type } from "@google/genai"; 

export const createMedicalReportsFunctionDeclaration = {
  name: 'create_report',
  description: 'Generates the final structure for the Sanare health report PDF based on medical logs.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      
      // --- Pressão ---
      bloodPressure: {
        type: Type.OBJECT,
        description: 'Analysis of blood pressure data.',
        properties: {
          averageSystolic: { type: Type.NUMBER, description: 'Integer value (mmHg)' },
          averageDiastolic: { type: Type.NUMBER, description: 'Integer value (mmHg)' },
          averageBloodPressure: { type: Type.STRING, description: 'Formatted string ex: "120/80"' },
          message: { type: Type.STRING, description: 'Medical advice/analysis' }
        },
        required: ['averageSystolic', 'averageDiastolic', 'averageBloodPressure', 'message']
      },

      // --- Hidratação ---
      hydration: {
        type: Type.OBJECT,
        description: 'Analysis of daily water intake.',
        properties: {
          averageHydration: { 
            type: Type.NUMBER,
            description: 'Average intake in Liters (e.g. 2.5)' 
          },
          message: { type: Type.STRING, description: 'Motivational message' }
        },
        required: ['averageHydration', 'message']
      },

      // --- Batimentos ---
      heartRate: {
        type: Type.OBJECT,
        description: 'Heart rate analysis.',
        properties: {
          averageHeartRate: { type: Type.NUMBER, description: 'Average BPM' },
          minHeartRate: { type: Type.NUMBER, description: 'Minimum BPM recorded' },
          maxHeartRate: { type: Type.NUMBER, description: 'Maximum BPM recorded' },
          message: { type: Type.STRING, description: 'Analysis of heart stability' }
        },
        required: ['averageHeartRate', 'minHeartRate', 'maxHeartRate', 'message']
      },

      // --- Sintomas ---
      symptoms: {
        type: Type.OBJECT,
        description: 'Frequency of reported symptoms.',
        properties: {
          symptomsList: { 
            type: Type.STRING, 
            description: 'Formatted text string listing symptoms and counts (e.g. "Headache: 2, Nausea: 1")' 
          },
          message: { type: Type.STRING, description: 'Clinical comment on symptoms' }
        },
        required: ['symptomsList', 'message']
      },

      // --- Humor ---
      mood: {
        type: Type.OBJECT,
        description: 'Emotional analysis.',
        properties: {
          moodsList: { 
             type: Type.STRING, 
             description: 'Formatted text string listing moods and counts (e.g. "Anxious: 2, Happy: 1")' 
          },
          message: { type: Type.STRING, description: 'Psychological support message' }
        },
        required: ['moodsList', 'message']
      },

      // --- Glicemia ---
      bloodSugar: {
        type: Type.OBJECT,
        description: 'Blood glucose analysis.',
        properties: {
          averageBloodSugar: { type: Type.NUMBER, description: 'Avg mg/dL' },
          minBloodSugar: { type: Type.NUMBER, description: 'Min mg/dL' },
          maxBloodSugar: { type: Type.NUMBER, description: 'Max mg/dL' },
          message: { type: Type.STRING, description: 'Alert or confirmation message' }
        },
        required: ['averageBloodSugar', 'minBloodSugar', 'maxBloodSugar', 'message']
      },

      // --- Cabeçalho / Tempo ---
      timeRegistered: {
        type: Type.OBJECT,
        description: 'Metadata about the report period.',
        properties: {
          year: { type: Type.NUMBER, description: 'Year (YYYY)' },
          month: { 
             type: Type.STRING, 
             description: 'Full month name in Portuguese (e.g., "Novembro")'
          },
          totalLogs: { type: Type.NUMBER, description: 'Total consistency days' }
        },
        required: ['year', 'month', 'totalLogs']
      }

    },
    // Lista final de módulos obrigatórios
    required: ['bloodPressure', 'hydration', 'heartRate', 'symptoms', 'mood', 'bloodSugar', 'timeRegistered']
  }
}