import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import ApiService from '../services/ApiService';
import { NotificationService } from '../services/NotificationService';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [uploadLimit, setUploadLimit] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any>(null);
  const [recentRecommendations, setRecentRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setupNotifications();
    loadHomeData();
  }, [user]);

  const setupNotifications = async () => {
    const token = await NotificationService.registerForPushNotifications();
    if (token) {
      console.log('Push notifications registered successfully');
    }

    // 알림 리스너 설정
    const listeners = NotificationService.setupNotificationListeners(
      (notification) => {
        // 포그라운드에서 알림 수신 시 처리
        console.log('Received notification:', notification);
      },
      (response) => {
        // 알림 탭 시 처리
        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      }
    );

    return () => {
      NotificationService.removeNotificationListeners(listeners);
    };
  };

  const handleNotificationTap = (data: any) => {
    switch (data.type) {
      case 'purchase_status':
        navigation.navigate('History'); // 구매 히스토리로 이동
        break;
      case 'analysis_complete':
        navigation.navigate('Camera'); // 카메라 화면으로 이동
        break;
      case 'usage_limit':
      case 'upgrade_proposal':
        navigation.navigate('Profile'); // 프로필 화면으로 이동
        break;
      default:
        break;
    }
  };

  const loadHomeData = async () => {
    if (!user?.id) return;

    try {
      const [limitResponse, plansResponse, recommendationsResponse] = await Promise.all([
        ApiService.checkUploadLimit(user.id),
        ApiService.getSubscriptionPlans(),
        ApiService.getRecommendations(user.id)
      ]);

      if (limitResponse.success) {
        setUploadLimit(limitResponse);
      }

      if (plansResponse.success) {
        setSubscriptionPlans(plansResponse);
      }

      if (recommendationsResponse.success) {
        setRecentRecommendations(recommendationsResponse.recommendations.slice(0, 5));
      }

    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleStartAnalysis = () => {
    navigation.navigate('Camera');
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const handleUpgrade = () => {
    Alert.alert(
      '프리미엄 업그레이드',
      '웹 버전에서 구독을 관리할 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '웹으로 이동', onPress: () => console.log('Open web version') },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>안녕하세요! 👋</Text>
        <Text style={styles.userName}>
          {user?.user_metadata?.display_name || user?.email?.split('@')[0]}님
        </Text>
      </View>

      {/* Quick Actions */}
      <Card style={styles.actionCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>AI 작품 분석</Text>
          <Text style={styles.cardDescription}>
            사진을 촬영하거나 갤러리에서 선택하여 유사한 작품을 찾아보세요
          </Text>
          <Button
            mode="contained"
            onPress={handleStartAnalysis}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            icon="camera"
          >
            분석 시작하기
          </Button>
        </Card.Content>
      </Card>

      {/* Usage Status */}
      {uploadLimit && (
        <Card style={styles.usageCard}>
          <Card.Content>
            <View style={styles.usageHeader}>
              <Text style={styles.cardTitle}>오늘의 사용량</Text>
              <Chip 
                style={[
                  styles.tierChip,
                  uploadLimit.tier === 'premium' ? styles.premiumChip : styles.freeChip
                ]}
                textStyle={styles.tierChipText}
              >
                {uploadLimit.tier === 'premium' ? '프리미엄' : '무료'}
              </Chip>
            </View>
            
            <View style={styles.usageBar}>
              <View style={styles.usageBarBackground}>
                <View 
                  style={[
                    styles.usageBarFill, 
                    { width: `${(uploadLimit.usedToday / uploadLimit.dailyLimit) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.usageText}>
                {uploadLimit.remainingUploads}회 남음 ({uploadLimit.usedToday}/{uploadLimit.dailyLimit})
              </Text>
            </View>

            {uploadLimit.tier === 'free' && uploadLimit.usedToday >= uploadLimit.dailyLimit * 0.8 && (
              <Button
                mode="outlined"
                onPress={handleUpgrade}
                style={styles.upgradeButton}
                contentStyle={styles.buttonContent}
                icon="star"
              >
                프리미엄으로 업그레이드
              </Button>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Recent Recommendations */}
      {recentRecommendations.length > 0 && (
        <Card style={styles.recommendationsCard}>
          <Card.Content>
            <View style={styles.recommendationsHeader}>
              <Text style={styles.cardTitle}>최근 추천 작품</Text>
              <Button
                mode="text"
                onPress={handleViewHistory}
                contentStyle={styles.viewAllButton}
              >
                전체 보기
              </Button>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentRecommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={styles.recommendationTitle} numberOfLines={2}>
                    {rec.artworks?.title || '작품명'}
                  </Text>
                  <Text style={styles.recommendationArtist} numberOfLines={1}>
                    {rec.artworks?.artist || '작가명'}
                  </Text>
                  <Text style={styles.similarityScore}>
                    유사도: {Math.round((rec.similarity_score || 0) * 100)}%
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>
      )}

      {/* Features Overview */}
      <Card style={styles.featuresCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>주요 기능</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="camera" size={24} color="#3b82f6" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>AI 이미지 분석</Text>
                <Text style={styles.featureDescription}>
                  4개 AI 모델을 활용한 정확한 분석
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="library" size={24} color="#10b981" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>개인화된 추천</Text>
                <Text style={styles.featureDescription}>
                  취향에 맞는 작품 추천 시스템
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="storefront" size={24} color="#f59e0b" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>구매 대행 서비스</Text>
                <Text style={styles.featureDescription}>
                  전문가가 도와드리는 작품 구매
                </Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Tips */}
      <Card style={styles.tipsCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>💡 사용 팁</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• 밝은 조명에서 촬영하면 더 정확한 분석이 가능해요</Text>
            <Text style={styles.tipItem}>• 작품의 전체가 나오도록 촬영해주세요</Text>
            <Text style={styles.tipItem}>• 여러 각도에서 촬영해보면 다양한 추천을 받을 수 있어요</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userName: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 4,
  },
  actionCard: {
    margin: 16,
    marginTop: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  usageCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierChip: {
    backgroundColor: '#e5e7eb',
  },
  premiumChip: {
    backgroundColor: '#fbbf24',
  },
  freeChip: {
    backgroundColor: '#e5e7eb',
  },
  tierChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  usageBar: {
    marginBottom: 12,
  },
  usageBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  usageText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  upgradeButton: {
    marginTop: 12,
    borderColor: '#fbbf24',
  },
  recommendationsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    paddingVertical: 0,
  },
  recommendationItem: {
    width: 120,
    marginRight: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recommendationArtist: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  similarityScore: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  featuresCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureContent: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  tipsCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
    elevation: 4,
    backgroundColor: '#eff6ff',
  },
  tipsList: {
    marginTop: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    marginBottom: 6,
  },
});

export default HomeScreen;