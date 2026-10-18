
export const traducirEnfermedad = (nombre) => {
  const enfermedad = String(nombre || "")
    .split("___")
    .slice(1)
    .join("___")
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[\s-]+/g, "_");

  const traducciones = {
    "two_spotted_spider_mite": "Acaro Araña De Dos Manchas",
    "spider_mites": "Acaro Araña De Dos Manchas",
    "apple_scab": "Costra de Manzana",
    "healthy": "Hoja Saludable",
    "huanglongbing": "Huanglongbing Enverdecimiento",
    "citrus_greening": "Huanglongbing Enverdecimiento",
    "bacterial_spot": "Mancha Bacteriana",
    "target_spot": "Mancha Foliar Objetivo",
    "cercospora_leaf_spot": "Mancha Foliar Por Cercospora",
    "gray_leaf_spot": "Mancha Foliar Por Cercospora",
    "isariopsis_leaf_spot": "Mancha Foliar Por Isariopsis",
    "septoria_leaf_spot": "Mancha Foliar Por Septoria",
    "powdery_mildew": "Mildiu Polvoriento",
    "leaf_mold": "Moho En La Hoja",
    "common_rust": "Oxido Comun",
    "cedar_apple_rust": "Oxido de Cedro",
    "black_rot": "Podredumbre Negra",
    "leaf_scorch": "Quemadura De Las Hojas",
    "black_measles": "Sarampion Negro",
    "northern_leaf_blight": "Tizon De La Hoja Del Norte",
    "late_blight": "Tizon Tardio",
    "early_blight": "Tizon Temprano",
    "mosaic_virus": "Virus Del Mosaico",
    "yellow_leaf_curl_virus": "Virus Del Rizado Amarillo"
  };

  for (const [clave, valor] of Object.entries(traducciones)) {
    if (enfermedad.includes(clave)) {
      return valor;
    }
  }

  return "Enfermedad no incluida en las 21 clases";
};
