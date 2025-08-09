/**
 * 다중 이미지 분석 모듈
 * - 이미지 업로드 및 미리보기 관리
 * - API 통신 및 결과 처리
 * - UI 상태 관리
 */

class MultiImageAnalyzer {
    constructor(options = {}) {
        this.options = {
            maxImages: options.maxImages || 50,
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
            allowedTypes: options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            apiEndpoint: options.apiEndpoint || '/api/multi-image/analyze',
            ...options
        };
        
        this.selectedImages = [];
        this.isAnalyzing = false;
        this.elements = {};
        
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        console.log('🚀 MultiImageAnalyzer initialized');
        this.bindElements();
        this.attachEventListeners();
    }

    /**
     * DOM 요소 바인딩
     */
    bindElements() {
        this.elements = {
            input: document.getElementById('multiImageInput'),
            uploadArea: document.querySelector('[onclick*="multiImageInput"]'),
            preview: document.getElementById('imagePreview'),
            grid: document.getElementById('imageGrid'),
            count: document.getElementById('imageCount'),
            analyzeBtn: document.getElementById('analyzeMultiBtn'),
            errorDiv: document.getElementById('multiError'),
            errorText: document.getElementById('multiErrorText'),
            resultDiv: document.getElementById('multiResult'),
            resultContent: document.getElementById('multiResultContent')
        };
    }

    /**
     * 이벤트 리스너 연결
     */
    attachEventListeners() {
        if (this.elements.input) {
            this.elements.input.addEventListener('change', (e) => this.handleImageSelection(e));
        }

        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.elements.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }

        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.addEventListener('click', () => this.analyzeImages());
        }
    }

    /**
     * 이미지 선택 처리
     */
    handleImageSelection(event) {
        console.log('📸 Images selected');
        const files = Array.from(event.target.files);
        this.addImages(files);
    }

    /**
     * 드래그 오버 처리
     */
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
    }

    /**
     * 드롭 처리
     */
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
        
        const files = Array.from(event.dataTransfer.files);
        const imageFiles = files.filter(file => this.isValidImageFile(file));
        
        if (imageFiles.length > 0) {
            this.addImages(imageFiles);
        }
    }

    /**
     * 이미지 추가
     */
    addImages(files) {
        const validFiles = files.filter(file => this.isValidImageFile(file));
        const totalImages = this.selectedImages.length + validFiles.length;

        if (totalImages > this.options.maxImages) {
            this.showError(`최대 ${this.options.maxImages}장까지만 업로드할 수 있습니다.`);
            return;
        }

        validFiles.forEach(file => {
            if (!this.isDuplicateFile(file)) {
                this.selectedImages.push(file);
            }
        });

        this.updateImagePreview();
        this.updateAnalyzeButton();
        this.hideError();
    }

    /**
     * 유효한 이미지 파일인지 확인
     */
    isValidImageFile(file) {
        if (!this.options.allowedTypes.includes(file.type)) {
            this.showError(`지원하지 않는 파일 형식입니다: ${file.type}`);
            return false;
        }

        if (file.size > this.options.maxFileSize) {
            this.showError(`파일 크기가 너무 큽니다: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
            return false;
        }

        return true;
    }

    /**
     * 중복 파일 확인
     */
    isDuplicateFile(file) {
        return this.selectedImages.some(existing => 
            existing.name === file.name && existing.size === file.size
        );
    }

    /**
     * 이미지 미리보기 업데이트
     */
    updateImagePreview() {
        if (!this.elements.preview || !this.elements.grid || !this.elements.count) return;

        if (this.selectedImages.length > 0) {
            this.elements.preview.style.display = 'block';
            this.elements.count.textContent = this.selectedImages.length;
            
            this.elements.grid.innerHTML = '';
            this.selectedImages.forEach((file, index) => {
                const imageCard = this.createImageCard(file, index);
                this.elements.grid.appendChild(imageCard);
            });
        } else {
            this.elements.preview.style.display = 'none';
        }
    }

    /**
     * 이미지 카드 생성
     */
    createImageCard(file, index) {
        const url = URL.createObjectURL(file);
        const div = document.createElement('div');
        div.className = 'relative group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow';
        
        div.innerHTML = `
            <div class="aspect-square overflow-hidden">
                <img src="${url}" alt="${file.name}" 
                     class="w-full h-full object-cover"
                     onload="this.style.opacity='1'" 
                     style="opacity: 0; transition: opacity 0.3s ease;">
            </div>
            <div class="p-2">
                <p class="text-xs text-gray-600 truncate" title="${file.name}">${file.name}</p>
                <p class="text-xs text-gray-400">${this.formatFileSize(file.size)}</p>
            </div>
            <button onclick="multiImageAnalyzer.removeImage(${index})" 
                    class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        `;
        
        return div;
    }

    /**
     * 파일 크기 포맷팅
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * 이미지 제거
     */
    removeImage(index) {
        // URL 해제하여 메모리 누수 방지
        const file = this.selectedImages[index];
        if (file) {
            const imgElements = this.elements.grid.querySelectorAll('img');
            if (imgElements[index]) {
                URL.revokeObjectURL(imgElements[index].src);
            }
        }

        this.selectedImages.splice(index, 1);
        this.updateImagePreview();
        this.updateAnalyzeButton();
    }

    /**
     * 분석 버튼 업데이트
     */
    updateAnalyzeButton() {
        if (!this.elements.analyzeBtn) return;

        if (this.selectedImages.length === 0) {
            this.elements.analyzeBtn.textContent = '이미지를 선택해주세요';
            this.elements.analyzeBtn.disabled = true;
            this.elements.analyzeBtn.className = 'px-6 py-3 rounded-lg font-semibold transition-colors bg-gray-300 text-gray-500 cursor-not-allowed';
        } else {
            this.elements.analyzeBtn.textContent = `${this.selectedImages.length}장 분석하기`;
            this.elements.analyzeBtn.disabled = false;
            this.elements.analyzeBtn.className = 'px-6 py-3 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700';
        }
    }

    /**
     * 이미지 분석 실행
     */
    async analyzeImages() {
        if (this.isAnalyzing || this.selectedImages.length === 0) return;

        console.log('🔍 Starting multi-image analysis');
        console.log('📸 Image count:', this.selectedImages.length);

        this.hideError();
        this.hideResult();

        // 게스트 모드 제한 확인
        if (this.selectedImages.length > 3) {
            this.showError('게스트는 최대 3장까지만 분석할 수 있습니다. 더 많은 이미지를 분석하려면 로그인해주세요.');
            return;
        }

        // UI 상태 업데이트
        this.setAnalyzingState(true);

        try {
            const result = await this.performAnalysis();
            this.displayResults(result);
        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.showError(error.message || '분석 중 오류가 발생했습니다.');
        } finally {
            this.setAnalyzingState(false);
        }
    }

    /**
     * 실제 분석 수행
     */
    async performAnalysis() {
        const formData = new FormData();
        
        // 게스트 모드이므로 userId 추가하지 않음
        console.log('📤 Guest mode - no userId added to FormData');
        
        this.selectedImages.forEach((file, index) => {
            formData.append(`image${index}`, file);
            console.log(`📎 Added image${index}:`, file.name);
        });

        console.log('🚀 Sending request to', this.options.apiEndpoint);
        
        const response = await fetch(this.options.apiEndpoint, {
            method: 'POST',
            body: formData
        });

        console.log('📡 Response status:', response.status);
        const result = await response.json();
        console.log('📊 Response data:', result);

        if (!response.ok) {
            throw new Error(result.error || '분석에 실패했습니다.');
        }

        return result;
    }

    /**
     * 분석 상태 설정
     */
    setAnalyzingState(analyzing) {
        this.isAnalyzing = analyzing;
        
        if (this.elements.analyzeBtn) {
            if (analyzing) {
                this.elements.analyzeBtn.textContent = '분석 중...';
                this.elements.analyzeBtn.disabled = true;
                this.elements.analyzeBtn.className = 'px-6 py-3 rounded-lg font-semibold transition-colors bg-gray-400 text-white cursor-not-allowed';
            } else {
                this.updateAnalyzeButton();
            }
        }
    }

    /**
     * 결과 표시
     */
    displayResults(result) {
        if (!this.elements.resultContent || !this.elements.resultDiv) return;

        const html = this.generateResultsHTML(result);
        this.elements.resultContent.innerHTML = html;
        this.elements.resultDiv.style.display = 'block';

        // 스크롤을 결과 영역으로 이동
        this.elements.resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * 결과 HTML 생성
     */
    generateResultsHTML(result) {
        let html = '<div><h3><strong>✅ 분석 완료!</strong></h3>';
        
        // 분석 정보
        html += '<div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 8px;">';
        html += '<p><strong>📊 분석 정보:</strong></p>';
        html += `<p>• 이미지 수: ${result.imageCount || 'N/A'}</p>`;
        html += `<p>• 처리 시간: ${result.processingTime ? (result.processingTime / 1000).toFixed(1) + '초' : 'N/A'}</p>`;
        html += `<p>• 티어: ${result.tier || 'N/A'}</p>`;
        
        if (result.commonKeywords?.keywords?.length > 0) {
            html += `<p>• 공통 키워드: ${result.commonKeywords.keywords.join(', ')}</p>`;
        }
        html += '</div>';

        // 추천 작품
        if (result.recommendations && (result.recommendations.internal?.length > 0 || result.recommendations.external?.length > 0)) {
            html += this.generateRecommendationsHTML(result.recommendations);
        } else {
            html += '<p style="color: #666; font-style: italic;">추천 작품을 찾을 수 없습니다.</p>';
        }

        html += '</div>';
        return html;
    }

    /**
     * 추천 작품 HTML 생성
     */
    generateRecommendationsHTML(recommendations) {
        const internal = recommendations.internal || [];
        const external = recommendations.external || [];
        const totalRecommendations = internal.length + external.length;

        let html = '<div style="margin-top: 20px;">';
        html += `<h4><strong>🎨 추천 작품 (${totalRecommendations}개)</strong></h4>`;
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;" class="recommendations-grid">';

        // 내부 추천
        internal.forEach(rec => {
            html += this.generateRecommendationCard(rec, 'internal');
        });

        // 외부 추천
        external.forEach(rec => {
            html += this.generateRecommendationCard(rec, 'external');
        });

        html += '</div></div>';
        return html;
    }

    /**
     * 추천 작품 카드 생성
     */
    generateRecommendationCard(rec, type) {
        const artwork = rec.artwork || rec;
        const imageUrl = artwork.image_url || artwork.thumbnail_url || 'https://via.placeholder.com/200x200/f0f0f0/666666?text=No+Image';
        const title = artwork.title || '제목 없음';
        const artist = artwork.artist || artwork.artistDisplayName || '작가 미상';
        const similarity = Math.round((rec.similarity_score?.total || rec.similarity || 0.8) * 100);

        return `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: white;" class="recommendation-card">
                <img src="${imageUrl}" alt="${title}" 
                     style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" 
                     onerror="this.onerror=null; this.parentElement.style.display='none';"
                     onload="console.log('✅ Image loaded:', '${title}');">
                <h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${title}</h5>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${artist}</p>
                <p style="margin: 0; font-size: 11px; color: #888;">유사도: ${similarity}%</p>
                ${type === 'external' ? '<span style="font-size: 10px; background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 12px;">외부</span>' : ''}
            </div>
        `;
    }

    /**
     * 에러 표시
     */
    showError(message) {
        if (this.elements.errorDiv && this.elements.errorText) {
            this.elements.errorText.textContent = message;
            this.elements.errorDiv.style.display = 'block';
        }
        console.error('❌ Error:', message);
    }

    /**
     * 에러 숨기기
     */
    hideError() {
        if (this.elements.errorDiv) {
            this.elements.errorDiv.style.display = 'none';
        }
    }

    /**
     * 결과 숨기기
     */
    hideResult() {
        if (this.elements.resultDiv) {
            this.elements.resultDiv.style.display = 'none';
        }
    }

    /**
     * 정리 (메모리 누수 방지)
     */
    cleanup() {
        // 생성된 Object URL들 해제
        this.elements.grid?.querySelectorAll('img').forEach(img => {
            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        });

        this.selectedImages = [];
        console.log('🧹 MultiImageAnalyzer cleaned up');
    }
}

// 전역 인스턴스 생성 (기존 코드와의 호환성을 위해)
let multiImageAnalyzer;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    multiImageAnalyzer = new MultiImageAnalyzer();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (multiImageAnalyzer) {
        multiImageAnalyzer.cleanup();
    }
});