// Simple JavaScript test for multi-image analysis
console.log('🚀 Simple test loaded');

// Test basic functionality first
window.addEventListener('DOMContentLoaded', () => {
    console.log('📍 DOM loaded');
    
    // Create a simple multi-image analysis interface
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                <h1 style="text-align: center; color: #333;">다중 이미지 분석 테스트</h1>
                
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                    <h3>게스트 모드 테스트</h3>
                    <p style="color: #666;">로그인 없이 최대 3장까지 분석 가능합니다.</p>
                    
                    <input type="file" id="imageInput" multiple accept="image/*" style="margin: 10px 0;">
                    <br>
                    <button id="analyzeBtn" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
                        분석하기
                    </button>
                </div>
                
                <div id="result" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: none;">
                    <h3>분석 결과</h3>
                    <div id="resultContent"></div>
                </div>
                
                <div id="error" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 15px; border-radius: 8px; display: none;">
                </div>
            </div>
        `;
        
        // Add event listeners
        const imageInput = document.getElementById('imageInput');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const resultDiv = document.getElementById('result');
        const resultContent = document.getElementById('resultContent');
        const errorDiv = document.getElementById('error');
        
        analyzeBtn.addEventListener('click', async () => {
            console.log('🔍 Analyze button clicked');
            
            const files = imageInput.files;
            if (!files || files.length === 0) {
                showError('분석할 이미지를 선택해주세요.');
                return;
            }
            
            console.log('📸 Selected files:', files.length);
            
            // Check if guest mode is allowed (≤3 images)
            if (files.length > 3) {
                showError('게스트는 최대 3장까지만 분석할 수 있습니다. 더 많은 이미지를 분석하려면 로그인해주세요.');
                return;
            }
            
            // Create FormData
            const formData = new FormData();
            // Don't add userId for guest mode
            console.log('📤 Guest mode - no userId added');
            
            for (let i = 0; i < files.length; i++) {
                formData.append('image' + i, files[i]);
                console.log('📎 Added image' + i + ':', files[i].name);
            }
            
            console.log('🚀 Sending request to /api/multi-image/analyze');
            analyzeBtn.textContent = '분석 중...';
            analyzeBtn.disabled = true;
            
            try {
                const response = await fetch('/api/multi-image/analyze', {
                    method: 'POST',
                    body: formData
                });
                
                console.log('📡 Response status:', response.status);
                const result = await response.json();
                console.log('📊 Response data:', result);
                
                if (!response.ok) {
                    throw new Error(result.error || '분석에 실패했습니다.');
                }
                
                showResult(result);
                
            } catch (error) {
                console.error('❌ Analysis error:', error);
                showError(error.message);
            } finally {
                analyzeBtn.textContent = '분석하기';
                analyzeBtn.disabled = false;
            }
        });
        
        function showError(message) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            resultDiv.style.display = 'none';
        }
        
        function showResult(result) {
            resultContent.innerHTML = \`
                <p><strong>분석 완료!</strong></p>
                <p>이미지 수: \${result.imageCount || 'N/A'}</p>
                <p>처리 시간: \${result.processingTime ? (result.processingTime / 1000).toFixed(1) + '초' : 'N/A'}</p>
                <p>티어: \${result.tier || 'N/A'}</p>
                \${result.commonKeywords ? '<p>공통 키워드: ' + result.commonKeywords.keywords.join(', ') + '</p>' : ''}
            \`;
            resultDiv.style.display = 'block';
            errorDiv.style.display = 'none';
        }
    }
});