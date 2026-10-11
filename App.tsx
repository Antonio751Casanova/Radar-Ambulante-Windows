// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RoleSelectScreen from './src/screens/RoleSelectScreen';
import LoginScreen from './src/screens/LoginScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import MapScreen from './src/screens/MapScreen';
import VendorDashboardScreen from './src/screens/VendorDashboardScreen'; 
import CustomerMapScreen from './src/screens/CustomerMapScreen'; 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="RoleSelect">
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
          <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CustomerMap" component={CustomerMapScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}