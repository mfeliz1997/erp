import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function suggestMapping(userColumns: string[]) {
  const invenzaFields = [
    { key: 'name', label: 'Nombre' },
    { key: 'description', label: 'Descripción' },
    { key: 'cost_price', label: 'Costo' },
    { key: 'price', label: 'Precio de Venta' },
    { key: 'stock', label: 'Stock' },
    { key: 'barcode', label: 'Código de Barras' },
    { key: 'category', label: 'Categoría' }
  ];

  const fieldList = invenzaFields.map(f => f.key).join(', ');
  
  const prompt = `Actúa como experto en datos. Tengo estas columnas de un archivo de inventario: ${userColumns.join(', ')}. 
  Necesito mapearlas a mis campos de base de datos: ${fieldList}.
  
  Reglas:
  1. Devuelve un JSON plano donde la clave es el campo de mi base de datos y el valor es el nombre exacto de la columna del usuario que más se parece.
  2. Si no hay una coincidencia clara para un campo, NO lo incluyas en el JSON.
  3. No añadas explicaciones, solo el JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "Eres un asistente que solo responde con JSON plano." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error in AI Mapping:', error);
    return {};
  }
}
