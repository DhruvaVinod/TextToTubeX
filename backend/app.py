from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import re
from datetime import datetime, timedelta
from typing import List, Dict
import logging
import tempfile
import subprocess
import json
from pathlib import Path
import google.generativeai as genai
from deep_translator import GoogleTranslator, exceptions as dt_exceptions
import whisper
import cv2
import easyocr
import base64
from PIL import Image
import io


from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# API Keys configuration
YOUTUBE_API_KEY = 'AIzaSyD6hKgUxy-91DW8AnaTrc7nvDHUfWazi_0'
GEMINI_API_KEY = "AIzaSyDDwEucj4KNsnUT4m4qpt1pwnByhm6_vjM"  # Add your Gemini API key to .env file

# YouTube API URLs
YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'

# Configure Gemini API
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class VideoProcessor:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        
    def download_video_audio(self, video_id: str) -> str:
        """
        Download audio from YouTube video using yt-dlp
        """
        try:
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            output_path = os.path.join(self.temp_dir, f"{video_id}.%(ext)s")
            
            # Use yt-dlp to download audio only
            cmd = [
                'yt-dlp',
                '--ffmpeg-location','C:\\ffmpeg\\ffmpeg-7.1.1-essentials_build\\bin\\ffmpeg.exe',
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '192K',
                '--output', output_path,
                '--no-playlist',
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                video_url
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                logger.error(f"yt-dlp error: {result.stderr}")
                raise Exception(f"Failed to download video: {result.stderr}")
            
            # Find the downloaded file
            audio_file = os.path.join(self.temp_dir, f"{video_id}.mp3")
            if os.path.exists(audio_file):
                return audio_file
            else:
                # Sometimes the file might have a different name, search for it
                for file in os.listdir(self.temp_dir):
                    if file.startswith(video_id) and file.endswith('.mp3'):
                        return os.path.join(self.temp_dir, file)
                
                raise Exception("Downloaded audio file not found")
                
        except subprocess.TimeoutExpired:
            raise Exception("Video download timed out")
        except Exception as e:
            logger.error(f"Error downloading video: {e}")
            raise Exception(f"Failed to download video: {str(e)}")
    
    def transcribe_audio(self, file_path):
        try:
            os.environ["PATH"] += os.pathsep + "C:\\ffmpeg\\ffmpeg-7.1.1-essentials_build\\bin"

            model = whisper.load_model("base")
            result = model.transcribe(file_path)
            return result["text"]
        
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")
        
    import re

    def extract_structured_fallback(text):
        summary = text.strip()

        key_points = re.findall(r"- (.*?)\n", text)
        if not key_points:
            key_points = ["Key points not extracted"]

        topics = re.findall(r"(?:Topic[s]?|Main topic[s]?):\s*(.*)", text)
        if not topics:
            topics = ["Topic extraction failed"]

        return {
            "summary": summary,
            "key_points": key_points,
            "topics": topics
        }
    
    def generate_summary(self, transcript: str) -> Dict:
        try:
            model = genai.GenerativeModel('models/gemini-1.5-flash')

            prompt = f"""
            Please analyze the following transcript and provide:
            1. A comprehensive summary (200-300 words)
            2. Key points (5-7 bullet points)
            3. Main topics covered

            Format your response as JSON with these keys:
            - "summary": comprehensive summary text
            - "key_points": array of key points
            - "topics": array of main topics

            Transcript:
            {transcript}
            """

            response = model.generate_content(prompt)

            # Remove markdown code fences
            cleaned_text = re.sub(r"```(?:json)?\s*([\s\S]*?)```", r"\1", response.text.strip())

            try:
                result = json.loads(cleaned_text)
            except json.JSONDecodeError:
                logger.warning("Failed to parse JSON; attempting to extract structured text fallback.")
                result = extract_structured_fallback(response.text)
  
            return result

        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            raise Exception(f"Failed to generate summary: {str(e)}")

    
    def translate_content(self, text: str, target_language: str) -> str:
        """
        Translate text to target language using GoogleTranslator
        """
        try:
            if target_language == 'en':
                return text  # No translation needed for English
            
            translator = GoogleTranslator(source='en', target=target_language)
            translated_text = translator.translate(text)
            
            return translated_text
            
        except dt_exceptions.TranslationNotFound:
            logger.warning(f"Translation not found for language: {target_language}")
            return text  # Return original text if translation fails
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            return text  # Return original text if translation fails
    
    def cleanup(self):
        """
        Clean up temporary files
        """
        try:
            import shutil
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except Exception as e:
            logger.error(f"Error cleaning up temp files: {e}")

class YouTubeSearcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = model
    
    def search_videos(self, query: str, max_results: int = 20) -> List[Dict]:
        """
        Search for videos on YouTube and return detailed information
        """
        try:
            # Step 1: Search for videos
            search_params = {
                'part': 'snippet',
                'q': query,
                'type': 'video',
                'maxResults': max_results,
                'key': self.api_key,
                'order': 'relevance',
                'videoDuration': 'medium',  # 4-20 minutes
                'videoDefinition': 'high',
                'relevanceLanguage': 'en',
                'safeSearch': 'strict'
            }
            
            search_response = requests.get(YOUTUBE_SEARCH_URL, params=search_params)
            search_response.raise_for_status()
            search_data = search_response.json()
            
            if 'items' not in search_data:
                logger.warning(f"No items found in search response for query: {query}")
                return []
            
            # Extract video IDs
            video_ids = [item['id']['videoId'] for item in search_data['items']]
            
            # Step 2: Get detailed video information
            videos_params = {
                'part': 'snippet,statistics,contentDetails',
                'id': ','.join(video_ids),
                'key': self.api_key
            }
            
            videos_response = requests.get(YOUTUBE_VIDEOS_URL, params=videos_params)
            videos_response.raise_for_status()
            videos_data = videos_response.json()
            
            # Step 3: Process and rank videos
            videos = []
            for item in videos_data.get('items', []):
                video_info = self._extract_video_info(item)
                if video_info:
                    videos.append(video_info)
            
            # Step 4: Calculate semantic similarity and rank
            ranked_videos = self._rank_videos_by_relevance(query, videos)
            
            # Return top 4 most relevant videos
            return ranked_videos[:4]
            
        except requests.RequestException as e:
            logger.error(f"YouTube API request failed: {e}")
            raise Exception(f"Failed to search YouTube: {str(e)}")
        except Exception as e:
            logger.error(f"Error in search_videos: {e}")
            raise Exception(f"Search failed: {str(e)}")
    
    def _extract_video_info(self, item: Dict) -> Dict:
        """
        Extract relevant information from YouTube API response
        """
        try:
            snippet = item['snippet']
            statistics = item.get('statistics', {})
            content_details = item.get('contentDetails', {})
            
            # Filter out videos that are too short or too long
            duration = content_details.get('duration', 'PT0S')
            duration_seconds = self._parse_duration(duration)
            
            # Skip videos shorter than 2 minutes or longer than 60 minutes
            if duration_seconds < 120 or duration_seconds > 3600:
                return None
            
            # Skip videos with very low view counts (likely spam)
            view_count = int(statistics.get('viewCount', 0))
            if view_count < 100:
                return None
            
            return {
                'id': item['id'],
                'title': snippet['title'],
                'description': snippet.get('description', ''),
                'channelTitle': snippet['channelTitle'],
                'publishedAt': snippet['publishedAt'],
                'thumbnailUrl': snippet['thumbnails']['high']['url'],
                'duration': duration,
                'viewCount': statistics.get('viewCount', '0'),
                'likeCount': statistics.get('likeCount', '0'),
                'durationSeconds': duration_seconds
            }
        except Exception as e:
            logger.warning(f"Error extracting video info: {e}")
            return None
    
    def _parse_duration(self, duration: str) -> int:
        """
        Parse YouTube duration format (PT4M13S) to seconds
        """
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
        if not match:
            return 0
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    def _rank_videos_by_relevance(self, query: str, videos: List[Dict]) -> List[Dict]:
        """
        Rank videos by semantic similarity using sentence transformers
        """
        if not videos:
            return []
        
        try:
            # Create embeddings for the search query
            query_embedding = self.model.encode([query])
            
            # Create embeddings for video titles and descriptions
            video_texts = []
            for video in videos:
                # Combine title and description for better matching
                text = f"{video['title']} {video['description'][:500]}"  # Limit description length
                video_texts.append(text)
            
            video_embeddings = self.model.encode(video_texts)
            
            # Calculate cosine similarity
            similarities = cosine_similarity(query_embedding, video_embeddings)[0]
            
            # Add relevance scores to videos
            for i, video in enumerate(videos):
                video['relevanceScore'] = float(similarities[i])
            
            # Sort by relevance score (descending)
            ranked_videos = sorted(videos, key=lambda x: x['relevanceScore'], reverse=True)
            
            logger.info(f"Ranked {len(ranked_videos)} videos by relevance")
            return ranked_videos
            
        except Exception as e:
            logger.error(f"Error ranking videos: {e}")
            # Return videos without ranking if ranking fails
            return videos

# Initialize global variables
youtube_searcher = None
video_processor = None

@app.route('/api/search-videos', methods=['POST'])
def search_videos():
    """
    API endpoint to search for YouTube videos
    """
    global youtube_searcher
    
    try:
        # Initialize searcher if not done
        if youtube_searcher is None:
            if not YOUTUBE_API_KEY:
                return jsonify({
                    'error': 'YouTube API key not configured'
                }), 500
            youtube_searcher = YouTubeSearcher(YOUTUBE_API_KEY)
        
        # Get search query from request
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({
                'error': 'Query parameter is required'
            }), 400
        
        query = data['query'].strip()
        if not query:
            return jsonify({
                'error': 'Query cannot be empty'
            }), 400
        
        logger.info(f"Searching for: {query}")
        
        # Search for videos
        videos = youtube_searcher.search_videos(query)
        
        logger.info(f"Found {len(videos)} relevant videos")
        
        return jsonify({
            'query': query,
            'videos': videos,
            'count': len(videos)
        })
        
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/generate-summary', methods=['POST'])
def generate_summary():
    """
    API endpoint to generate video summary with translation
    """
    global video_processor
    
    try:
        # Check if required APIs are configured
        if not GEMINI_API_KEY:
            return jsonify({
                'error': 'Gemini API key not configured'
            }), 500
        
        # Get request data
        data = request.get_json()
        if not data or 'video_id' not in data or 'language' not in data:
            return jsonify({
                'error': 'video_id and language parameters are required'
            }), 400
        
        video_id = data['video_id'].strip()
        target_language = data['language'].strip()
        
        if not video_id or not target_language:
            return jsonify({
                'error': 'video_id and language cannot be empty'
            }), 400
        
        logger.info(f"Generating summary for video: {video_id} in language: {target_language}")
        
        # Initialize video processor
        if video_processor is None:
            video_processor = VideoProcessor()
        
        # Step 1: Download video audio
        logger.info("Downloading video audio...")
        audio_file = video_processor.download_video_audio(video_id)
        
        # Step 2: Transcribe audio
        logger.info("Transcribing audio...")
        transcript = video_processor.transcribe_audio(audio_file)
        
        # Step 3: Generate summary
        logger.info("Generating summary...")
        summary_data = video_processor.generate_summary(transcript)
        
        # Step 4: Translate if not English
        if target_language != 'en':
            logger.info(f"Translating to {target_language}...")
            
            # Translate summary
            summary_data['summary'] = video_processor.translate_content(
                summary_data['summary'], target_language
            )
            
            # Translate key points
            if 'key_points' in summary_data:
                translated_points = []
                for point in summary_data['key_points']:
                    translated_point = video_processor.translate_content(point, target_language)
                    translated_points.append(translated_point)
                summary_data['key_points'] = translated_points
            
            # Translate topics
            if 'topics' in summary_data:
                translated_topics = []
                for topic in summary_data['topics']:
                    translated_topic = video_processor.translate_content(topic, target_language)
                    translated_topics.append(translated_topic)
                summary_data['topics'] = translated_topics
        
        # Clean up audio file
        try:
            os.remove(audio_file)
        except Exception as e:
            logger.warning(f"Could not remove audio file: {e}")
        
        logger.info("Summary generation completed successfully")
        
        return jsonify({
            'video_id': video_id,
            'language': target_language,
            'summary': summary_data['summary'],
            'key_points': summary_data.get('key_points', []),
            'topics': summary_data.get('topics', []),
            'transcript_length': len(transcript),
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error in generate summary endpoint: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': model is not None,
        'youtube_api_configured': bool(YOUTUBE_API_KEY),
        'gemini_api_configured': bool(GEMINI_API_KEY)
    })

@app.teardown_appcontext
def cleanup_processor(exception):
    """
    Clean up video processor resources
    """
    global video_processor
    if video_processor:
        video_processor.cleanup()
@app.route('/api/camera-capture', methods=['POST'])
def camera_capture():
    """
    API endpoint to capture image from webcam and extract text
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                'error': 'Image data is required'
            }), 400
        
        # Decode base64 image
        image_data = data['image'].split(',')[1]  # Remove data:image/jpeg;base64, prefix
        image_bytes = base64.b64decode(image_data)
        
        # Convert to OpenCV format
        image = Image.open(io.BytesIO(image_bytes))
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Convert to grayscale for better OCR
        gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
        
        # Initialize EasyOCR reader
        reader = easyocr.Reader(['en'])
        
        # Perform OCR
        results = reader.readtext(gray)
        
        if not results:
            return jsonify({
                'text': '',
                'message': 'No text found in the image'
            })
        
        # Extract and join all detected text
        extracted_text = " ".join([res[1] for res in results])
        
        return jsonify({
            'text': extracted_text,
            'confidence': sum([res[2] for res in results]) / len(results) if results else 0
        })
        
    except Exception as e:
        logger.error(f"Error in camera capture endpoint: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """
    API endpoint to upload image file and extract text
    """
    try:
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image file uploaded'
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({
                'error': 'No file selected'
            }), 400
        
        # Check if file is an image
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                'error': 'Invalid file type. Please upload an image file.'
            }), 400
        
        # Read image data
        image_data = file.read()
        
        # Convert to OpenCV format
        image = Image.open(io.BytesIO(image_data))
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Convert to grayscale for better OCR
        gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
        
        # Initialize EasyOCR reader
        reader = easyocr.Reader(['en'])
        
        # Perform OCR
        results = reader.readtext(gray)
        
        if not results:
            return jsonify({
                'text': '',
                'message': 'No text found in the image'
            })
        
        # Extract and join all detected text
        extracted_text = " ".join([res[1] for res in results])
        
        return jsonify({
            'text': extracted_text,
            'confidence': sum([res[2] for res in results]) / len(results) if results else 0,
            'filename': file.filename
        })
        
    except Exception as e:
        logger.error(f"Error in upload image endpoint: {e}")
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting YouTube Search and Summarization API on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"YouTube API key configured: {bool(YOUTUBE_API_KEY)}")
    logger.info(f"Gemini API key configured: {bool(GEMINI_API_KEY)}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)