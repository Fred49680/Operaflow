/**
 * Formate un nombre avec un séparateur de milliers (espace)
 * @param value - La valeur numérique à formater
 * @param decimals - Nombre de décimales (par défaut 2)
 * @returns La chaîne formatée avec séparateur de milliers
 * 
 * @example
 * formatAmount(1234.56) // "1 234.56"
 * formatAmount(1234567.89, 0) // "1 234 568"
 */
export function formatAmount(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }

  // Arrondir à `decimals` décimales
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  
  // Séparer la partie entière et décimale
  const parts = rounded.toFixed(decimals).split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Ajouter un espace tous les 3 chiffres pour la partie entière
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  
  // Retourner avec ou sans décimales selon le paramètre
  if (decimals === 0) {
    return formattedInteger;
  }
  
  return `${formattedInteger},${decimalPart}`;
}

/**
 * Formate un montant avec le symbole euro
 * @param value - La valeur numérique à formater
 * @param decimals - Nombre de décimales (par défaut 2)
 * @returns La chaîne formatée avec séparateur de milliers et symbole €
 * 
 * @example
 * formatCurrency(1234.56) // "1 234,56 €"
 * formatCurrency(1234567.89, 0) // "1 234 568 €"
 */
export function formatCurrency(value: number | null | undefined, decimals: number = 2): string {
  const formatted = formatAmount(value, decimals);
  if (formatted === "-") {
    return "-";
  }
  return `${formatted} €`;
}

