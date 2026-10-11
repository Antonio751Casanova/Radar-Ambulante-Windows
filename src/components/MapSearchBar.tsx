import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Vendor } from '../types/vendor';

interface MapSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  suggestions: Vendor[];
  onSelectSuggestion: (vendor: Vendor) => void;
}

export default function MapSearchBar({
  value,
  onChangeText,
  onClear,
  suggestions,
  onSelectSuggestion,
}: MapSearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);

  function handleSearchChange(text: string): void {
    setShowSuggestions(true);
    onChangeText(text);
  }

  function handleSuggestionPress(vendor: Vendor): void {
    setShowSuggestions(false);
    onSelectSuggestion(vendor);
  }

  function handleClear(): void {
    setShowSuggestions(false);
    onClear();
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <TextInput
          value={value}
          onChangeText={handleSearchChange}
          placeholder="Busca un vendedor o antojo"
          placeholderTextColor="#718096"
          returnKeyType="search"
          style={styles.input}
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityLabel="Limpiar búsqueda"
            onPress={handleClear}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>
      {showSuggestions && value.trim().length > 0 && suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((vendor) => (
            <Pressable
              key={vendor.id}
              accessibilityRole="button"
              onPress={() => handleSuggestionPress(vendor)}
              style={styles.suggestion}
            >
              <View style={styles.suggestionCopy}>
                <Text style={styles.suggestionName}>{vendor.name}</Text>
                <Text style={styles.suggestionMeta}>
                  {vendor.category} · {vendor.address}
                </Text>
              </View>
              <Text style={styles.suggestionArrow}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    flex: 1,
    color: '#102A43',
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: '#486581',
    fontSize: 26,
    lineHeight: 28,
  },
  suggestions: {
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestion: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9E2EC',
  },
  suggestionCopy: {
    flex: 1,
  },
  suggestionName: {
    color: '#102A43',
    fontSize: 15,
    fontWeight: '700',
  },
  suggestionMeta: {
    marginTop: 3,
    color: '#627D98',
    fontSize: 12,
  },
  suggestionArrow: {
    marginLeft: 12,
    color: '#0F766E',
    fontSize: 24,
    fontWeight: '600',
  },
});