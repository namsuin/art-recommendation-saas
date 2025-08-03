-- 샘플 작품 데이터 추가
-- 이 스크립트는 테이블 생성 후 실행하세요

INSERT INTO public.artworks (title, artist, image_url, description, keywords, price, available) VALUES
('모나리자', '레오나르도 다 빈치', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/687px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', 
 '세계에서 가장 유명한 초상화 중 하나로, 레오나르도 다 빈치의 걸작입니다.', 
 ARRAY['portrait', 'renaissance', 'classical', 'famous', 'mysterious'], 
 0, true),

('별이 빛나는 밤', '빈센트 반 고흐', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
 '반 고흐의 대표작으로 소용돌이치는 하늘과 별들이 인상적인 작품입니다.',
 ARRAY['landscape', 'night', 'stars', 'post-impressionism', 'swirls', 'blue', 'yellow'],
 0, true),

('진주 귀걸이를 한 소녀', '요하네스 베르메르', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg',
 '베르메르의 신비로운 초상화로 "북방의 모나리자"라고 불립니다.',
 ARRAY['portrait', 'baroque', 'pearl', 'mysterious', 'dutch', 'golden age'],
 0, true),

('절규', '에드바르드 뭉크', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/800px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg',
 '현대인의 불안과 공포를 표현한 표현주의의 대표작입니다.',
 ARRAY['expressionism', 'scream', 'anxiety', 'modern', 'emotion', 'orange', 'blue'],
 0, true),

('키스', '구스타프 클림트', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg/800px-The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg',
 '클림트의 황금 시대 작품으로 사랑과 열정을 황금빛으로 표현한 걸작입니다.',
 ARRAY['art nouveau', 'love', 'gold', 'embrace', 'decorative', 'romantic'],
 0, true),

('수련', '클로드 모네', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1919%2C_Metropolitan_Museum_of_Art.jpg/1280px-Claude_Monet_-_Water_Lilies_-_1919%2C_Metropolitan_Museum_of_Art.jpg',
 '모네의 정원에서 영감을 받은 인상주의의 대표작입니다.',
 ARRAY['impressionism', 'water', 'flowers', 'nature', 'garden', 'peaceful', 'blue', 'green'],
 0, true),

('아르놀피니 부부의 초상', '얀 반 에이크', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Van_Eyck_-_Arnolfini_Portrait.jpg/800px-Van_Eyck_-_Arnolfini_Portrait.jpg',
 '북유럽 르네상스의 걸작으로 세밀한 묘사와 상징성이 돋보입니다.',
 ARRAY['northern renaissance', 'portrait', 'detailed', 'symbolic', 'oil painting', 'marriage'],
 0, true),

('아테네 학당', '라파엘로', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/La_scuola_di_Atene.jpg/1280px-La_scuola_di_Atene.jpg',
 '고대 그리스의 철학자들을 묘사한 르네상스 프레스코화의 걸작입니다.',
 ARRAY['renaissance', 'fresco', 'philosophy', 'classical', 'architecture', 'education'],
 0, true),

('우키요에 - 후지산', '가츠시카 호쿠사이', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/1280px-The_Great_Wave_off_Kanagawa.jpg',
 '일본 우키요에의 대표작으로 거대한 파도와 후지산을 그린 목판화입니다.',
 ARRAY['ukiyo-e', 'wave', 'mount fuji', 'japanese', 'woodblock', 'blue', 'nature'],
 0, true),

('자유의 여신상', '프리드리히 아우구스트 바르톨디', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Statue_of_Liberty_7.jpg/800px-Statue_of_Liberty_7.jpg',
 '자유와 민주주의를 상징하는 신고전주의 조각상입니다.',
 ARRAY['sculpture', 'liberty', 'neoclassical', 'symbol', 'freedom', 'green', 'monumental'],
 0, true);