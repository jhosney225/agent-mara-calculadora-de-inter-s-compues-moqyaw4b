
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function calculateCompoundInterest(
  principal,
  rate,
  compounds,
  years,
  additionalMonthly = 0
) {
  let amount = principal;
  const monthlyAdditional = additionalMonthly / 12;
  const months = years * 12;

  for (let i = 0; i < months; i++) {
    amount += monthlyAdditional;
    amount = amount * (1 + rate / 100 / compounds);
  }

  return {
    finalAmount: parseFloat(amount.toFixed(2)),
    totalInterest: parseFloat((amount - principal).toFixed(2)),
    totalContribution: parseFloat((principal + additionalMonthly * years).toFixed(2)),
  };
}

async function main() {
  console.log("📊 Calculadora de Interés Compuesto para Inversiones");
  console.log("=" + "=".repeat(50));

  const conversationHistory = [];

  // Initial system message
  const systemMessage = `Eres un asesor financiero experto en cálculo de interés compuesto. 
Tu objetivo es ayudar al usuario a:
1. Entender cómo funciona el interés compuesto
2. Calcular el crecimiento de sus inversiones
3. Comparar diferentes escenarios de inversión
4. Proporcionar consejos sobre estrategias de inversión

Cuando el usuario proporcione datos de inversión (capital inicial, tasa de interés, período, etc.),
ayuda a calcular y explicar los resultados. Sé claro, educativo y proporciona ejemplos prácticos.
Siempre haz referencias a los cálculos realizados.`;

  console.log(
    "\n💡 Puedo ayudarte con cálculos de interés compuesto. Cuéntame sobre tu inversión:"
  );
  console.log("Ejemplo: 'Tengo $10,000 para invertir a una tasa del 8% anual por 10 años'\n");

  let continueConversation = true;

  while (continueConversation) {
    const userInput = await question("\n📝 Tú: ");

    if (
      userInput.toLowerCase() === "salir" ||
      userInput.toLowerCase() === "exit"
    ) {
      console.log(
        "\n👋 Gracias por usar la calculadora. ¡Feliz inversión! (exit)"
      );
      continueConversation = false;
      break;
    }

    conversationHistory.push({
      role: "user",
      content: userInput,
    });

    try {
      // First, use Claude to understand the investment parameters
      const analysisResponse = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: `Eres un analizador de inversiones. Extrae los siguientes datos del texto del usuario si están presentes:
- Capital inicial (principal)
- Tasa de interés anual (rate)
- Tipo de capitalización (compounds: 1=anual, 2=semestral, 4=trimestral, 12=mensual, 365=diario)
- Período en años (years)
- Aportación adicional mensual (optional, por defecto 0)

Responde en formato JSON SOLAMENTE si encuentras números, así:
{"principal": número, "rate": número, "compounds": número, "years": número, "additionalMonthly": número}

Si no encuentras suficientes datos, responde con: {"error": "mensaje explicativo"}`,
        messages: [
          {
            role: "user",
            content: userInput,
          },
        ],
      });

      let calculationData = null;
      let analysisText = analysisResponse.content[0].text;

      // Try to parse JSON from the response
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          calculationData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If JSON parsing fails, continue without calculations
      }

      let assistantMessage = "";

      // If we have valid calculation data, perform the calculation
      if (
        calculationData &&
        !calculationData.error &&
        calculationData.principal &&
        calculationData.rate &&
        calculationData.years
      ) {
        const result = await calculateCompoundInterest(
          calculationData.principal,
          calculationData.rate,
          calculationData.compounds || 12,
          calculationData.years,
          calculationData.additionalMonthly || 0
        );

        // Now ask Claude to explain the results
        const explanationResponse = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          system: systemMessage,
          messages: [
            ...conversationHistory,
            {
              role: "assistant",
              content: `He realizado el siguiente cálculo de interés compuesto:\n\nDatos de entrada:\n- Capital inicial: $${calculationData.principal.toFixed(2)}\n- Tasa de interés anual: ${calculationData.rate}%\n- Período: ${calculationData.years} años\n- Capitalización: ${calculationData.compounds || 12} veces al año\n${calculationData.additionalMonthly ? `- Aportación adicional mensual: $${calculationData.