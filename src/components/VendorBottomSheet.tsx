import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Vendor } from '../types/vendor';

interface VendorBottomSheetProps {
  visible: boolean;
  vendor: Vendor | null;
  onClose: () => void;
  onRequest: (mode: 'pickup' | 'delivery') => void;
  userReference: string;
  onChangeUserReference: (reference: string) => void;
  isSubmitting: boolean;
}

export default function VendorBottomSheet({
  visible,
  vendor,
  onClose,
  onRequest,
  userReference,
  onChangeUserReference,
  isSubmitting,
}: VendorBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  const slideProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(slideProgress, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (isMounted) {
      Animated.timing(slideProgress, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsMounted(false);
        }
      });
    }
  }, [isMounted, slideProgress, visible]);

  function handleClose(): void {
    Animated.timing(slideProgress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
        onClose();
      }
    });
  }

  if (!isMounted || !vendor) {
    return null;
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Cerrar detalle del vendedor"
          onPress={handleClose}
          style={styles.backdrop}
        />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(36, insets.bottom + 24) },
            {
              transform: [
                {
                  translateY: slideProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.name}>{vendor.name}</Text>
              <Text style={styles.category}>{vendor.category}</Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar detalle"
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <Text style={[styles.status, vendor.isOpen ? styles.open : styles.closed]}>
            {vendor.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
          </Text>
          <Text style={styles.description}>{vendor.description}</Text>
          <Text style={styles.menuTitle}>Menú</Text>
          <View style={styles.menuList}>
            {(vendor.menu ?? []).map((item) => (
              <View key={item.name} style={styles.menuRow}>
                <Text style={styles.menuItem}>{item.name}</Text>
                <Text style={styles.menuPrice}>{item.price}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.detail}>{vendor.address}</Text>
          <Text style={styles.detail}>Horario: {vendor.schedule}</Text>
          <TextInput
            accessibilityLabel="Referencia de entrega"
            editable={!isSubmitting}
            onChangeText={onChangeUserReference}
            placeholder="Añade una referencia (ej. Casa azul, portón negro)"
            placeholderTextColor="#829AB1"
            style={styles.referenceInput}
            value={userReference}
          />
          {vendor.type === 'fixed' ? (
            <View style={styles.actions}>
              <Text style={styles.actionsTitle}>¿Cómo quieres recibirlo?</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onRequest('pickup')}
                style={styles.pickupButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Recoger en el local
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => onRequest('delivery')}
                style={styles.deliveryButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    [ Confirmar y Enviar Pedido ]
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => onRequest('delivery')}
              style={styles.deliveryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  [ Confirmar y Enviar Pedido ]
                </Text>
              )}
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 42, 67, 0.28)',
  },
  sheet: {
    minHeight: 380,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    marginBottom: 18,
    borderRadius: 3,
    backgroundColor: '#BCCCDC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
  },
  name: {
    color: '#102A43',
    fontSize: 24,
    fontWeight: '700',
  },
  category: {
    marginTop: 4,
    color: '#486581',
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F0F4F8',
  },
  closeText: {
    color: '#486581',
    fontSize: 25,
    lineHeight: 28,
  },
  status: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '700',
  },
  open: {
    color: '#0F766E',
  },
  closed: {
    color: '#C05621',
  },
  description: {
    marginTop: 12,
    color: '#243B53',
    fontSize: 16,
    lineHeight: 23,
  },
  menuTitle: {
    marginTop: 16,
    color: '#102A43',
    fontSize: 16,
    fontWeight: '800',
  },
  menuList: {
    marginTop: 8,
    gap: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuItem: {
    flex: 1,
    color: '#243B53',
    fontSize: 14,
  },
  menuPrice: {
    marginLeft: 12,
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '800',
  },
  detail: {
    marginTop: 10,
    color: '#627D98',
    fontSize: 14,
  },
  referenceInput: {
    minHeight: 46,
    marginTop: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#BCCCDC',
    borderRadius: 12,
    color: '#102A43',
    fontSize: 14,
  },
  actions: {
    marginTop: 18,
  },
  actionsTitle: {
    marginBottom: 8,
    color: '#102A43',
    fontSize: 15,
    fontWeight: '800',
  },
  pickupButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#0F766E',
  },
  deliveryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#0284C7',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});