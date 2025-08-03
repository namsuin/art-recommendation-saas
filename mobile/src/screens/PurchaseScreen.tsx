import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Card, TextInput, Button, RadioButton, Chip } from 'react-native-paper';
import { useAuth } from '../services/AuthContext';
import ApiService from '../services/ApiService';

interface PurchaseScreenProps {
  navigation: any;
  route: any;
}

interface Artwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  price?: number;
}

const PurchaseScreen: React.FC<PurchaseScreenProps> = ({ navigation, route }) => {
  const { artwork }: { artwork: Artwork } = route.params;
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.display_name || '',
    phone: '',
    email: user?.email || '',
    address: '',
    message: '',
    urgency: 'medium',
  });
  
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // 필수 필드 검증
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('입력 오류', '이름과 연락처를 입력해주세요.');
      return;
    }

    // 전화번호 형식 간단 검증
    const phoneRegex = /^[0-9-+\s()]+$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert('입력 오류', '올바른 전화번호를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const contactInfo = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || user?.email,
        address: formData.address.trim() || undefined,
        message: formData.message.trim() || undefined,
      };

      const response = await ApiService.requestPurchase(
        artwork.id,
        user?.id!,
        contactInfo
      );

      if (response.success) {
        Alert.alert(
          '구매 요청 완료',
          '구매 요청이 성공적으로 접수되었습니다. 담당자가 24시간 내에 연락드릴 예정입니다.',
          [
            {
              text: '확인',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('요청 실패', response.error || '구매 요청에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const urgencyOptions = [
    { value: 'low', label: '일반', description: '일주일 내 연락' },
    { value: 'medium', label: '보통', description: '2-3일 내 연락' },
    { value: 'high', label: '긴급', description: '24시간 내 연락' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Artwork Info */}
      <Card style={styles.artworkCard}>
        <Card.Content>
          <View style={styles.artworkHeader}>
            <Image source={{ uri: artwork.image_url }} style={styles.artworkImage} />
            <View style={styles.artworkInfo}>
              <Text style={styles.artworkTitle}>{artwork.title}</Text>
              <Text style={styles.artworkArtist}>{artwork.artist}</Text>
              {artwork.price && (
                <Text style={styles.artworkPrice}>
                  ₩{artwork.price.toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Contact Form */}
      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>연락처 정보</Text>
          
          <TextInput
            label="이름 *"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="전화번호 *"
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            mode="outlined"
            keyboardType="phone-pad"
            placeholder="010-1234-5678"
            style={styles.input}
          />
          
          <TextInput
            label="이메일"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            mode="outlined"
            keyboardType="email-address"
            style={styles.input}
          />
          
          <TextInput
            label="배송 주소 (선택)"
            value={formData.address}
            onChangeText={(value) => handleInputChange('address', value)}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          
          <TextInput
            label="추가 메시지 (선택)"
            value={formData.message}
            onChangeText={(value) => handleInputChange('message', value)}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="작품에 대한 문의사항이나 구매 조건 등을 적어주세요."
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Urgency Selection */}
      <Card style={styles.urgencyCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>연락 희망 시기</Text>
          
          <RadioButton.Group
            onValueChange={(value) => handleInputChange('urgency', value)}
            value={formData.urgency}
          >
            {urgencyOptions.map((option) => (
              <View key={option.value} style={styles.radioOption}>
                <RadioButton.Item
                  label={option.label}
                  value={option.value}
                  style={styles.radioItem}
                />
                <Text style={styles.urgencyDescription}>{option.description}</Text>
              </View>
            ))}
          </RadioButton.Group>
        </Card.Content>
      </Card>

      {/* Important Notice */}
      <Card style={styles.noticeCard}>
        <Card.Content>
          <Text style={styles.noticeTitle}>📋 구매 안내</Text>
          <View style={styles.noticeList}>
            <Text style={styles.noticeItem}>• 담당자가 연락하여 정확한 가격과 상태를 안내해드립니다</Text>
            <Text style={styles.noticeItem}>• 작품의 실물 상태에 따라 가격이 변동될 수 있습니다</Text>
            <Text style={styles.noticeItem}>• 배송비는 별도 요금이며, 지역에 따라 차이가 있습니다</Text>
            <Text style={styles.noticeItem}>• 구매 취소는 담당자와 협의 후 가능합니다</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !formData.name.trim() || !formData.phone.trim()}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          icon="send"
        >
          {loading ? '요청 중...' : '구매 요청하기'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  artworkCard: {
    margin: 16,
    elevation: 4,
  },
  artworkHeader: {
    flexDirection: 'row',
  },
  artworkImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 16,
  },
  artworkInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  artworkTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  artworkArtist: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  artworkPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
  },
  formCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  urgencyCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  radioOption: {
    marginBottom: 8,
  },
  radioItem: {
    paddingLeft: 0,
  },
  urgencyDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 16,
    marginTop: -8,
    marginBottom: 8,
  },
  noticeCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
    backgroundColor: '#fef3c7',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 12,
  },
  noticeList: {
    paddingLeft: 8,
  },
  noticeItem: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
    marginBottom: 4,
  },
  submitContainer: {
    padding: 16,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});

export default PurchaseScreen;