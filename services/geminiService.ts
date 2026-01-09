
import { GoogleGenAI } from "@google/genai";
import { SubPeriod } from "../types";

export const analyzeGrades = async (subPeriods: SubPeriod[], currentYearName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataSummary = subPeriods.map(sp => {
    const subjectsSummary = sp.subjects.map(s => {
      const totalWeight = s.grades.reduce((acc, g) => acc + g.coefficient, 0);
      const avg = totalWeight > 0 ? (s.grades.reduce((acc, g) => acc + (g.value * g.coefficient), 0) / totalWeight).toFixed(2) : 'N/A';
      return `    - ${s.name}: ${avg}/20 (Coef ${s.coefficient})`;
    }).join('\n');
    return `Période: ${sp.name}\n${subjectsSummary || '    Aucune matière'}`;
  }).join('\n\n');

  const prompt = `
    Tu es un expert en coaching scolaire. Analyse les résultats de l'élève pour l'année "${currentYearName}".
    Voici les données par sous-périodes :
    ${dataSummary}

    Génère un rapport pédagogique interactif en HTML (sans balises <html>/<body>).
    
    RÈGLES DE DESIGN CRITIQUES :
    - UTILISE DES COULEURS À HAUT CONTRASTE. 
    - Fond des blocs : 'bg-white' ou 'bg-slate-50'.
    - Texte : 'text-slate-900' ou 'text-slate-800'. JAMAIS de texte sombre sur fond sombre.
    - Utilise des bordures colorées 'border-l-4' pour distinguer les sections.

    STRUCTURE DU RAPPORT :
    1. 📊 **Vue d'ensemble** : Analyse de la dynamique entre les périodes (progression ou baisse).
    2. 🎯 **Focus Matières** : Quelles matières tirent la moyenne vers le haut/bas.
    3. 🚀 **Plan d'Action Stratégique** : Calcule précisément quel score l'élève doit viser dans sa matière à plus fort coefficient pour augmenter sa moyenne générale de 1 point.
    4. 💡 **Conseils de Méthodologie** : 3 astuces personnalisées.
    5. 🌟 **Mot de l'expert** : Une conclusion encourageante.

    Utilise Tailwind CSS pour le style. Sois précis et technique mais encourageant.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "<p>L'analyse n'est pas disponible pour le moment.</p>";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "<p class='text-rose-600 font-bold'>Erreur lors de la génération de l'analyse IA. Vérifiez votre connexion.</p>";
  }
};
