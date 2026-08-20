// Thème du système, toujours ramené à « light » ou « dark ».
//
// Ce fichier ré-exportait directement le hook de react-native. Depuis React
// Native 0.86, celui-ci peut renvoyer "unspecified", valeur avec laquelle on ne
// peut pas indexer la palette Colors. La normalisation a donc lieu ici, pour
// que tous les écrans qui l'utilisent reçoivent une valeur exploitable.
import { useColorScheme as useRNColorScheme } from 'react-native';
import { normalizeColorScheme, type AppColorScheme } from '../constants/ColorScheme';

export function useColorScheme(): AppColorScheme {
  return normalizeColorScheme(useRNColorScheme());
}
