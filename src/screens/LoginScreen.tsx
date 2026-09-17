import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
	Alert,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

export default function LoginScreen() {
	const navigation = useNavigation<any>();
	const [phone, setPhone] = useState<string>('');
	const [businessName, setBusinessName] = useState<string>('Raspados Yeti');
	const [category, setCategory] = useState<string>('otros');

	const handleRegister = async (): Promise<void> => {
		try {
			const response = await fetch('http://192.168.1.137/api/register/vendor', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					phone_number: phone,
					business_name: businessName,
					category,
				}),
			});

			if (response.ok) {
				navigation.navigate('VerifyOTP', { phone });
				return;
			}

			const errorMessage = await response.text();
			Alert.alert('Error', errorMessage || `Error ${response.status}`);
		} catch (error) {
			const errorMessage = error instanceof Error
				? error.message
				: 'No se pudo completar el registro';
			Alert.alert('Error', errorMessage);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Radar Ambulante</Text>
			<TextInput
				value={phone}
				onChangeText={setPhone}
				keyboardType="phone-pad"
				placeholder="Teléfono"
				style={styles.phoneInput}
			/>
			<TextInput
				value={businessName}
				onChangeText={setBusinessName}
				placeholder="Nombre del negocio"
				style={styles.phoneInput}
			/>
			<TextInput
				value={category}
				onChangeText={setCategory}
				placeholder="Categoría (ej. comida, otros)"
				style={styles.phoneInput}
			/>
			<TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
				<Text style={styles.buttonText}>Enviar Código OTP</Text>
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
	phoneInput: {
		height: 50,
		marginVertical: 12,
		borderWidth: 1,
		borderColor: '#999',
		paddingHorizontal: 12,
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
