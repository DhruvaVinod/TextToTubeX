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
import yt_dlp
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import ssl
import urllib3
from urllib3.poolmanager import PoolManager
from urllib3.util import connection
import socket
from werkzeug.utils import secure_filename

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
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
GEMINI_FLASH_KEY=os.getenv('GEMINI_FLASH_KEY')

# YouTube API URLs
YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'

# Configure Gemini API
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class VideoProcessor:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
    def check_video_copyright(self, video_id: str) -> Dict:
        """Check if video has copyright restrictions"""
        try:
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                
                # Check various copyright indicators
                title = info.get('title', '').lower()
                description = info.get('description', '').lower()
                uploader = info.get('uploader', '').lower()
                
                # Music industry indicators
                music_keywords = [
                    'official music video', 'vevo', 'records', 'entertainment',
                    'sony music', 'universal music', 'warner music', 'emi music'
                ]
                
                # Movie/TV indicators
                media_keywords = [
                    'official trailer', 'full movie', 'netflix', 'disney',
                    'paramount', 'warner bros', 'sony pictures'
                ]
                
                # Check for restricted content
                for keyword in music_keywords + media_keywords:
                    if keyword in title or keyword in description or keyword in uploader:
                        return {
                            "restricted": True,
                            "reason": "This appears to be copyrighted content (music/entertainment industry)"
                        }
                
                # Check duration - very long videos might be full movies/shows
                duration = info.get('duration', 0)
                if duration > 7200:  # 2+ hours
                    return {
                        "restricted": True,
                        "reason": "Video is too long (likely full movie/show content)"
                    }
                
                # Check if video is available
                if info.get('is_live') or not info.get('formats'):
                    return {
                        "restricted": True,
                        "reason": "Video is not available for processing"
                    }
                
                return {"restricted": False, "reason": None}
                
        except Exception as e:
            return {
                "restricted": True,
                "reason": f"Unable to verify copyright status: {str(e)}"
            }  
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

class SSLAdapter(HTTPAdapter):
    """Custom SSL adapter to handle SSL connection issues"""
    
    def __init__(self, ssl_context=None, **kwargs):
        self.ssl_context = ssl_context
        super().__init__(**kwargs)
    
    def init_poolmanager(self, *args, **kwargs):
        kwargs['ssl_context'] = self.ssl_context
        return super().init_poolmanager(*args, **kwargs)
class YouTubeSearcher:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = model
        self.session = self._create_secure_session()
    
    def _create_secure_session(self):
        """Create a requests session with SSL handling and retry logic"""
        session = requests.Session()
        
        # Create SSL context with more permissive settings
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # Alternative: Use a more compatible SSL context
        # ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        # ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"]
        )
        
        # Mount adapter with SSL context
        adapter = SSLAdapter(ssl_context=ssl_context, max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        
        # Set headers
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        
        return session
    
    def search_videos(self, query: str, max_results: int = 20) -> List[Dict]:
        """
        Search for videos on YouTube and return detailed information
        """
        try:
            # Method 1: Use the configured session
            videos = self._search_with_session(query, max_results)
            if videos:
                return videos
                
        except Exception as e:
            logger.warning(f"Session-based search failed: {e}")
            
        try:
            # Method 2: Try with urllib3 and disabled SSL warnings
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            videos = self._search_with_urllib3(query, max_results)
            if videos:
                return videos
                
        except Exception as e:
            logger.warning(f"urllib3-based search failed: {e}")
            
        try:
            # Method 3: Try with basic requests and timeout
            videos = self._search_basic(query, max_results)
            return videos
            
        except Exception as e:
            logger.error(f"All search methods failed: {e}")
            raise Exception(f"Failed to search YouTube after multiple attempts: {str(e)}")
    
    def _search_with_session(self, query: str, max_results: int) -> List[Dict]:
        """Search using configured session"""
        # Step 1: Search for videos
        search_params = {
            'part': 'snippet',
            'q': query,
            'type': 'video',
            'maxResults': max_results,
            'key': self.api_key,
            'order': 'relevance',
            'videoDuration': 'medium',
            'videoDefinition': 'high',
            'relevanceLanguage': 'en',
            'safeSearch': 'strict'
        }
        
        search_response = self.session.get(
            YOUTUBE_SEARCH_URL, 
            params=search_params, 
            timeout=(10, 30),  # Connection timeout, read timeout
            verify=False  # Disable SSL verification as fallback
        )
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
        
        videos_response = self.session.get(
            YOUTUBE_VIDEOS_URL, 
            params=videos_params, 
            timeout=(10, 30),
            verify=False
        )
        videos_response.raise_for_status()
        videos_data = videos_response.json()
        
        # Process videos
        return self._process_videos(query, videos_data)
    
    def _search_with_urllib3(self, query: str, max_results: int) -> List[Dict]:
        """Alternative search method using urllib3 directly"""
        import urllib3
        
        # Create pool manager with SSL disabled
        http = urllib3.PoolManager(
            cert_reqs='CERT_NONE',
            ca_certs=None,
            timeout=urllib3.Timeout(connect=10, read=30)
        )
        
        # Step 1: Search for videos
        search_params = {
            'part': 'snippet',
            'q': query,
            'type': 'video',
            'maxResults': max_results,
            'key': self.api_key,
            'order': 'relevance',
            'videoDuration': 'medium',
            'videoDefinition': 'high',
            'relevanceLanguage': 'en',
            'safeSearch': 'strict'
        }
        
        # Build URL
        import urllib.parse
        search_url = f"{YOUTUBE_SEARCH_URL}?{urllib.parse.urlencode(search_params)}"
        
        response = http.request('GET', search_url)
        if response.status != 200:
            raise Exception(f"HTTP {response.status}: {response.data}")
        
        import json
        search_data = json.loads(response.data.decode('utf-8'))
        
        if 'items' not in search_data:
            return []
        
        # Get video details (simplified for this method)
        video_ids = [item['id']['videoId'] for item in search_data['items']]
        videos_params = {
            'part': 'snippet,statistics,contentDetails',
            'id': ','.join(video_ids),
            'key': self.api_key
        }
        
        videos_url = f"{YOUTUBE_VIDEOS_URL}?{urllib.parse.urlencode(videos_params)}"
        videos_response = http.request('GET', videos_url)
        
        if videos_response.status != 200:
            raise Exception(f"HTTP {videos_response.status}: {videos_response.data}")
        
        videos_data = json.loads(videos_response.data.decode('utf-8'))
        return self._process_videos(query, videos_data)
    
    def _search_basic(self, query: str, max_results: int) -> List[Dict]:
        """Basic search with minimal SSL configuration"""
        import requests
        
        # Create a new session with minimal configuration
        session = requests.Session()
        session.verify = False  # Disable SSL verification
        
        # Set a longer timeout
        timeout = (15, 45)  # connection timeout, read timeout
        
        # Step 1: Search for videos
        search_params = {
            'part': 'snippet',
            'q': query,
            'type': 'video',
            'maxResults': max_results,
            'key': self.api_key,
            'order': 'relevance',
            'videoDuration': 'medium',
            'videoDefinition': 'high',
            'relevanceLanguage': 'en',
            'safeSearch': 'strict'
        }
        
        search_response = session.get(
            YOUTUBE_SEARCH_URL, 
            params=search_params, 
            timeout=timeout
        )
        search_response.raise_for_status()
        search_data = search_response.json()
        
        if 'items' not in search_data:
            return []
        
        # Extract video IDs
        video_ids = [item['id']['videoId'] for item in search_data['items']]
        
        # Step 2: Get detailed video information
        videos_params = {
            'part': 'snippet,statistics,contentDetails',
            'id': ','.join(video_ids),
            'key': self.api_key
        }
        
        videos_response = session.get(
            YOUTUBE_VIDEOS_URL, 
            params=videos_params, 
            timeout=timeout
        )
        videos_response.raise_for_status()
        videos_data = videos_response.json()
        
        return self._process_videos(query, videos_data)
    
    def _process_videos(self, query: str, videos_data: Dict) -> List[Dict]:
        """Process video data and rank by relevance"""
        videos = []
        for item in videos_data.get('items', []):
            video_info = self._extract_video_info(item)
            if video_info:
                videos.append(video_info)
        
        # Rank videos by relevance
        ranked_videos = self._rank_videos_by_relevance(query, videos)
        return ranked_videos[:4]
    
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
        # Initialize video processor
        if video_processor is None:
            video_processor = VideoProcessor()

        # Step 1: Check for copyright restrictions
        logger.info("Checking video copyright status...")
        copyright_check = video_processor.check_video_copyright(video_id)
        if copyright_check["restricted"]:
            return jsonify({
                'error': f"❌ Cannot process this video: {copyright_check['reason']}",
                'copyright_restricted': True
            }), 403

        # Step 2: Download video audio
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

# Configure upload settings
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize EasyOCR reader (you can add more languages as needed)
# This will download models on first use - might take some time
try:
    # Initialize with English by default. Add more languages like ['en', 'ar', 'fr'] as needed
    ocr_reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=True if you have CUDA available
    logger.info("EasyOCR reader initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize EasyOCR reader: {e}")
    ocr_reader = None

# Supported languages for quiz generation
SUPPORTED_LANGUAGES = {
    'English': 'en',
    'Hindi': 'hi',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Kannada': 'kn',
    'Malayalam': 'ml',
    'Bengali': 'bn',
    'Gujarati': 'gu',
    'Marathi': 'mr',
    'Punjabi': 'pa',
    'Urdu': 'ur',
    'Odia': 'or',
    'Assamese': 'as'
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_image(image_data, is_base64=False):
    """
    Extract text from image using EasyOCR
    """
    try:
        if ocr_reader is None:
            return {
                'text': '',
                'confidence': None,
                'success': False,
                'error': 'EasyOCR reader not initialized'
            }
        
        if is_base64:
            # Handle base64 image data from camera
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        else:
            # Handle file upload
            image = Image.open(image_data)
        
        # Convert PIL image to numpy array for EasyOCR
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_array = np.array(image)
        
        # Extract text using EasyOCR
        # readtext returns list of tuples: (bbox, text, confidence)
        results = ocr_reader.readtext(image_array)
        
        if not results:
            return {
                'text': '',
                'confidence': 0.0,
                'success': True,
                'details': []
            }
        
        # Extract text and calculate average confidence
        extracted_texts = []
        confidences = []
        details = []
        
        for (bbox, text, confidence) in results:
            if text.strip():  # Only include non-empty text
                extracted_texts.append(text.strip())
                confidences.append(confidence)
                details.append({
                    'text': text.strip(),
                    'confidence': round(confidence, 3),
                    'bbox': bbox
                })
        
        # Combine all text with newlines
        full_text = '\n'.join(extracted_texts)
        
        # Calculate average confidence
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return {
            'text': full_text,
            'confidence': round(avg_confidence, 3),
            'success': True,
            'details': details,  # Individual text blocks with their confidence scores
            'word_count': len(extracted_texts)
        }
    
    except Exception as e:
        logger.error(f"EasyOCR extraction error: {e}")
        return {
            'text': '',
            'confidence': None,
            'success': False,
            'error': str(e)
        }

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    """
    Enhanced API endpoint to generate quiz questions using Gemini AI with language support
    Supports both topic-based and document-based quiz generation
    """
    try:
        # Check if Gemini API is configured
        if not GEMINI_API_KEY:
            return jsonify({
                'error': 'Gemini API key not configured'
            }), 500
        
        # Get request data
        data = request.get_json()
        if not data or 'level' not in data:
            return jsonify({
                'error': 'level parameter is required'
            }), 400
        
        level = data['level'].strip().lower()
        num_questions = data.get('num_questions', 5)
        language = data.get('language', 'English')  # Default to English
        
        # Validate language
        if language not in SUPPORTED_LANGUAGES:
            return jsonify({
                'error': f'Unsupported language. Supported languages: {list(SUPPORTED_LANGUAGES.keys())}'
            }), 400
        
        # Check if we have either topic or document_content
        topic = data.get('topic', '').strip()
        document_content = data.get('document_content', '').strip()
        
        if not topic and not document_content:
            return jsonify({
                'error': 'Either topic or document_content parameter is required'
            }), 400
        
        if level not in ['beginner', 'intermediate', 'advanced']:
            return jsonify({
                'error': 'Invalid level. Must be beginner, intermediate, or advanced'
            }), 400
        
        # Determine the source and generate appropriate quiz
        if document_content:
            logger.info(f"Generating {num_questions} {level} level questions from document content ({len(document_content)} chars) in {language}")
            questions = generate_quiz_from_document(document_content, level, num_questions, language)
            source_type = 'document'
            source_info = f"Document content ({len(document_content)} characters)"
        else:
            logger.info(f"Generating {num_questions} {level} level questions for topic: {topic} in {language}")
            questions = generate_quiz_questions(topic, level, num_questions, language)
            source_type = 'topic'
            source_info = topic
        
        logger.info(f"Successfully generated {len(questions)} questions in {language}")
        
        return jsonify({
            'source_type': source_type,
            'source_info': source_info,
            'level': level,
            'language': language,
            'questions': questions,
            'count': len(questions)
        })
        
    except Exception as e:
        logger.error(f"Error in generate quiz endpoint: {e}")
        return jsonify({
            'error': str(e)
        }), 500
    
@app.route('/api/supported-languages', methods=['GET'])
def get_supported_languages():
    """
    Get list of supported languages for quiz generation
    """
    return jsonify({
        'languages': list(SUPPORTED_LANGUAGES.keys()),
        'default': 'English'
    })

def generate_quiz_from_document(document_content: str, level: str, num_questions: int, language: str = 'English') -> List[Dict]:
    """
    Generate quiz questions from document content using Gemini AI with language support
    """
    try:
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        # Define difficulty descriptions
        difficulty_descriptions = {
            'beginner': 'basic, foundational concepts that are easy to understand',
            'intermediate': 'moderate difficulty requiring some knowledge and understanding',
            'advanced': 'challenging questions requiring deep knowledge and critical thinking'
        }
        
        # Truncate document content if too long (keep first 3000 characters)
        if len(document_content) > 3000:
            document_content = document_content[:3000] + "..."
            logger.info("Document content truncated to 3000 characters for processing")
        
        # Language-specific instructions
        language_instruction = ""
        if language != 'English':
            language_instruction = f"\n\nIMPORTANT: Generate all questions, options, and explanations in {language} language. Ensure proper grammar and natural language flow in {language}."
        
        prompt = f"""
        Based on the following document content, generate {num_questions} multiple choice questions at {level} level.
        
        Document Content:
        {document_content}
        
        Level Description: {difficulty_descriptions[level]}
        {language_instruction}
        
        Format your response as a JSON array where each question has this structure:
        {{
            "question": "The question text based on the document",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct": 0,
            "explanation": "Brief explanation of the correct answer with reference to the document"
        }}
        
        Requirements:
        - Each question should have exactly 4 options
        - The "correct" field should be the index (0-3) of the correct answer
        - Questions should be at {level} difficulty level
        - Base all questions on the provided document content
        - Include clear, helpful explanations that reference the document
        - Make questions engaging and educational
        - Ensure factual accuracy based on the document
        - Vary question types (factual, conceptual, analytical)
        - If the document doesn't contain enough information for {num_questions} questions, generate as many as possible
        {"- All content must be in " + language + " language" if language != 'English' else ""}
        
        Level: {level}
        Number of questions: {num_questions}
        Language: {language}
        
        Return only the JSON array, no additional text.
        """
        
        response = model.generate_content(prompt)
        
        # Clean the response text
        response_text = response.text.strip()
        
        # Remove markdown code fences if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        try:
            questions = json.loads(response_text)
            
            # Validate the questions structure
            validated_questions = []
            for i, q in enumerate(questions):
                if validate_question_structure(q):
                    validated_questions.append(q)
                else:
                    logger.warning(f"Invalid question structure at index {i}: {q}")
            
            if not validated_questions:
                raise Exception("No valid questions generated from document")
            
            return validated_questions[:num_questions]  # Ensure we don't exceed requested number
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response text: {response_text}")
            
            # Fallback: generate generic questions based on document
            return generate_document_fallback_questions(document_content, level, num_questions, language)
            
    except Exception as e:
        logger.error(f"Error generating quiz questions from document: {e}")
        return generate_document_fallback_questions(document_content, level, num_questions, language)

def generate_quiz_questions(topic: str, level: str, num_questions: int, language: str = 'English') -> List[Dict]:
    """
    Generate quiz questions using Gemini AI with language support
    """
    try:
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        # Define difficulty descriptions
        difficulty_descriptions = {
            'beginner': 'basic, foundational concepts that are easy to understand',
            'intermediate': 'moderate difficulty requiring some knowledge and understanding',
            'advanced': 'challenging questions requiring deep knowledge and critical thinking'
        }
        
        # Language-specific instructions
        language_instruction = ""
        if language != 'English':
            language_instruction = f"\n\nIMPORTANT: Generate all questions, options, and explanations in {language} language. Ensure proper grammar and natural language flow in {language}."
        
        prompt = f"""
        Generate {num_questions} multiple choice questions about {topic} at {level} level.
        
        Level Description: {difficulty_descriptions[level]}
        {language_instruction}
        
        Format your response as a JSON array where each question has this structure:
        {{
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct": 0,
            "explanation": "Brief explanation of the correct answer"
        }}
        
        Requirements:
        - Each question should have exactly 4 options
        - The "correct" field should be the index (0-3) of the correct answer
        - Questions should be at {level} difficulty level
        - Include clear, helpful explanations
        - Make questions engaging and educational
        - Ensure factual accuracy
        - Vary question types (conceptual, factual, analytical)
        {"- All content must be in " + language + " language" if language != 'English' else ""}
        
        Topic: {topic}
        Level: {level}
        Number of questions: {num_questions}
        Language: {language}
        
        Return only the JSON array, no additional text.
        """
        
        response = model.generate_content(prompt)
        
        # Clean the response text
        response_text = response.text.strip()
        
        # Remove markdown code fences if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        try:
            questions = json.loads(response_text)
            
            # Validate the questions structure
            validated_questions = []
            for i, q in enumerate(questions):
                if validate_question_structure(q):
                    validated_questions.append(q)
                else:
                    logger.warning(f"Invalid question structure at index {i}: {q}")
            
            if not validated_questions:
                raise Exception("No valid questions generated")
            
            return validated_questions[:num_questions]  # Ensure we don't exceed requested number
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response text: {response_text}")
            
            # Fallback: try to extract questions manually
            return generate_fallback_questions(topic, level, num_questions, language)
            
    except Exception as e:
        logger.error(f"Error generating quiz questions: {e}")
        return generate_fallback_questions(topic, level, num_questions, language)

def validate_question_structure(question: Dict) -> bool:
    """
    Validate that a question has the correct structure
    """
    required_fields = ['question', 'options', 'correct', 'explanation']
    
    # Check if all required fields are present
    if not all(field in question for field in required_fields):
        return False
    
    # Check if options is a list with 4 items
    if not isinstance(question['options'], list) or len(question['options']) != 4:
        return False
    
    # Check if correct is a valid index
    if not isinstance(question['correct'], int) or question['correct'] < 0 or question['correct'] > 3:
        return False
    
    # Check if question and explanation are strings
    if not isinstance(question['question'], str) or not isinstance(question['explanation'], str):
        return False
    
    return True

def generate_document_fallback_questions(document_content: str, level: str, num_questions: int, language: str = 'English') -> List[Dict]:
    """
    Generate fallback questions when AI generation fails for document content
    """
    # Extract some key terms from the document for basic questions
    words = document_content.split()
    key_terms = [word.strip('.,!?;:') for word in words if len(word) > 6][:10]
    
    fallback_questions = []
    
    # Basic fallback questions in English (could be enhanced with translation)
    for i in range(min(num_questions, 3)):
        if i < len(key_terms):
            term = key_terms[i]
            fallback_questions.append({
                "question": f"Based on the document, what is mentioned about '{term}'?",
                "options": [
                    "It is discussed in detail",
                    "It is briefly mentioned", 
                    "It is not mentioned",
                    "It is criticized"
                ],
                "correct": 1,
                "explanation": f"The term '{term}' appears in the provided document content."
            })
        else:
            fallback_questions.append({
                "question": f"What type of content does this document appear to contain?",
                "options": [
                    "Technical information",
                    "Literary content", 
                    "Historical data",
                    "Scientific research"
                ],
                "correct": 0,
                "explanation": "Based on the document structure and content, it appears to contain technical information."
            })
    
    return fallback_questions[:num_questions]

def generate_fallback_questions(topic: str, level: str, num_questions: int, language: str = 'English') -> List[Dict]:
    """
    Generate fallback questions when AI generation fails
    """
    # Fallback questions based on level and topic (in English)
    fallback_questions = {
        'beginner': [
            {
                "question": f"What is a fundamental concept in {topic}?",
                "options": ["Basic principle", "Advanced theory", "Complex algorithm", "Expert technique"],
                "correct": 0,
                "explanation": f"At beginner level, we focus on basic principles in {topic}."
            },
            {
                "question": f"Which of the following is most important for beginners in {topic}?",
                "options": ["Understanding basics", "Advanced techniques", "Expert knowledge", "Complex theories"],
                "correct": 0,
                "explanation": f"Beginners should focus on understanding the basics of {topic}."
            }
        ],
        'intermediate': [
            {
                "question": f"What is an intermediate concept in {topic}?",
                "options": ["Basic idea", "Moderate complexity topic", "Expert level theory", "Simple concept"],
                "correct": 1,
                "explanation": f"Intermediate level involves moderate complexity topics in {topic}."
            },
            {
                "question": f"Which skill is important at intermediate level in {topic}?",
                "options": ["Basic understanding", "Applied knowledge", "Expert mastery", "Simple recognition"],
                "correct": 1,
                "explanation": f"Intermediate level requires applied knowledge in {topic}."
            }
        ],
        'advanced': [
            {
                "question": f"What characterizes advanced understanding of {topic}?",
                "options": ["Basic knowledge", "Simple concepts", "Deep expertise", "Elementary ideas"],
                "correct": 2,
                "explanation": f"Advanced level requires deep expertise in {topic}."
            },
            {
                "question": f"Which approach is typical of advanced {topic} practice?",
                "options": ["Simple methods", "Basic techniques", "Sophisticated strategies", "Elementary approaches"],
                "correct": 2,
                "explanation": f"Advanced practice involves sophisticated strategies in {topic}."
            }
        ]
    }
    
    questions = fallback_questions.get(level, fallback_questions['beginner'])
    return questions[:num_questions]

@app.route('/api/analyze-diagram', methods=['POST'])
def analyze_diagram():
    """
    Endpoint to explain a diagram/image using Gemini 1.5 Flash with a separate API key.
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file uploaded'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.mimetype.startswith('image/'):
            return jsonify({'error': 'Invalid file type. Please upload an image.'}), 400

        image_data = file.read()

        import google.generativeai as genai
        genai.configure(api_key=GEMINI_FLASH_KEY)

        model = genai.GenerativeModel('models/gemini-1.5-flash')

        response = model.generate_content([
            {"mime_type": file.mimetype, "data": image_data},
            {"text": "Explain this diagram or image in simple educational terms. Include any labels or parts. Be precise and elaborate"}
        ])

        return jsonify({
            "explanation": response.text.strip(),
            "notes": "Explanation generated using Gemini 1.5 Flash"
        })

        genai.configure(api_key=GEMINI_API_KEY)

    except Exception as e:
        logger.error(f"Error analyzing diagram: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-youtube-topic', methods=['POST'])
def generate_youtube_topic():
    """
    Endpoint to generate a 2-5 word YouTube search topic from an explanation using Gemini.
    """
    try:
        data = request.get_json()
        
        if not data or 'explanation' not in data:
            return jsonify({'error': 'No explanation provided'}), 400

        explanation = data['explanation']
        
        if not explanation.strip():
            return jsonify({'error': 'Empty explanation provided'}), 400

        import google.generativeai as genai

        model = genai.GenerativeModel('models/gemini-1.5-flash')

        prompt = f"""Based on this educational explanation, generate a concise 2-5 word search topic that would be perfect for finding relevant educational YouTube videos about this subject. 

The topic should be:
- Clear and specific
- Educational in nature
- Optimized for YouTube search
- 2-5 words maximum
- Focus on the main concept/subject

Only return the topic phrase, nothing else.

Explanation: {explanation}"""

        response = model.generate_content(prompt)
        
        topic = response.text.strip()
        
        # Clean up the topic (remove quotes, extra spaces, etc.)
        topic = topic.replace('"', '').replace("'", '').strip()
        
        # Ensure it's not too long (fallback)
        words = topic.split()
        if len(words) > 5:
            topic = ' '.join(words[:5])

        return jsonify({
            "topic": topic,
            "notes": "Topic generated using Gemini 1.5 Flash"
        })


    except Exception as e:
        logger.error(f"Error generating YouTube topic: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting YouTube Search and Summarization API on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"YouTube API key configured: {bool(YOUTUBE_API_KEY)}")
    logger.info(f"Gemini API key configured: {bool(GEMINI_API_KEY)}")
    logger.info(f"Gemini Flash API key configured: {bool(GEMINI_FLASH_KEY)}")

    app.run(host='0.0.0.0', port=port, debug=debug)