import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';

const ROLES = [
  { label: 'Player', value: 'player' },
  { label: 'Coach', value: 'coach' },
  { label: 'Sponsor', value: 'sponsor' },
  { label: 'Scorer', value: 'scorer' },
];

const AuthScreen = ({ apiClient, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('player');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Animation Refs
  const buttonScale = useRef(new Animated.Value(1)).current;
  const toggleOpacity = useRef(new Animated.Value(1)).current;
  const formHeightAnim = useRef(new Animated.Value(1)).current; // For smooth sizing switch

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleMode = () => {
    // Fade and switch registration fields smoothly
    Animated.timing(toggleOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsLogin(!isLogin);
      setMessage(null);
      setError(null);
      Animated.timing(toggleOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (isLogin) {
        const res = await apiClient.login(email, password);
        if (res && res.access_token) {
          apiClient.setToken(res.access_token);
          const profile = await apiClient.getProfile();
          if (profile && profile.role) {
            onLoginSuccess(profile);
          } else {
            setError('Profile retrieval failed.');
          }
        } else {
          setError(res?.detail || 'Login failed.');
        }
      } else {
        const userData = {
          email,
          password,
          full_name: name,
          role,
        };
        const res = await apiClient.register(userData);
        if (res && res.id) {
          setMessage('Registration request sent! Please await Department Admin approval.');
          setIsLogin(true);
        } else {
          setError(res?.detail || 'Registration failed.');
        }
      }
    } catch (err) {
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedRoleLabel = () => {
    const selected = ROLES.find(r => r.value === role);
    return selected ? selected.label : 'Select Role';
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚡ SPORTS APP</Text>
        </View>

        {/* Message Banner */}
        {message && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ {message}</Text>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        {/* Animated Form Content */}
        <Animated.View style={{ opacity: toggleOpacity }}>
          {/* Input Fields */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#666"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Custom Role Picker (only for registration) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>System Role</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.dropdownButton}
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
              >
                <Text style={styles.dropdownButtonText}>{getSelectedRoleLabel()}</Text>
                <Text style={styles.dropdownArrow}>{showRoleDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showRoleDropdown && (
                <View style={styles.dropdownMenu}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.dropdownItem,
                        role === r.value && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setRole(r.value);
                        setShowRoleDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          role === r.value && styles.dropdownItemTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Submit Button with Animated Spring Tap Feedback */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#141414" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Toggle Login/Register */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={handleToggleMode}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleButtonText}>
            {isLogin ? (
              <>
                {"Don't have an account? "}
                <Text style={styles.toggleLinkText}>Sign up</Text>
              </>
            ) : (
              <>
                {"Already have an account? "}
                <Text style={styles.toggleLinkText}>Sign in</Text>
              </>
            )}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1F1F1F',
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 28,
    marginRight: 10,
    color: '#D4AF37',
  },
  title: {
    fontFamily: 'Poppins-Black',
    fontSize: 26,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 28,
  },
  successBox: {
    backgroundColor: '#1E2C1E',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    fontFamily: 'Poppins-Regular',
    color: '#81C784',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#3C1F1F',
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    color: '#E57373',
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Poppins-Bold',
    color: '#888888',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#2A2A2A',
    color: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  dropdownButtonText: {
    fontFamily: 'Poppins-Regular',
    color: '#F5F5F5',
    fontSize: 15,
  },
  dropdownArrow: {
    color: '#D4AF37',
    fontSize: 12,
  },
  dropdownMenu: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  dropdownItemActive: {
    backgroundColor: '#333333',
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    fontSize: 14,
  },
  dropdownItemTextActive: {
    fontFamily: 'Poppins-Bold',
    color: '#D4AF37',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    color: '#141414',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  toggleButtonText: {
    fontFamily: 'Poppins-Regular',
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleLinkText: {
    fontFamily: 'Poppins-Bold',
    color: '#D4AF37',
    fontWeight: 'bold',
  },
});

export default AuthScreen;
