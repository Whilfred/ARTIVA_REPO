// =============================================================================
// front_end/constants/ColorScheme.ts
// Normalisation du thème clair/sombre.
// =============================================================================
// React Native 0.86 (SDK 57) a élargi le type `ColorSchemeName` : il valait
// « light | dark | null », il vaut désormais « light | dark | unspecified ».
//
// L'idiome employé jusqu'ici dans le projet — `useColorScheme() ?? "light"` —
// ne suffit plus : `??` ne rattrape que null et undefined, donc la valeur
// "unspecified" traversait et servait à indexer `Colors[...]`, qui n'a que les
// clés « light » et « dark ». D'où les erreurs TS7053 au moment de la migration.
//
// Tout passe désormais par cette fonction : une seule règle, un seul endroit à
// corriger si le type évolue encore.
// =============================================================================

import type { ColorSchemeName } from "react-native";

/** Les deux seuls thèmes que l'application sait afficher. */
export type AppColorScheme = "light" | "dark";

/**
 * Ramène n'importe quelle valeur de thème du système à « light » ou « dark ».
 * Tout ce qui n'est pas explicitement « dark » (y compris "unspecified", null
 * et undefined) donne « light », le thème par défaut de l'application.
 */
export function normalizeColorScheme(
  scheme: ColorSchemeName | null | undefined
): AppColorScheme {
  return scheme === "dark" ? "dark" : "light";
}
