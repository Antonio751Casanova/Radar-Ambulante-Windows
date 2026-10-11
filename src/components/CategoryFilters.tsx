import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VendorCategory } from '../types/vendor';

export type CategoryFilter = 'Todos' | VendorCategory;

interface CategoryFiltersProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (category: CategoryFilter) => void;
}

const categories: CategoryFilter[] = ['Todos', 'Snacks', 'Bebidas'];

export default function CategoryFilters({
  selectedCategory,
  onSelectCategory,
}: CategoryFiltersProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={[styles.container, { top: insets.top + 68 }]}
    >
      {categories.map((category) => {
        const isSelected = selectedCategory === category;

        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectCategory(category)}
            style={[styles.chip, isSelected && styles.selectedChip]}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>
              {category}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 5,
  },
  selectedChip: {
    backgroundColor: '#0F766E',
  },
  label: {
    color: '#243B53',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedLabel: {
    color: '#FFFFFF',
  },
});