import torch
import librosa  # MP3 파일 읽기용 라이브러리
import sys  # 명령줄 인자를 받기 위한 모듈
from transformers import WhisperProcessor, WhisperForConditionalGeneration

# GPU 사용 여부 확인 (GPU 있으면 사용하고 없으면 CPU로 처리)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Whisper 모델과 프로세서를 불러오기
processor = WhisperProcessor.from_pretrained("openai/whisper-large-v2")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v2").to(device)

# 한국어, 베트남어, 태국어 중에서 입력 언어를 선택할 수 있도록 설정
def process_audio(language, audio_input):
    # Whisper 모델에서 언어 설정
    forced_decoder_ids = processor.get_decoder_prompt_ids(language=language, task="transcribe")
    
    # 모델 입력을 위해 음성 데이터를 전처리 (16kHz로 샘플링)
    inputs = processor(audio_input, return_tensors="pt", sampling_rate=16000, padding=True)
    input_features = inputs.input_features.to(device)
    
    # attention_mask가 존재할 경우에만 사용
    attention_mask = inputs.get("attention_mask", None)
    if attention_mask is not None:
        attention_mask = attention_mask.to(device)
    
    # 모델을 사용해 텍스트 예측
    if attention_mask is not None:
        predicted_ids = model.generate(input_features, attention_mask=attention_mask, forced_decoder_ids=forced_decoder_ids)
    else:
        predicted_ids = model.generate(input_features, forced_decoder_ids=forced_decoder_ids)
    
    # 텍스트 디코딩
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    
    return transcription

# MP3 파일 불러오기
def load_mp3(file_path):
    # MP3 파일을 16kHz로 변환하면서 로드
    audio_input, original_sr = librosa.load(file_path, sr=16000)  # 16kHz로 샘플링
    return audio_input

# 명령줄 인자로 파일 경로와 언어 설정 받기
if len(sys.argv) < 3:
    print("Usage: python ai.py <file_path> <language>")
    sys.exit(1)

file_path = sys.argv[1]
language = sys.argv[2]

# MP3 파일을 불러와 처리
audio_input = load_mp3(file_path)

# 선택한 언어로 음성 처리
transcription = process_audio(language, audio_input)
print(f"Transcription ({language}): {transcription}")
