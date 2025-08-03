import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Image } from 'react-native';
import { Text, Button, Card, ActivityIndicator, FAB } from 'react-native-paper';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import ApiService from '../services/ApiService';

interface CameraScreenProps {
  navigation: any;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ navigation }) => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');

      const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (camera) {
      try {
        const photo = await camera.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setSelectedImage(photo.uri);
      } catch (error) {
        Alert.alert('오류', '사진 촬영에 실패했습니다.');
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('오류', '이미지 선택에 실패했습니다.');
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert('오류', '분석할 이미지를 선택해주세요.');
      return;
    }

    setAnalyzing(true);
    
    try {
      const response = await ApiService.analyzeImage(selectedImage, user?.id);
      
      if (response.success) {
        navigation.navigate('Analysis', {
          analysisResult: response,
          imageUri: selectedImage,
        });
      } else {
        Alert.alert('분석 실패', response.error || '이미지 분석에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetImage = () => {
    setSelectedImage(null);
  };

  if (hasCameraPermission === null || hasGalleryPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>권한을 확인하는 중...</Text>
      </View>
    );
  }

  if (hasCameraPermission === false) {
    return (
      <View style={styles.container}>
        <Card style={styles.permissionCard}>
          <Card.Content>
            <Text style={styles.permissionText}>
              카메라 권한이 필요합니다. 설정에서 권한을 허용해주세요.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (selectedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={analyzeImage}
            loading={analyzing}
            disabled={analyzing}
            style={styles.analyzeButton}
            contentStyle={styles.buttonContent}
            icon="brain"
          >
            {analyzing ? 'AI 분석 중...' : 'AI 분석 시작'}
          </Button>
          
          <Button
            mode="outlined"
            onPress={resetImage}
            style={styles.retakeButton}
            contentStyle={styles.buttonContent}
            icon="camera-retake"
          >
            다시 촬영
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={(ref) => setCamera(ref)}
        style={styles.camera}
        type={Camera.Constants.Type.back}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.header}>
            <Text style={styles.headerText}>작품을 촬영하거나 갤러리에서 선택하세요</Text>
          </View>
          
          <View style={styles.bottomControls}>
            <FAB
              icon="image"
              style={styles.galleryFab}
              onPress={pickImageFromGallery}
              label="갤러리"
            />
            
            <FAB
              icon="camera"
              style={styles.captureFab}
              onPress={takePicture}
              size="large"
            />
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  galleryFab: {
    backgroundColor: '#ffffff',
  },
  captureFab: {
    backgroundColor: '#3b82f6',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  selectedImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  analyzeButton: {
    marginBottom: 12,
  },
  retakeButton: {
    borderColor: '#3b82f6',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  permissionCard: {
    margin: 20,
    elevation: 4,
  },
  permissionText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
  },
});

export default CameraScreen;