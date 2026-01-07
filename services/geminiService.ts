
import { GoogleGenAI, Type } from "@google/genai";
import { LessonConfig, Question, StudentProfile } from "../types";

export const generateLessonContent = async (config: LessonConfig, profile: StudentProfile): Promise<Question[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Voeg je API_KEY toe in de Vercel instellingen!");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Genereer 5 educatieve meerkeuzevragen in het NEDERLANDS. 
  Niveau: ${profile.grade}. 
  Onderwerp: ${config.topic}. 
  Geef antwoord in JSON formaat.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctAnswer", "explanation", "category"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (err) {
    throw new Error("AI kon geen vragen maken. Is je API_KEY geldig?");
  }
};
