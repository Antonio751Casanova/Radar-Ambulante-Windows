import { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import {
	Alert,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

export default function VerifyOTPScreen() {
	const route = useRoute<any>();
	const { phone } = route.params;
	const navigation = useNavigation<any>();
	const [otp, setOtp] = useState<string>('');

	const handleVerify = async (): Promise<void> => {
		try {
			const response = await fetch('http://192.168.0.68/api/register/verify', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					phone_number: phone,
					otp,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				await SecureStore.setItemAsync('vendor_token', data.token);
				navigation.navigate('VendorDashboard');
				return;
			}

			const errorMessage = await response.text();
			Alert.alert('Error', errorMessage || `Error ${response.status}`);
		} catch (error) {
			const errorMessage = error instanceof Error
				? error.message
				: 'No se pudo verificar el OTP';
			Alert.alert('Error', errorMessage);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Ingresa tu Código</Text>
			<TextInput
				value={otp}
				onChangeText={setOtp}
				keyboardType="number-pad"
				maxLength={6}
				style={styles.otpInput}
			/>
			<TouchableOpacity style={styles.primaryButton} onPress={handleVerify}>
				<Text style={styles.buttonText}>Verificar OTP</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#fff',
	},
	title: {
		marginBottom: 24,
		fontSize: 28,
		fontWeight: '700',
		textAlign: 'center',
	},
	otpInput: {
		height: 50,
		marginVertical: 12,
		borderWidth: 1,
		borderColor: '#999',
		fontSize: 24,
		textAlign: 'center',
	},
	primaryButton: {
		minHeight: 50,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1976d2',
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
