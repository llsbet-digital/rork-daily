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
import { Eye, EyeOff, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/providers/AppProvider';
import { AuthMode } from '@/types';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
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
        const { confirmationRequired } = await signUp(email.trim(), password, name.trim());
        if (confirmationRequired) {
          setAwaitingConfirmation(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
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

  const handleResend = useCallback(async () => {
    if (resendCooldown) return;
    try {
      await supabase.auth.resend({ type: 'signup', email: email.trim() });
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 30000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Could not resend. Please try again shortly.');
    }
  }, [email, resendCooldown]);

  const validateEmail = useCallback((val: string) => {
    if (!val.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  }, []);

  const validatePassword = useCallback((val: string) => {
    if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else {
      setPasswordError('');
    }
  }, []);

  const validateName = useCallback((val: string) => {
    if (!val.trim()) {
      setNameError('Name is required');
    } else {
      setNameError('');
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'signin' ? 'signup' : 'signin');
    setEmailError('');
    setPasswordError('');
    setNameError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (awaitingConfirmation) {
    return (
      <View style={[styles.container, styles.confirmContainer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 32) }]}>
        <Animated.View style={[styles.confirmContent, { opacity: fadeAnim }]}>
          <View style={styles.confirmIconWrap}>
            <Mail size={28} color="#1A1A1A" />
          </View>
          <Text style={styles.confirmTitle}>Check your inbox</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmEmail}>{email.trim()}</Text>
          </Text>
          <Text style={styles.confirmHint}>
            Tap the link in the email to verify your account, then come back and sign in.
          </Text>

          <TouchableOpacity
            style={styles.authButton}
            onPress={() => {
              setAwaitingConfirmation(false);
              setMode('signin');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.authButtonText}>Go to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            activeOpacity={0.6}
            disabled={resendCooldown}
            style={styles.resendRow}
          >
            <Text style={[styles.resendText, resendCooldown && styles.resendTextMuted]}>
              {resendCooldown ? 'Email sent — check your inbox' : "Didn't get it? Resend"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

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
                style={[styles.input, nameError ? styles.inputError : null]}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={(v) => { setName(v); if (nameError) setNameError(''); }}
                onBlur={() => validateName(name)}
                autoCapitalize="words"
                editable={!isSubmitting}
                testID="name-input"
              />
              {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(''); }}
              onBlur={() => validateEmail(email)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting}
              testID="email-input"
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(''); }}
                onBlur={() => validatePassword(password)}
                secureTextEntry={!showPassword}
                editable={!isSubmitting}
                testID="password-input"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword ? (
                  <Eye size={20} color={Colors.textSecondary} />
                ) : (
                  <EyeOff size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
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
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  passwordRow: {
    position: 'relative' as const,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  authButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: '#1A1A1A',
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
    color: '#1A1A1A',
    fontWeight: '600' as const,
  },
  confirmContainer: {
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmContent: {
    alignItems: 'center',
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: 'CrimsonText_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  confirmEmail: {
    color: Colors.text,
    fontWeight: '600' as const,
  },
  confirmHint: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  resendRow: {
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  resendTextMuted: {
    color: Colors.textMuted,
    textDecorationLine: 'none',
  },
});
