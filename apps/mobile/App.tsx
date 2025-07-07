import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@famremit/ui';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useState, useEffect, useRef } from 'react';
import { Subscription } from 'expo-notifications';

// This handler decides how to show the notification when the app is OPEN
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    // This function asks for permission and gets the push token
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification Response:', response);
      // Here you could navigate to a specific screen based on the notification data
    });

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      if(notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if(responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // For demonstration purposes, we'll display the token on screen
  return (
    <View style={styles.container}>
      <Text>Welcome to FamRemit Mobile!</Text>
      <Text>Your Expo Push Token is:</Text>
      <Text style={styles.tokenText}>{expoPushToken || 'Requesting token...'}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    // This is the "mailing address" for this specific device
    token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // --- IMPORTANT FOR PRODUCTION ---
    // Here, we would send this token to our backend and save it in a new
    // 'push_tokens' table, associated with the logged-in user's ID.
    // For example: await supabase.from('push_tokens').insert({ user_id: auth.uid(), token: token })
    console.log("Expo Push Token:", token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  tokenText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    color: '#666'
  }
})