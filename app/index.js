import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  NativeModules,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';

const BACKGROUND_FETCH_TASK = 'year-dots-wallpaper-update';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const enabled = await AsyncStorage.getItem('autoWallpaperEnabled');
    if (enabled === 'true') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Year Dots Updated! 🎯',
          body: 'Your daily wallpaper is being updated...',
          data: { action: 'update-wallpaper' },
        },
        trigger: null,
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function WallpaperView({ viewRef }) {
  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const isLeapYear = (year) => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  };

  const currentYear = new Date().getFullYear();
  const totalDays = isLeapYear(currentYear) ? 366 : 365;
  const currentDay = getDayOfYear();

  const dots = [];
  for (let i = 1; i <= totalDays; i++) {
    dots.push({
      id: i,
      completed: i <= currentDay,
      isToday: i === currentDay,
    });
  }

  return (
    <View ref={viewRef} style={styles.wallpaper}>
      <View style={styles.header}>
        <Text style={styles.year}>{currentYear}</Text>
        <Text style={styles.progress}>{currentDay} / {totalDays} days</Text>
        <Text style={styles.percentage}>{Math.round((currentDay / totalDays) * 100)}%</Text>
      </View>
      <View style={styles.dotsContainer}>
        {dots.map((dot) => (
          <View key={dot.id} style={[
            styles.dot,
            dot.completed && styles.dotCompleted,
            dot.isToday && styles.dotToday,
          ]} />
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Year Dots</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wallpaperRef = useRef(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await MediaLibrary.requestPermissionsAsync();
    await Notifications.requestPermissionsAsync();
    
    const enabled = await AsyncStorage.getItem('autoWallpaperEnabled');
    setAutoEnabled(enabled === 'true');

    const lastUpdateTime = await AsyncStorage.getItem('lastWallpaperUpdate');
    if (lastUpdateTime) {
      setLastUpdate(new Date(lastUpdateTime));
    }
  };

  const captureWallpaper = async () => {
    const uri = await captureRef(wallpaperRef, {
      format: 'png',
      quality: 1,
      width: 1080,
      height: 1920,
    });
    return uri;
  };

  const setWallpaperManually = async () => {
    try {
      const uri = await captureWallpaper();
      await MediaLibrary.createAssetAsync(uri);
      
      const now = new Date();
      await AsyncStorage.setItem('lastWallpaperUpdate', now.toISOString());
      setLastUpdate(now);

      Alert.alert('Wallpaper Saved! 🎉', 'Your Year Dots wallpaper has been saved to gallery!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save wallpaper: ' + error.message);
    }
  };

  const enableAutoWallpaper = async () => {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Year Dots Updated! 🎯',
          body: 'Your daily wallpaper is being updated...',
          data: { action: 'update-wallpaper' },
        },
        trigger: { hour: 0, minute: 2, repeats: true },
      });

      await AsyncStorage.setItem('autoWallpaperEnabled', 'true');
      setAutoEnabled(true);
      Alert.alert('Auto-Update Enabled! ✅', 'Your wallpaper will update automatically every night at 00:02.');
    } catch (error) {
      Alert.alert('Error', 'Failed to enable auto-update: ' + error.message);
    }
  };

  const disableAutoWallpaper = async () => {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem('autoWallpaperEnabled', 'false');
    setAutoEnabled(false);
    Alert.alert('Auto-Update Disabled');
  };

  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const isLeapYear = (year) => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  };

  const currentYear = new Date().getFullYear();
  const totalDays = isLeapYear(currentYear) ? 366 : 365;
  const currentDay = getDayOfYear();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>Year Progress</Text>
        <Text style={styles.subtitle}>
          Day {currentDay} of {totalDays} ({Math.round((currentDay / totalDays) * 100)}%)
        </Text>
      </View>

      <View style={styles.previewContainer}>
        <View style={styles.phoneFrame}>
          <WallpaperView viewRef={wallpaperRef} />
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={setWallpaperManually}>
          <Text style={styles.buttonText}>📱 Save & Set Wallpaper</Text>
        </TouchableOpacity>

        {autoEnabled ? (
          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={disableAutoWallpaper}>
            <Text style={styles.buttonText}>🔕 Disable Auto-Update</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.successButton]} onPress={enableAutoWallpaper}>
            <Text style={styles.buttonText}>🔔 Enable Auto-Update</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Auto-Update Status</Text>
          <Text style={[styles.infoValue, autoEnabled ? styles.activeStatus : styles.inactiveStatus]}>
            {autoEnabled ? '✅ Enabled' : '❌ Disabled'}
          </Text>
        </View>
        {lastUpdate && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>
              {lastUpdate.toLocaleDateString()} {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerSection: { padding: 20, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#999' },
  previewContainer: { alignItems: 'center', marginVertical: 20 },
  phoneFrame: { width: Dimensions.get('window').width * 0.7, aspectRatio: 9 / 19.5, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#333' },
  actionsContainer: { padding: 20, gap: 12 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: '#3b82f6' },
  successButton: { backgroundColor: '#22c55e' },
  dangerButton: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  infoContainer: { padding: 20, gap: 12 },
  infoCard: { backgroundColor: '#111', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  infoLabel: { fontSize: 14, color: '#999', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#fff', fontWeight: '500' },
  activeStatus: { color: '#22c55e' },
  inactiveStatus: { color: '#ef4444' },
  wallpaper: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'space-between' },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  year: { fontSize: 48, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  progress: { fontSize: 18, color: '#999', marginBottom: 4 },
  percentage: { fontSize: 32, fontWeight: 'bold', color: '#3b82f6' },
  dotsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#222', margin: 3, borderWidth: 1, borderColor: '#333' },
  dotCompleted: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  dotToday: { backgroundColor: '#22c55e', borderColor: '#22c55e', borderWidth: 2, transform: [{ scale: 1.2 }] },
  footer: { paddingBottom: 40, alignItems: 'center' },
  footerText: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
});
