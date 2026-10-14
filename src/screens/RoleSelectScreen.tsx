// src/screens/RoleSelectScreen.tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RoleSelectScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Radar Ambulante</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CustomerMap')}
      >
        <Text style={styles.buttonText}>Quiero un antojo (Cliente)</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.vendorButton]}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.buttonText}>Soy Vendedor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#1a1a1a' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 40, color: '#ffffff' },
  button: { backgroundColor: '#ff8c00', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  vendorButton: { backgroundColor: '#1976d2' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});