import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import ApiService from '../services/ApiService';

interface AnalysisScreenProps {
  navigation: any;
  route: any;
}

interface Recommendation {
  id: string;
  artwork?: {
    id: string;
    title: string;
    artist: string;
    image_url: string;
    price?: number;
  };
  title?: string;
  artist?: string;
  image_url?: string;
  price?: number;
  similarity: number;
  reasons?: string[];
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ navigation, route }) => {
  const { analysisResult, imageUri } = route.params;
  const { user } = useAuth();
  const [loadingPurchase, setLoadingPurchase] = useState<string | null>(null);

  const handleRecommendationClick = async (recommendation: Recommendation) => {
    if (user?.id && recommendation.id) {
      try {
        await ApiService.recordRecommendationClick(recommendation.id, user.id);
      } catch (error) {
        console.error('Failed to record click:', error);
      }
    }
  };

  const handlePurchaseRequest = async (recommendation: Recommendation) => {
    const artworkId = recommendation.artwork?.id || recommendation.id;
    if (!artworkId) return;

    setLoadingPurchase(artworkId);
    
    navigation.navigate('Purchase', {
      artwork: recommendation.artwork || {
        id: recommendation.id,
        title: recommendation.title,
        artist: recommendation.artist,
        image_url: recommendation.image_url,
        price: recommendation.price,
      }
    });
    
    setLoadingPurchase(null);
  };

  const renderRecommendation = (recommendation: Recommendation, index: number) => {
    const artwork = recommendation.artwork || recommendation;
    const isPurchaseLoading = loadingPurchase === artwork.id;

    return (
      <Card key={artwork.id || index} style={styles.recommendationCard}>
        <Card.Content>
          <View style={styles.recommendationHeader}>
            <Image 
              source={{ uri: artwork.image_url }} 
              style={styles.recommendationImage}
              onError={() => console.log('Image load error')}
            />
            <View style={styles.recommendationInfo}>
              <Text style={styles.recommendationTitle}>{artwork.title}</Text>
              <Text style={styles.recommendationArtist}>{artwork.artist}</Text>
              {artwork.price && (
                <Text style={styles.recommendationPrice}>
                  ₩{artwork.price.toLocaleString()}
                </Text>
              )}
              <View style={styles.similarityContainer}>
                <Ionicons name="analytics" size={16} color="#3b82f6" />
                <Text style={styles.similarityText}>
                  유사도: {Math.round(recommendation.similarity * 100)}%
                </Text>
              </View>
            </View>
          </View>

          {recommendation.reasons && recommendation.reasons.length > 0 && (
            <View style={styles.reasonsContainer}>
              <Text style={styles.reasonsTitle}>추천 이유:</Text>
              <View style={styles.reasonsChips}>
                {recommendation.reasons.slice(0, 3).map((reason, idx) => (
                  <Chip key={idx} style={styles.reasonChip} textSize={12}>
                    {reason}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          <View style={styles.recommendationActions}>
            <Button
              mode="outlined"
              onPress={() => handleRecommendationClick(recommendation)}
              style={styles.viewButton}
              contentStyle={styles.buttonContent}
            >
              자세히 보기
            </Button>
            
            <Button
              mode="contained"
              onPress={() => handlePurchaseRequest(recommendation)}
              loading={isPurchaseLoading}
              disabled={isPurchaseLoading}
              style={styles.purchaseButton}
              contentStyle={styles.buttonContent}
              icon="shopping"
            >
              구매 문의
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Original Image */}
      <Card style={styles.imageCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>분석된 이미지</Text>
          <Image source={{ uri: imageUri }} style={styles.originalImage} />
        </Card.Content>
      </Card>

      {/* Analysis Results */}
      {analysisResult.analysis && (
        <Card style={styles.analysisCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>AI 분석 결과</Text>
            
            {analysisResult.analysis.keywords && (
              <View style={styles.keywordsContainer}>
                <Text style={styles.keywordsTitle}>키워드:</Text>
                <View style={styles.keywordsChips}>
                  {analysisResult.analysis.keywords.map((keyword: string, index: number) => (
                    <Chip key={index} style={styles.keywordChip}>
                      {keyword}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {analysisResult.analysis.style && (
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>스타일:</Text>
                <Text style={styles.analysisValue}>{analysisResult.analysis.style}</Text>
              </View>
            )}

            {analysisResult.analysis.mood && (
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>분위기:</Text>
                <Text style={styles.analysisValue}>{analysisResult.analysis.mood}</Text>
              </View>
            )}

            {analysisResult.analysis.confidence && (
              <View style={styles.analysisItem}>
                <Text style={styles.analysisLabel}>신뢰도:</Text>
                <Text style={styles.analysisValue}>
                  {Math.round(analysisResult.analysis.confidence * 100)}%
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Recommendations */}
      <View style={styles.recommendationsSection}>
        <Text style={styles.sectionTitle}>추천 작품</Text>
        
        {analysisResult.recommendations && analysisResult.recommendations.length > 0 ? (
          analysisResult.recommendations.map((recommendation: Recommendation, index: number) =>
            renderRecommendation(recommendation, index)
          )
        ) : (
          <Card style={styles.noRecommendationsCard}>
            <Card.Content>
              <Text style={styles.noRecommendationsText}>
                추천할 작품을 찾을 수 없습니다.
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Processing Info */}
      {analysisResult.processing_time && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoText}>
              처리 시간: {analysisResult.processing_time}ms
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  imageCard: {
    margin: 16,
    elevation: 4,
  },
  originalImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginTop: 8,
  },
  analysisCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  keywordsContainer: {
    marginBottom: 16,
  },
  keywordsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  keywordsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    backgroundColor: '#dbeafe',
  },
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  analysisLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  analysisValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  recommendationsSection: {
    margin: 16,
    marginTop: 0,
  },
  recommendationCard: {
    marginBottom: 16,
    elevation: 4,
  },
  recommendationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  recommendationInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  recommendationArtist: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  recommendationPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 4,
  },
  similarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  similarityText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 4,
  },
  reasonsContainer: {
    marginBottom: 12,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reasonsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonChip: {
    backgroundColor: '#f3f4f6',
  },
  recommendationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  viewButton: {
    flex: 1,
    borderColor: '#3b82f6',
  },
  purchaseButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },
  buttonContent: {
    paddingVertical: 4,
  },
  noRecommendationsCard: {
    elevation: 4,
    backgroundColor: '#fef3c7',
  },
  noRecommendationsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#92400e',
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default AnalysisScreen;