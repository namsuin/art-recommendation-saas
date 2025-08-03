import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static expoPushToken: string | null = null;

  // 푸시 알림 권한 요청 및 토큰 획득
  static async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      
      // 토큰을 로컬 스토리지에 저장
      await AsyncStorage.setItem('expoPushToken', token);
      
      console.log('Expo push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    return token;
  }

  // 저장된 토큰 가져오기
  static async getStoredPushToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('expoPushToken');
      this.expoPushToken = token;
      return token;
    } catch (error) {
      console.error('Error getting stored push token:', error);
      return null;
    }
  }

  // 현재 푸시 토큰 반환
  static getCurrentPushToken(): string | null {
    return this.expoPushToken;
  }

  // 로컬 알림 스케줄링
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: trigger || { seconds: 1 },
      });
      
      console.log('Local notification scheduled:', id);
      return id;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  // 즉시 로컬 알림 표시
  static async showLocalNotification(title: string, body: string, data?: any) {
    return this.scheduleLocalNotification(title, body, data, { seconds: 1 });
  }

  // 알림 리스너 설정
  static setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    // 앱이 포그라운드에 있을 때 알림 수신
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // 사용자가 알림을 탭했을 때
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );

    return {
      notificationListener,
      responseListener,
    };
  }

  // 리스너 정리
  static removeNotificationListeners(listeners: {
    notificationListener: Notifications.Subscription;
    responseListener: Notifications.Subscription;
  }) {
    listeners.notificationListener.remove();
    listeners.responseListener.remove();
  }

  // 모든 예약된 알림 취소
  static async cancelAllScheduledNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // 특정 알림 취소
  static async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // 알림 배지 설정 (iOS)
  static async setBadgeCount(count: number) {
    try {
      if (Platform.OS === 'ios') {
        await Notifications.setBadgeCountAsync(count);
      }
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // 구매 요청 상태 변경 알림
  static async notifyPurchaseStatusChange(status: string, artworkTitle: string) {
    const statusMessages = {
      processing: '처리 중입니다',
      contacted: '담당자가 연락드렸습니다',
      completed: '구매가 완료되었습니다',
      cancelled: '요청이 취소되었습니다',
    };

    const message = statusMessages[status as keyof typeof statusMessages] || '상태가 변경되었습니다';
    
    await this.showLocalNotification(
      '구매 요청 업데이트',
      `${artworkTitle} - ${message}`,
      { type: 'purchase_status', status, artworkTitle }
    );
  }

  // 분석 완료 알림
  static async notifyAnalysisComplete(recommendationCount: number) {
    await this.showLocalNotification(
      '🎨 AI 분석 완료',
      `${recommendationCount}개의 추천 작품을 찾았습니다!`,
      { type: 'analysis_complete', count: recommendationCount }
    );
  }

  // 일일 사용량 알림
  static async notifyUsageLimit(currentUsage: number, limit: number) {
    const percentage = Math.round((currentUsage / limit) * 100);
    
    await this.showLocalNotification(
      '📊 사용량 알림',
      `오늘 분석 사용량이 ${percentage}%에 도달했습니다 (${currentUsage}/${limit})`,
      { type: 'usage_limit', currentUsage, limit, percentage }
    );
  }

  // 프리미엄 업그레이드 제안 알림
  static async notifyUpgradeProposal() {
    await this.showLocalNotification(
      '⭐ 프리미엄 업그레이드',
      '더 많은 분석과 고급 기능을 이용해보세요!',
      { type: 'upgrade_proposal' }
    );
  }

  // 정기 알림 스케줄링 (예: 주간 리마인더)
  static async scheduleWeeklyReminder() {
    const trigger: Notifications.WeeklyTriggerInput = {
      weekday: 1, // Monday
      hour: 10,
      minute: 0,
      repeats: true,
    };

    return this.scheduleLocalNotification(
      '🎨 주간 아트 체크',
      '새로운 작품을 분석해보시겠어요?',
      { type: 'weekly_reminder' },
      trigger
    );
  }
}