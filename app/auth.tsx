import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { AuthMode } from '@/types';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAuth = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.log('[Auth] Error:', error);
      const message = error?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, name, mode, signIn, signUp]);

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'signin' ? 'signup' : 'signin');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Paprr</Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isSubmitting}
                testID="name-input"
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting}
              testID="email-input"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isSubmitting}
              testID="password-input"
            />
          </View>

          <TouchableOpacity
            style={[styles.authButton, isSubmitting && styles.authButtonDisabled]}
            onPress={handleAuth}
            activeOpacity={0.8}
            disabled={isSubmitting}
            testID="auth-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.authButtonText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={toggleMode} activeOpacity={0.6} disabled={isSubmitting}>
              <Text style={styles.switchLink}>
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    fontFamily: 'CrimsonText_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  authButton: {
    backgroundColor: Colors.dark,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  switchText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  switchLink: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
});
