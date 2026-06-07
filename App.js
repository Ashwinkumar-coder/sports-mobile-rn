import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, ActivityIndicator, View } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import ApiClient from './src/core/network/api_client';
import AuthScreen from './src/features/dashboard/screens/AuthScreen';
import DashboardScreen from './src/features/dashboard/screens/DashboardScreen';

const apiClient = new ApiClient();

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-Black': Poppins_900Black,
  });

  const handleLoginSuccess = (userProfile) => {
    const forbiddenRoles = ['super_admin', 'department_admin', 'federation_admin'];
    if (!forbiddenRoles.includes(userProfile.role)) {
      setCurrentUser(userProfile);
    }
  };

  const handleLogout = () => {
    apiClient.setToken('');
    setCurrentUser(null);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {currentUser ? (
        <DashboardScreen
          apiClient={apiClient}
          user={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        <AuthScreen
          apiClient={apiClient}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
